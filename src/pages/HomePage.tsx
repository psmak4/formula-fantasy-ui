import { type ReactNode, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { LeagueIcon } from "../components/league/LeagueIcon";
import { authClient } from "@/auth/authClient";
import { apiClient } from "../api/apiClient";
import { toastApiError } from "../lib/api-error";
import { invalidateLeagueQueries, leagueInitials, parseInviteTokenOrLeagueId } from "../lib/leagueJoin";
import { buildCircuitAssetUrl, resolveRaceHeroTheme } from "../lib/raceHeroThemes";
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
  icon?: string;
  color?: string;
};

type LeaguesResponse = {
  leagues?: League[];
};

type LatestResultResponse = {
  leagueId?: string | null;
  leagueName?: string | null;
  latestRound?: {
    raceId?: string;
    round?: number;
    raceName?: string;
    pointsTotal?: number | null;
    status?: string;
  } | null;
};

const leagueIconBackgrounds = [
  "bg-red-600",
  "bg-black",
  "bg-blue-600",
  "bg-emerald-600",
  "bg-amber-500",
];

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
      data-interactive="true"
      className="ff-data-row hover:no-underline md:grid-cols-[minmax(0,1.4fr)_130px_120px]"
    >
      <div className="flex min-w-0 items-center gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center ${
            league.color ? "" : leagueIconBackgrounds[index % leagueIconBackgrounds.length]
          }`}
          style={league.color ? { backgroundColor: league.color } : undefined}
        >
          {league.icon ? (
            <LeagueIcon iconName={league.icon} />
          ) : (
            <span className="text-sm font-black text-white">
              {leagueInitials(league.name)}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-2xl font-semibold uppercase tracking-[0.04em] text-on-surface">
            {league.name}
          </p>
          <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
            <span>{league.visibility ?? "private"}</span>
            <span>{league.memberCount ?? 0} members</span>
          </div>
        </div>
      </div>

      <div>
        <p className="ff-kicker">Players</p>
        <p className="mt-2 text-3xl font-black text-on-surface">{league.memberCount ?? 0}</p>
      </div>

      <div className="text-left md:text-right">
        <p className="ff-kicker">Rank</p>
        <p className="mt-2 text-3xl font-black text-tertiary">{formatRank(league.rank)}</p>
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
    <Card className="ff-table-card overflow-hidden">
      <CardContent className="grid gap-6 px-6 py-6 md:grid-cols-[0.9fr_1.1fr] md:items-center">
        <div className="space-y-4">
          <p className="ff-kicker">How It Works</p>
          <h3 className="text-3xl font-semibold uppercase tracking-[0.04em] text-on-surface md:text-4xl">
            {title}
          </h3>
          <p className="max-w-xl text-sm leading-6 text-on-surface-variant md:text-base">{body}</p>
        </div>
        <div className="ff-field-shell bg-surface-container-low">{accent}</div>
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

  const latestResultQuery = useQuery({
    queryKey: ["me-latest-result"],
    enabled: Boolean(session?.user),
    queryFn: () =>
      apiClient.get<LatestResultResponse>("/me/latest-result").catch(() => ({} as LatestResultResponse)),
  });
  const latestResult = latestResultQuery.data ?? null;

  const nextRace = nextRaceQuery.data ?? null;
  const loading = nextRaceQuery.isLoading;
  const error =
    nextRaceQuery.error instanceof Error ? nextRaceQuery.error.message : null;
  const [inviteInput, setInviteInput] = useState("");
  const [joinState, setJoinState] = useState<"idle" | "joining" | "joined" | string>("idle");

  const raceName = useMemo(
    () => nextRace?.name ?? nextRace?.raceName ?? nextRace?.grandPrixName ?? "Next Grand Prix",
    [nextRace],
  );
  const heroTheme = useMemo(() => resolveRaceHeroTheme(raceName), [raceName]);
  const circuitAssetUrl = useMemo(() => buildCircuitAssetUrl(heroTheme), [heroTheme]);

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
  const lockAtLabel = useMemo(() => formatDateLabel(entryClosesAt), [entryClosesAt]);
  const leagues = myLeaguesQuery.data ?? [];
  const primaryLeague = leagues[0] ?? null;

  const joinLeagueMutation = useMutation({
    mutationFn: async (token: string) => {
      return apiClient.post<{ leagueId?: string }>(
        `/invites/${encodeURIComponent(token)}/join`,
      );
    },
    onMutate: () => {
      setJoinState("joining");
    },
    onSuccess: async (result) => {
      await invalidateLeagueQueries(queryClient);
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
      : predictionStatus === "locked"
        ? {
            href: "/results",
            label: "Review results",
          }
        : null
    : {
        href: predictionStatus === "open" ? "/sign-up" : "#how-to-play",
        label: predictionStatus === "open" ? "Create account" : "How it works",
      };

  const statusText = predictionStatus === "open"
    ? `Predictions lock ${lockAtLabel}`
    : predictionStatus === "opens_soon"
      ? "Next round opens soon"
      : `Round locked · ${localRaceTime}`;

  return (
    <section>
      {/* ── Hero ── */}
      <section
        className="ff-hero-band relative overflow-hidden"
        style={
          {
            "--ff-hero-primary": heroTheme.primary,
            "--ff-hero-secondary": heroTheme.secondary,
            "--ff-hero-glow": heroTheme.glow,
            "--ff-hero-accent-soft": heroTheme.accentSoft,
            "--ff-hero-circuit-width": heroTheme.overlayWidth,
            "--ff-hero-circuit-opacity": `${heroTheme.overlayOpacity}`,
            "--ff-hero-circuit-offset-x": heroTheme.overlayOffsetX,
            "--ff-hero-circuit-offset-y": heroTheme.overlayOffsetY,
            "--ff-hero-circuit-scale": `${heroTheme.overlayScale ?? 1}`,
          } as React.CSSProperties
        }
      >
        {circuitAssetUrl ? (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <img
              src={circuitAssetUrl}
              alt=""
              aria-hidden="true"
              className="ff-hero-circuit absolute left-1/2 top-1/2 opacity-0 md:opacity-100"
            />
          </div>
        ) : null}

        {loading ? (
          <div className="relative z-10 flex min-h-[100svh] flex-col items-center justify-center gap-8 px-8 py-16 text-center">
            <div className="h-2 w-16 animate-pulse bg-white/10" />
            <div className="h-28 w-[70vw] max-w-3xl animate-pulse bg-white/10 md:h-56" />
            <div className="h-[2px] w-12 bg-white/10" />
            <div className="h-2 w-32 animate-pulse bg-white/10" />
          </div>
        ) : error ? (
          <div className="relative z-10 flex min-h-[100svh] flex-col items-center justify-center gap-6 px-8 py-16 text-center">
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.35em] text-primary">
              Race Control
            </p>
            <h1 className="ff-display max-w-5xl text-[4rem] leading-[0.88] text-white md:text-[7rem]">
              Next race unavailable
            </h1>
            <div className="h-[2px] w-12 bg-primary" />
            <p className="max-w-xl text-xs leading-6 text-white/50">{error}</p>
            <Button variant="secondary" onClick={() => void nextRaceQuery.refetch()}>
              Retry feed
            </Button>
          </div>
        ) : (
          <div className="relative z-10 flex min-h-[100svh] flex-col items-center justify-center gap-5 px-8 py-16 text-center">
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.35em] text-white/40">
              Round {nextRace?.round ?? "—"}
            </p>
            <h1 className="ff-display max-w-6xl text-[5rem] leading-[0.88] text-white md:text-[9rem] lg:text-[11rem]">
              {raceName}
            </h1>
            <div className="h-[2px] w-12 bg-primary" />
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.28em] text-white/50">
              {statusText}
            </p>
            {heroButton ? (
              <div className="mt-4">
                <Button asChild size="lg">
                  <Link to={heroButton.href}>{heroButton.label}</Link>
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </section>

      {/* ── Below hero ── */}
      {session?.user && !sessionPending ? (
        <div className="ff-page">
          <div className="ff-shell">

            {latestResult?.latestRound?.status === "scored" ? (
              <div className="pb-3">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="ff-kicker text-primary">Previous Round</span>
                  <span className="font-semibold uppercase tracking-[0.06em] text-on-surface">
                    Round {latestResult.latestRound.round ?? "—"} · {latestResult.latestRound.raceName}
                  </span>
                  {typeof latestResult.latestRound.pointsTotal === "number" ? (
                    <span className="text-sm font-black text-on-surface">
                      {latestResult.latestRound.pointsTotal} PTS
                    </span>
                  ) : null}
                  {latestResult.leagueId && latestResult.latestRound.raceId ? (
                    <Link
                      to={`/league/${latestResult.leagueId}/races/${latestResult.latestRound.raceId}/review`}
                      className="ml-auto text-sm font-semibold text-primary hover:underline"
                    >
                      View predictions →
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}

            <section className="space-y-6">
              {/* My Leagues */}
              <Card>
                <CardContent className="px-0 py-0">
                  <div className="flex items-center justify-between gap-3 bg-surface-container-low px-5 py-3.5">
                    <div>
                      <p className="text-3xl font-semibold uppercase tracking-[0.04em] text-on-surface">
                        My Leagues
                      </p>
                      <p className="mt-2 text-sm text-on-surface-variant">
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
                          className="h-24 rounded-lg animate-pulse bg-surface-container-low"
                        />
                      ))}
                    </div>
                  ) : null}

                  {myLeaguesQuery.error ? (
                    <div className="px-6 py-6">
                      <div className="bg-error-container px-4 py-3 text-sm text-on-error-container">
                        {myLeaguesQuery.error instanceof Error
                          ? myLeaguesQuery.error.message
                          : "Failed to load leagues"}
                      </div>
                    </div>
                  ) : null}

                  {!myLeaguesQuery.isLoading && !myLeaguesQuery.error ? (
                    leagues.length === 0 ? (
                      <div className="px-6 py-10 text-center">
                        <p className="text-2xl font-semibold uppercase tracking-[0.04em] text-on-surface">
                          No Leagues Yet
                        </p>
                        <p className="mx-auto mt-3 max-w-2xl text-sm text-on-surface-variant">
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

              {/* Quick action cards */}
              <div className="grid gap-6 xl:grid-cols-3">
                <Card>
                  <CardContent className="space-y-5 px-6 py-6">
                    <div className="space-y-3">
                      <h2 className="text-3xl font-semibold uppercase tracking-[0.04em] text-on-surface">
                        Invite Access
                      </h2>
                      <p className="text-sm leading-6 text-on-surface-variant">
                        Paste an invite token or league link to jump straight into a grid.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="homeInvite">League invite link or token</Label>
                      <Input
                        id="homeInvite"
                        placeholder="Paste invite token or league link…"
                        value={inviteInput}
                        onChange={(event) => {
                          setInviteInput(event.target.value);
                          if (joinState !== "idle") {
                            setJoinState("idle");
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-3">
                      <Button
                        className="w-full"
                        onClick={handleJoinLeague}
                        disabled={joinState === "joining"}
                      >
                        {joinState === "joining" ? "Joining…" : "Join league"}
                      </Button>
                      <p className="text-sm text-on-surface-variant">
                        {joinState === "idle"
                          ? "Drop in via invite or open an existing league directly."
                          : joinState === "joined"
                            ? "Redirecting…"
                            : joinState}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="space-y-5 px-6 py-6">
                    <div className="space-y-3">
                      <h2 className="text-3xl font-semibold uppercase tracking-[0.04em] text-on-surface">
                        Join A League
                      </h2>
                      <p className="text-sm leading-6 text-on-surface-variant">
                        Redeem an invite or browse public competitions already on the board.
                      </p>
                    </div>
                    <Button asChild variant="outline" className="w-full">
                      <Link to="/join">Browse leagues</Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="space-y-5 px-6 py-6">
                    <div className="space-y-3">
                      <h2 className="text-3xl font-semibold uppercase tracking-[0.04em] text-on-surface">
                        Create A League
                      </h2>
                      <p className="text-sm leading-6 text-on-surface-variant">
                        Start a private grid for your group and shape the season narrative yourself.
                      </p>
                    </div>
                    <Button asChild variant="outline" className="w-full">
                      <Link to="/leagues/create">Create league</Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </section>
          </div>
        </div>
      ) : !session?.user && !sessionPending ? (
        <div className="ff-page">
          <div className="ff-shell">
            <section id="how-to-play" className="space-y-6">
              <div className="space-y-3">
                <p className="ff-kicker">How To Play</p>
                <h2 className="ff-display text-4xl text-on-surface md:text-5xl">
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
                        <div key={slot} className="bg-surface-container-lowest p-4">
                          <p className="ff-kicker">{slot}</p>
                          <p className="mt-2 text-xl font-black text-on-surface">Driver Pick</p>
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
                      <div className="bg-surface-container-lowest p-4">
                        <p className="ff-kicker">League Rank</p>
                        <p className="mt-2 text-3xl font-black text-tertiary">P4</p>
                      </div>
                      <div className="bg-surface-container-lowest p-4">
                        <p className="ff-kicker">Weekend Score</p>
                        <p className="mt-2 text-3xl font-black text-on-surface">126 pts</p>
                      </div>
                    </div>
                  }
                />
                <HowToPlayCard
                  title="Review every scored round"
                  body="After the race, compare your picks against the actual results, see where the points came from, and track your season trend."
                  accent={
                    <div className="space-y-3">
                      <div className="flex items-center justify-between bg-surface-container-lowest p-4">
                        <span className="ff-kicker">Round review</span>
                        <Badge tone="success">Scored</Badge>
                      </div>
                      <div className="bg-surface-container-lowest p-4">
                        <p className="ff-kicker">Scored Round</p>
                        <p className="mt-2 text-3xl font-black text-on-surface">Review</p>
                      </div>
                    </div>
                  }
                />
              </div>
            </section>
          </div>
        </div>
      ) : null}
    </section>
  );
}
