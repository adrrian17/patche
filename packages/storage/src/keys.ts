export function mediaObjectKey(productId: string, objectId: string): string {
  return `products/${productId}/${objectId}`;
}

export function digitalObjectKey(variantId: string, objectId: string): string {
  return `variants/${variantId}/${objectId}`;
}

export function isDigitalObjectKey(variantId: string, key: string): boolean {
  const prefix = `variants/${variantId}/`;
  const objectId = key.slice(prefix.length);
  return (
    key.startsWith(prefix) &&
    objectId.length > 0 &&
    !objectId.includes("/") &&
    !objectId.includes("..")
  );
}

export function mediaPublicUrl(baseUrl: string, key: string): string {
  return `${baseUrl.replace(/\/$/u, "")}/${key}`;
}
