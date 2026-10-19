import { createDb } from "@patche/db";
import { digitalUploadIntent } from "@patche/db/schema/storage";
import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";

import { decideLocalDigitalUpload } from "@/lib/local-digital-upload";
import { getRequestSession, isAdminUser } from "@/lib/session";
import {
  getDigitalBucket,
  isLocalDigitalUploadEnabled,
} from "@/lib/storage.server";

// Stands in for the presigned R2 PUT under `alchemy dev`, whose local bucket has no S3 endpoint.
// Like R2, it only stores the object; confirmDigitalUpload still owns every Upload Intent transition.
export const Route = createFileRoute("/api/admin/digital-uploads/$intentId")({
  server: {
    handlers: {
      PUT: async ({ params, request }) => {
        if (!isLocalDigitalUploadEnabled()) {
          return new Response(null, { status: 404 });
        }
        const session = await getRequestSession(request);
        if (!(session && isAdminUser(session.user))) {
          return new Response("Forbidden", { status: 403 });
        }

        const intent = await createDb()
          .select({
            contentType: digitalUploadIntent.contentType,
            createdBy: digitalUploadIntent.createdBy,
            expectedSize: digitalUploadIntent.expectedSize,
            expiresAt: digitalUploadIntent.expiresAt,
            status: digitalUploadIntent.status,
            temporaryKey: digitalUploadIntent.temporaryKey,
          })
          .from(digitalUploadIntent)
          .where(eq(digitalUploadIntent.id, params.intentId))
          .get();
        const contentLength = request.headers.get("content-length");
        const decision = decideLocalDigitalUpload({
          contentLength: contentLength ? Number(contentLength) : null,
          contentType: request.headers.get("content-type"),
          intent: intent ?? null,
          now: new Date(),
          userId: session.user.id,
        });
        if (!decision.ok) {
          return new Response(decision.message, { status: decision.status });
        }

        // Content-Length is only a claim, so check the bytes that actually arrived.
        const body = await request.arrayBuffer();
        if (body.byteLength > decision.maxBytes) {
          return new Response("Archivo demasiado grande", { status: 413 });
        }
        await getDigitalBucket().put(decision.key, body, {
          httpMetadata: { contentType: decision.contentType },
        });
        return new Response(null, { status: 200 });
      },
    },
  },
});
