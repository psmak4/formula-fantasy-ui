import type { QueryClient } from "@tanstack/react-query";
import { getApiErrorMessage } from "@/lib/api-error";

const adminDateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatAdminDateTime(value: string | null, fallback = "Not available"): string {
  if (!value) return fallback;
  return adminDateTimeFormatter.format(new Date(value));
}

export function getAdminPageErrorMessage(error: unknown, fallback: string): string {
  return getApiErrorMessage(error, fallback);
}

export async function invalidateQueryKeys(queryClient: QueryClient, queryKeys: ReadonlyArray<readonly unknown[]>): Promise<void> {
  await Promise.all(queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey: [...queryKey] })));
}
