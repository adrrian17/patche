import { createDb } from "@patche/db";
import { variant } from "@patche/db/schema/catalog";
import { digitalUploadIntent } from "@patche/db/schema/storage";
import {
  DIGITAL_FILE_MAX_BYTES,
  DIGITAL_UPLOAD_EXPIRES_SECONDS,
  digitalObjectKey,
  digitalUploadTemporaryKey,
} from "@patche/storage";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";

import { retryPendingStorageDeletions } from "@/lib/storage.server";
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
  .handler(async ({ context, data }) => {
    try {
      await retryPendingStorageDeletions();
    } catch {
      // Cleanup is retryable and must not prevent a new upload intent.
    }
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

    const intentId = nanoid();
    const temporaryKey = digitalUploadTemporaryKey(intentId);
    const finalKey = digitalObjectKey(data.variantId, nanoid());
    await db.insert(digitalUploadIntent).values({
      contentType: data.contentType,
      createdBy: context.session.user.id,
      expectedSize: data.size,
      expiresAt: new Date(Date.now() + DIGITAL_UPLOAD_EXPIRES_SECONDS * 1000),
      fileName: data.fileName,
      finalKey,
      id: intentId,
      temporaryKey,
      variantId: data.variantId,
    });
    return {
      contentType: data.contentType,
      fileName: data.fileName,
      intentId,
      size: data.size,
      url: `/api/admin/digital-uploads/${encodeURIComponent(intentId)}`,
    };
  });
