import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { apiClient } from "../api/apiClient";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";
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
  pointsTotal?: number;
  submitted?: boolean;
  breakdown?: Record<string, number>;
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

function titleCaseBreakdownLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function breakdownEntries(breakdown?: Record<string, number>) {
  return Object.entries(breakdown ?? {})
    .filter(([, value]) => typeof value === "number")
    .sort((left, right) => Math.abs(right[1]) - Math.abs(left[1]));
}

function latestRoundHeadline(race?: MyResultsRace | null): string {
  if (!race) return "No scored round yet";
  if (!race.submitted) return "No card submitted for this round";
  return race.performanceLabel ?? "Scored round";
}

function hasUsableScoredRound(race?: MyResultsRace | null): boolean {
  if (!race) return false;
  return race.submitted !== false;
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
          <h1 className="ff-display text-5xl text-white md:text-7xl">My Results</h1>
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_320px]">
        <Card className="ff-hero-band overflow-hidden border-white/8 text-white">
          <CardContent className="px-8 py-7">
            <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-stretch">
              <div className="border border-white/10 bg-black/20 p-4">
                <div className="skeleton-line h-4 w-20" />
                <div className="mt-3 skeleton-line h-24 w-full" />
                <div className="mt-3 skeleton-line h-4 w-32" />
              </div>
              <div className="space-y-4">
                <div className="skeleton-line h-14 w-1/2" />
                <div className="skeleton-line h-5 w-full" />
                <div className="skeleton-line h-5 w-5/6" />
                <div className="grid gap-4 sm:grid-cols-4">
                  {[1, 2, 3, 4].map((value) => (
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

        <Card className="ff-table-card border-white/8">
          <CardContent className="space-y-4 px-6 py-6">
            <div className="skeleton-line h-8 w-40" />
            {[1, 2, 3].map((value) => (
              <div key={value} className="ff-field-shell bg-white/3 px-4 py-4">
                <div className="skeleton-line h-4 w-24" />
                <div className="mt-3 skeleton-line h-8 w-20" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="space-y-2">
          <p className="ff-kicker">Season Timeline</p>
          <h2 className="ff-display text-4xl text-white">Round History</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="skeleton-line h-10 w-40" />
          <div className="skeleton-line h-10 w-24" />
        </div>
      </div>

      <div className="space-y-4">
        {[1, 2, 3].map((value) => (
          <Card key={value} className="ff-table-card border-white/8">
            <CardContent className="grid gap-5 px-6 py-6 lg:grid-cols-[minmax(0,1.5fr)_120px_120px_170px_150px] lg:items-center">
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
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-4">
            <p className="ff-kicker">Season Intel</p>
            <h1 className="ff-display text-5xl text-white md:text-7xl">My Results</h1>
            <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
              <span className="ff-kicker bg-[#cc0000] px-3 py-2 text-white">
                {displayedSeason ?? availableSeasons[0] ?? "Season"}
              </span>
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
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:min-w-[420px]">
            <div className="ff-field-shell bg-white/3 px-5 py-4">
              <p className="ff-kicker">Total points</p>
              <p className="mt-2 text-4xl font-black text-white">{summary?.totalPoints ?? 0}</p>
            </div>
            <div className="ff-field-shell bg-white/3 px-5 py-4">
              <p className="ff-kicker">Average points</p>
              <p className="mt-2 text-4xl font-black text-[#e9c400]">{averagePointsLabel}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_320px]">
          <Card className="ff-hero-band overflow-hidden border-white/8 text-white">
            <CardContent className="px-8 py-7">
              <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-stretch">
                <div className="border border-white/10 bg-black/20 p-4">
                  <p className="ff-kicker">Round {heroRound?.round ?? "—"}</p>
                  <p className="ff-display mt-3 text-3xl text-white">
                    {heroRound?.raceName ?? "No Scored Round Yet"}
                  </p>
                  <p className="mt-3 text-sm text-white/70">
                    {hasScoredResults ? formatDate(heroRound?.raceStartAt) : "Waiting for first scored result"}
                  </p>
                </div>

                <div className="space-y-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="ff-display text-4xl text-white md:text-5xl">
                        {hasScoredResults ? latestRoundHeadline(heroRound) : "No Scored Rounds Yet"}
                      </h2>
                      <p className="mt-2 max-w-2xl text-base text-white/82">
                        {hasScoredResults
                          ? heroRound?.submitted
                          ? "Your latest scored weekend is front and center, with rank movement and scoring signals pulled into a single control panel."
                          : "This round was scored, but you did not submit a prediction card for it."
                          : "This league does not have a scored race result for your entry yet. Once a submitted card is scored, your latest round snapshot will appear here."}
                      </p>
                    </div>
                    <Button
                      asChild
                      variant="outline"
                      className="border-white/20 bg-white/6 text-white hover:bg-white/10"
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
                  </div>

                  <div className="ff-stat-strip sm:grid-cols-4">
                    <div className="ff-stat bg-white/6">
                      <p className="ff-kicker">Points scored</p>
                      <p className="mt-2 text-3xl font-black text-white">
                        {hasScoredResults ? heroRound?.pointsTotal ?? 0 : "—"}
                      </p>
                    </div>
                    <div className="ff-stat bg-white/6">
                      <p className="ff-kicker">Average points</p>
                      <p className="mt-2 text-3xl font-black text-white">
                        {hasScoredResults ? averagePointsLabel : "—"}
                      </p>
                    </div>
                    <div className="ff-stat bg-white/6">
                      <p className="ff-kicker">League rank</p>
                      <p className="mt-2 text-3xl font-black text-white">
                        {hasScoredResults ? formatPosition(heroRound?.rank) : "—"}
                      </p>
                    </div>
                    <div className="ff-stat bg-white/6">
                      <p className="ff-kicker">Delta vs average</p>
                      <p className="mt-2 text-3xl font-black text-[#e9c400]">
                        {hasScoredResults ? formatSignedNumber(heroRound?.deltaFromAverage) : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Badge tone={hasScoredResults ? (heroRound?.submitted ? "success" : "warning") : "neutral"}>
                      {hasScoredResults
                        ? heroRound?.submitted
                          ? "Card submitted"
                          : "No card submitted"
                        : "No scored results"}
                    </Badge>
                    {hasScoredResults && heroRound?.isBestRound ? <Badge tone="success">Best round</Badge> : null}
                    {hasScoredResults && heroRound?.computedAt ? <Badge tone="neutral">Scored</Badge> : null}
                    <span className="ml-auto text-sm text-white/70">
                      {hasScoredResults
                        ? `${formatSignedNumber(heroRound?.deltaFromAverage)} vs average`
                        : "No result benchmark yet"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#594b11] bg-[#2b2508]">
            <CardContent className="space-y-5 px-6 py-6">
              <p className="ff-kicker text-[#e9c400]">Championship Radar</p>
              <p className="ff-display text-3xl text-white">Strategy Outlook</p>
              <p className="text-sm leading-6 text-[#d4c68b]">
                Keep stacking accurate weekends and defend your league position through the next scoring cycle.
              </p>
              <div className="space-y-3">
                <div className="ff-field-shell border border-[#74662c] bg-black/10">
                  <p className="ff-kicker text-[#d4c68b]">Current position</p>
                  <p className="mt-2 text-3xl font-black text-white">
                    {hasScoredResults ? formatPosition(summary?.currentPosition) : "—"}
                  </p>
                </div>
                <div className="ff-field-shell border border-[#74662c] bg-black/10">
                  <p className="ff-kicker text-[#d4c68b]">Best round</p>
                  <p className="mt-2 text-3xl font-black text-white">
                    {hasScoredResults ? (summary?.bestRoundPoints ?? 0) : "—"}
                  </p>
                </div>
                <div className="ff-field-shell border border-[#74662c] bg-black/10">
                  <p className="ff-kicker text-[#d4c68b]">Rounds scored</p>
                  <p className="mt-2 text-3xl font-black text-white">
                    {hasScoredResults ? (summary?.roundsScored ?? 0) : 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-2">
            <p className="ff-kicker">Season Timeline</p>
            <h2 className="ff-display text-4xl text-white">Round History</h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className={`border px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] transition ${
                hideMissedRounds
                  ? "border-[#cc0000] bg-[#cc0000] text-white"
                  : "border-white/10 bg-white/4 text-[#d0d3d9]"
              }`}
              onClick={() => setHideMissedRounds((value) => !value)}
            >
              {hideMissedRounds ? "Submitted only" : "Hide missed rounds"}
            </button>
            <span className="ff-kicker bg-white/6 px-3 py-2 text-[#d0d3d9]">
              {displayedSeason ?? availableSeasons[0] ?? "Season"}
            </span>
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
            <Card className="border-white/8 bg-[#15161b]">
              <CardContent className="py-10 text-center text-[#989aa2]">
                No completed and scored rounds yet for this league.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {visibleRounds.map((race) => {
                const topBreakdown = breakdownEntries(race.breakdown).slice(0, 2);
                const isMissed = race.submitted === false;
                return (
                  <Card key={`${race.raceId}-${race.round}`} className="ff-table-card border-white/8">
                    <CardContent className="grid gap-5 px-6 py-6 lg:grid-cols-[minmax(0,1.5fr)_120px_120px_170px_150px] lg:items-center">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {race.isBestRound ? <Badge tone="success">Best round</Badge> : null}
                          <Badge tone={isMissed ? "warning" : "info"}>
                            {isMissed ? "Missed round" : "Scored"}
                          </Badge>
                        </div>
                        <p className="ff-display mt-4 text-3xl text-white">
                          {race.raceName ?? "Race"}
                        </p>
                        <p className="mt-1 text-sm text-[#7f828b]">
                          Round {race.round ?? "—"} · {formatDate(race.raceStartAt)}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-3 text-xs font-medium uppercase tracking-[0.1em] text-[#989aa2]">
                          {topBreakdown.map(([label, value]) => (
                            <span key={label}>
                              {titleCaseBreakdownLabel(label)} {value} pts
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="ff-kicker">Points</p>
                        <p className="mt-2 text-3xl font-black text-white">
                          {race.pointsTotal ?? 0}
                        </p>
                      </div>

                      <div>
                        <p className="ff-kicker">Rank</p>
                        <p className="mt-2 text-2xl font-black text-[#d0d3d9]">
                          {formatPosition(race.rank)}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <p className="ff-kicker">Trend</p>
                        <p className="text-sm text-white">
                          {race.performanceLabel ?? "Scored round"}
                        </p>
                        <p className="text-sm text-[#7f828b]">
                          {formatSignedNumber(race.deltaFromAverage)} vs average
                        </p>
                      </div>

                      <div>
                        <Button asChild variant="outline" className="w-full">
                          <Link to={`/league/${selectedLeagueId}/races/${race.raceId}/review`}>
                            Review
                          </Link>
                        </Button>
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
