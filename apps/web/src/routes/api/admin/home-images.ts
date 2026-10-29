import { createDb } from "@patche/db";
import { storeSetting } from "@patche/db/schema/settings";
import {
  homeImageObjectKey,
  homeImageSlots,
  mediaPublicUrl,
} from "@patche/storage";
import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import { homeImageSettingKey } from "@/functions/home-images";
import { getRequestSession, isAdminUser } from "@/lib/session";
import {
  deleteStorageObjectWithRetry,
  getMediaBucket,
  getMediaPublicBaseUrl,
  validateMediaFile,
} from "@/lib/storage.server";

export const Route = createFileRoute("/api/admin/home-images")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await getRequestSession(request);
        if (!(session && isAdminUser(session.user))) {
          return new Response("Forbidden", { status: 403 });
        }

        const form = await request.formData();
        const slotValue = form.get("slot");
        const slot = homeImageSlots.find(
          (candidate) => candidate === slotValue
        );
        const file = form.get("file");
        if (!(slot && file instanceof File)) {
          return new Response("Imagen inválida", { status: 400 });
        }
        const invalidFile = validateMediaFile(file);
        if (invalidFile) {
          return invalidFile;
        }

        const db = createDb();
        const settingKey = homeImageSettingKey(slot);
        const previous = await db
          .select({ value: storeSetting.value })
          .from(storeSetting)
          .where(eq(storeSetting.key, settingKey))
          .get();
        const key = homeImageObjectKey(slot, nanoid());
        const mediaBucket = getMediaBucket();
        await mediaBucket.put(key, file, {
          httpMetadata: { contentType: file.type },
        });

        try {
          await db
            .insert(storeSetting)
            .values({ key: settingKey, value: key })
            .onConflictDoUpdate({
              set: { value: key },
              target: storeSetting.key,
            });
        } catch {
          await deleteStorageObjectWithRetry(mediaBucket, key);
          return new Response("No se pudo guardar la imagen", { status: 500 });
        }

        if (previous?.value) {
          try {
            await deleteStorageObjectWithRetry(mediaBucket, previous.value);
          } catch {
            // The new image is live; a leftover object only costs storage.
          }
        }

        return Response.json({
          slot,
          url: mediaPublicUrl(getMediaPublicBaseUrl(), key),
        });
      },
    },
  },
});
