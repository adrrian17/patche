import { timingSafeEqual } from "node:crypto";

import { z } from "zod";

export const previewSeedTokenHeader = "x-preview-seed-token";
export const previewSeedPageLimit = 2;
const minTokenLength = 16;
const encoder = new TextEncoder();

function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  if (leftBytes.byteLength !== rightBytes.byteLength) {
    return false;
  }
  return timingSafeEqual(leftBytes, rightBytes);
}

export function isAuthorizedPreviewSeedRequest({
  appEnv,
  expectedToken,
  providedToken,
}: {
  appEnv: string | undefined;
  expectedToken: string | undefined;
  providedToken: string | null | undefined;
}): boolean {
  if (appEnv !== "preview") {
    return false;
  }
  if (!expectedToken || expectedToken.length < minTokenLength) {
    return false;
  }
  if (!providedToken) {
    return false;
  }
  return constantTimeEqual(expectedToken, providedToken);
}

export const previewSeedRequestSchema = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(previewSeedPageLimit)
    .default(previewSeedPageLimit),
  offset: z.number().int().min(0).default(0),
});

export type PreviewSeedRequest = z.infer<typeof previewSeedRequestSchema>;

export interface PreviewSeedSummary {
  categories: { created: number; total: number };
  homeImages: { created: number; skipped: number };
  media: { created: number; skipped: number };
  nextOffset: number | null;
  products: { created: number; existing: number; processed: number };
  stockMovements: { created: number };
  variants: { created: number };
}
