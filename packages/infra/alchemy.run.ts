import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as GitHub from "alchemy/GitHub";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

// Secrets come from Varlock (`varlock run -- ...`), which fills process.env from 1Password.

const isProductionStage = process.env.STAGE === "production";

const Database = Cloudflare.D1.Database("Database", {
  migrations: "../../packages/db/src/migrations",
  name: isProductionStage ? "patche" : undefined,
});

const MediaBucket = Cloudflare.R2.Bucket("MediaBucket", {
  name: isProductionStage ? "patche-media" : undefined,
});

const DigitalBucket = Cloudflare.R2.Bucket("DigitalBucket", {
  cors: [
    {
      allowedHeaders: ["content-type"],
      allowedMethods: ["PUT"],
      // ponytail: presigned URLs already authorize each PUT; pin the origin once there is a custom domain.
      allowedOrigins: ["*"],
    },
  ],
  lifecycleRules: [
    {
      deleteObjectsTransition: {
        condition: { maxAge: 86_400, type: "Age" },
      },
      id: "delete-abandoned-digital-uploads",
      prefix: "uploads/",
    },
  ],
  name: isProductionStage ? "patche-digital" : undefined,
});

const AuthEmail = Cloudflare.Email.SendEmail("AuthEmail", {
  allowedSenderAddresses: ["noreply@adrianayala.mx"],
});

export const Web = Cloudflare.Website.Vite("Web", {
  // Matches the integration tests in apps/web/vitest.config.ts.
  compatibility: { date: "2026-08-15" },
  dev: { port: 3001, strictPort: true },
  env: {
    AUTH_EMAIL: AuthEmail,
    BETTER_AUTH_SECRET: Config.Redacted("BETTER_AUTH_SECRET"),
    BETTER_AUTH_URL: Cloudflare.Worker.URL,
    // Only presigned R2 URLs need it; local dev serves R2 through the Worker.
    CF_ACCOUNT_ID: Config.String("CF_ACCOUNT_ID").pipe(Config.withDefault("")),
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
  },
  rootDir: "../../apps/web",
});

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
        body: [
          "## Preview",
          "",
          `**URL:** ${web.url}`,
          "",
          `Commit \`${sha}\``,
          "",
          "_Este comentario se actualiza con cada push._",
        ].join("\n"),
        issueNumber,
        owner,
        repository,
      });
    }

    return { url: web.url };
  })
);
