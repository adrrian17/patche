/// <reference types="@cloudflare/workers-types" />
// oxlint-disable-next-line typescript(triple-slash-reference)
/// <reference path="../env.d.ts" />

export interface ServerEnv {
  AUTH_EMAIL: SendEmail;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  CF_ACCOUNT_ID: string;
  DB: D1Database;
  DIGITAL_BUCKET: R2Bucket;
  DIGITAL_BUCKET_NAME: string;
  MEDIA_BUCKET: R2Bucket;
  MEDIA_PUBLIC_BASE_URL: string;
  MEDIA_PUBLIC_PROXY: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
}

export { env } from "cloudflare:workers";
