import { createDb } from "@patche/db";
import { variant } from "@patche/db/schema/catalog";
import { DIGITAL_FILE_MAX_BYTES, digitalObjectKey } from "@patche/storage";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";

import { createDigitalPutUrl } from "@/lib/storage.server";
import { adminMiddleware } from "@/middleware/admin";

export const createDigitalUploadUrl = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(
    z.object({
      contentType: z.string().trim().min(1).max(200),
      fileName: z.string().trim().min(1).max(255),
      size: z.number().int().positive().max(DIGITAL_FILE_MAX_BYTES),
      variantId: z.string().min(1).max(32),
    })
  )
  .handler(async ({ data }) => {
    const db = createDb();
    const matchingVariant = await db
      .select({
        archivedAt: variant.archivedAt,
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
    if (matchingVariant.archivedAt) {
      throw new Error("Variant archivada");
    }

    const key = digitalObjectKey(data.variantId, nanoid());
    const url = await createDigitalPutUrl(key, data.contentType);
    return {
      contentType: data.contentType,
      fileName: data.fileName,
      key,
      size: data.size,
      url,
    };
  });
