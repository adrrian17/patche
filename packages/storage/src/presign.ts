import { AwsClient } from "aws4fetch";

export interface PresignConfig {
  accessKeyId: string;
  accountId: string;
  bucket: string;
  secretAccessKey: string;
}

export interface PresignInput {
  contentType?: string;
  expiresSeconds: number;
  key: string;
  method: "GET" | "PUT";
}

export function r2ObjectUrl(
  accountId: string,
  bucket: string,
  key: string
): string {
  const encodedKey = key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${encodedKey}`;
}

export async function createPresignedUrl(
  config: PresignConfig,
  input: PresignInput
): Promise<string> {
  const client = new AwsClient({
    accessKeyId: config.accessKeyId,
    region: "auto",
    secretAccessKey: config.secretAccessKey,
    service: "s3",
  });
  const url = new URL(r2ObjectUrl(config.accountId, config.bucket, input.key));
  url.searchParams.set("X-Amz-Expires", String(input.expiresSeconds));

  const headers = new Headers();
  if (input.contentType) {
    headers.set("Content-Type", input.contentType);
  }

  const signed = await client.sign(url, {
    aws: { allHeaders: true, signQuery: true },
    headers,
    method: input.method,
  });
  return signed.url;
}
