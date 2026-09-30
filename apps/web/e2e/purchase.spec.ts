import type { Stripe } from "@patche/payments";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { registerWithPassword } from "./support/password-auth";
import {
  seedProduct,
  seedStock,
  seedVariant,
  signedInEmail,
} from "./support/seed-product";
import { findStripeEvent, postSignedEvent } from "./support/stripe-events";

test.use({ storageState: "e2e/.auth/customer.json" });

// The dev checkout form submits natively when clicked before hydration, so retry from a fresh load.
async function submitDevCheckout(
  page: Page,
  variantId: string,
  outcome: () => Promise<void>
) {
  await expect(async () => {
    await page.goto("/dev/checkout");
    await page.getByLabel("Variant ID", { exact: true }).fill(variantId);
    await page.getByRole("button", { name: "Ir a Stripe Checkout" }).click();
    await outcome();
  }).toPass({ timeout: 25_000 });
}

async function fillStripeField(page: Page, name: string, value: string) {
  await expect
    .poll(
      async () => {
        for (const frame of page.frames()) {
          const field = frame.getByRole("textbox", {
            name: new RegExp(name, "iu"),
          });
          try {
            // oxlint-disable-next-line no-await-in-loop -- Stripe can replace frames between checks.
            if (await field.isVisible()) {
              // oxlint-disable-next-line no-await-in-loop -- Fill the live frame before it is replaced.
              await field.fill(value);
              return true;
            }
          } catch (error) {
            if (
              error instanceof Error &&
              error.message.includes("Frame was detached")
            ) {
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

test("purchase, fulfillment, and refund complete through Stripe", async ({
  browser,
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  const customerEmail = `purchase-${crypto.randomUUID()}@e2e.patche.test`;
  await page.context().clearCookies();
  await registerWithPassword(page, {
    email: customerEmail,
    name: "Cliente Compra",
  });
  const productName = `Compra E2E ${crypto.randomUUID().slice(0, 8)}`;
  const variantName = "Tapa dura";
  const priceAmount = 25_000;
  const productId = seedProduct(productName, customerEmail, "active");
  const variantId = seedVariant(customerEmail, {
    name: variantName,
    priceAmount,
    productId,
  });
  seedStock(customerEmail, variantId, 2);

  await submitDevCheckout(page, variantId, () =>
    expect(page).toHaveURL(/checkout\.stripe\.com/u, { timeout: 5000 })
  );

  const sessionId = page.url().match(/cs_test_[A-Za-z0-9]+/u)?.[0];
  if (!sessionId) {
    throw new Error("Stripe Checkout URL did not contain its Session ID");
  }

  await page.getByRole("textbox", { name: "Email" }).fill(customerEmail);
  await page.getByRole("textbox", { name: "Full name" }).fill("Cliente E2E");
  await page.getByRole("button", { name: "Enter address manually" }).click();
  await page
    .getByRole("textbox", { name: /address line 1/iu })
    .fill("Av. Constitución 100");
  await page.getByRole("textbox", { name: "City" }).fill("Monterrey");
  await page
    .getByRole("combobox", { name: "State" })
    .selectOption({ label: "Nuevo León" });
  await page.getByRole("textbox", { name: /postal code|zip/iu }).fill("64000");
  await fillStripeField(page, "card number", "4242424242424242");
  await fillStripeField(page, "expiration", "1234");
  await fillStripeField(page, "security code|cvc", "123");
  const agentDisclosure = page.getByRole("checkbox", {
    name: "I am an AI agent acting on behalf of someone else",
  });
  // SAFETY: This locator resolves Stripe's native checkbox input.
  await agentDisclosure.evaluate((checkbox) =>
    (checkbox as HTMLInputElement).click()
  );
  await expect(agentDisclosure).toBeChecked();
  // Outside Mexico Stripe pre-checks Link and then requires a phone number.
  const saveInfo = page.getByRole("checkbox", {
    name: "Save my information for faster checkout",
  });
  if ((await saveInfo.count()) > 0 && (await saveInfo.isChecked())) {
    // SAFETY: This locator resolves Stripe's native checkbox input.
    await saveInfo.evaluate((checkbox) =>
      (checkbox as HTMLInputElement).click()
    );
    await expect(saveInfo).not.toBeChecked();
  }
  await page
    .getByRole("button", { name: /pay|pagar/iu })
    .last()
    .click();
  await expect(page).toHaveURL(/\/dashboard/u, { timeout: 60_000 });

  let event: Stripe.Event | undefined;
  await expect(async () => {
    event = await findStripeEvent("checkout.session.completed", sessionId);
    expect(event).toBeDefined();
  }).toPass({ timeout: 30_000 });
  if (!event) {
    throw new Error("Stripe did not emit checkout.session.completed");
  }
  if (event.type !== "checkout.session.completed") {
    throw new Error("Stripe did not emit checkout.session.completed");
  }
  expect(event.data.object.amount_subtotal).toBe(priceAmount);
  const totalAmount = event.data.object.amount_total;
  if (totalAmount === null) {
    throw new Error("Stripe Checkout event did not contain its total");
  }
  const expectedTotal = new Intl.NumberFormat("es-MX", {
    currency: "MXN",
    style: "currency",
  }).format(totalAmount / 100);
  // SAFETY: events.list is unexpanded here, so the Payment Intent is an ID.
  const paymentIntentId = event.data.object.payment_intent as string | null;
  if (!paymentIntentId) {
    throw new Error("Stripe Checkout event did not contain a Payment Intent");
  }

  const webhookResponse = await postSignedEvent(page.request, event);
  expect(webhookResponse.status()).toBe(200);
  expect(await webhookResponse.json()).toMatchObject({
    received: true,
    result: "processed",
  });

  const adminContext = await browser.newContext({
    baseURL: "http://localhost:3001",
    storageState: "e2e/.auth/admin.json",
  });
  try {
    const adminPage = await adminContext.newPage();
    await adminPage.goto("/admin/orders");
    const orderRow = adminPage
      .getByRole("row")
      .filter({ hasText: customerEmail });
    await expect(orderRow).toContainText("Pagado");
    await expect(orderRow).toContainText(expectedTotal);
    await orderRow.getByRole("link").click();
    const itemRow = adminPage.getByRole("row").filter({ hasText: variantName });
    await expect(itemRow).toContainText(productName);
    await expect(itemRow).toContainText("$250.00");

    await adminPage.getByRole("button", { name: "Marcar enviada" }).click();
    await expect(adminPage.getByText("Enviado", { exact: true })).toBeVisible();
    await adminPage.getByRole("button", { name: "Marcar entregada" }).click();
    await expect(
      adminPage.getByText("Entregado", { exact: true })
    ).toBeVisible();

    await adminPage.getByRole("button", { name: "Reembolso total" }).click();
    await expect(
      adminPage.getByText("Reembolso pendiente", { exact: true })
    ).toBeVisible();

    let refundEvent: Stripe.Event | undefined;
    await expect(async () => {
      refundEvent = await findStripeEvent("charge.refunded", paymentIntentId);
      expect(refundEvent).toBeDefined();
    }).toPass({ timeout: 30_000 });
    if (!refundEvent) {
      throw new Error("Stripe did not emit charge.refunded");
    }
    const refundResponse = await postSignedEvent(
      adminPage.request,
      refundEvent
    );
    expect(refundResponse.status()).toBe(200);
    expect(await refundResponse.json()).toMatchObject({
      received: true,
      result: "processed",
    });
    await adminPage.reload();
    await expect(
      adminPage.getByText("Reembolsado", { exact: true })
    ).toBeVisible();

    await adminPage.goto("/admin/inventory");
    const inventoryRow = adminPage
      .getByRole("row")
      .filter({ hasText: productName });
    await expect(inventoryRow.getByRole("cell").nth(2)).toHaveText("1");
    await testInfo.attach("paid-order", {
      body: await adminPage.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
  } finally {
    await adminContext.close();
  }
});

test("does not start Checkout when Stock is insufficient", async ({
  page,
}, testInfo) => {
  const customerEmail = await signedInEmail(page);
  const productName = `Sin Stock E2E ${crypto.randomUUID().slice(0, 8)}`;
  const productId = seedProduct(productName, customerEmail, "active");
  const variantId = seedVariant(customerEmail, {
    name: "Tapa dura",
    priceAmount: 25_000,
    productId,
  });

  await submitDevCheckout(page, variantId, () =>
    expect(page.getByRole("alert")).toContainText("Stock insuficiente", {
      timeout: 5000,
    })
  );
  await expect(page).toHaveURL(/localhost:3001\/dev\/checkout/u);
  await testInfo.attach("insufficient-stock", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});
