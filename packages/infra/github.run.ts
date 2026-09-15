import { Stack } from "alchemy";
import { adopt } from "alchemy/AdoptPolicy";
import {
  ApiToken,
  CloudflareEnvironment,
  providers as cloudflareProviders,
  state as cloudflareState,
} from "alchemy/Cloudflare";
import {
  Environment,
  providers as githubProviders,
  Secret,
} from "alchemy/GitHub";
import { all, gen } from "effect/Effect";
import { mergeAll } from "effect/Layer";
import { make as redacted } from "effect/Redacted";

const repository = {
  owner: "adrrian17",
  repository: "patche",
} as const;

export default Stack(
  "patche-github",
  {
    providers: mergeAll(cloudflareProviders(), githubProviders()),
    state: cloudflareState(),
  },
  gen(function* stack() {
    const { accountId } = yield* yield* CloudflareEnvironment;

    const preview = yield* Environment("preview", {
      ...repository,
      name: "preview",
    }).pipe(adopt(true));

    const production = yield* Environment("production", {
      ...repository,
      deploymentBranchPolicy: { customBranchPolicies: ["main"] },
      name: "production",
    }).pipe(adopt(true));

    const ciToken = yield* ApiToken.AccountApiToken("ci-token", {
      accountId,
      name: "patche-github-actions",
      policies: [
        {
          effect: "allow",
          permissionGroups: [
            "Workers Scripts Write",
            "Workers R2 Storage Write",
            "D1 Write",
            "Account Settings Write",
            "Secrets Store Write",
          ],
          resources: {
            [`com.cloudflare.api.account.${accountId}`]: "*",
          },
        },
        {
          effect: "allow",
          permissionGroups: ["Zone Read"],
          resources: {
            "com.cloudflare.api.account.zone.*": "*",
          },
        },
      ],
    });

    yield* all(
      [
        { environment: preview, id: "preview" },
        { environment: production, id: "production" },
      ].flatMap(({ environment, id }) => [
        Secret(`${id}-cloudflare-api-token`, {
          ...repository,
          environment,
          name: "CLOUDFLARE_API_TOKEN",
          value: ciToken.value,
        }),
        Secret(`${id}-cloudflare-account-id`, {
          ...repository,
          environment,
          name: "CLOUDFLARE_ACCOUNT_ID",
          value: redacted(accountId),
        }),
      ])
    );
  })
);
