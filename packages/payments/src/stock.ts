export function stockFromMovements(quantities: readonly number[]): number {
  let stock = 0;
  for (const quantity of quantities) {
    stock += quantity;
  }
  return stock;
}
