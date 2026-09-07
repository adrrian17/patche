import { Stripe as StripeClient } from "stripe";

export { startCheckout } from "./checkout";
export { processStripeEvent } from "./webhook-events";
export type {
  CheckoutDependencies,
  CheckoutItem,
  CheckoutSessionResult,
  CheckoutVariant,
  StartCheckoutInput,
} from "./checkout";
export type {
  StripeEventResult,
  WebhookStore,
  WebhookTransaction,
} from "./webhook-events";
export type { Stripe } from "stripe";

export interface WebhookVerificationInput {
  body: string;
  secret: string;
  signature: string;
}

export function createStripeClient(secretKey: string): StripeClient {
  return new StripeClient(secretKey, {
    apiVersion: "2026-08-26.dahlia",
    httpClient: StripeClient.createFetchHttpClient(),
    maxNetworkRetries: 2,
  });
}

export async function verifyWebhookEvent(
  stripe: StripeClient,
  input: WebhookVerificationInput
): Promise<StripeClient.Event> {
  return await stripe.webhooks.constructEventAsync(
    input.body,
    input.signature,
    input.secret,
    undefined,
    StripeClient.createSubtleCryptoProvider()
  );
}
