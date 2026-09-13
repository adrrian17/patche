const moneyFormatter = new Intl.NumberFormat("es-MX", {
  currency: "MXN",
  style: "currency",
});
const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatMoney(amount: number): string {
  return moneyFormatter.format(amount / 100);
}

export function formatDate(value: Date | string): string {
  return dateFormatter.format(new Date(value));
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1_048_576) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}
