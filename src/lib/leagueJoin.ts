import type { QueryClient } from "@tanstack/react-query";

export function leagueInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function parseInviteTokenOrLeagueId(raw: string): {
  token?: string;
  leagueId?: string;
} {
  const input = raw.trim();
  if (!input) return {};

  const readFromPath = (value: string) => {
    const leagueFromPath = value.match(/\/league\/([^/?#]+)/)?.[1];
    const inviteFromPath = value.match(/\/invite\/([^/?#]+)/)?.[1];
    if (leagueFromPath) return { leagueId: leagueFromPath };
    if (inviteFromPath) return { token: inviteFromPath };
    return null;
  };

  if (!input.includes("://")) {
    const fromPath = readFromPath(input);
    return fromPath ?? { token: input };
  }

  try {
    const url = new URL(input);
    const fromPath = readFromPath(url.pathname);
    if (fromPath) return fromPath;

    const inviteFromQuery = url.searchParams.get("invite") ?? url.searchParams.get("token");
    if (inviteFromQuery) return { token: inviteFromQuery };
  } catch {
    return { token: input };
  }

  return { token: input };
}

export async function invalidateLeagueQueries(
  queryClient: QueryClient,
  options?: {
    includePublicLeagues?: boolean;
    inviteToken?: string;
  }
): Promise<void> {
  const work = [
    queryClient.invalidateQueries({ queryKey: ["leagues-page"] }),
    queryClient.invalidateQueries({ queryKey: ["home-my-leagues"] }),
  ];

  if (options?.includePublicLeagues) {
    work.push(queryClient.invalidateQueries({ queryKey: ["public-leagues"] }));
  }
  if (options?.inviteToken) {
    work.push(queryClient.invalidateQueries({ queryKey: ["invite-preview", options.inviteToken] }));
  }

  await Promise.all(work);
}
