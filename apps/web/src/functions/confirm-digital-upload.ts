import { createDb } from "@patche/db";
import { variant } from "@patche/db/schema/catalog";
import { digitalUploadIntent } from "@patche/db/schema/storage";
import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import {
  deleteStorageObjectWithRetry,
  getDigitalBucket,
} from "@/lib/storage.server";
import { adminMiddleware } from "@/middleware/admin";

type Database = ReturnType<typeof createDb>;
type BatchQuery = Parameters<Database["batch"]>[0][number];

async function deleteReplacedObject(
  db: Database,
  intentId: string,
  replacedKey: string | null
): Promise<void> {
  if (!replacedKey) {
    return;
  }
  await deleteStorageObjectWithRetry(getDigitalBucket(), replacedKey);
  await db
    .update(digitalUploadIntent)
    .set({ replacedKey: null })
    .where(
      and(
        eq(digitalUploadIntent.id, intentId),
        eq(digitalUploadIntent.replacedKey, replacedKey)
      )
    );
}

export const confirmDigitalUpload = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(z.object({ intentId: z.string().min(1).max(32) }))
  .handler(async ({ context, data }) => {
    const db = createDb();
    const intent = await db
      .select()
      .from(digitalUploadIntent)
      .where(
        and(
          eq(digitalUploadIntent.id, data.intentId),
          eq(digitalUploadIntent.createdBy, context.session.user.id)
        )
      )
      .get();
    if (!intent) {
      throw new Error("Upload Intent no encontrado");
    }
    if (intent.status === "confirmed") {
      await deleteReplacedObject(db, intent.id, intent.replacedKey);
      return {
        digitalFileKey: intent.finalKey,
        digitalFileName: intent.fileName,
        digitalFileSize: intent.expectedSize,
      };
    }
    if (intent.status !== "uploaded") {
      throw new Error("Upload Intent no está listo para confirmar");
    }

    const claimed = await db
      .update(digitalUploadIntent)
      .set({ status: "confirming" })
      .where(
        and(
          eq(digitalUploadIntent.id, intent.id),
          eq(digitalUploadIntent.status, "uploaded")
        )
      )
      .returning({ id: digitalUploadIntent.id })
      .get();
    if (!claimed) {
      throw new Error("Upload Intent ya está siendo confirmado");
    }

    const bucket = getDigitalBucket();
    const temporaryObject = await bucket.get(intent.temporaryKey);
    const objectMatches =
      temporaryObject?.size === intent.expectedSize &&
      temporaryObject.httpMetadata?.contentType === intent.contentType;
    if (!objectMatches) {
      if (temporaryObject) {
        await deleteStorageObjectWithRetry(bucket, intent.temporaryKey);
      }
      await db
        .update(digitalUploadIntent)
        .set({ status: "expired" })
        .where(eq(digitalUploadIntent.id, intent.id));
      throw new Error("Digital File no coincide con la intención de carga");
    }

    const matchingVariant = await db
      .select({
        digitalFileKey: variant.digitalFileKey,
        kind: variant.kind,
      })
      .from(variant)
      .where(eq(variant.id, intent.variantId))
      .get();
    if (!matchingVariant || matchingVariant.kind !== "digital") {
      await db
        .update(digitalUploadIntent)
        .set({ status: "uploaded" })
        .where(eq(digitalUploadIntent.id, intent.id));
      throw new Error("Variant digital no disponible");
    }

    try {
      await bucket.put(intent.finalKey, temporaryObject.body, {
        httpMetadata: { contentType: intent.contentType },
      });
      const queries: BatchQuery[] = [
        db
          .update(variant)
          .set({
            digitalFileKey: intent.finalKey,
            digitalFileName: intent.fileName,
            digitalFileSize: intent.expectedSize,
          })
          .where(eq(variant.id, intent.variantId)),
        db
          .update(digitalUploadIntent)
          .set({
            confirmedAt: new Date(),
            replacedKey:
              matchingVariant.digitalFileKey === intent.finalKey
                ? null
                : matchingVariant.digitalFileKey,
            status: "confirmed",
          })
          .where(
            and(
              eq(digitalUploadIntent.id, intent.id),
              eq(digitalUploadIntent.status, "confirming")
            )
          ),
      ];
      // SAFETY: queries always contains the Variant and Intent updates above.
      await db.batch(queries as [BatchQuery, ...BatchQuery[]]);
    } catch (error) {
      await Promise.allSettled([
        deleteStorageObjectWithRetry(bucket, intent.finalKey),
        db
          .update(digitalUploadIntent)
          .set({ status: "uploaded" })
          .where(
            and(
              eq(digitalUploadIntent.id, intent.id),
              eq(digitalUploadIntent.status, "confirming")
            )
          ),
      ]);
      throw error;
    }

    try {
      await deleteStorageObjectWithRetry(bucket, intent.temporaryKey);
    } catch {
      // The R2 lifecycle rule removes abandoned objects under uploads/.
    }
    await deleteReplacedObject(
      db,
      intent.id,
      matchingVariant.digitalFileKey === intent.finalKey
        ? null
        : matchingVariant.digitalFileKey
    );

    return {
      digitalFileKey: intent.finalKey,
      digitalFileName: intent.fileName,
      digitalFileSize: intent.expectedSize,
    };
  });
