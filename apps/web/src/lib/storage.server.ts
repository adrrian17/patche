import { env } from "@patche/env/server";
import {
  createPresignedUrl,
  DIGITAL_DOWNLOAD_EXPIRES_SECONDS,
  DIGITAL_UPLOAD_EXPIRES_SECONDS,
} from "@patche/storage";

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

export function getMediaPublicBaseUrl(): string {
  return env.MEDIA_PUBLIC_BASE_URL;
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
