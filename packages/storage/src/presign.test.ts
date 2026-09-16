import { describe, expect, test } from "bun:test";

import { DIGITAL_UPLOAD_EXPIRES_SECONDS } from "./limits";
import { createPresignedUrl, r2ObjectUrl } from "./presign";

const config = {
  accessKeyId: "AKIA_TEST",
  accountId: "account_test",
  bucket: "patche-dev-digital",
  secretAccessKey: "secret_test",
};

describe("createPresignedUrl", () => {
  test("signs a PUT URL with the content type and expiry", async () => {
    const url = new URL(
      await createPresignedUrl(config, {
        contentType: "application/pdf",
        expiresSeconds: DIGITAL_UPLOAD_EXPIRES_SECONDS,
        key: "uploads/intent_1",
        method: "PUT",
      })
    );

    expect(url.origin).toBe("https://account_test.r2.cloudflarestorage.com");
    expect(url.pathname).toBe("/patche-dev-digital/uploads/intent_1");
    expect(url.searchParams.get("X-Amz-Expires")).toBe("3600");
    expect(url.searchParams.get("X-Amz-SignedHeaders")).toContain(
      "content-type"
    );
  });

  test("encodes each object-key segment without collapsing slashes", () => {
    expect(r2ObjectUrl("account", "bucket", "uploads/file name.pdf")).toBe(
      "https://account.r2.cloudflarestorage.com/bucket/uploads/file%20name.pdf"
    );
  });
});
