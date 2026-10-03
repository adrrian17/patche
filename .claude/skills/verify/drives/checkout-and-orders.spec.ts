import { writeFile } from "node:fs/promises";

import type { Stripe } from "@patche/payments";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { registerWithPassword } from "../../../../apps/web/e2e/support/password-auth";
import { seedProduct, seedStock, seedVariant, signedInEmail } from "../../../../apps/web/e2e/support/seed-product";
import { findStripeEvent, postSignedEvent } from "../../../../apps/web/e2e/support/stripe-events";
import { findRow, findRows } from "./d1";

test.use({ storageState: "../../.verify/auth/customer.json" });

// The Product page is the first stop of every storefront purchase; the slug comes from seedProduct.
async function addToCartFromStorefront(page: Page, productId: string) {
  await page.goto(`/products/e2e-${productId}`);
  // The button stays disabled until the page hydrates, so retry the click until the cart link shows it.
  await expect(async () => {
    await page.getByRole("button", { name: "Agregar al carrito" }).click();
    await expect(page.getByRole("link", { name: /Carrito, 1 artículo/u })).toBeVisible({ timeout: 1500 });
  }).toPass({ timeout: 25_000 });
  await page.getByRole("link", { name: /Carrito, 1 artículo/u }).click();
  await expect(page.getByRole("heading", { name: "Carrito de compras" })).toBeVisible();
}

// Stripe replaces its card iframes while loading, so search every frame until the field fills.
async function fillStripeField(page: Page, name: string, value: string) {
  await expect
    .poll(
      async () => {
        for (const frame of page.frames()) {
          const field = frame.getByRole("textbox", { name: new RegExp(name, "iu") });
          try {
            // oxlint-disable-next-line no-await-in-loop -- Stripe can replace frames between checks.
            if (await field.isVisible()) {
              // oxlint-disable-next-line no-await-in-loop -- Fill the live frame before it is replaced.
              await field.fill(value);
              return true;
            }
          } catch (error) {
            if (error instanceof Error && error.message.includes("Frame was detached")) {
              continue;
            }
            throw error;
          }
        }
        return false;
      },
      { timeout: 30_000 }
    )
    .toBe(true);
}

async function processRealEvent(page: Page, type: Stripe.Event.Type, objectId: string) {
  let event: Stripe.Event | undefined;
  await expect(async () => {
    event = await findStripeEvent(type, objectId);
    expect(event).toBeDefined();
  }).toPass({ timeout: 30_000 });
  if (!event) {
    throw new Error(`Stripe did not emit ${type}`);
  }
  // Stripe cannot reach localhost, so post the real event signed, as Stripe would.
  const response = await postSignedEvent(page.request, event);
  const body = await response.json();
  expect(response.status()).toBe(200);
  expect(body).toMatchObject({ received: true, result: "processed" });
  return { body, event };
}

