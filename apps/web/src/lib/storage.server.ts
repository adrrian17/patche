import { env } from "@patche/env/server";
import {
  createPresignedUrl,
  DIGITAL_DOWNLOAD_EXPIRES_SECONDS,
  DIGITAL_UPLOAD_EXPIRES_SECONDS,
} from "@patche/storage";

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
    }
  }
}

export function getMediaPublicBaseUrl(): string {
  const baseUrl = env.MEDIA_PUBLIC_BASE_URL.replace(/\/$/u, "");
  return env.MEDIA_PUBLIC_PROXY ? `${baseUrl}${localMediaProxyPath}` : baseUrl;
}

export function isLocalMediaProxyEnabled(): boolean {
  return env.MEDIA_PUBLIC_PROXY;
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

export async function createDigitalGetUrl(key: string): Promise<string> {
  return await createPresignedUrl(getPresignConfig(), {
    expiresSeconds: DIGITAL_DOWNLOAD_EXPIRES_SECONDS,
    key,
    method: "GET",
  });
}
