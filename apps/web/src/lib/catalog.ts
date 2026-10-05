import type { variantKinds } from "@patche/db/schema/catalog";

export type VariantKind = (typeof variantKinds)[number];

// Mirrors the schema enum without pulling Drizzle into the client bundle.
export const storeKinds = [
  "digital",
  "physical",
] as const satisfies readonly VariantKind[];

export const kindLabels = {
  digital: "Digital",
  physical: "Físico",
} satisfies Record<VariantKind, string>;

export const catalogSorts = ["newest", "price-asc", "price-desc"] as const;
export type CatalogSort = (typeof catalogSorts)[number];
