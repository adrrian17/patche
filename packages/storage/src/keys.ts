export function mediaObjectKey(productId: string, objectId: string): string {
  return `products/${productId}/${objectId}`;
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
