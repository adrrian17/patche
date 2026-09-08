import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import { config } from "dotenv";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";

config({ path: "./.env" });
config({ path: "../../apps/web/.env" });

function createResources(stage: string) {
  const stageHostname = stage.replaceAll("_", "-").toLowerCase();
  const mediaHostname =
    stage === "production"
      ? "media.patche.mx"
      : `media-${stageHostname}.patche.mx`;
  const allowedOrigins =
    stage === "production"
      ? ["https://patche.mx"]
      : ["https://patche.mx", "http://localhost:3001"];
  const db = Cloudflare.D1.Database("database", {
    migrations: "../../packages/db/src/migrations",
  });
  const mediaBucket = Cloudflare.R2.Bucket("media", {
    domains: [{ name: mediaHostname }],
  });
  const digitalBucket = Cloudflare.R2.Bucket("digital", {
    cors: [
      {
        allowedHeaders: ["content-type"],
        allowedMethods: ["PUT"],
        allowedOrigins,
      },
    ],
  });
  const web = Cloudflare.Website.Vite("web", {
    compatibility: {
      flags: ["nodejs_compat"],
    },
    dev: {
      port: 3001,
    },
    env: {
      BETTER_AUTH_SECRET: Config.redacted("BETTER_AUTH_SECRET"),
      BETTER_AUTH_URL: Cloudflare.Worker.URL,
      CF_ACCOUNT_ID: Config.string("CF_ACCOUNT_ID"),
      DB: db,
      DIGITAL_BUCKET: digitalBucket,
      DIGITAL_BUCKET_NAME: digitalBucket.pipe(
        Effect.map((bucket) => bucket.bucketName)
      ),
      MEDIA_BUCKET: mediaBucket,
      MEDIA_PUBLIC_BASE_URL: `https://${mediaHostname}`,
      R2_ACCESS_KEY_ID: Config.redacted("R2_ACCESS_KEY_ID"),
      R2_SECRET_ACCESS_KEY: Config.redacted("R2_SECRET_ACCESS_KEY"),
      STRIPE_SECRET_KEY: Config.redacted("STRIPE_SECRET_KEY"),
      STRIPE_WEBHOOK_SECRET: Config.redacted("STRIPE_WEBHOOK_SECRET"),
    },
    rootDir: "../../apps/web",
  });

  return { web };
}

export type WebEnv = Cloudflare.InferEnv<
  ReturnType<typeof createResources>["web"]
> & {
  ALCHEMY_STAGE: string;
};

export default Alchemy.Stack(
  "patche",
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* stack() {
    const stage = yield* Alchemy.Stage;
    const { web } = createResources(stage);
    const webWorker = yield* web;

    return {
      web: webWorker.url,
    };
  })
);
