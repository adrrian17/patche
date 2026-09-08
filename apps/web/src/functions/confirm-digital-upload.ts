import { createDb } from "@patche/db";
import { variant } from "@patche/db/schema/catalog";
import { DIGITAL_FILE_MAX_BYTES, isDigitalObjectKey } from "@patche/storage";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";

import {
  deleteStorageObjectWithRetry,
  getDigitalBucket,
} from "@/lib/storage.server";
import { adminMiddleware } from "@/middleware/admin";

export const confirmDigitalUpload = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(
    z.object({
      contentType: z.string().trim().min(1).max(200),
      fileName: z.string().trim().min(1).max(255),
      key: z.string().min(1).max(512),
      size: z.number().int().positive().max(DIGITAL_FILE_MAX_BYTES),
      variantId: z.string().min(1).max(32),
    })
  )
  .handler(async ({ data }) => {
    if (!isDigitalObjectKey(data.variantId, data.key)) {
      throw new Error("Digital File con clave inválida");
    }

    const db = createDb();
    const matchingVariant = await db
      .select({
        digitalFileKey: variant.digitalFileKey,
        kind: variant.kind,
      })
      .from(variant)
      .where(eq(variant.id, data.variantId))
      .get();
    if (!matchingVariant) {
      throw new Error("Variant no encontrada");
    }
    if (matchingVariant.kind !== "digital") {
      throw new Error("Solo una Variant digital admite Digital File");
    }

    const object = await getDigitalBucket().head(data.key);
    if (!object) {
      throw new Error("Digital File no encontrado en R2");
    }
    if (object.size !== data.size) {
      throw new Error("El tamaño del Digital File no coincide");
    }
    if (
      object.httpMetadata?.contentType &&
      object.httpMetadata.contentType !== data.contentType
    ) {
      throw new Error("El tipo del Digital File no coincide");
    }

    const updated = await db
      .update(variant)
      .set({
        digitalFileKey: data.key,
        digitalFileName: data.fileName,
        digitalFileSize: object.size,
      })
      .where(eq(variant.id, data.variantId))
      .returning({ id: variant.id })
      .get();
    if (!updated) {
      throw new Error("No se pudo confirmar el Digital File");
    }

    if (
      matchingVariant.digitalFileKey &&
      matchingVariant.digitalFileKey !== data.key
    ) {
      await deleteStorageObjectWithRetry(
        getDigitalBucket(),
        matchingVariant.digitalFileKey
      );
    }

    return {
      digitalFileKey: data.key,
      digitalFileName: data.fileName,
      digitalFileSize: object.size,
    };
  });
