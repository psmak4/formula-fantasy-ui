import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { apiClient } from "../api/apiClient";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";

type LeagueOption = {
  id?: string;
  name?: string;
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

  const races = useMemo(() => resultsQuery.data?.races ?? [], [resultsQuery.data?.races]);
  const summary = resultsQuery.data?.summary;
  const latestRound = resultsQuery.data?.latestRound ?? races[0] ?? null;
  const visibleRounds = useMemo(
    () => (hideMissedRounds ? races.filter((race) => race.submitted !== false) : races),
    [hideMissedRounds, races],
  );
  const selectedLeagueName = resultsQuery.data?.league?.name ?? "League";
  const availableSeasons = resultsQuery.data?.availableSeasons ?? [];
  const displayedSeason = resultsQuery.data?.seasonYear;

  const summaryAccuracy = 25;
  const latestRoundAccuracy = latestRound?.submitted ? 20 : null;
  const averageAccuracy = latestRound?.submitted ? 31 : null;

  return (
    <section className="px-6 py-14 md:py-20">
      <div className="mx-auto max-w-7xl space-y-10">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-4">
            <p className="ff-kicker">Season Intel</p>
            <h1 className="ff-display text-5xl text-white md:text-7xl">My Results</h1>
            <div className="flex flex-wrap gap-2">
              <span className="ff-kicker bg-[#cc0000] px-3 py-2 text-white">
                {displayedSeason ?? availableSeasons[0] ?? "Season"}
              </span>
              <span className="ff-kicker bg-white/6 px-3 py-2 text-[#d0d3d9]">
                {selectedLeagueName}
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:min-w-[420px]">
            <div className="border border-white/8 bg-white/3 px-5 py-4">
              <p className="ff-kicker">Total points</p>
              <p className="mt-2 text-4xl font-black text-white">{summary?.totalPoints ?? 0}</p>
            </div>
            <div className="border border-white/8 bg-white/3 px-5 py-4">
              <p className="ff-kicker">Season accuracy</p>
              <p className="mt-2 text-4xl font-black text-[#e9c400]">{summaryAccuracy}%</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_320px]">
          <Card className="overflow-hidden border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(204,0,0,0.22),transparent_28%),linear-gradient(145deg,#111217_0%,#171920_52%,#20232b_100%)] text-white">
            <CardContent className="px-8 py-7">
              <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-stretch">
                <div className="border border-white/10 bg-black/20 p-4">
                  <p className="ff-kicker">Round {latestRound?.round ?? "—"}</p>
                  <p className="ff-display mt-3 text-3xl text-white">
                    {latestRound?.raceName ?? "Latest Round"}
                  </p>
                  <p className="mt-3 text-sm text-white/70">
                    {formatDate(latestRound?.raceStartAt)}
                  </p>
                </div>

                <div className="space-y-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="ff-display text-4xl text-white md:text-5xl">
                        {latestRound?.submitted
                          ? latestRoundHeadline(latestRound)
                          : "Round Pending"}
                      </h2>
                      <p className="mt-2 max-w-2xl text-base text-white/82">
                        {latestRound?.submitted
                          ? "Your latest scored weekend is front and center, with rank movement and scoring signals pulled into a single control panel."
                          : "This round is on the timeline, but no submitted prediction card was available for scoring."}
                      </p>
                    </div>
                    <Button
                      asChild
                      variant="outline"
                      className="border-white/20 bg-white/6 text-white hover:bg-white/10"
                    >
                      <Link
                        to={
                          latestRound?.raceId
                            ? `/league/${selectedLeagueId}/races/${latestRound.raceId}/review`
                            : "/results"
                        }
                      >
                        Review round
                      </Link>
                    </Button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-4">
                    <div className="border border-white/10 bg-white/6 p-4">
                      <p className="ff-kicker">Points scored</p>
                      <p className="mt-2 text-3xl font-black text-white">
                        {latestRound?.pointsTotal ?? 0}
                      </p>
                    </div>
                    <div className="border border-white/10 bg-white/6 p-4">
                      <p className="ff-kicker">Round accuracy</p>
                      <p className="mt-2 text-3xl font-black text-white">
                        {latestRoundAccuracy !== null ? `${latestRoundAccuracy}%` : "—"}
                      </p>
                    </div>
                    <div className="border border-white/10 bg-white/6 p-4">
                      <p className="ff-kicker">League rank</p>
                      <p className="mt-2 text-3xl font-black text-white">
                        {formatPosition(latestRound?.rank)}
                      </p>
                    </div>
                    <div className="border border-white/10 bg-white/6 p-4">
                      <p className="ff-kicker">Benchmark</p>
                      <p className="mt-2 text-3xl font-black text-[#e9c400]">
                        {averageAccuracy !== null ? `${averageAccuracy}%` : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Badge tone={latestRound?.submitted ? "success" : "warning"}>
                      {latestRound?.submitted ? "Card submitted" : "No card submitted"}
                    </Badge>
                    {latestRound?.isBestRound ? <Badge tone="success">Best round</Badge> : null}
                    {latestRound?.computedAt ? <Badge tone="neutral">Scored</Badge> : null}
                    <span className="ml-auto text-sm text-white/70">
                      {formatSignedNumber(latestRound?.deltaFromAverage)} vs average
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
                <div className="border border-[#74662c] bg-black/10 p-4">
                  <p className="ff-kicker text-[#d4c68b]">Current position</p>
                  <p className="mt-2 text-3xl font-black text-white">
                    {formatPosition(summary?.currentPosition)}
                  </p>
                </div>
                <div className="border border-[#74662c] bg-black/10 p-4">
                  <p className="ff-kicker text-[#d4c68b]">Best round</p>
                  <p className="mt-2 text-3xl font-black text-white">
                    {summary?.bestRoundPoints ?? 0}
                  </p>
                </div>
                <div className="border border-[#74662c] bg-black/10 p-4">
                  <p className="ff-kicker text-[#d4c68b]">Rounds scored</p>
                  <p className="mt-2 text-3xl font-black text-white">
                    {summary?.roundsScored ?? 0}
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
            <label className="ff-kicker" htmlFor="resultsLeague">
              League
            </label>
            <select
              id="resultsLeague"
              className="h-11 border border-white/10 bg-[#0d0e12] px-4 text-sm text-white"
              value={selectedLeagueId}
              onChange={(event) => setSelectedLeagueId(event.target.value)}
            >
              {leagues.map((league) => (
                <option key={league.id} value={league.id}>
                  {league.name ?? "League"}
                </option>
              ))}
            </select>
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
                const placeholderAccuracy = race.submitted ? 30 : null;

                return (
                  <Card key={`${race.raceId}-${race.round}`} className="border-white/8 bg-[#15161b]">
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
                        <p className="text-sm text-[#e9c400]">
                          {placeholderAccuracy !== null ? `${placeholderAccuracy}%` : "—"} acc
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
      </div>
    </section>
  );
}
