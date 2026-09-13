export function errorMessage(error: Error | null, fallback: string): string {
  return error?.message ?? fallback;
}
