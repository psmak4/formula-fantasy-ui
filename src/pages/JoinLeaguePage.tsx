import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../api/apiClient";
import { Button } from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toastApiError } from "../lib/api-error";

type PublicLeague = {
  id: string;
  name: string;
  memberCount?: number;
  visibility?: "public" | "private";
  isMember?: boolean;
};

type PublicLeaguesResponse = {
  leagues?: PublicLeague[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
};

const PAGE_SIZE = 10;
const leagueIconBackgrounds = [
  "bg-blue-600",
  "bg-fuchsia-600",
  "bg-red-600",
  "bg-emerald-700",
  "bg-amber-600",
];

function leagueInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function parseInviteTokenOrLeagueId(raw: string): {
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

    const inviteFromQuery =
      url.searchParams.get("invite") ?? url.searchParams.get("token");
    if (inviteFromQuery) return { token: inviteFromQuery };
  } catch {
    return { token: input };
  }

  return { token: input };
}

function PublicLeagueRow({
  league,
  index,
  onJoin,
  joining,
}: {
  league: PublicLeague;
  index: number;
  onJoin: (leagueId: string) => void;
  joining: boolean;
}) {
  return (
    <div className="flex items-center gap-4 rounded-[26px] border border-[#ddd6cc] bg-white px-5 py-5">
      <div
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-black text-white ${leagueIconBackgrounds[index % leagueIconBackgrounds.length]}`}
      >
        {leagueInitials(league.name)}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-['Orbitron'] text-2xl font-black tracking-tight text-black">
          {league.name}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          <span>{league.visibility ?? "public"}</span>
          <span>Total Players: {league.memberCount ?? 0}</span>
        </div>
      </div>

      {league.isMember ? (
        <Button asChild variant="outline" className="rounded-full">
          <Link to={`/league/${league.id}`}>View</Link>
        </Button>
      ) : (
        <Button
          className="rounded-full"
          disabled={joining}
          onClick={() => onJoin(league.id)}
        >
          {joining ? "Joining..." : "Join"}
        </Button>
      )}
    </div>
  );
}

export function JoinLeaguePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [inviteInput, setInviteInput] = useState("");
  const [joinState, setJoinState] = useState<"idle" | "joining" | string>("idle");
  const [page, setPage] = useState(1);

  const publicLeaguesQuery = useQuery({
    queryKey: ["public-leagues", page],
    queryFn: () =>
      apiClient.get<PublicLeaguesResponse>(
        `/leagues/public?page=${page}&pageSize=${PAGE_SIZE}`,
      ),
  });

  const joinPublicLeagueMutation = useMutation({
    mutationFn: async (leagueId: string) => {
      return apiClient.post<{ leagueId: string; joined: boolean }>(
        `/leagues/${leagueId}/join`,
      );
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["leagues-page"] }),
        queryClient.invalidateQueries({ queryKey: ["home-my-leagues"] }),
        queryClient.invalidateQueries({ queryKey: ["public-leagues"] }),
      ]);
      navigate(`/league/${result.leagueId}`);
    },
    onError: (err: unknown) => {
      setJoinState(
        toastApiError(err, "Join league failed", "Failed to join league"),
      );
    },
  });

  const joinInviteMutation = useMutation({
    mutationFn: async (token: string) => {
      return apiClient.post<{ leagueId?: string }>(
        `/invites/${encodeURIComponent(token)}/join`,
      );
    },
    onMutate: () => {
      setJoinState("joining");
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["leagues-page"] }),
        queryClient.invalidateQueries({ queryKey: ["home-my-leagues"] }),
      ]);
      const joinedLeagueId = result.leagueId;
      if (!joinedLeagueId) {
        throw new Error("Invite join succeeded but no league id returned");
      }
      navigate(`/league/${joinedLeagueId}`);
    },
    onError: (err: unknown) => {
      setJoinState(
        toastApiError(err, "Join league failed", "Failed to join league"),
      );
    },
  });

  const leagues = publicLeaguesQuery.data?.leagues ?? [];
  const totalPages = publicLeaguesQuery.data?.totalPages ?? 1;
  const total = publicLeaguesQuery.data?.total ?? 0;
  const loadError =
    publicLeaguesQuery.error instanceof Error
      ? publicLeaguesQuery.error.message
      : null;

  function handleJoinSubmit() {
    const parsed = parseInviteTokenOrLeagueId(inviteInput);

    if (!parsed.token && !parsed.leagueId) {
      setJoinState("Paste an invite token or league link");
      return;
    }

    if (parsed.leagueId) {
      void joinPublicLeagueMutation.mutateAsync(parsed.leagueId);
      return;
    }

    void joinInviteMutation.mutateAsync(parsed.token ?? "");
  }

  async function handleJoinPublicLeague(leagueId: string) {
    setJoinState("joining");
    await joinPublicLeagueMutation.mutateAsync(leagueId);
  }

  const hasPagination = totalPages > 1;
  const summaryLabel = useMemo(() => {
    if (total === 0) return "No public leagues available";
    const start = (page - 1) * PAGE_SIZE + 1;
    const end = Math.min(page * PAGE_SIZE, total);
    return `Showing ${start} to ${end} of ${total} public leagues`;
  }, [page, total]);

  return (
    <section className="bg-[linear-gradient(180deg,#f6f3ee_0%,#f2ede6_100%)] pb-14 pt-14">
      <div className="mx-auto max-w-6xl space-y-8 px-6">
        <div className="space-y-5">
          <Link
            to="/leagues"
            className="inline-flex items-center text-sm font-semibold text-slate-600 hover:text-black hover:no-underline"
          >
            ← Back
          </Link>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="font-['Orbitron'] text-4xl font-black uppercase tracking-tight text-black md:text-5xl">
                Join A League
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
                Join using an invite code, invite URL, or explore the full list of
                public leagues below.
              </p>
            </div>

            <div className="w-full max-w-xl space-y-2">
              <Label htmlFor="joinLeagueInput">League code or invite link</Label>
              <div className="flex rounded-full border border-black bg-white p-1">
                <Input
                  id="joinLeagueInput"
                  placeholder="Enter a league code or invite URL"
                  value={inviteInput}
                  onChange={(event) => setInviteInput(event.target.value)}
                  className="border-0 shadow-none focus-visible:ring-0"
                />
                <Button
                  className="rounded-full px-6"
                  onClick={handleJoinSubmit}
                  disabled={
                    joinState === "joining" ||
                    joinInviteMutation.isPending ||
                    joinPublicLeagueMutation.isPending
                  }
                >
                  Join
                </Button>
              </div>
              {joinState !== "idle" && joinState !== "joining" ? (
                <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {joinState}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Public leagues
              </p>
              <p className="text-sm text-slate-600">{summaryLabel}</p>
            </div>
          </div>

          {publicLeaguesQuery.isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((value) => (
                <div
                  key={value}
                  className="h-24 animate-pulse rounded-[26px] border border-[#ddd6cc] bg-white"
                />
              ))}
            </div>
          ) : null}

          {loadError ? (
            <Card className="rounded-[28px] border-red-200 bg-red-50">
              <CardContent className="py-5">
                <p className="text-red-700">{loadError}</p>
              </CardContent>
            </Card>
          ) : null}

          {!publicLeaguesQuery.isLoading && !loadError ? (
            leagues.length === 0 ? (
              <Card className="rounded-[28px] border-[#ddd6cc] bg-white">
                <CardContent className="py-10 text-center">
                  <p className="font-['Orbitron'] text-2xl font-black uppercase text-black">
                    No public leagues yet
                  </p>
                  <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-600">
                    Create a league or join with a private invite link instead.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {leagues.map((league, index) => (
                  <PublicLeagueRow
                    key={league.id}
                    league={league}
                    index={index}
                    onJoin={handleJoinPublicLeague}
                    joining={joinPublicLeagueMutation.isPending}
                  />
                ))}
              </div>
            )
          ) : null}

          {hasPagination ? (
            <div className="flex justify-center">
              <div className="flex items-center gap-3 rounded-full border border-black bg-white px-4 py-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="min-w-20 text-center text-sm font-semibold text-slate-700">
                  Page {page} / {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full"
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
