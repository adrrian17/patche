import { createDb } from "@patche/db";
import { product, productMedia } from "@patche/db/schema/catalog";
import {
  MEDIA_FILE_MAX_BYTES,
  mediaObjectKey,
  mediaPublicUrl,
} from "@patche/storage";
import { createFileRoute } from "@tanstack/react-router";
import { eq, max } from "drizzle-orm";
import { nanoid } from "nanoid";

import { getRequestSession, isAdminUser } from "@/lib/session";
import {
  deleteStorageObjectWithRetry,
  getMediaBucket,
  getMediaPublicBaseUrl,
} from "@/lib/storage.server";

const allowedMediaTypes = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const Route = createFileRoute("/api/admin/media")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await getRequestSession(request);
        if (!(session && isAdminUser(session.user))) {
          return new Response("Forbidden", { status: 403 });
        }

        const form = await request.formData();
        const productId = String(form.get("productId") ?? "").trim();
        const alt = String(form.get("alt") ?? "").trim();
        const file = form.get("file");
        if (!(productId && file instanceof File)) {
          return new Response("Media inválida", { status: 400 });
        }
        if (!allowedMediaTypes.has(file.type)) {
          return new Response("Tipo de Media no permitido", { status: 400 });
        }
        if (file.size === 0 || file.size > MEDIA_FILE_MAX_BYTES) {
          return new Response("Tamaño de Media no permitido", { status: 400 });
        }

        const db = createDb();
        const matchingProduct = await db
          .select({ id: product.id })
          .from(product)
          .where(eq(product.id, productId))
          .get();
        if (!matchingProduct) {
          return new Response("Product no encontrado", { status: 404 });
        }

        const currentSort = await db
          .select({ sort: max(productMedia.sort) })
          .from(productMedia)
          .where(eq(productMedia.productId, productId))
          .get();
        const key = mediaObjectKey(productId, nanoid());
        const mediaBucket = getMediaBucket();
        await mediaBucket.put(key, file, {
          httpMetadata: { contentType: file.type },
        });

        let media: typeof productMedia.$inferSelect | undefined;
        try {
          media = await db
            .insert(productMedia)
            .values({
              alt,
              productId,
              r2Key: key,
              sort: (currentSort?.sort ?? -1) + 1,
            })
            .returning()
            .get();
        } catch {
          await deleteStorageObjectWithRetry(mediaBucket, key);
          return new Response("No se pudo guardar la Media", { status: 500 });
        }
        if (!media) {
          await deleteStorageObjectWithRetry(mediaBucket, key);
          return new Response("No se pudo guardar la Media", { status: 500 });
        }

        return Response.json({
          ...media,
          url: mediaPublicUrl(getMediaPublicBaseUrl(), media.r2Key),
        });
      },
    },
  },
});
