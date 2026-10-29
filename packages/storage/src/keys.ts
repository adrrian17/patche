export function mediaObjectKey(productId: string, objectId: string): string {
  return `products/${productId}/${objectId}`;
}

export const homeImageSlots = ["hero", "washi", "pens"] as const;
export type HomeImageSlot = (typeof homeImageSlots)[number];

export function homeImageObjectKey(
  slot: HomeImageSlot,
  objectId: string
): string {
  return `home/${slot}/${objectId}`;
}

export function digitalObjectKey(variantId: string, objectId: string): string {
  return `variants/${variantId}/${objectId}`;
}

export function digitalUploadTemporaryKey(intentId: string): string {
  return `uploads/${intentId}`;
}

export function mediaPublicUrl(baseUrl: string, key: string): string {
  return `${baseUrl.replace(/\/$/u, "")}/${key}`;
}
