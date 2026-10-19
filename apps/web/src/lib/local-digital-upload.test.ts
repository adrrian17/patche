import { describe, expect, test } from "bun:test";

import { decideLocalDigitalUpload } from "./local-digital-upload";

const now = new Date("2026-10-19T12:00:00.000Z");
const intent = {
  contentType: "application/pdf",
  createdBy: "admin_1",
  expectedSize: 2048,
  expiresAt: new Date("2026-10-19T12:15:00.000Z"),
  status: "pending" as const,
  temporaryKey: "uploads/intent_1",
};
const request = {
  contentLength: 2048,
  contentType: "application/pdf",
  intent,
  now,
  userId: "admin_1",
};

describe("decideLocalDigitalUpload", () => {
  test("accepts the intent owner's matching upload and keys it from the intent", () => {
    expect(decideLocalDigitalUpload(request)).toEqual({
      contentType: "application/pdf",
      key: "uploads/intent_1",
      maxBytes: 2048,
      ok: true,
    });
  });

  test("hides intents that are missing or belong to another Admin", () => {
    expect(
      decideLocalDigitalUpload({ ...request, intent: null })
    ).toMatchObject({ ok: false, status: 404 });
    expect(
      decideLocalDigitalUpload({ ...request, userId: "admin_2" })
    ).toMatchObject({ ok: false, status: 404 });
  });

  test("refuses intents that are expired or past pending", () => {
    expect(
      decideLocalDigitalUpload({ ...request, now: intent.expiresAt })
    ).toMatchObject({ ok: false, status: 409 });
    expect(
      decideLocalDigitalUpload({
        ...request,
        intent: { ...intent, status: "confirmed" },
      })
    ).toMatchObject({ ok: false, status: 409 });
  });

  test("refuses a content type other than the signed one", () => {
    expect(
      decideLocalDigitalUpload({ ...request, contentType: "text/html" })
    ).toMatchObject({ ok: false, status: 415 });
    expect(
      decideLocalDigitalUpload({ ...request, contentType: null })
    ).toMatchObject({ ok: false, status: 415 });
  });

  test("refuses empty, unknown, or oversized bodies", () => {
    expect(
      decideLocalDigitalUpload({ ...request, contentLength: null })
    ).toMatchObject({ ok: false, status: 400 });
    expect(
      decideLocalDigitalUpload({ ...request, contentLength: 0 })
    ).toMatchObject({ ok: false, status: 400 });
    expect(
      decideLocalDigitalUpload({ ...request, contentLength: 2049 })
    ).toMatchObject({ ok: false, status: 413 });
  });
});
