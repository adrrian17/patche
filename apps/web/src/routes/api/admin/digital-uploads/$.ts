import { createDb } from "@patche/db";
import { digitalUploadIntent } from "@patche/db/schema/storage";
import { DIGITAL_FILE_MAX_BYTES } from "@patche/storage";
import { createFileRoute } from "@tanstack/react-router";
import { and, eq, gt } from "drizzle-orm";

import { getRequestSession, isAdminUser } from "@/lib/session";
import { getDigitalBucket } from "@/lib/storage.server";

const uploadRoutePrefix = "/api/admin/digital-uploads/";

export const Route = createFileRoute("/api/admin/digital-uploads/$")({
  server: {
    handlers: {
      PUT: async ({ request }) => {
        const session = await getRequestSession(request);
        if (!(session && isAdminUser(session.user))) {
          return new Response("Forbidden", { status: 403 });
        }

        const { pathname } = new URL(request.url);
        if (!pathname.startsWith(uploadRoutePrefix)) {
          return new Response(null, { status: 404 });
        }
        let intentId: string;
        try {
          intentId = decodeURIComponent(
            pathname.slice(uploadRoutePrefix.length)
          );
        } catch {
          return new Response("Upload Intent inválido", { status: 400 });
        }
        if (!intentId) {
          return new Response(null, { status: 404 });
        }

        const rawLength = request.headers.get("content-length");
        const contentLength = rawLength ? Number(rawLength) : Number.NaN;
        if (
          !Number.isInteger(contentLength) ||
          contentLength <= 0 ||
          contentLength > DIGITAL_FILE_MAX_BYTES
        ) {
          return new Response("Tamaño de Digital File no permitido", {
            status: 413,
          });
        }
        const contentType = request.headers.get("content-type");
        if (!contentType) {
          return new Response("Content-Type requerido", { status: 400 });
        }
        if (!request.body) {
          return new Response("Digital File vacío", { status: 400 });
        }

        const db = createDb();
        const intent = await db
          .select()
          .from(digitalUploadIntent)
          .where(
            and(
              eq(digitalUploadIntent.id, intentId),
              eq(digitalUploadIntent.createdBy, session.user.id),
              eq(digitalUploadIntent.status, "pending"),
              gt(digitalUploadIntent.expiresAt, new Date())
            )
          )
          .get();
        if (!intent) {
          return new Response("Upload Intent no disponible", { status: 404 });
        }
        if (
          intent.expectedSize !== contentLength ||
          intent.contentType !== contentType
        ) {
          return new Response("Digital File no coincide con la intención", {
            status: 400,
          });
        }

        const claimed = await db
          .update(digitalUploadIntent)
          .set({ status: "uploading" })
          .where(
            and(
              eq(digitalUploadIntent.id, intent.id),
              eq(digitalUploadIntent.status, "pending")
            )
          )
          .returning({ id: digitalUploadIntent.id })
          .get();
        if (!claimed) {
          return new Response("Upload Intent ya utilizado", { status: 409 });
        }

        try {
          await getDigitalBucket().put(intent.temporaryKey, request.body, {
            httpMetadata: { contentType },
          });
          await db
            .update(digitalUploadIntent)
            .set({ status: "uploaded", uploadedAt: new Date() })
            .where(
              and(
                eq(digitalUploadIntent.id, intent.id),
                eq(digitalUploadIntent.status, "uploading")
              )
            );
        } catch {
          await db
            .update(digitalUploadIntent)
            .set({ status: "pending" })
            .where(
              and(
                eq(digitalUploadIntent.id, intent.id),
                eq(digitalUploadIntent.status, "uploading")
              )
            );
          return new Response("No se pudo guardar el Digital File", {
            status: 500,
          });
        }

        return new Response(null, { status: 204 });
      },
    },
  },
});
