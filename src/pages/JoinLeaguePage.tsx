import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../api/apiClient";
import { AppPageHeader } from "../components/layout/AppPageHeader";
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
    <div className="ff-data-row md:grid-cols-[minmax(0,1.5fr)_140px_110px]">
      <div className="flex items-center gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center border border-white/10 text-base font-black text-white ${leagueIconBackgrounds[index % leagueIconBackgrounds.length]}`}
        >
          {String(index + 1).padStart(2, "0")}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xl font-semibold uppercase tracking-[0.04em] text-[#111318]">
            {league.name}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7f828b]">
            <span>{league.visibility ?? "public"}</span>
            <span>{leagueInitials(league.name)}</span>
          </div>
        </div>
      </div>

      <div className="text-left md:text-center">
        <p className="ff-kicker">Members</p>
        <p className="mt-2 text-3xl font-black text-[#111318]">
          {league.memberCount ?? 0}
        </p>
      </div>

      <div className="flex md:justify-end">
        {league.isMember ? (
          <Button asChild variant="outline" className="min-w-24">
            <Link to={`/league/${league.id}`}>View</Link>
          </Button>
        ) : (
          <Button
            className="min-w-24"
            disabled={joining}
            onClick={() => onJoin(league.id)}
          >
            {joining ? "Joining..." : "Join"}
          </Button>
        )}
      </div>
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

  return (
    <section className="ff-page">
      <div className="ff-shell space-y-6">
        <div className="space-y-5">
          <AppPageHeader
            backHref="/leagues"
            backLabel="Back to leagues"
            eyebrow="League Access"
            title="Join League"
            description="Join with an invite code, paste an invite URL, or browse the public list below."
            utility={
              <div className="w-full lg:max-w-[720px]">
                <Label htmlFor="joinLeagueInput">Invite token or league link</Label>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <Input
                    id="joinLeagueInput"
                    placeholder="Enter token or invite URL"
                    value={inviteInput}
                    onChange={(event) => setInviteInput(event.target.value)}
                    className="sm:flex-1"
                  />
                  <Button
                    size="lg"
                    className="sm:min-w-36"
                    onClick={handleJoinSubmit}
                    disabled={
                      joinState === "joining" ||
                      joinInviteMutation.isPending ||
                      joinPublicLeagueMutation.isPending
                    }
                  >
                    {joinState === "joining" ? "Joining..." : "Join"}
                  </Button>
                </div>
              </div>
            }
          />

          {joinState !== "idle" && joinState !== "joining" ? (
            <p className="border border-[#7a0d0d] bg-[#350909] px-4 py-3 text-sm text-[#ff8e8e]">
              {joinState}
            </p>
          ) : null}
        </div>

        <Card className="ff-table-card border-[#d9dee5]">
              <CardContent className="px-0 py-0">
                <div className="flex items-center justify-between border-b border-[#e4e8ee] px-5 py-4">
                  <p className="text-xl font-semibold uppercase tracking-[0.04em] text-[#111318]">Public Grids</p>
                </div>

                {publicLeaguesQuery.isLoading ? (
                  <div className="space-y-4 px-5 py-5">
                    {[1, 2, 3, 4].map((value) => (
                      <div
                        key={value}
                        className="h-24 animate-pulse border border-[#e1e6ec] bg-[#f8f9fb]"
                      />
                    ))}
                  </div>
                ) : null}

                {loadError ? (
                  <div className="px-5 py-5">
                    <div className="border border-[#7a0d0d] bg-[#350909] px-4 py-3 text-sm text-[#ff8e8e]">
                      {loadError}
                    </div>
                  </div>
                ) : null}

              {!publicLeaguesQuery.isLoading && !loadError ? (
                  leagues.length === 0 ? (
                    <div className="px-5 py-5">
                      <div className="border border-[#e1e6ec] bg-[#f8f9fb] px-6 py-10 text-center">
                        <p className="text-xl font-semibold uppercase tracking-[0.04em] text-[#111318]">
                          No Public Leagues Yet
                        </p>
                        <p className="mx-auto mt-3 max-w-2xl text-sm text-[#9699a2]">
                          Create a league or join with a private invite link instead.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div>
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
                  <div className="flex items-center justify-between gap-4 border-t border-[#e4e8ee] px-5 py-5">
                    <p className="ff-kicker text-[#6f727b]">
                      Page {page} of {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={() => setPage((value) => Math.max(1, value - 1))}
                        disabled={page === 1}
                      >
                        ←
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                        disabled={page === totalPages}
                      >
                        →
                      </Button>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
      </div>
    </section>
  );
}
