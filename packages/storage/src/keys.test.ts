import { describe, expect, test } from "bun:test";

import {
  digitalObjectKey,
  digitalUploadTemporaryKey,
  isDigitalObjectKey,
  mediaObjectKey,
  mediaPublicUrl,
} from "./keys";

describe("R2 object keys", () => {
  test("keeps media, confirmed files, and temporary uploads separate", () => {
    expect(mediaObjectKey("prod_1", "obj_1")).toBe("products/prod_1/obj_1");
    expect(digitalObjectKey("var_1", "obj_1")).toBe("variants/var_1/obj_1");
    expect(digitalUploadTemporaryKey("intent_1")).toBe("uploads/intent_1");
    expect(
      mediaPublicUrl("https://media.patche.mx/", "products/prod_1/obj_1")
    ).toBe("https://media.patche.mx/products/prod_1/obj_1");
    expect(isDigitalObjectKey("var_1", "variants/var_1/obj_1")).toBe(true);
    expect(isDigitalObjectKey("var_1", "variants/var_1/../secret")).toBe(false);
    expect(isDigitalObjectKey("var_1", "products/prod_1/obj_1")).toBe(false);
  });
});
