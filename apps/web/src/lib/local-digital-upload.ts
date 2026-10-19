import type { digitalUploadIntent } from "@patche/db/schema/storage";

type UploadIntent = Pick<
  typeof digitalUploadIntent.$inferSelect,
  | "contentType"
  | "createdBy"
  | "expectedSize"
  | "expiresAt"
  | "status"
  | "temporaryKey"
>;

export type LocalDigitalUploadDecision =
  | { ok: true; key: string; contentType: string; maxBytes: number }
  | { ok: false; status: number; message: string };

// Mirrors what a presigned R2 PUT allows: only the signed key, content type, and window.
export function decideLocalDigitalUpload({
  contentLength,
  contentType,
  intent,
  now,
  userId,
}: {
  intent: UploadIntent | null;
  userId: string;
  now: Date;
  contentType: string | null;
  contentLength: number | null;
}): LocalDigitalUploadDecision {
  // Another Admin's intent looks missing, so intent IDs cannot be probed.
  if (!intent || intent.createdBy !== userId) {
    return { message: "Upload Intent no encontrado", ok: false, status: 404 };
  }
  if (intent.status !== "pending" || intent.expiresAt <= now) {
    return { message: "Upload Intent expirado", ok: false, status: 409 };
  }
  if (contentType !== intent.contentType) {
    return { message: "Content-Type no coincide", ok: false, status: 415 };
  }
  if (!contentLength) {
    return { message: "Archivo vacío", ok: false, status: 400 };
  }
  if (contentLength > intent.expectedSize) {
    return { message: "Archivo demasiado grande", ok: false, status: 413 };
  }
  return {
    contentType: intent.contentType,
    key: intent.temporaryKey,
    maxBytes: intent.expectedSize,
    ok: true,
  };
}
