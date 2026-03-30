import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { apiClient } from "../api/apiClient";
import { AppPageHeader, AppPageHeaderStat } from "../components/layout/AppPageHeader";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";
import { type BreakdownRow, resultStatusLabel, resultStatusTone, type ResultStatus } from "../lib/resultDetails";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

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
  deltaFromAverage?: number;
  isBestRound?: boolean;
  performanceLabel?: string;
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

function formatSignedNumber(value?: number): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  if (value === 0) return "Even";
  return value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
}

function formatPosition(value?: number | null): string {
  return typeof value === "number" ? `P${value}` : "—";
}

function latestRoundHeadline(race?: MyResultsRace | null): string {
  if (!race) return "No scored round yet";
  if (race.status === "no_entry") return "No card submitted for this round";
  if (race.status === "pending") return "Round awaiting scoring";
  return race.performanceLabel ?? "Scored round";
}

function hasUsableScoredRound(race?: MyResultsRace | null): boolean {
  if (!race) return false;
  return race.status === "scored";
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
          <h1 className="ff-display text-5xl text-[#111318] md:text-7xl">My Results</h1>
          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
            <div className="skeleton-line h-10 w-24" />
            <div className="skeleton-line h-4 w-16" />
            <div className="skeleton-line h-10 w-[320px] max-w-full" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:min-w-[420px]">
          {[1, 2].map((value) => (
            <div key={value} className="ff-field-shell bg-white/3 px-5 py-4">
              <div className="skeleton-line h-4 w-28" />
              <div className="mt-3 skeleton-line h-10 w-24" />
            </div>
          ))}
        </div>
      </div>

      <div>
        <Card className="ff-hero-band overflow-hidden border-white/8 text-white">
          <CardContent className="px-8 py-7">
            <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-stretch">
              <div className="border border-white/10 bg-black/20 p-4">
                <div className="skeleton-line h-4 w-20" />
                <div className="mt-3 skeleton-line h-24 w-full" />
                <div className="mt-3 skeleton-line h-4 w-32" />
              </div>
              <div className="space-y-4">
                <div className="skeleton-line h-14 w-1/2" />
                <div className="skeleton-line h-5 w-full" />
                <div className="skeleton-line h-5 w-5/6" />
                <div className="grid gap-4 sm:grid-cols-3">
                  {[1, 2, 3].map((value) => (
                    <div key={value} className="ff-field-shell bg-white/3 px-4 py-4">
                      <div className="skeleton-line h-4 w-20" />
                      <div className="mt-3 skeleton-line h-8 w-16" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="space-y-2">
          <p className="ff-kicker">Season Timeline</p>
          <h2 className="ff-display text-4xl text-[#111318]">Round History</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="skeleton-line h-10 w-40" />
          <div className="skeleton-line h-10 w-24" />
        </div>
      </div>

      <div className="space-y-4">
        {[1, 2, 3].map((value) => (
          <Card key={value} className="ff-table-card border-[#d9dee5]">
            <CardContent className="grid gap-5 px-6 py-6 lg:grid-cols-[minmax(0,1.8fr)_120px_120px_150px] lg:items-center">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="skeleton-line h-7 w-24" />
                  <div className="skeleton-line h-7 w-24" />
                </div>
                <div className="skeleton-line h-10 w-72" />
                <div className="skeleton-line h-4 w-40" />
              </div>
              {[1, 2].map((inner) => (
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
  const latestRound = useMemo(() => {
    const apiLatestRound = resultsQuery.data?.latestRound ?? null;
    if (!apiLatestRound) {
      return races[0] ?? null;
    }

    if (selectedLeagueCreatedAtMs === null) {
      return apiLatestRound;
    }

    const latestRaceStartMs = parseTimestamp(apiLatestRound.raceStartAt);
    if (latestRaceStartMs !== null && latestRaceStartMs < selectedLeagueCreatedAtMs) {
      return races[0] ?? null;
    }

    return apiLatestRound;
  }, [resultsQuery.data?.latestRound, races, selectedLeagueCreatedAtMs]);
  const hasScoredResults = useMemo(
    () => races.some((race) => hasUsableScoredRound(race)),
    [races],
  );
  const heroRound = hasScoredResults ? latestRound : null;
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
          description="Track your season totals, open the latest round review, and scan every completed race in one place."
          stats={
            <>
              <AppPageHeaderStat label="Total points" value={summary?.totalPoints ?? 0} />
              <AppPageHeaderStat
                label="Average points"
                value={averagePointsLabel}
                accentClassName="text-[#e9c400]"
              />
            </>
          }
          utility={
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary">
                {displayedSeason ?? availableSeasons[0] ?? "Season"}
              </Badge>
              <label className="ff-kicker" htmlFor="resultsLeague">
                League
              </label>
              <Select value={selectedLeagueId} onValueChange={setSelectedLeagueId}>
                <SelectTrigger id="resultsLeague" className="min-w-[240px] md:w-[320px]">
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
            </div>
          }
        />

        <div>
          <Card className="ff-hero-band overflow-hidden border-white/8 text-white">
            <CardContent className="px-8 py-7">
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start">
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="ff-kicker text-white/60">
                      Round {heroRound?.round ?? "—"}
                    </p>
                    <Badge tone={hasScoredResults ? (heroRound?.submitted ? "success" : "warning") : "neutral"}>
                      {hasScoredResults
                        ? resultStatusLabel(heroRound?.status)
                        : "No scored results"}
                    </Badge>
                  </div>

                  <div>
                    <h2 className="ff-display text-4xl text-white md:text-5xl">
                      {hasScoredResults ? latestRoundHeadline(heroRound) : "No Scored Rounds Yet"}
                    </h2>
                    <p className="mt-2 max-w-3xl text-base leading-7 text-[#d7dbe1]">
                      {hasScoredResults
                        ? "Your latest scored round is highlighted here. Open the review page when you want the full scoring breakdown."
                        : "This league does not have a scored race result for your entry yet. Once a submitted card is scored, your latest round snapshot will appear here."}
                    </p>
                  </div>

                  <div className="grid gap-4 border-t border-white/10 pt-5 sm:grid-cols-3">
                    <div>
                      <p className="ff-kicker text-white/60">Race</p>
                      <p className="mt-2 text-2xl font-semibold uppercase tracking-[0.04em] text-white">
                        {heroRound?.raceName ?? "Awaiting first result"}
                      </p>
                    </div>
                    <div>
                      <p className="ff-kicker text-white/60">Date</p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-white">
                        {hasScoredResults ? formatDate(heroRound?.raceStartAt) : "Waiting for first scored result"}
                      </p>
                    </div>
                    <div>
                      <p className="ff-kicker text-white/60">Vs average</p>
                      <p className="mt-2 text-2xl font-black text-[#e9c400]">
                        {hasScoredResults ? formatSignedNumber(heroRound?.deltaFromAverage) : "—"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 lg:border-l lg:border-white/10 lg:pl-6">
                  <Button
                    asChild
                    variant="outline"
                    className="w-full !border-white/20 !bg-transparent !text-white hover:!bg-white/8 hover:!text-white"
                    disabled={!hasScoredResults}
                  >
                    <Link
                      to={
                        heroRound?.raceId
                          ? `/league/${selectedLeagueId}/races/${heroRound.raceId}/review`
                          : "/results"
                      }
                    >
                      {hasScoredResults ? "Review round" : "Awaiting results"}
                    </Link>
                  </Button>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    <div className="rounded-none border border-white/10 bg-black/15 px-4 py-4">
                      <p className="ff-kicker text-white/60">Round points</p>
                      <p className="mt-2 text-3xl font-black text-white">
                        {hasScoredResults ? heroRound?.pointsTotal ?? 0 : "—"}
                      </p>
                    </div>
                    <div className="rounded-none border border-white/10 bg-black/15 px-4 py-4">
                      <p className="ff-kicker text-white/60">Round rank</p>
                      <p className="mt-2 text-3xl font-black text-white">
                        {hasScoredResults ? formatPosition(heroRound?.rank) : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-2">
            <p className="ff-kicker">Season Timeline</p>
            <h2 className="ff-display text-4xl text-[#111318]">Round History</h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className={`border px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] transition ${
                hideMissedRounds
                  ? "border-[#e10600] bg-[#e10600] text-white"
                  : "border-[#d9dee5] bg-white text-[#45515f] hover:border-[#c8cfd8] hover:bg-[#f8f9fb]"
              }`}
              onClick={() => setHideMissedRounds((value) => !value)}
            >
              {hideMissedRounds ? "Submitted only" : "Hide missed rounds"}
            </button>
            <Badge variant="secondary">
              {displayedSeason ?? availableSeasons[0] ?? "Season"}
            </Badge>
          </div>
        </div>

        {resultsQuery.isLoading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((value) => (
              <div
                key={value}
                className="h-52 animate-pulse border border-white/8 bg-[#15161b]"
              />
            ))}
          </div>
        ) : null}

        {resultsQuery.error ? (
          <Card className="border-[#7a0d0d] bg-[#350909]">
            <CardContent className="py-5">
              <p className="text-[#ff8e8e]">
                {resultsQuery.error instanceof Error
                  ? resultsQuery.error.message
                  : "Failed to load results"}
              </p>
            </CardContent>
          </Card>
        ) : null}

        {!resultsQuery.isLoading && !resultsQuery.error ? (
          visibleRounds.length === 0 ? (
            <Card className="border-[#d9dee5] bg-white">
              <CardContent className="py-10 text-center text-[#66707d]">
                No completed and scored rounds yet for this league.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {visibleRounds.map((race) => {
                return (
                  <Card key={`${race.raceId}-${race.round}`} className="ff-table-card border-[#d9dee5]">
                    <CardContent className="px-6 py-6">
                      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.8fr)_120px_120px_150px] lg:items-center">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            {race.isBestRound ? <Badge tone="success">Best round</Badge> : null}
                            <Badge tone={resultStatusTone(race.status)}>
                              {resultStatusLabel(race.status)}
                            </Badge>
                          </div>
                          <p className="mt-4 text-2xl font-semibold uppercase tracking-[0.04em] text-[#111318]">
                            {race.raceName ?? "Race"}
                          </p>
                          <p className="mt-1 text-sm text-[#7f828b]">
                            Round {race.round ?? "—"} · {formatDate(race.raceStartAt)}
                          </p>
                          <p className="mt-3 max-w-2xl text-sm text-[#989aa2]">
                            {race.status === "scored"
                              ? "Open the round review for the full category-by-category scoring breakdown."
                              : race.status === "pending"
                                ? "This round has a submitted card, but scoring is still pending."
                                : "No prediction card was submitted for this round."}
                          </p>
                        </div>

                        <div>
                          <p className="ff-kicker">Points</p>
                          <p className="mt-2 text-3xl font-black text-[#111318]">
                            {typeof race.pointsTotal === "number" ? race.pointsTotal : "—"}
                          </p>
                        </div>

                        <div>
                          <p className="ff-kicker">Rank</p>
                          <p className="mt-2 text-2xl font-black text-[#45515f]">
                            {race.status === "scored" ? formatPosition(race.rank) : "—"}
                          </p>
                        </div>

                        <div>
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
