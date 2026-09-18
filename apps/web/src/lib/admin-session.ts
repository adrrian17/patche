import type { QueryClient } from "@tanstack/react-query";

export function clearAdminQueries(queryClient: QueryClient): void {
  queryClient.removeQueries({ queryKey: ["admin"] });
}
