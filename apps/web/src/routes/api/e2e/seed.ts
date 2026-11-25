import { env } from "@patche/env/server";
import { createFileRoute } from "@tanstack/react-router";

import {
  e2eSeedActionSchema,
  e2eSeedTokenHeader,
  isAuthorizedE2eSeedRequest,
} from "@/lib/e2e-seed";
import { runE2eSeedAction } from "@/lib/e2e-seed.server";

export const Route = createFileRoute("/api/e2e/seed")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (
          !isAuthorizedE2eSeedRequest({
            appEnv: env.APP_ENV,
            expectedToken: env.E2E_SEED_TOKEN,
            providedToken: request.headers.get(e2eSeedTokenHeader),
          })
        ) {
          return new Response(null, { status: 404 });
        }

        let rawBody: unknown;
        try {
          rawBody = await request.json();
        } catch {
          return new Response("JSON inválido", { status: 400 });
        }

        const parsed = e2eSeedActionSchema.safeParse(rawBody);
        if (!parsed.success) {
          return Response.json(
            { error: "Payload E2E inválido", issues: parsed.error.issues },
            { status: 400 }
          );
        }

        const result = await runE2eSeedAction(parsed.data);
        if (!result.ok) {
          return new Response(result.message, { status: result.status });
        }
        return Response.json(result.data);
      },
    },
  },
});
