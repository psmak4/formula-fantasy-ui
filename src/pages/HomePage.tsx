import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { authClient } from "@/auth/authClient";
import { apiClient } from "../api/apiClient";
import { toastApiError } from "../lib/api-error";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
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
      className="grid gap-4 border-b border-white/6 bg-white/2 px-5 py-5 transition hover:bg-white/4 hover:no-underline md:grid-cols-[minmax(0,1.4fr)_130px_120px]"
    >
      <div className="flex min-w-0 items-center gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center border border-white/10 text-sm font-black text-white ${leagueIconBackgrounds[index % leagueIconBackgrounds.length]}`}
        >
          {leagueInitials(league.name)}
        </div>
        <div className="min-w-0">
          <p className="ff-display truncate text-2xl text-white">{league.name}</p>
          <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7f828b]">
            <span>{league.visibility ?? "private"}</span>
            <span>{league.memberCount ?? 0} members</span>
          </div>
        </div>
      </div>

      <div>
        <p className="ff-kicker">Players</p>
        <p className="mt-2 text-3xl font-black text-white">{league.memberCount ?? 0}</p>
      </div>

      <div className="text-left md:text-right">
        <p className="ff-kicker">Rank</p>
        <p className="mt-2 text-3xl font-black text-[#e9c400]">{formatRank(league.rank)}</p>
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
  accent: ReactNode;
}) {
  return (
    <Card className="overflow-hidden border-white/8 bg-[#15161b]">
      <CardContent className="grid gap-6 px-6 py-6 md:grid-cols-[0.9fr_1.1fr] md:items-center">
        <div className="space-y-4">
          <p className="ff-kicker">How It Works</p>
          <h3 className="ff-display text-3xl text-white md:text-4xl">{title}</h3>
          <p className="max-w-xl text-sm leading-6 text-[#989aa2] md:text-base">{body}</p>
        </div>
        <div className="border border-white/8 bg-white/3 p-6">{accent}</div>
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
  const primaryLeague = leagues[0] ?? null;

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
      void queryClient.invalidateQueries({ queryKey: ["leagues-page"] });
      void queryClient.invalidateQueries({ queryKey: ["home-my-leagues"] });
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
          href: primaryLeague ? `/league/${primaryLeague.id}/predict` : "/leagues/create",
          label: primaryLeague ? "Build race card" : "Create a league",
        }
      : predictionStatus === "opens_soon"
        ? {
            href: primaryLeague ? "/leagues" : "/leagues/create",
            label: primaryLeague ? "View my leagues" : "Create a league",
          }
        : {
            href: "/results",
            label: "Review results",
          }
    : {
        href: predictionStatus === "open" ? "/sign-up" : "#how-to-play",
        label: predictionStatus === "open" ? "Create account" : "How it works",
      };

  return (
    <section className="px-6 py-12 md:py-16">
      <div className="mx-auto max-w-7xl space-y-10">
        <section className="overflow-hidden border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(204,0,0,0.26),transparent_30%),linear-gradient(135deg,#0d0e12_0%,#16171c_55%,#21242b_100%)]">
          <div className="grid gap-8 px-8 py-10 lg:grid-cols-[minmax(0,1.45fr)_320px] lg:px-10 lg:py-12">
            <div className="space-y-8">
              {loading ? (
                <div className="space-y-4 py-10">
                  <div className="h-5 w-24 animate-pulse bg-white/10" />
                  <div className="h-16 w-80 animate-pulse bg-white/10" />
                  <div className="h-6 w-64 animate-pulse bg-white/10" />
                </div>
              ) : error ? (
                <div className="space-y-4 py-8">
                  <p className="ff-kicker text-[#ff7373]">Race Control</p>
                  <h1 className="ff-display text-5xl text-white md:text-6xl">
                    Next race unavailable
                  </h1>
                  <p className="max-w-xl text-sm leading-6 text-[#c2c4cb]">{error}</p>
                  <Button variant="secondary" onClick={() => void nextRaceQuery.refetch()}>
                    Retry feed
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <p className="ff-kicker">Round {nextRace?.round ?? "—"} Transmission</p>
                    <h1 className="ff-display max-w-4xl text-5xl text-white md:text-7xl">
                      {raceName}
                    </h1>
                    <p className="max-w-2xl text-sm font-semibold uppercase tracking-[0.16em] text-[#d0d3d9] md:text-base">
                      {localRaceTime}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Badge tone={predictionStatus === "open" ? "success" : predictionStatus === "opens_soon" ? "warning" : "neutral"}>
                      {predictionStatus === "open"
                        ? "Predictions Open"
                        : predictionStatus === "opens_soon"
                          ? "Window Opening Soon"
                          : "Predictions Locked"}
                    </Badge>
                    <Badge tone="info">Countdown {countdown}</Badge>
                  </div>

                  <p className="max-w-2xl text-base leading-7 text-[#c2c4cb]">
                    {predictionStatus === "open"
                      ? `Build your card before ${lockAtLabel} and lock in your race weekend strategy.`
                      : predictionStatus === "opens_soon"
                        ? `The next submission window opens ${openAtLabel}. Use the down time to line up your leagues and rivals.`
                        : "The grid is locked. Review the fallout, track your rank, and get ready for the next window."}
                  </p>

                  <div className="flex flex-wrap gap-3">
                    <Button asChild size="lg">
                      <Link to={heroButton.href}>{heroButton.label}</Link>
                    </Button>
                    <Button asChild variant="outline" size="lg">
                      <Link to={session?.user ? "/leagues" : "/sign-in"}>
                        {session?.user ? "League garage" : "Sign in"}
                      </Link>
                    </Button>
                  </div>

                  <div className="grid gap-4 pt-2 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="border border-white/8 bg-black/20 px-4 py-4">
                      <p className="ff-kicker">Window status</p>
                      <p className="mt-2 text-3xl font-black text-white">
                        {predictionStatus === "open"
                          ? "Open"
                          : predictionStatus === "opens_soon"
                            ? "Soon"
                            : "Locked"}
                      </p>
                    </div>
                    <div className="border border-white/8 bg-black/20 px-4 py-4">
                      <p className="ff-kicker">Opens at</p>
                      <p className="mt-2 text-sm font-semibold text-white">{openAtLabel}</p>
                    </div>
                    <div className="border border-white/8 bg-black/20 px-4 py-4">
                      <p className="ff-kicker">Locks at</p>
                      <p className="mt-2 text-sm font-semibold text-white">{lockAtLabel}</p>
                    </div>
                    <div className="border border-white/8 bg-black/20 px-4 py-4">
                      <p className="ff-kicker">Active leagues</p>
                      <p className="mt-2 text-3xl font-black text-[#e9c400]">
                        {session?.user ? leagueCount : "—"}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-5">
              <Card className="border-white/8 bg-black/20">
                <CardContent className="space-y-5 px-6 py-6">
                  <p className="ff-kicker">Race Signal</p>
                  <div>
                    <p className="text-5xl font-black text-white">{countdown || "—"}</p>
                    <p className="mt-2 text-sm text-[#989aa2]">
                      {predictionStatus === "open"
                        ? "Remaining until the card locks"
                        : predictionStatus === "opens_soon"
                          ? "Remaining until submissions open"
                          : "Race weekend timing"}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    <div className="border border-white/8 bg-white/4 p-4">
                      <p className="ff-kicker">Track status</p>
                      <p className="mt-2 text-2xl font-black text-white">{raceName}</p>
                    </div>
                    <div className="border border-white/8 bg-white/4 p-4">
                      <p className="ff-kicker">Race start</p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-white">
                        {localRaceTime}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/8 bg-[#15161b]">
                <CardContent className="space-y-4 px-6 py-6">
                  <p className="ff-kicker">Invite Access</p>
                  <div className="space-y-2">
                    <Label htmlFor="homeInvite" className="text-[#d0d3d9]">
                      League invite link or token
                    </Label>
                    <Input
                      id="homeInvite"
                      placeholder="Paste invite token or league link"
                      value={inviteInput}
                      onChange={(event) => {
                        setInviteInput(event.target.value);
                        if (joinState !== "idle") {
                          setJoinState("idle");
                        }
                      }}
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleJoinLeague}
                    disabled={joinState === "joining"}
                  >
                    {joinState === "joining" ? "Joining..." : "Join league"}
                  </Button>
                  <p className="text-sm text-[#989aa2]">
                    {joinState === "idle"
                      ? "Drop in via invite or open an existing league directly."
                      : joinState === "joined"
                        ? "Redirecting..."
                        : joinState}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {session?.user && !sessionPending ? (
          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_320px]">
            <Card className="border-white/8 bg-[#15161b]">
              <CardContent className="px-0 py-0">
                <div className="flex items-center justify-between border-b border-white/6 px-6 py-5">
                  <div>
                    <p className="ff-display text-3xl text-white">My Leagues</p>
                    <p className="mt-2 text-sm text-[#989aa2]">
                      Active championships and current rank pressure.
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/leagues">Open hub</Link>
                  </Button>
                </div>

                {myLeaguesQuery.isLoading ? (
                  <div className="space-y-4 px-6 py-6">
                    {[1, 2, 3].map((value) => (
                      <div
                        key={value}
                        className="h-24 animate-pulse border border-white/6 bg-white/3"
                      />
                    ))}
                  </div>
                ) : null}

                {myLeaguesQuery.error ? (
                  <div className="px-6 py-6">
                    <div className="border border-[#7a0d0d] bg-[#350909] px-4 py-3 text-sm text-[#ff8e8e]">
                      {myLeaguesQuery.error instanceof Error
                        ? myLeaguesQuery.error.message
                        : "Failed to load leagues"}
                    </div>
                  </div>
                ) : null}

                {!myLeaguesQuery.isLoading && !myLeaguesQuery.error ? (
                  leagues.length === 0 ? (
                    <div className="px-6 py-10 text-center">
                      <p className="ff-display text-2xl text-white">No Leagues Yet</p>
                      <p className="mx-auto mt-3 max-w-2xl text-sm text-[#989aa2]">
                        Start your own paddock or join with an invite to unlock predictions.
                      </p>
                    </div>
                  ) : (
                    <div>
                      {leagues.slice(0, 4).map((league, index) => (
                        <LeagueListRow key={league.id} league={league} index={index} />
                      ))}
                    </div>
                  )
                ) : null}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-white/8 bg-[linear-gradient(180deg,#1d120d_0%,#100e0d_100%)]">
                <CardContent className="space-y-5 px-6 py-6">
                  <span className="ff-kicker bg-[#cc0000] px-3 py-2 text-white">
                    Current Focus
                  </span>
                  <h2 className="ff-display text-4xl text-white">Prediction Window</h2>
                  <p className="text-sm leading-6 text-[#d5d7dd]">
                    {predictionStatus === "open"
                      ? "Cards are open now. Prioritize your primary league and lock the podium before the field settles."
                      : predictionStatus === "opens_soon"
                        ? "The next race card is not live yet. Keep your leagues organized and be ready at opening."
                        : "The current race is locked. Use this cycle to review performance and reset for the next event."}
                  </p>
                  <Button asChild variant="outline">
                    <Link to={predictionStatus === "locked" ? "/results" : "/leagues"}>
                      {predictionStatus === "locked" ? "Open results" : "Manage leagues"}
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-white/8 bg-[#15161b]">
                <CardContent className="space-y-4 px-6 py-6">
                  <p className="ff-kicker">Quick Access</p>
                  <div className="grid gap-4">
                    <Link
                      to="/join"
                      className="border border-white/8 bg-white/3 px-4 py-4 text-white transition hover:bg-white/6 hover:no-underline"
                    >
                      <p className="ff-display text-2xl text-white">Join A League</p>
                      <p className="mt-2 text-sm text-[#989aa2]">
                        Redeem an invite or browse public competitions.
                      </p>
                    </Link>
                    <Link
                      to="/leagues/create"
                      className="border border-white/8 bg-white/3 px-4 py-4 text-white transition hover:bg-white/6 hover:no-underline"
                    >
                      <p className="ff-display text-2xl text-white">Create A League</p>
                      <p className="mt-2 text-sm text-[#989aa2]">
                        Start a private grid for your group and own the season narrative.
                      </p>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        ) : (
          <section id="how-to-play" className="space-y-6">
            <div className="space-y-3">
              <p className="ff-kicker">How To Play</p>
              <h2 className="ff-display text-4xl text-white md:text-5xl">
                Predict The Weekend. Beat Your League.
              </h2>
            </div>

            <div className="grid gap-6">
              <HowToPlayCard
                title="Build your race card"
                body="Choose the podium, fastest lap, biggest gainer, safety car call, and classified finishers before the window closes."
                accent={
                  <div className="grid gap-3 sm:grid-cols-2">
                    {["P1", "P2", "P3", "Fastest Lap"].map((slot) => (
                      <div key={slot} className="border border-white/8 bg-black/20 p-4">
                        <p className="ff-kicker">{slot}</p>
                        <p className="mt-2 text-xl font-black text-white">Driver Pick</p>
                      </div>
                    ))}
                  </div>
                }
              />
              <HowToPlayCard
                title="Compete inside leagues"
                body="Create a private competition for friends or jump into an invite link. Every weekend adds points to your running league table."
                accent={
                  <div className="space-y-3">
                    <div className="border border-white/8 bg-black/20 p-4">
                      <p className="ff-kicker">League Rank</p>
                      <p className="mt-2 text-3xl font-black text-[#e9c400]">P4</p>
                    </div>
                    <div className="border border-white/8 bg-black/20 p-4">
                      <p className="ff-kicker">Weekend Score</p>
                      <p className="mt-2 text-3xl font-black text-white">126 pts</p>
                    </div>
                  </div>
                }
              />
              <HowToPlayCard
                title="Review every scored round"
                body="After the race, compare your picks against the actual results, see where the points came from, and track your season trend."
                accent={
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border border-white/8 bg-black/20 p-4">
                      <span className="ff-kicker">Round review</span>
                      <Badge tone="success">Scored</Badge>
                    </div>
                    <div className="border border-white/8 bg-black/20 p-4">
                      <p className="ff-kicker">Accuracy Snapshot</p>
                      <p className="mt-2 text-3xl font-black text-white">31%</p>
                    </div>
                  </div>
                }
              />
            </div>
          </section>
        )}
      </div>
    </section>
  );
}
