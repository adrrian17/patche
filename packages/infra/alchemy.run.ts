import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import { config } from "dotenv";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";

config({ path: "./.env" });
config({ path: "../../apps/web/.env" });

export const db = Cloudflare.D1.Database("database", {
  migrations: "../../packages/db/src/migrations",
});

export const mediaBucket = Cloudflare.R2.Bucket("media", {
  domains: [{ name: "media.patche.mx" }],
});

export const digitalBucket = Cloudflare.R2.Bucket("digital", {
  cors: [
    {
      allowedHeaders: ["content-type"],
      allowedMethods: ["PUT"],
      allowedOrigins: ["http://localhost:3001", "https://patche.mx"],
    },
  ],
});

export const web = Cloudflare.Website.Vite("web", {
  compatibility: {
    flags: ["nodejs_compat"],
  },
  dev: {
    port: 3001,
  },
  env: {
    ADMIN_EMAIL: Config.string("ADMIN_EMAIL"),
    BETTER_AUTH_SECRET: Config.redacted("BETTER_AUTH_SECRET"),
    BETTER_AUTH_URL: Cloudflare.Worker.URL,
    CF_ACCOUNT_ID: Config.string("CF_ACCOUNT_ID"),
    DB: db,
    DIGITAL_BUCKET: digitalBucket,
    DIGITAL_BUCKET_NAME: digitalBucket.pipe(
      Effect.map((bucket) => bucket.bucketName)
    ),
    MEDIA_BUCKET: mediaBucket,
    MEDIA_PUBLIC_BASE_URL: "https://media.patche.mx",
    R2_ACCESS_KEY_ID: Config.redacted("R2_ACCESS_KEY_ID"),
    R2_SECRET_ACCESS_KEY: Config.redacted("R2_SECRET_ACCESS_KEY"),
    STRIPE_SECRET_KEY: Config.redacted("STRIPE_SECRET_KEY"),
    STRIPE_WEBHOOK_SECRET: Config.redacted("STRIPE_WEBHOOK_SECRET"),
  },
  rootDir: "../../apps/web",
});

export type WebEnv = Cloudflare.InferEnv<typeof web> & {
  ALCHEMY_STAGE: string;
};

export default Alchemy.Stack(
  "patche",
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* stack() {
    const webWorker = yield* web;

    return {
      web: webWorker.url,
    };
  })
);
