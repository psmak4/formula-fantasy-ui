import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { authClient } from "@/auth/authClient";
import { apiClient } from "../api/apiClient";
import { toastApiError } from "../lib/api-error";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { HeroBackdrop } from "../components/HeroBackdrop";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

type NextRaceResponse = {
  id?: string;
  raceId?: string;
  name?: string;
  raceName?: string;
  grandPrixName?: string;
  startsAt?: string;
  startTime?: string;
  raceAt?: string;
  raceStartAt?: string;
  scheduledAt?: string;
  date?: string;
  entryOpensAt?: string;
  predictionOpensAt?: string;
  openAt?: string;
  entryClosesAt?: string;
  predictionClosesAt?: string;
  lockAt?: string;
  predictionLocked?: boolean;
  entriesLocked?: boolean;
  lockStatus?: "open" | "locked";
};

type PredictionStatus = "open" | "opens_soon" | "locked";
type League = {
  id: string;
  name: string;
  memberCount?: number;
  visibility?: "public" | "private";
};

type LeaguesResponse = {
  leagues?: League[];
};

const leagueIconBackgrounds = [
  "bg-red-600",
  "bg-black",
  "bg-blue-600",
  "bg-emerald-600",
  "bg-amber-500",
];

function leagueInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function LeagueListRow({ league, index }: { league: League; index: number }) {
  return (
    <Link
      to={`/league/${league.id}`}
      className="group flex items-center gap-4 rounded-4xl border border-neutral-300 bg-white px-4 py-4 transition hover:border-neutral-400"
    >
      <div
        className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-2xl font-semibold text-white ${leagueIconBackgrounds[index % leagueIconBackgrounds.length]}`}
      >
        {leagueInitials(league.name)}
      </div>

      <div className="min-w-0 flex-1 flex flex-col gap-0.5">
        <p className="truncate font-['Orbitron'] text-3xl font-semibold leading-tight text-black">
          {league.name}
        </p>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          <span>{(league.visibility ?? "private").toUpperCase()}</span>
          <span className="mx-3 text-slate-400">|</span>
          <span>Total Players: {league.memberCount ?? 0}</span>
        </p>
      </div>

      <div className="hidden items-center gap-3 pr-2 md:flex">
        <span className="text-lg font-semibold text-slate-500">Rank</span>
        <span className="font-['Orbitron'] text-lg font-bold text-black">
          -
        </span>
      </div>
    </Link>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const nextRaceQuery = useQuery({
    queryKey: ["f1", "next-race"],
    queryFn: () => apiClient.get<NextRaceResponse>("/f1/next-race"),
  });
  const nextRace = nextRaceQuery.data ?? null;
  const loading = nextRaceQuery.isLoading;
  const error =
    nextRaceQuery.error instanceof Error ? nextRaceQuery.error.message : null;
  const [countdown, setCountdown] = useState("");
  const [inviteInput, setInviteInput] = useState("");
  const [joinState, setJoinState] = useState<
    "idle" | "joining" | "joined" | string
  >("idle");
  const myLeaguesQuery = useQuery({
    queryKey: ["home-my-leagues"],
    enabled: Boolean(session?.user),
    queryFn: async () => {
      const data = await apiClient.getMyLeagues<LeaguesResponse>();
      return data.leagues ?? [];
    },
  });

  const raceName = useMemo(
    () =>
      nextRace?.name ?? nextRace?.raceName ?? nextRace?.grandPrixName ?? "TBD",
    [nextRace],
  );

  const startsAt = useMemo(
    () =>
      nextRace?.startsAt ??
      nextRace?.startTime ??
      nextRace?.raceAt ??
      nextRace?.raceStartAt ??
      nextRace?.scheduledAt ??
      nextRace?.date,
    [nextRace],
  );

  const entryOpensAt = useMemo(
    () =>
      nextRace?.entryOpensAt ?? nextRace?.predictionOpensAt ?? nextRace?.openAt,
    [nextRace],
  );

  const entryClosesAt = useMemo(
    () =>
      nextRace?.entryClosesAt ??
      nextRace?.predictionClosesAt ??
      nextRace?.lockAt,
    [nextRace],
  );

  const localRaceTime = useMemo(() => {
    if (!startsAt) return "Time TBD";
    const date = new Date(startsAt);
    if (Number.isNaN(date.getTime())) return "Time TBD";
    return date.toLocaleString();
  }, [startsAt]);

  const utcRaceTime = useMemo(() => {
    if (!startsAt) return "UTC TBD";
    const date = new Date(startsAt);
    if (Number.isNaN(date.getTime())) return "UTC TBD";
    return date.toUTCString();
  }, [startsAt]);

  const lockAtLabel = useMemo(() => {
    if (!entryClosesAt) return "TBD";
    const date = new Date(entryClosesAt);
    if (Number.isNaN(date.getTime())) return "TBD";
    return date.toLocaleString();
  }, [entryClosesAt]);

  const predictionStatus = useMemo<PredictionStatus>(() => {
    const openTs = entryOpensAt ? new Date(entryOpensAt).getTime() : NaN;
    const closeTs = entryClosesAt ? new Date(entryClosesAt).getTime() : NaN;
    const now = Date.now();

    const lockedByApi =
      nextRace?.predictionLocked === true ||
      nextRace?.entriesLocked === true ||
      nextRace?.lockStatus === "locked";

    if (lockedByApi || (!Number.isNaN(closeTs) && now >= closeTs))
      return "locked";
    if (!Number.isNaN(openTs) && now < openTs) return "opens_soon";
    return "open";
  }, [
    entryClosesAt,
    entryOpensAt,
    nextRace?.entriesLocked,
    nextRace?.lockStatus,
    nextRace?.predictionLocked,
  ]);

  useEffect(() => {
    if (!startsAt) {
      setCountdown("Start time not available");
      return;
    }

    const raceStartMs = new Date(startsAt).getTime();
    if (Number.isNaN(raceStartMs)) {
      setCountdown("Start time not available");
      return;
    }

    const tick = () => {
      const deltaMs = raceStartMs - Date.now();
      if (deltaMs <= 0) {
        setCountdown("Race weekend live");
        return;
      }

      const totalMinutes = Math.floor(deltaMs / 60000);
      const days = Math.floor(totalMinutes / (24 * 60));
      const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
      const minutes = totalMinutes % 60;
      setCountdown(`${days}d ${hours}h ${minutes}m`);
    };

    tick();
    const interval = window.setInterval(tick, 30000);
    return () => window.clearInterval(interval);
  }, [startsAt]);

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

  const joinLeagueMutation = useMutation({
    mutationFn: async (token: string) => {
      return apiClient.post<{
        leagueId?: string;
      }>(`/invites/${encodeURIComponent(token)}/join`);
    },
    onMutate: () => {
      setJoinState("joining");
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["leagues-page"] });
      const joinedLeagueId = result.leagueId;
      if (!joinedLeagueId) {
        throw new Error("Invite join succeeded but no league id returned");
      }
      setJoinState("joined");
      navigate(`/league/${joinedLeagueId}`);
    },
    onError: (err: unknown) => {
      const message = toastApiError(
        err,
        "Join league failed",
        "Failed to join league",
      );
      setJoinState(message);
    },
  });

  function handleJoinLeague() {
    const parsed = parseInviteTokenOrLeagueId(inviteInput);

    if (!parsed.token && !parsed.leagueId) {
      setJoinState("Paste an invite token or league link");
      return;
    }

    if (parsed.leagueId) {
      setJoinState("joined");
      navigate(`/league/${parsed.leagueId}`);
      return;
    }

    void joinLeagueMutation.mutateAsync(parsed.token ?? "");
  }

  return (
    <section className="w-full">
      <section className="relative w-full overflow-hidden bg-linear-to-br from-neutral-950 via-neutral-900 to-black py-20 text-white">
        <HeroBackdrop />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-6">
          <div className="overflow-hidden rounded-4xl border border-neutral-200/20 bg-white/5 backdrop-blur">
            <div className="h-[3px] w-full bg-red-600" />
            <div className="space-y-7 p-10">
              {loading ? (
                <p className="text-slate-300">Loading next race...</p>
              ) : null}
              {loading ? (
                <div className="space-y-4">
                  <div className="h-8 w-2/3 animate-pulse rounded bg-white/10" />
                  <div className="h-6 w-1/3 animate-pulse rounded bg-white/10" />
                  <div className="h-6 w-1/4 animate-pulse rounded bg-white/10" />
                </div>
              ) : null}
              {error ? (
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold">
                    Couldn&apos;t load next race
                  </h3>
                  <p className="text-slate-300">{error}</p>
                  <Button
                    variant="secondary"
                    onClick={() => void nextRaceQuery.refetch()}
                  >
                    Retry
                  </Button>
                </div>
              ) : null}

              {!loading && !error ? (
                <>
                  <div className="space-y-3">
                    <p className="font-['Orbitron'] text-xs uppercase tracking-[0.24em] text-slate-300">
                      Next Race
                    </p>
                    <h2 className="text-5xl font-extrabold tracking-tight md:text-6xl">
                      {raceName}
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Badge
                      variant="outline"
                      className={`rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide uppercase ${
                        predictionStatus === "open"
                          ? "border-green-500/30 bg-green-500/20 text-green-300"
                          : predictionStatus === "opens_soon"
                            ? "border-sky-400/30 bg-sky-400/20 text-sky-200"
                            : "border-red-500/30 bg-red-500/20 text-red-200"
                      }`}
                    >
                      {predictionStatus === "open"
                        ? "Predictions Open"
                        : predictionStatus === "opens_soon"
                          ? "Opening Soon"
                          : "Predictions Locked"}
                    </Badge>
                    <p className="text-sm text-slate-300">
                      Invite your group, lock picks, and chase the podium.
                    </p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-3xl border border-white/15 bg-white/10 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                        Countdown
                      </p>
                      <p className="mt-2 text-3xl font-semibold tracking-[0.04em] text-white">
                        {countdown}
                      </p>
                    </div>
                    <div className="rounded-3xl border border-white/15 bg-white/10 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                        Race Start
                      </p>
                      <p className="mt-2 text-sm font-medium text-white">
                        {localRaceTime}
                      </p>
                      <p className="mt-1 text-xs text-slate-300">{utcRaceTime}</p>
                    </div>
                    <div className="rounded-3xl border border-white/15 bg-white/10 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                        Entry Lock
                      </p>
                      <p className="mt-2 text-sm font-medium text-white">
                        {lockAtLabel}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      asChild
                      className="h-auto bg-red-600 px-8 py-3 text-base font-semibold text-white! shadow-lg ring-2 ring-red-400/40 transition hover:-translate-y-0.5 hover:bg-red-700"
                    >
                      <Link to="/leagues/create">Create League</Link>
                    </Button>
                    <Button
                      asChild
                      variant="secondary"
                      className="h-auto border border-white/20 bg-white/10 px-6 py-3 text-base font-semibold text-white hover:bg-white/20"
                    >
                      <Link to="/leagues">View My Leagues</Link>
                    </Button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="relative w-full pb-12 pt-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, rgba(0,0,0,0.015) 0px, rgba(0,0,0,0.015) 1px, rgba(0,0,0,0) 9px, rgba(0,0,0,0) 14px)",
            opacity: 0.02,
          }}
        />
        <div className="relative z-10 mx-auto max-w-7xl space-y-8 px-6">
          {session?.user && !sessionPending ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-['Orbitron'] text-3xl font-bold uppercase tracking-tight text-black">
                  My Leagues
                </h2>
                <Button asChild variant="secondary">
                  <Link to="/leagues">View All</Link>
                </Button>
              </div>
              {myLeaguesQuery.isLoading ? (
                <div className="space-y-6">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-36 animate-pulse rounded-4xl border border-neutral-300 bg-neutral-100"
                    />
                  ))}
                </div>
              ) : null}
              {myLeaguesQuery.error ? (
                <Card className="bg-red-50">
                  <CardContent className="py-4">
                    <p className="text-red-600">
                      {myLeaguesQuery.error instanceof Error
                        ? myLeaguesQuery.error.message
                        : "Failed to load leagues"}
                    </p>
                  </CardContent>
                </Card>
              ) : null}
              {!myLeaguesQuery.isLoading && !myLeaguesQuery.error ? (
                <>
                  {(myLeaguesQuery.data ?? []).length === 0 ? (
                    <Card className="bg-background">
                      <CardContent className="py-6">
                        <p className="text-center text-slate-500">
                          You haven&apos;t joined any leagues yet.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-6">
                      {(myLeaguesQuery.data ?? []).map((league, index) => (
                        <LeagueListRow
                          key={league.id}
                          league={league}
                          index={index}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <h2 className="font-['Orbitron'] text-3xl font-bold uppercase tracking-tight text-black">
              Join League
            </h2>
            <p className="text-muted-foreground text-slate-600">
              Paste an invite link or token to jump into a league.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-1">
            <Card>
              <CardHeader>
                <CardTitle>Join League</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  Paste an invite token or full invite link to join instantly.
                </p>
                <Label htmlFor="inviteInput">Invite token or link</Label>
                <Input
                  id="inviteInput"
                  placeholder="Invite token or link"
                  value={inviteInput}
                  onChange={(event) => setInviteInput(event.target.value)}
                />
                <Button
                  className="w-full"
                  variant="secondary"
                  onClick={handleJoinLeague}
                  disabled={joinState === "joining"}
                >
                  {joinState === "joining" ? "Joining..." : "Join League"}
                </Button>
                {joinState !== "idle" &&
                joinState !== "joining" &&
                joinState !== "joined" ? (
                  <p>{joinState}</p>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </section>
  );
}
