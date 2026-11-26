import * as Cloudflare from "@alchemy.run/cloudflare";
import * as GitHub from "@alchemy.run/github";
import * as Alchemy from "alchemy";
import * as Output from "alchemy/Output";
import { Stage } from "alchemy/Stage";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";

// Secrets come from Varlock (`varlock run -- ...`), which fills process.env from .env.schema.

// Only `pr-<number>` stages may be emptied and destroyed along with their buckets.
const previewStagePattern = /^pr-\d+$/u;

function isPreviewStage(stage: string) {
  return previewStagePattern.test(stage);
}

const Database = Cloudflare.D1.Database(
  "Database",
  Stage.pipe(
    Effect.map((stage) => ({
      migrations: "../../packages/db/src/migrations",
      name: stage === "production" ? "patche" : undefined,
    }))
  )
);

const MediaBucket = Cloudflare.R2.Bucket(
  "MediaBucket",
  Stage.pipe(
    Effect.map((stage) => ({
      forceDestroy: isPreviewStage(stage),
      name: stage === "production" ? "patche-media" : undefined,
    }))
  )
);

const DigitalBucket = Cloudflare.R2.Bucket(
  "DigitalBucket",
  Stage.pipe(
    Effect.map((stage) => ({
      cors: [
        {
          allowedHeaders: ["content-type"],
          allowedMethods: ["PUT" as const],
          // ponytail: presigned URLs already authorize each PUT; pin the origin once there is a custom domain.
          allowedOrigins: ["*"],
        },
      ],
      forceDestroy: isPreviewStage(stage),
      lifecycleRules: [
        {
          deleteObjectsTransition: {
            condition: { maxAge: 86_400, type: "Age" as const },
          },
          id: "delete-abandoned-digital-uploads",
          prefix: "uploads/",
        },
      ],
      name: stage === "production" ? "patche-digital" : undefined,
    }))
  )
);

const AuthEmail = Cloudflare.Email.SendEmail("AuthEmail", {
  allowedSenderAddresses: ["noreply@adrianayala.mx"],
});

const baseWebEnv = {
  AUTH_EMAIL: AuthEmail,
  BETTER_AUTH_SECRET: Config.Redacted("BETTER_AUTH_SECRET"),
  BETTER_AUTH_URL: Cloudflare.Worker.URL,
  // Only presigned R2 URLs need it; local dev serves R2 through the Worker.
  CF_ACCOUNT_ID: Config.String("CLOUDFLARE_ACCOUNT_ID"),
  DB: Database,
  DIGITAL_BUCKET: DigitalBucket,
  DIGITAL_BUCKET_NAME: DigitalBucket.pipe(
    Effect.map((bucket) => bucket.bucketName)
  ),
  MEDIA_BUCKET: MediaBucket,
  // Media is served through the Worker (/media proxy), so it shares the Worker URL.
  MEDIA_PUBLIC_BASE_URL: Cloudflare.Worker.URL,
  MEDIA_PUBLIC_PROXY: "true",
  R2_ACCESS_KEY_ID: Config.Redacted("R2_ACCESS_KEY_ID"),
  R2_SECRET_ACCESS_KEY: Config.Redacted("R2_SECRET_ACCESS_KEY"),
  STRIPE_SECRET_KEY: Config.Redacted("STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: Config.Redacted("STRIPE_WEBHOOK_SECRET"),
  VITE_NEWSLETTER_ENABLED: process.env.VITE_NEWSLETTER_ENABLED ?? "false",
};

function webEnvFor(stage: string) {
  const isProduction = stage === "production";
  const isE2eDev =
    Boolean(process.env.ALCHEMY_DEV) &&
    process.env.APP_ENV === "e2e" &&
    !isProduction;
  const env = {
    ...baseWebEnv,
    // Local R2 has no S3 endpoint, so `alchemy dev` uploads Digital Files through the Worker.
    DIGITAL_UPLOAD_TRANSPORT:
      process.env.ALCHEMY_DEV && !isProduction ? "worker" : "presigned",
  };
  if (isE2eDev) {
    return {
      ...env,
      APP_ENV: "e2e",
      E2E_SEED_TOKEN: process.env.E2E_SEED_TOKEN ?? "",
    };
  }
  // Preview seeding exists only on `pr-<number>` stages deployed with APP_ENV=preview, never in production.
  if (
    isPreviewStage(stage) &&
    process.env.APP_ENV === "preview" &&
    !process.env.ALCHEMY_DEV
  ) {
    return {
      ...env,
      APP_ENV: "preview",
      PREVIEW_SEED_TOKEN: Redacted.make(process.env.PREVIEW_SEED_TOKEN ?? ""),
    };
  }
  return env;
}

export const Web = Cloudflare.Website.Vite(
  "Web",
  Stage.pipe(
    Effect.map((stage) => ({
      // Matches the integration tests in apps/web/vitest.config.ts.
      compatibility: { date: "2026-08-15" },
      // WEB_PORT lets a second local instance run when :3001 is taken.
      dev: { port: Number(process.env.WEB_PORT ?? 3001), strictPort: true },
      env: webEnvFor(stage),
      rootDir: "../../apps/web",
    }))
  )
);

function previewCommentTarget() {
  const [owner, repository] = (process.env.GITHUB_REPOSITORY ?? "").split("/");
  const issueNumber = Number(process.env.PULL_REQUEST);

  if (!owner || !repository || !Number.isInteger(issueNumber)) {
    throw new Error(
      "A pull request preview needs GITHUB_REPOSITORY=owner/name and a numeric PULL_REQUEST."
    );
  }

  return { issueNumber, owner, repository };
}

const pullRequest = process.env.PULL_REQUEST;

export default Alchemy.Stack(
  "patche",
  {
    providers: Layer.mergeAll(Cloudflare.providers(), GitHub.providers()),
    // Local dev and E2E keep state on disk so they run without Cloudflare credentials.
    state: process.env.ALCHEMY_DEV ? Alchemy.localState() : Cloudflare.state(),
  },
  Effect.gen(function* stack() {
    const web = yield* Web;

    if (pullRequest) {
      const { issueNumber, owner, repository } = previewCommentTarget();
      const sha = process.env.GITHUB_SHA?.slice(0, 7) ?? "unknown";

      yield* GitHub.Comment("preview-comment", {
        // Closing the PR destroys the stage and removes this comment with it.
        allowDelete: true,
        body: Output.interpolate`
          ## Preview

          **URL:** ${web.url}

          Commit \`${sha}\`

          _Este comentario se actualiza con cada push._
        `,
        issueNumber,
        owner,
        repository,
      });
    }

    return { url: web.url };
  })
);
