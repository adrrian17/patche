import { describe, expect, test } from "bun:test";

import {
  digitalObjectKey,
  isDigitalObjectKey,
  mediaObjectKey,
  mediaPublicUrl,
} from "./keys";
import {
  createPresignedUrl,
  DIGITAL_DOWNLOAD_EXPIRES_SECONDS,
  DIGITAL_UPLOAD_EXPIRES_SECONDS,
  r2ObjectUrl,
} from "./presign";

const config = {
  accessKeyId: "AKIA_TEST",
  accountId: "account_test",
  bucket: "patche-dev-digital",
  secretAccessKey: "secret_test",
};

describe("R2 object keys", () => {
  test("keeps Media and Digital File keys in separate prefixes", () => {
    expect(mediaObjectKey("prod_1", "obj_1")).toBe("products/prod_1/obj_1");
    expect(digitalObjectKey("var_1", "obj_1")).toBe("variants/var_1/obj_1");
    expect(
      mediaPublicUrl("https://media.patche.mx/", "products/prod_1/obj_1")
    ).toBe("https://media.patche.mx/products/prod_1/obj_1");
    expect(isDigitalObjectKey("var_1", "variants/var_1/obj_1")).toBe(true);
    expect(isDigitalObjectKey("var_1", "variants/var_1/../secret")).toBe(false);
    expect(isDigitalObjectKey("var_1", "products/prod_1/obj_1")).toBe(false);
  });
});

describe("createPresignedUrl", () => {
  test("signs a PUT URL with the same Content-Type and a 1 hour expiry", async () => {
    const url = new URL(
      await createPresignedUrl(config, {
        contentType: "application/pdf",
        expiresSeconds: DIGITAL_UPLOAD_EXPIRES_SECONDS,
        key: "variants/var_1/file.pdf",
        method: "PUT",
      })
    );

    expect(url.origin).toBe("https://account_test.r2.cloudflarestorage.com");
    expect(url.pathname).toBe("/patche-dev-digital/variants/var_1/file.pdf");
    expect(url.searchParams.get("X-Amz-Expires")).toBe("3600");
    expect(url.searchParams.get("X-Amz-SignedHeaders")).toContain(
      "content-type"
    );
    expect(url.searchParams.get("X-Amz-Algorithm")).toBe("AWS4-HMAC-SHA256");
  });

  test("signs a GET URL that expires in 15 minutes without a Content-Type", async () => {
    const url = new URL(
      await createPresignedUrl(config, {
        expiresSeconds: DIGITAL_DOWNLOAD_EXPIRES_SECONDS,
        key: "variants/var_1/file.pdf",
        method: "GET",
      })
    );

    expect(url.searchParams.get("X-Amz-Expires")).toBe("900");
    expect(url.searchParams.get("X-Amz-SignedHeaders")).not.toContain(
      "content-type"
    );
  });

  test("encodes each key segment without collapsing slashes", () => {
    expect(r2ObjectUrl("acct", "bucket", "variants/var 1/file.pdf")).toBe(
      "https://acct.r2.cloudflarestorage.com/bucket/variants/var%201/file.pdf"
    );
  });
});
