import { createDb } from "@patche/db";
import { productMedia } from "@patche/db/schema/catalog";
import { digitalUploadIntent } from "@patche/db/schema/storage";
import { env } from "@patche/env/server";
import {
  createPresignedUrl,
  DIGITAL_UPLOAD_EXPIRES_SECONDS,
  mediaObjectKey,
} from "@patche/storage";
import { and, eq, isNotNull } from "drizzle-orm";

const storageDeleteAttempts = 3;
// Older than any upload that could still be waiting for its D1 row.
const orphanMediaMinAgeMs = 60 * 60 * 1000;
const localMediaProxyPath = "/api/media";

function getPresignConfig() {
  return {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    accountId: env.CF_ACCOUNT_ID,
    bucket: env.DIGITAL_BUCKET_NAME,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  };
}

export function getMediaBucket(): R2Bucket {
  return env.MEDIA_BUCKET;
}

export function getDigitalBucket(): R2Bucket {
  return env.DIGITAL_BUCKET;
}

export async function deleteStorageObjectWithRetry(
  bucket: R2Bucket,
  key: string,
  attempts = storageDeleteAttempts
): Promise<void> {
  try {
    await bucket.delete(key);
  } catch {
    if (attempts > 1) {
      await deleteStorageObjectWithRetry(bucket, key, attempts - 1);
      return;
    }
    throw new Error(`No se pudo eliminar el objeto de Storage: ${key}`);
  }
}

export async function retryPendingStorageDeletions(): Promise<void> {
  const db = createDb();
  const pending = await db
    .select({
      id: digitalUploadIntent.id,
      key: digitalUploadIntent.replacedKey,
    })
    .from(digitalUploadIntent)
    .where(isNotNull(digitalUploadIntent.replacedKey))
    .limit(10);
  const deletions = await Promise.allSettled(
    pending.map(async (item) => {
      if (!item.key) {
        return;
      }
      await deleteStorageObjectWithRetry(getDigitalBucket(), item.key);
      await db
        .update(digitalUploadIntent)
        .set({ replacedKey: null })
        .where(
          and(
            eq(digitalUploadIntent.id, item.id),
            eq(digitalUploadIntent.replacedKey, item.key)
          )
        );
    })
  );
  const failures = deletions.filter(
    (result) => result.status === "rejected"
  ).length;
  if (failures > 0) {
    throw new Error(
      `No se pudieron completar ${failures} eliminaciones de Storage`
    );
  }
}

export function getMediaPublicBaseUrl(): string {
  const baseUrl = env.MEDIA_PUBLIC_BASE_URL.replace(/\/$/u, "");
  return env.MEDIA_PUBLIC_PROXY === "true"
    ? `${baseUrl}${localMediaProxyPath}`
    : baseUrl;
}

export function isLocalMediaProxyEnabled(): boolean {
  return env.MEDIA_PUBLIC_PROXY === "true";
}

export async function createDigitalPutUrl(
  key: string,
  contentType: string
): Promise<string> {
  return await createPresignedUrl(getPresignConfig(), {
    contentType,
    expiresSeconds: DIGITAL_UPLOAD_EXPIRES_SECONDS,
    key,
    method: "PUT",
  });
}

// Removes R2 objects under a Product's media prefix that no Media row points to,
// such as an upload whose D1 insert and rollback delete both failed.
export async function deleteOrphanMedia(
  productId: string,
  now = Date.now()
): Promise<void> {
  const bucket = getMediaBucket();
  const [listed, rows] = await Promise.all([
    bucket.list({ prefix: mediaObjectKey(productId, "") }),
    createDb()
      .select({ r2Key: productMedia.r2Key })
      .from(productMedia)
      .where(eq(productMedia.productId, productId)),
  ]);
  const knownKeys = new Set(rows.map(({ r2Key }) => r2Key));
  const orphanKeys: string[] = [];
  for (const { key, uploaded } of listed.objects) {
    if (!knownKeys.has(key) && now - uploaded.getTime() > orphanMediaMinAgeMs) {
      orphanKeys.push(key);
    }
  }
  // ponytail: one list page (1000 objects) per call; paginate if a Product ever holds more.
  if (orphanKeys.length) {
    await bucket.delete(orphanKeys);
  }
}
