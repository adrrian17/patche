import { createDb } from "@patche/db";
import { digitalUploadIntent } from "@patche/db/schema/storage";
import { env } from "@patche/env/server";
import {
  createPresignedUrl,
  DIGITAL_UPLOAD_EXPIRES_SECONDS,
} from "@patche/storage";
import { and, eq, isNotNull } from "drizzle-orm";

const storageDeleteAttempts = 3;
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
