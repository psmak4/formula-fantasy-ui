import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { apiClient } from "../api/apiClient";
import { AppPageHeader } from "../components/layout/AppPageHeader";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";
import { type BreakdownRow, type ResultStatus } from "../lib/resultDetails";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

type NextRaceResponse = {
  raceId?: string;
  round?: number;
  name?: string;
  raceName?: string;
  grandPrixName?: string;
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

type LeagueOption = {
  id?: string;
  name?: string;
  createdAt?: string;
};

type LeaguesResponse = {
  leagues?: LeagueOption[];
};

type MyResultsRace = {
  raceId?: string;
  round?: number;
  raceName?: string;
  raceStartAt?: string;
  computedAt?: string;
  pointsTotal?: number | null;
  submitted?: boolean;
  status?: ResultStatus;
  breakdown?: Record<string, number>;
  breakdownRows?: BreakdownRow[];
  rank?: number | null;
  deltaFromAverage?: number | null;
  isBestRound?: boolean;
  performanceLabel?: string;
  accuracy?: number | null;
};

type MyResultsResponse = {
  league?: {
    id?: string;
    name?: string;
  };
  user?: {
    id?: string;
    displayName?: string;
  };
  seasonYear?: number;
  availableSeasons?: number[];
  summary?: {
    totalPoints?: number;
    currentPosition?: number | null;
    roundsScored?: number;
    averagePoints?: number;
    bestRoundPoints?: number | null;
    accuracy?: number | null;
  };
  latestRound?: MyResultsRace | null;
  races?: MyResultsRace[];
};

function formatDate(value?: string): string {
  if (!value) return "Date pending";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Date pending";
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatPosition(value?: number | null): string {
  return typeof value === "number" ? `P${value}` : "—";
}

function parseTimestamp(value?: string): number | null {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

function MyResultsSkeleton() {
  return (
    <>
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-4">
          <p className="ff-kicker">Season Intel</p>
          <h1 className="ff-display text-5xl text-on-surface md:text-7xl">My Results</h1>
          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
            <div className="skeleton-line h-10 w-24" />
            <div className="skeleton-line h-4 w-16" />
            <div className="skeleton-line h-10 w-[320px] max-w-full" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:min-w-[600px]">
          {[1, 2, 3, 4].map((value) => (
            <div key={value} className="ff-field-shell px-5 py-4">
              <div className="skeleton-line h-4 w-28" />
              <div className="mt-3 skeleton-line h-10 w-24" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="space-y-2">
          <p className="ff-kicker">Season Timeline</p>
          <h2 className="ff-display text-4xl text-on-surface">Round History</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="skeleton-line h-10 w-40" />
          <div className="skeleton-line h-10 w-24" />
        </div>
      </div>

      <div className="space-y-4">
        {[1, 2, 3].map((value) => (
          <Card key={value} className="ff-table-card ">
            <CardContent className="grid gap-5 px-6 py-6 lg:grid-cols-[minmax(0,1.8fr)_100px_100px_100px_150px] lg:items-center">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="skeleton-line h-7 w-24" />
                  <div className="skeleton-line h-7 w-24" />
                </div>
                <div className="skeleton-line h-10 w-72" />
                <div className="skeleton-line h-4 w-40" />
              </div>
              {[1, 2, 3].map((inner) => (
                <div key={inner} className="space-y-2">
                  <div className="skeleton-line h-4 w-16" />
                  <div className="skeleton-line h-8 w-16" />
                </div>
              ))}
              <div className="skeleton-line h-11 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

export function MyResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedLeagueId, setSelectedLeagueId] = useState(
    searchParams.get("leagueId") ?? "",
  );
  const [hideMissedRounds, setHideMissedRounds] = useState(false);

  const leaguesQuery = useQuery({
    queryKey: ["my-leagues-for-results"],
    queryFn: () => apiClient.get<LeaguesResponse>("/me/leagues"),
  });

  const leagues = leaguesQuery.data?.leagues ?? [];
  const selectedLeague = useMemo(
    () => leagues.find((league) => league.id === selectedLeagueId) ?? null,
    [leagues, selectedLeagueId],
  );
  const selectedLeagueCreatedAtMs = useMemo(
    () => parseTimestamp(selectedLeague?.createdAt),
    [selectedLeague?.createdAt],
  );

  useEffect(() => {
    if (!selectedLeagueId && leagues.length > 0) {
      const firstLeagueId = leagues[0]?.id ?? "";
      if (firstLeagueId) {
        setSelectedLeagueId(firstLeagueId);
      }
    }
  }, [leagues, selectedLeagueId]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (selectedLeagueId) {
      next.set("leagueId", selectedLeagueId);
    }
    setSearchParams(next, { replace: true });
  }, [selectedLeagueId, setSearchParams]);

  const resultsQuery = useQuery({
    queryKey: ["my-results", selectedLeagueId],
    enabled: Boolean(selectedLeagueId),
    queryFn: async () => {
      const params = new URLSearchParams({ leagueId: selectedLeagueId });
      return apiClient.get<MyResultsResponse>(`/me/results?${params.toString()}`);
    },
  });

  const nextRaceQuery = useQuery({
    queryKey: ["f1", "next-race"],
    queryFn: () =>
      apiClient.get<NextRaceResponse>("/f1/next-race").catch(() => ({}) as NextRaceResponse),
  });
  const nextRace = nextRaceQuery.data ?? null;

  const nextRaceName = nextRace?.name ?? nextRace?.raceName ?? nextRace?.grandPrixName ?? null;

  const nextRaceIsOpen = useMemo(() => {
    if (!nextRace) return false;
    const closeAt = nextRace.entryClosesAt ?? nextRace.predictionClosesAt ?? nextRace.lockAt;
    const openAt = nextRace.entryOpensAt ?? nextRace.predictionOpensAt ?? nextRace.openAt;
    const closeTs = closeAt ? new Date(closeAt).getTime() : NaN;
    const openTs = openAt ? new Date(openAt).getTime() : NaN;
    const now = Date.now();
    const lockedByApi =
      nextRace.predictionLocked === true ||
      nextRace.entriesLocked === true ||
      nextRace.lockStatus === "locked" ||
      nextRace.windowStatus === "locked";
    if (lockedByApi || (!Number.isNaN(closeTs) && now >= closeTs)) return false;
    if (!Number.isNaN(openTs) && now < openTs) return false;
    return true;
  }, [nextRace]);

  const races = useMemo(() => {
    const allRaces = resultsQuery.data?.races ?? [];
    if (selectedLeagueCreatedAtMs === null) {
      return allRaces;
    }

    return allRaces.filter((race) => {
      const raceStartMs = parseTimestamp(race.raceStartAt);
      if (raceStartMs === null) {
        return true;
      }
      return raceStartMs >= selectedLeagueCreatedAtMs;
    });
  }, [resultsQuery.data?.races, selectedLeagueCreatedAtMs]);
  const summary = resultsQuery.data?.summary;
  const visibleRounds = useMemo(
    () => (hideMissedRounds ? races.filter((race) => race.submitted !== false) : races),
    [hideMissedRounds, races],
  );
  const availableSeasons = resultsQuery.data?.availableSeasons ?? [];
  const displayedSeason = resultsQuery.data?.seasonYear;

  const averagePointsLabel =
    typeof summary?.averagePoints === "number" ? summary.averagePoints.toFixed(1) : "—";
  const isInitialLoading =
    leaguesQuery.isLoading ||
    (Boolean(selectedLeagueId) && resultsQuery.isLoading && !resultsQuery.data);

  return (
    <section className="ff-page">
      <div className="ff-shell">
        {isInitialLoading ? (
          <MyResultsSkeleton />
        ) : (
          <>
            <AppPageHeader
              eyebrow="Season Intel"
              title="My Results"
              description="Track your season totals and jump straight into completed round reviews."
              utility={
                <div className="flex w-full flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="ff-kicker" htmlFor="resultsLeague">
                      League
                    </label>
                    <Select value={selectedLeagueId} onValueChange={setSelectedLeagueId}>
                      <SelectTrigger id="resultsLeague" className="min-w-[260px] md:w-[380px]">
                        <SelectValue placeholder="Select league" />
                      </SelectTrigger>
                      <SelectContent>
                        {leagues.map((league) => (
                          <SelectItem key={league.id} value={league.id ?? ""}>
                            {league.name ?? "League"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Badge variant="secondary">
                      {displayedSeason ?? availableSeasons[0] ?? "Season"}
                    </Badge>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 xl:min-w-[600px]">
                    <div className="rounded-md bg-surface-container-low px-4 py-3">
                      <p className="ff-kicker">Total points</p>
                      <p className="mt-2 text-2xl font-black text-on-surface">
                        {summary?.totalPoints ?? 0}
                      </p>
                    </div>
                    <div className="rounded-md bg-surface-container-low px-4 py-3">
                      <p className="ff-kicker">Average points</p>
                      <p className="mt-2 text-2xl font-black text-tertiary">
                        {averagePointsLabel}
                      </p>
                    </div>
                    <div className="rounded-md bg-surface-container-low px-4 py-3">
                      <p className="ff-kicker">Position</p>
                      <p className="mt-2 text-2xl font-black text-on-surface-variant">
                        {formatPosition(summary?.currentPosition)}
                      </p>
                    </div>
                    <div className="rounded-md bg-surface-container-low px-4 py-3">
                      <p className="ff-kicker">Rounds scored</p>
                      <p className="mt-2 text-2xl font-black text-on-surface">
                        {summary?.roundsScored ?? 0}
                      </p>
                    </div>
                  </div>
                </div>
              }
            />

            {nextRaceName ? (
              <div className="flex flex-wrap items-center gap-3 rounded-lg bg-surface-container-low px-4 py-3 text-sm">
                <span className="ff-kicker text-primary">Next Race</span>
                <span className="font-semibold uppercase tracking-[0.06em] text-on-surface">
                  Round {nextRace?.round ?? "—"} · {nextRaceName}
                </span>
                {nextRaceIsOpen && selectedLeagueId ? (
                  <Button asChild variant="outline" size="sm" className="ml-auto">
                    <Link to={`/league/${selectedLeagueId}/predict`}>Go to predictions →</Link>
                  </Button>
                ) : (
                  <span className="ml-auto text-xs text-on-surface-variant">Predictions not yet open</span>
                )}
              </div>
            ) : null}

            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="space-y-2">
                <p className="ff-kicker">Season Timeline</p>
                <h2 className="ff-display text-4xl text-on-surface">Round History</h2>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className={`px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] transition ${
                    hideMissedRounds
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low"
                  }`}
                  onClick={() => setHideMissedRounds((value) => !value)}
                >
                  {hideMissedRounds ? "Submitted only" : "Hide missed rounds"}
                </button>
              </div>
            </div>

            {resultsQuery.isLoading ? (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3].map((value) => (
                  <div
                    key={value}
                    className="h-52 rounded-lg animate-pulse bg-inverse-surface"
                  />
                ))}
              </div>
            ) : null}

            {resultsQuery.error ? (
              <Card className="bg-error-container">
                <CardContent className="py-5">
                  <p className="text-error">
                    {resultsQuery.error instanceof Error
                      ? resultsQuery.error.message
                      : "Failed to load results"}
                  </p>
                </CardContent>
              </Card>
            ) : null}

            {!resultsQuery.isLoading && !resultsQuery.error ? (
              visibleRounds.length === 0 ? (
                <Card className="ff-table-card ">
                  <CardContent className="py-14 text-center">
                    <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-high text-2xl">
                      🏎
                    </div>
                    <p className="text-xl font-semibold uppercase tracking-[0.04em] text-on-surface">No Scored Rounds Yet</p>
                    <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-on-surface-variant">
                      Completed rounds will appear here once they've been scored. Check back after race weekend.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {visibleRounds.map((race) => {
                    return (
                      <Card
                        key={`${race.raceId}-${race.round}`}
                        className="ff-table-card "
                      >
                        <CardContent className="px-6 py-6">
                          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.8fr)_100px_100px_100px_150px] lg:items-center">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-2xl font-semibold uppercase tracking-[0.04em] text-on-surface">
                                  {race.raceName ?? "Race"}
                                </p>
                                {race.isBestRound ? (
                                  <span className="bg-tertiary-container px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-on-tertiary-container">
                                    Best Round
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-1 text-sm text-on-surface-variant">
                                Round {race.round ?? "—"} · {formatDate(race.raceStartAt)}
                              </p>
                              {race.performanceLabel ? (
                                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.1em] text-on-surface-variant">
                                  {race.performanceLabel}
                                </p>
                              ) : null}
                            </div>

                            <div>
                              <p className="ff-kicker">Points</p>
                              <p className="mt-2 text-3xl font-black text-on-surface">
                                {typeof race.pointsTotal === "number" ? race.pointsTotal : "—"}
                              </p>
                            </div>

                            <div>
                              <p className="ff-kicker">Rank</p>
                              <p className="mt-2 text-2xl font-black text-on-surface-variant">
                                {race.status === "scored" ? formatPosition(race.rank) : "—"}
                              </p>
                            </div>

                            <div>
                              <p className="ff-kicker">Accuracy</p>
                              <p className="mt-2 text-2xl font-black text-on-surface">
                                {typeof race.accuracy === "number" ? `${race.accuracy}%` : "—"}
                              </p>
                            </div>

                            <div className="space-y-2">
                              {typeof race.deltaFromAverage === "number" ? (
                                <p className={`text-xs font-semibold ${race.deltaFromAverage >= 0 ? "text-success" : "text-error"}`}>
                                  {race.deltaFromAverage >= 0 ? `+${race.deltaFromAverage}` : race.deltaFromAverage} vs avg
                                </p>
                              ) : null}
                              <Button asChild variant="outline" className="w-full">
                                <Link to={`/league/${selectedLeagueId}/races/${race.raceId}/review`}>
                                  Review
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