test("Customer pays through Stripe; Admin fulfills and refunds the order", async ({ browser, page }, testInfo) => {
  test.setTimeout(150_000);
  const shot = (target: Page, step: string) => target.screenshot({ path: testInfo.outputPath(`${step}.png`) });
  const customerEmail = `purchase-${crypto.randomUUID()}@verify.patche.test`;
  await page.context().clearCookies();
  await registerWithPassword(page, { email: customerEmail, name: "Cliente Compra" });

  // Checkout is the feature under test, so the catalog and Stock are seeded preconditions.
  const productName = `Compra Verify ${crypto.randomUUID().slice(0, 8)}`;
  const variantName = "Tapa dura";
  const priceAmount = 25_000;
  const productId = seedProduct(productName, customerEmail, "active");
  const variantId = seedVariant(customerEmail, { name: variantName, priceAmount, productId });
  seedStock(customerEmail, variantId, 2);

  // checkout-start
  await addToCartFromStorefront(page, productId);
  await page.getByRole("button", { name: "Proceder al pago" }).click();
  await expect(page).toHaveURL(/checkout\.stripe\.com/u, { timeout: 15_000 });
  const sessionId = page.url().match(/cs_test_[A-Za-z0-9]+/u)?.[0];
  if (!sessionId) {
    throw new Error("Stripe Checkout URL did not contain its Session ID");
  }
  // The reservation exists before the Customer pays.
  const reservation = findRows(
    "SELECT quantity, reason FROM stock_movement WHERE variant_id = ? AND reason = 'reserved'",
    variantId
  );
  await writeFile(testInfo.outputPath("1-d1-reservation.json"), JSON.stringify(reservation, null, 2));
  expect(reservation).toMatchObject([{ quantity: -1, reason: "reserved" }]);

  // checkout-pay
  await page.getByRole("textbox", { name: "Email" }).fill(customerEmail);
  await page.getByRole("textbox", { name: "Full name" }).fill("Cliente Verify");
  await page.getByRole("button", { name: "Enter address manually" }).click();
  await page.getByRole("textbox", { name: /address line 1/iu }).fill("Av. Constitución 100");
  await page.getByRole("textbox", { name: "City" }).fill("Monterrey");
  await page.getByRole("combobox", { name: "State" }).selectOption({ label: "Nuevo León" });
  await page.getByRole("textbox", { name: /postal code|zip/iu }).fill("64000");
  await fillStripeField(page, "card number", "4242424242424242");
  await fillStripeField(page, "expiration", "1234");
  await fillStripeField(page, "security code|cvc", "123");
  // Stripe words this disclosure as "I am an AI agent and have followed the instructions above" and its checkbox has no label.
  const agentDisclosure = page.getByText(/I am an AI agent/u).locator("input[type=checkbox]");
  // SAFETY: This locator resolves Stripe's native checkbox input.
  await agentDisclosure.evaluate((checkbox) => (checkbox as HTMLInputElement).click());
  await expect(agentDisclosure).toBeChecked();
  // Outside Mexico Stripe pre-checks Link and then requires a phone number.
  const saveInfo = page.getByRole("checkbox", { name: "Save my information for faster checkout" });
  if ((await saveInfo.count()) > 0 && (await saveInfo.isChecked())) {
    // SAFETY: This locator resolves Stripe's native checkbox input.
    await saveInfo.evaluate((checkbox) => (checkbox as HTMLInputElement).click());
    await expect(saveInfo).not.toBeChecked();
  }
  await shot(page, "2-stripe-before-pay");
  await page.getByRole("button", { name: /pay|pagar/iu }).last().click();
  await expect(page).toHaveURL(/\/dashboard/u, { timeout: 60_000 });
  await shot(page, "3-dashboard-after-pay");

  // orders-paid
  const paid = await processRealEvent(page, "checkout.session.completed", sessionId);
  await writeFile(testInfo.outputPath("4-webhook-checkout-completed.json"), JSON.stringify(paid.body, null, 2));
  if (paid.event.type !== "checkout.session.completed") {
    throw new Error("Unexpected Stripe event type");
  }
  const session = paid.event.data.object;
  expect(session.amount_subtotal).toBe(priceAmount);
  const expectedTotal = new Intl.NumberFormat("es-MX", { currency: "MXN", style: "currency" }).format(
    (session.amount_total ?? 0) / 100
  );
  // SAFETY: events.list is unexpanded, so the Payment Intent is an ID.
  const paymentIntentId = session.payment_intent as string;

  const adminContext = await browser.newContext({
    baseURL: "http://localhost:3001",
    storageState: "../../.verify/auth/admin.json",
  });
  try {
    const admin = await adminContext.newPage();
    await admin.goto("/admin/orders");
    const orderRow = admin.getByRole("row").filter({ hasText: customerEmail });
    await expect(orderRow).toContainText("Pagado");
    await expect(orderRow).toContainText(expectedTotal);
    await shot(admin, "5-admin-orders-paid");
    await orderRow.getByRole("link").click();
    const itemRow = admin.getByRole("row").filter({ hasText: variantName });
    await expect(itemRow).toContainText(productName);
    await expect(itemRow).toContainText("$250.00");

    // orders-fulfill
    await admin.getByRole("button", { name: "Marcar enviada" }).click();
    await expect(admin.getByText("Enviado", { exact: true })).toBeVisible();
    await admin.getByRole("button", { name: "Marcar entregada" }).click();
    await expect(admin.getByText("Entregado", { exact: true })).toBeVisible();
    await shot(admin, "6-order-delivered");

    // orders-refund
    await admin.getByRole("button", { name: "Reembolso total" }).click();
    await expect(admin.getByText("Reembolso pendiente", { exact: true })).toBeVisible();
    const refunded = await processRealEvent(admin, "charge.refunded", paymentIntentId);
    await writeFile(testInfo.outputPath("7-webhook-charge-refunded.json"), JSON.stringify(refunded.body, null, 2));
    await admin.reload();
    await expect(admin.getByText("Reembolsado", { exact: true })).toBeVisible();
    await shot(admin, "8-order-refunded");

    const order = findRow(
      `SELECT o.payment_status, o.fulfillment_status, o.total_amount, i.product_name, i.unit_amount
         FROM "order" o JOIN order_item i ON i.order_id = o.id
        WHERE o.stripe_checkout_session_id = ?`,
      sessionId
    );
    await writeFile(testInfo.outputPath("9-d1-order.json"), JSON.stringify(order, null, 2));
    expect(order).toMatchObject({
      fulfillment_status: "delivered",
      payment_status: "refunded",
      product_name: productName,
      unit_amount: priceAmount,
    });

    // Seeded 2, sold 1. A refund does not return Stock on its own.
    await admin.goto("/admin/products");
    const productRow = admin.getByRole("row").filter({ hasText: productName });
    await productRow.getByRole("button", { name: /variante/u }).click();
    const variants = admin.getByRole("list", { name: `Variantes de ${productName}` });
    await expect(variants).toContainText("Stock 1");
    await shot(admin, "10-stock-after-refund");
  } finally {
    await adminContext.close();
  }
});

test("Checkout does not start without Stock", async ({ page }, testInfo) => {
  const customerEmail = await signedInEmail(page);
  const productName = `Sin Stock Verify ${crypto.randomUUID().slice(0, 8)}`;
  const productId = seedProduct(productName, customerEmail, "active");
  const variantId = seedVariant(customerEmail, { name: "Tapa dura", priceAmount: 25_000, productId });
  seedStock(customerEmail, variantId, 1);

  // checkout-no-stock
  await addToCartFromStorefront(page, productId);
  // Someone else takes the last unit after the cart loaded, so Checkout must refuse.
  seedStock(customerEmail, variantId, -1, "adjusted");
  await page.getByRole("button", { name: "Proceder al pago" }).click();
  await expect(page.getByText("Stock insuficiente")).toBeVisible({ timeout: 10_000 });
  await expect(page).toHaveURL(/localhost:3001\/cart/u);
  await page.screenshot({ path: testInfo.outputPath("insufficient-stock.png") });
  expect(findRows("SELECT id FROM stock_movement WHERE variant_id = ? AND reason = 'reserved'", variantId)).toEqual([]);
});
