const moneyFormatter = new Intl.NumberFormat("es-MX", {
  currency: "MXN",
  style: "currency",
});
const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
});

const dayFormatter = new Intl.DateTimeFormat("es-MX", { dateStyle: "long" });

export function formatDay(value: Date | string): string {
  return dayFormatter.format(new Date(value));
}

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

// Short, readable Order reference for Customers; the full id stays on the detail page for support.
export function formatOrderReference(id: string): string {
  return `#${id.slice(0, 8).toUpperCase()}`;
}
