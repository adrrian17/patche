import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import { map as mapOutput } from "alchemy/Output";
import { config } from "dotenv";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";

config({ path: "./.env" });
config({ path: "../../apps/web/.env" });

const productionHostname = "patche.mx";
const productionOrigin = `https://${productionHostname}`;
const productionMediaHostname = `media.${productionHostname}`;
const localOrigin = "http://localhost:3001";

function getR2PublicBaseUrl(publicDomain: string | undefined): string {
  if (!publicDomain) {
    throw new Error("R2 did not provide a public domain for the media bucket");
  }
  return `https://${publicDomain}`;
}

function getAllowedOrigins(isProduction: boolean, isLocal: boolean): string[] {
  if (isProduction) {
    return [productionOrigin];
  }
  if (isLocal) {
    return [productionOrigin, localOrigin];
  }
  return [productionOrigin, "*", localOrigin];
}

function createApp(stage: string, isLocal: boolean, zoneId?: string) {
  const isProduction = stage === "production";
  const db = Cloudflare.D1.Database("database", {
    migrations: "../../packages/db/src/migrations",
  });

  const mediaBucket = Cloudflare.R2.Bucket(
    "media",
    isProduction
      ? { domains: [{ name: productionMediaHostname }] }
      : { publicAccess: true }
  );

  const mediaPublicBaseUrl = (() => {
    if (isLocal) {
      return Cloudflare.Worker.URL;
    }
    if (isProduction) {
      return `https://${productionMediaHostname}`;
    }
    return mediaBucket.pipe(
      Effect.map((bucket) => mapOutput(bucket.publicDomain, getR2PublicBaseUrl))
    );
  })();

  const digitalBucket = Cloudflare.R2.Bucket("digital", {
    cors: [
      {
        allowedHeaders: ["content-type"],
        allowedMethods: ["PUT"],
        allowedOrigins: getAllowedOrigins(isProduction, isLocal),
      },
    ],
  });

  if (!isLocal && zoneId) {
    Cloudflare.Email.SendingSubdomain("authEmailDomain", {
      name: "patche.mx",
      zoneId,
    });
  }

  const authEmail = Cloudflare.Email.SendEmail("authEmail", {
    allowedSenderAddresses: ["noreply@patche.mx"],
  });

  return Cloudflare.Website.Vite("web", {
    compatibility: {
      flags: ["nodejs_compat"],
    },
    dev: {
      port: 3001,
    },
    domain: isProduction ? productionHostname : undefined,
    env: {
      AUTH_EMAIL: authEmail,
      BETTER_AUTH_SECRET: Config.redacted("BETTER_AUTH_SECRET"),
      BETTER_AUTH_URL: Cloudflare.Worker.URL,
      CF_ACCOUNT_ID: Config.string("CF_ACCOUNT_ID"),
      DB: db,
      DIGITAL_BUCKET: digitalBucket,
      DIGITAL_BUCKET_NAME: digitalBucket.pipe(
        Effect.map((bucket) => bucket.bucketName)
      ),
      MEDIA_BUCKET: mediaBucket,
      MEDIA_PUBLIC_BASE_URL: mediaPublicBaseUrl,
      MEDIA_PUBLIC_PROXY: isLocal,
      R2_ACCESS_KEY_ID: Config.redacted("R2_ACCESS_KEY_ID"),
      R2_SECRET_ACCESS_KEY: Config.redacted("R2_SECRET_ACCESS_KEY"),
      STRIPE_SECRET_KEY: Config.redacted("STRIPE_SECRET_KEY"),
      STRIPE_WEBHOOK_SECRET: Config.redacted("STRIPE_WEBHOOK_SECRET"),
    },
    rootDir: "../../apps/web",
  });
}

export type WebEnv = Cloudflare.InferEnv<ReturnType<typeof createApp>> & {
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
    const providerMode = yield* Alchemy.ProviderMode.defaultProviderMode;
    const isLocal = providerMode === "local";
    const zoneId = isLocal ? undefined : yield* Config.string("CF_ZONE_ID");
    const web = createApp(stage, isLocal, zoneId);
    const webWorker = yield* web;

    return {
      web: webWorker.url,
    };
  })
);
