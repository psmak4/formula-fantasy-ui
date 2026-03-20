import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { authClient } from "@/auth/authClient";
import { apiClient } from "../api/apiClient";
import { toastApiError } from "../lib/api-error";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { HeroBackdrop } from "../components/HeroBackdrop";
import { Card, CardContent } from "../components/ui/Card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

type NextRaceResponse = {
  raceId?: string;
  round?: number;
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
  lockStatus?: "open" | "locked" | "upcoming";
  windowStatus?: "open" | "locked" | "upcoming";
};

type PredictionStatus = "open" | "opens_soon" | "locked";

type League = {
  id: string;
  name: string;
  memberCount?: number;
  visibility?: "public" | "private";
  rank?: number | null;
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

function formatDateLabel(value?: string) {
  if (!value) return "TBD";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "TBD";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

function formatRank(value?: number | null): string {
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
    return "-";
  }
  if (value >= 1000) {
    const compact =
      value >= 10000 ? Math.round(value / 1000) : Math.round((value / 1000) * 10) / 10;
    return `${compact}K+`;
  }
  return value.toLocaleString();
}

function LeagueListRow({ league, index }: { league: League; index: number }) {
  return (
    <Link
      to={`/league/${league.id}`}
      className="group flex items-center gap-4 rounded-[26px] border border-[#ddd6cc] bg-white px-5 py-5 transition hover:-translate-y-0.5 hover:border-neutral-400 hover:no-underline"
    >
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
          <span>{league.visibility ?? "private"}</span>
          <span>Total Players: {league.memberCount ?? 0}</span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Rank
        </p>
        <p className="mt-1 font-['Orbitron'] text-2xl font-black text-black">
          {formatRank(league.rank)}
        </p>
      </div>
    </Link>
  );
}

function HowToPlayCard({
  title,
  body,
  accent,
}: {
  title: string;
  body: string;
  accent: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden rounded-[28px] border-[#ddd6cc] bg-white shadow-[0_14px_32px_rgba(15,23,42,0.04)]">
      <CardContent className="grid gap-6 px-6 py-6 md:grid-cols-[0.95fr_1.05fr] md:items-center">
        <div className="space-y-4">
          <h3 className="font-['Orbitron'] text-3xl font-black tracking-tight text-black">
            {title}
          </h3>
          <p className="max-w-xl text-sm leading-6 text-slate-600 md:text-base">
            {body}
          </p>
        </div>
        <div className="rounded-[24px] border border-[#ece5dc] bg-[#f7f3ec] p-6">
          {accent}
        </div>
      </CardContent>
    </Card>
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

  const myLeaguesQuery = useQuery({
    queryKey: ["home-my-leagues"],
    enabled: Boolean(session?.user),
    queryFn: async () => {
      const data = await apiClient.getMyLeagues<LeaguesResponse>();
      return data.leagues ?? [];
    },
  });

  const nextRace = nextRaceQuery.data ?? null;
  const loading = nextRaceQuery.isLoading;
  const error =
    nextRaceQuery.error instanceof Error ? nextRaceQuery.error.message : null;
  const [countdown, setCountdown] = useState("");
  const [inviteInput, setInviteInput] = useState("");
  const [joinState, setJoinState] = useState<"idle" | "joining" | "joined" | string>("idle");

  const raceName = useMemo(
    () => nextRace?.name ?? nextRace?.raceName ?? nextRace?.grandPrixName ?? "Next Grand Prix",
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
    () => nextRace?.entryOpensAt ?? nextRace?.predictionOpensAt ?? nextRace?.openAt,
    [nextRace],
  );

  const entryClosesAt = useMemo(
    () => nextRace?.entryClosesAt ?? nextRace?.predictionClosesAt ?? nextRace?.lockAt,
    [nextRace],
  );

  const predictionStatus = useMemo<PredictionStatus>(() => {
    const openTs = entryOpensAt ? new Date(entryOpensAt).getTime() : NaN;
    const closeTs = entryClosesAt ? new Date(entryClosesAt).getTime() : NaN;
    const now = Date.now();

    const lockedByApi =
      nextRace?.predictionLocked === true ||
      nextRace?.entriesLocked === true ||
      nextRace?.lockStatus === "locked" ||
      nextRace?.windowStatus === "locked";

    if (lockedByApi || (!Number.isNaN(closeTs) && now >= closeTs)) {
      return "locked";
    }
    if (!Number.isNaN(openTs) && now < openTs) {
      return "opens_soon";
    }
    return "open";
  }, [
    entryClosesAt,
    entryOpensAt,
    nextRace?.entriesLocked,
    nextRace?.lockStatus,
    nextRace?.predictionLocked,
    nextRace?.windowStatus,
  ]);

  const localRaceTime = useMemo(() => formatDateLabel(startsAt), [startsAt]);
  const openAtLabel = useMemo(() => formatDateLabel(entryOpensAt), [entryOpensAt]);
  const lockAtLabel = useMemo(() => formatDateLabel(entryClosesAt), [entryClosesAt]);
  const leagues = myLeaguesQuery.data ?? [];
  const leagueCount = leagues.length;

  useEffect(() => {
    const targetAt =
      predictionStatus === "opens_soon"
        ? entryOpensAt
        : predictionStatus === "open"
          ? entryClosesAt
          : startsAt;

    if (!targetAt) {
      setCountdown("Schedule pending");
      return;
    }

    const targetMs = new Date(targetAt).getTime();
    if (Number.isNaN(targetMs)) {
      setCountdown("Schedule pending");
      return;
    }

    const tick = () => {
      const deltaMs = targetMs - Date.now();
      if (deltaMs <= 0) {
        setCountdown(
          predictionStatus === "locked"
            ? "Race weekend live"
            : predictionStatus === "open"
              ? "Window closing"
              : "Window opening",
        );
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
  }, [entryClosesAt, entryOpensAt, predictionStatus, startsAt]);

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
      return apiClient.post<{ leagueId?: string }>(
        `/invites/${encodeURIComponent(token)}/join`,
      );
    },
    onMutate: () => {
      setJoinState("joining");
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["leagues-page"] });
      queryClient.invalidateQueries({ queryKey: ["home-my-leagues"] });
      const joinedLeagueId = result.leagueId;
      if (!joinedLeagueId) {
        throw new Error("Invite join succeeded but no league id returned");
      }
      setJoinState("joined");
      navigate(`/league/${joinedLeagueId}`);
    },
    onError: (err: unknown) => {
      const message = toastApiError(err, "Join league failed", "Failed to join league");
      setJoinState(message);
    },
  });

  function handleJoinLeague() {
    const parsed = parseInviteTokenOrLeagueId(inviteInput);

    if (!parsed.token && !parsed.leagueId) {
      setJoinState("Paste an invite token or league link");
      return;
    }

    if (!session?.user) {
      const redirectTarget = parsed.token
        ? `/invite/${parsed.token}`
        : parsed.leagueId
          ? `/league/${parsed.leagueId}`
          : "/";
      navigate(`/sign-in?redirect=${encodeURIComponent(redirectTarget)}`);
      return;
    }

    if (parsed.leagueId) {
      setJoinState("joined");
      navigate(`/league/${parsed.leagueId}`);
      return;
    }

    void joinLeagueMutation.mutateAsync(parsed.token ?? "");
  }

  const heroButton = session?.user
    ? predictionStatus === "open"
      ? {
          href: leagueCount > 0 ? `/league/${leagues[0]?.id}/predict` : "/leagues/create",
          label: leagueCount > 0 ? "Make predictions" : "Create a league",
        }
      : predictionStatus === "opens_soon"
        ? {
            href: leagueCount > 0 ? "/leagues" : "/leagues/create",
            label: leagueCount > 0 ? "View my leagues" : "Create a league",
          }
        : {
            href: "/results",
            label: "View my results",
          }
    : {
        href: predictionStatus === "open" ? "/sign-up" : "#how-to-play",
        label: predictionStatus === "open" ? "Login / Register" : "How to play",
      };

  return (
    <section className="bg-[linear-gradient(180deg,#f6f3ee_0%,#f2ede6_100%)] pb-14 pt-10">
      <section className="relative overflow-hidden">
        <HeroBackdrop />
        <div className="relative z-10 mx-auto max-w-6xl px-6">
          <div className="mx-auto mb-3 h-2 max-w-[92%] bg-red-600" />
          <div className="mx-auto max-w-[92%] rounded-[32px] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.10),_transparent_32%),linear-gradient(180deg,#8f0229_0%,#a0022f_42%,#b00436_100%)] px-8 py-10 text-white shadow-[0_24px_60px_rgba(127,29,29,0.24)]">
            {loading ? (
              <div className="space-y-4 py-12">
                <div className="h-5 w-24 animate-pulse rounded bg-white/20" />
                <div className="h-16 w-72 animate-pulse rounded bg-white/20" />
                <div className="h-6 w-56 animate-pulse rounded bg-white/20" />
              </div>
            ) : error ? (
              <div className="space-y-3 py-10">
                <h2 className="font-['Orbitron'] text-3xl font-black uppercase tracking-tight">
                  Couldn&apos;t load next race
                </h2>
                <p className="text-white/80">{error}</p>
                <Button variant="secondary" onClick={() => void nextRaceQuery.refetch()}>
                  Retry
                </Button>
              </div>
            ) : (
              <div className="space-y-8 text-center">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/75">
                    Round {nextRace?.round ?? "—"}
                  </p>
                  <h1 className="font-['Orbitron'] text-5xl font-black tracking-tight text-white md:text-7xl">
                    {raceName}
                  </h1>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
                    {localRaceTime}
                  </p>
                </div>

                <div className="flex flex-col items-center gap-3">
                  <Badge
                    className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${
                      predictionStatus === "open"
                        ? "bg-emerald-100 text-emerald-800"
                        : predictionStatus === "opens_soon"
                          ? "bg-white/12 text-white"
                          : "bg-black/20 text-white"
                    }`}
                  >
                    {predictionStatus === "open"
                      ? "Predictions Open"
                      : predictionStatus === "opens_soon"
                        ? "Next round will open soon"
                        : "Predictions locked"}
                  </Badge>
                  <p className="text-lg font-semibold text-white">
                    {countdown}
                  </p>
                  <p className="max-w-2xl text-sm text-white/78 md:text-base">
                    {predictionStatus === "open"
                      ? `Submit or edit your card before ${lockAtLabel}.`
                      : predictionStatus === "opens_soon"
                        ? `Prediction window opens ${openAtLabel}.`
                        : "This round is locked. Review results and prepare for the next race."}
                  </p>
                  <Button
                    asChild
                    variant={session?.user ? "outline" : "secondary"}
                    className={`mt-1 rounded-full px-6 ${
                      session?.user
                        ? "border-white/24 bg-white/10 text-white hover:bg-white/16 hover:text-white"
                        : "border-white bg-white text-black hover:bg-white/90"
                    }`}
                  >
                    <Link to={heroButton.href}>{heroButton.label}</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>

          {!loading && !error ? (
            <div className="mx-auto mt-4 grid max-w-[92%] gap-4 rounded-[28px] border border-[#ddd6cc] bg-white px-6 py-5 shadow-[0_14px_28px_rgba(15,23,42,0.04)] md:grid-cols-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Window status
                </p>
                <p className="mt-2 font-['Orbitron'] text-2xl font-black text-black">
                  {predictionStatus === "open"
                    ? "Open"
                    : predictionStatus === "opens_soon"
                      ? "Soon"
                      : "Locked"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Opens at
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {openAtLabel}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Locks at
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {lockAtLabel}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Live leagues
                </p>
                <p className="mt-2 font-['Orbitron'] text-2xl font-black text-black">
                  {session?.user ? leagueCount : "-"}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <div className="mx-auto mt-10 max-w-6xl space-y-10 px-6">
        {session?.user && !sessionPending ? (
          <>
            <section className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-['Orbitron'] text-3xl font-black uppercase tracking-tight text-black md:text-4xl">
                    My Leagues
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-slate-600">
                    Your current competitions, with quick access back to the
                    leaderboard and next card.
                  </p>
                </div>
                <Button asChild variant="outline" className="rounded-full border-2 border-black px-5">
                  <Link to="/leagues">View all</Link>
                </Button>
              </div>

              {myLeaguesQuery.isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((value) => (
                    <div
                      key={value}
                      className="h-24 animate-pulse rounded-[26px] border border-[#ddd6cc] bg-white"
                    />
                  ))}
                </div>
              ) : myLeaguesQuery.error ? (
                <Card className="rounded-[28px] border-red-200 bg-red-50">
                  <CardContent className="py-5">
                    <p className="text-red-700">
                      {myLeaguesQuery.error instanceof Error
                        ? myLeaguesQuery.error.message
                        : "Failed to load leagues"}
                    </p>
                  </CardContent>
                </Card>
              ) : leagueCount === 0 ? (
                <Card className="rounded-[28px] border-[#ddd6cc] bg-white">
                  <CardContent className="space-y-4 py-10 text-center">
                    <p className="font-['Orbitron'] text-2xl font-black uppercase text-black">
                      No leagues yet
                    </p>
                    <p className="mx-auto max-w-2xl text-sm text-slate-600">
                      Create your first league or join one with an invite link.
                    </p>
                    <div className="flex flex-wrap justify-center gap-3">
                      <Button asChild className="rounded-full">
                        <Link to="/leagues/create">Create a league</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {leagues.map((league, index) => (
                    <LeagueListRow key={league.id} league={league} index={index} />
                  ))}
                </div>
              )}
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <Card className="rounded-[28px] border-[#ddd6cc] bg-white shadow-[0_14px_32px_rgba(15,23,42,0.04)]">
                <CardContent className="space-y-5 px-6 py-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Join league
                    </p>
                    <h3 className="mt-2 font-['Orbitron'] text-3xl font-black tracking-tight text-black">
                      Bring in an invite
                    </h3>
                    <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
                      Paste a token, invite URL, or direct league link. If it is
                      valid, you will be routed straight into the competition.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inviteInput">Invite token or link</Label>
                    <Input
                      id="inviteInput"
                      placeholder="https://... or invite token"
                      value={inviteInput}
                      onChange={(event) => setInviteInput(event.target.value)}
                    />
                  </div>
                  <Button
                    className="w-full rounded-full bg-black text-white hover:bg-neutral-800"
                    onClick={handleJoinLeague}
                    disabled={joinState === "joining"}
                  >
                    {joinState === "joining" ? "Joining..." : "Join league"}
                  </Button>
                  {joinState !== "idle" &&
                  joinState !== "joining" &&
                  joinState !== "joined" ? (
                    <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {joinState}
                    </p>
                  ) : null}
                </CardContent>
              </Card>

              <div className="rounded-[28px] border border-[#ddd6cc] bg-white px-8 py-8">
                <div className="h-2 w-full bg-red-600" />
                <div className="mt-6 space-y-4">
                  <h3 className="font-['Orbitron'] text-4xl font-black tracking-tight text-black">
                    Create and compete
                  </h3>
                  <p className="max-w-xl text-sm leading-6 text-slate-600">
                    Join public leagues, create your own, or invite friends to
                    compare scores as you predict the race results for the F1 season.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button asChild className="rounded-full">
                      <Link to="/join">Join a league</Link>
                    </Button>
                    <Button asChild variant="outline" className="rounded-full border-2 border-black px-5">
                      <Link to="/leagues/create">+ Create a league</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          </>
        ) : (
          <>
            <section id="how-to-play" className="space-y-5">
              <div>
                <h2 className="font-['Orbitron'] text-3xl font-black uppercase tracking-tight text-black md:text-4xl">
                  How To Play
                </h2>
              </div>

              <HowToPlayCard
                title="Make your predictions"
                body="Choose who you think will win the race, grab fastest lap, gain the most places, and how the rest of the weekend will unfold. Every race is its own scoring moment."
                accent={
                  <div className="flex h-full min-h-40 items-center justify-center">
                    <div className="flex items-center gap-3">
                      {[1, 2, 3, 4, 5, 6, 7].map((value) => (
                        <div
                          key={value}
                          className={`h-4 w-4 rounded-full ${
                            value <= 3 ? "bg-red-600" : "bg-white"
                          } border border-neutral-300`}
                        />
                      ))}
                    </div>
                  </div>
                }
              />

              <HowToPlayCard
                title="Lock in your answers"
                body="Cards open 7 days before the race and stay editable until lock. Save early, come back later, and refine your selections before lights out."
                accent={
                  <div className="grid min-h-40 grid-cols-3 gap-3">
                    <div className="rounded-[22px] bg-white" />
                    <div className="rounded-[22px] bg-white" />
                    <div className="rounded-[22px] bg-white" />
                  </div>
                }
              />

              <HowToPlayCard
                title="Race to the top"
                body="Each correct call adds to your round score. Track movement in your leagues and see how your predictions compare against everyone else on the grid."
                accent={
                  <div className="grid min-h-40 grid-cols-3 gap-4">
                    {[{ c: "bg-blue-100", n: "12" }, { c: "bg-emerald-100", n: "182" }, { c: "bg-rose-100", n: "375" }].map((item) => (
                      <div key={item.n} className={`rounded-[24px] ${item.c} px-4 py-5 text-center`}>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Position
                        </p>
                        <p className="mt-3 font-['Orbitron'] text-4xl font-black text-black">
                          {item.n}
                        </p>
                      </div>
                    ))}
                  </div>
                }
              />

              <HowToPlayCard
                title="Score big points"
                body="Strong rounds build your season story. The more accurate your calls are, the more pressure you put on the rest of your league."
                accent={
                  <div className="grid min-h-40 gap-3">
                    <div className="rounded-[22px] bg-[#f3d9cf] px-4 py-4" />
                    <div className="rounded-[22px] bg-[#d7e6f7] px-4 py-4" />
                    <div className="rounded-[22px] bg-[#dbeadf] px-4 py-4" />
                  </div>
                }
              />
            </section>

            <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
              <Card className="rounded-[28px] border-[#ddd6cc] bg-white shadow-[0_14px_32px_rgba(15,23,42,0.04)]">
                <CardContent className="space-y-5 px-6 py-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Join league
                    </p>
                    <h3 className="mt-2 font-['Orbitron'] text-3xl font-black tracking-tight text-black">
                      Got an invite?
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      Paste your invite and we&apos;ll take you to sign in before
                      joining the league.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inviteInputGuest">Invite token or link</Label>
                    <Input
                      id="inviteInputGuest"
                      placeholder="https://... or invite token"
                      value={inviteInput}
                      onChange={(event) => setInviteInput(event.target.value)}
                    />
                  </div>
                  <Button
                    className="w-full rounded-full"
                    onClick={handleJoinLeague}
                    disabled={joinState === "joining"}
                  >
                    {joinState === "joining" ? "Continuing..." : "Continue to sign in"}
                  </Button>
                  {joinState !== "idle" &&
                  joinState !== "joining" &&
                  joinState !== "joined" ? (
                    <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {joinState}
                    </p>
                  ) : null}
                </CardContent>
              </Card>

              <div className="rounded-[28px] border border-[#ddd6cc] bg-white px-8 py-8">
                <div className="h-2 w-full bg-red-600" />
                <div className="mt-6 space-y-4">
                  <h3 className="font-['Orbitron'] text-4xl font-black tracking-tight text-black">
                    Start your season
                  </h3>
                  <p className="max-w-xl text-sm leading-6 text-slate-600">
                    Create a private league, join public competition, and track
                    every round as the calendar unfolds.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button asChild className="rounded-full">
                      <Link to="/sign-up">Create account</Link>
                    </Button>
                    <Button asChild variant="outline" className="rounded-full border-2 border-black px-5">
                      <Link to="/sign-in">Sign in</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </section>
  );
}
