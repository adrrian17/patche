const maxSlugLength = 160;

export function slugify(value: string): string {
  const slug = value
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/^-+|-+$/gu, "")
    .slice(0, maxSlugLength)
    .replaceAll(/-+$/gu, "");

  return slug || "sin-nombre";
}

export async function uniqueSlug(
  name: string,
  exists: (slug: string) => Promise<boolean>
): Promise<string> {
  async function findAvailableSlug(
    base: string,
    suffix: number
  ): Promise<string> {
    const suffixText = suffix === 1 ? "" : `-${suffix}`;
    const candidate = `${base.slice(0, maxSlugLength - suffixText.length)}${suffixText}`;
    if (!(await exists(candidate))) {
      return candidate;
    }
    return await findAvailableSlug(base, suffix + 1);
  }

  return await findAvailableSlug(slugify(name), 1);
}
