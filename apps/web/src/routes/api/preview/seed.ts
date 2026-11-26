import { env } from "@patche/env/server";
import { createFileRoute } from "@tanstack/react-router";

import {
  isAuthorizedPreviewSeedRequest,
  previewSeedRequestSchema,
  previewSeedTokenHeader,
} from "@/lib/preview-seed";
import { seedPreviewCatalog } from "@/lib/preview-seed.server";

export const Route = createFileRoute("/api/preview/seed")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (
          !isAuthorizedPreviewSeedRequest({
            appEnv: env.APP_ENV,
            expectedToken: env.PREVIEW_SEED_TOKEN,
            providedToken: request.headers.get(previewSeedTokenHeader),
          })
        ) {
          return new Response(null, { status: 404 });
        }

        const rawText = await request.text();
        const text = rawText.trim();
        let parsed;
        try {
          // An empty body seeds from the start; the schema supplies offset 0.
          parsed = previewSeedRequestSchema.safeParse(
            text ? JSON.parse(text) : {}
          );
        } catch {
          return new Response("JSON inválido", { status: 400 });
        }

        if (!parsed.success) {
          return Response.json(
            {
              error: "Payload de preview inválido",
              issues: parsed.error.issues,
            },
            { status: 400 }
          );
        }

        return Response.json(await seedPreviewCatalog(parsed.data));
      },
    },
  },
});
