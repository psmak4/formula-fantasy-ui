import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { apiClient } from "../api/apiClient";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";

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

function titleCaseBreakdownLabel(value: string): string {
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
      return apiClient.get<MyResultsResponse>(
        `/me/results?${params.toString()}`,
      );
    },
  });

  const races = useMemo(
    () => resultsQuery.data?.races ?? [],
    [resultsQuery.data?.races],
  );
  const summary = resultsQuery.data?.summary;
  const latestRound = resultsQuery.data?.latestRound ?? races[0] ?? null;

  return (
    <section className="pb-12 pt-20">
      <div className="relative z-10 mx-auto max-w-7xl space-y-8 px-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_360px]">
          <Card className="overflow-hidden border-neutral-900 bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.22),transparent_35%),linear-gradient(140deg,#121212_0%,#0f172a_52%,#18181b_100%)] text-white shadow-[0_24px_80px_rgba(15,23,42,0.26)]">
            <CardHeader className="space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-white/12 text-white" tone="info">
                  {resultsQuery.data?.league?.name ?? "League results"}
                </Badge>
                <Badge className="bg-white/12 text-white" tone="info">
                  {resultsQuery.data?.seasonYear ?? "Season"}
                </Badge>
                {typeof summary?.currentPosition === "number" ? (
                  <Badge className="bg-red-600/90 text-white" tone="info">
                    {formatPosition(summary.currentPosition)} in league
                  </Badge>
                ) : null}
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.36em] text-white/60">
                  Season Performance
                </p>
                <h2 className="font-['Orbitron'] text-4xl font-bold uppercase tracking-tight text-white md:text-5xl">
                  My Results
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-white/72 md:text-base">
                  Follow your season story round by round, check your latest
                  scored weekend, and jump straight into any race leaderboard.
                </p>
              </div>
            </CardHeader>
          </Card>

          <Card className="border-neutral-300 bg-white/96">
            <CardHeader>
              <CardTitle className="font-['Orbitron'] text-xl uppercase tracking-[0.18em] text-slate-900">
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  League
                </label>
                <select
                  className="h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm"
                  value={selectedLeagueId}
                  onChange={(event) => setSelectedLeagueId(event.target.value)}
                >
                  {leagues.map((league) => (
                    <option key={league.id} value={league.id}>
                      {league.name ?? "League"}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>
        </div>

        {resultsQuery.isLoading ? (
          <div className="grid gap-6 md:grid-cols-4">
            {[1, 2, 3, 4].map((value) => (
              <Card key={value} className="animate-pulse bg-background">
                <CardHeader>
                  <div className="h-6 w-3/4 rounded bg-neutral-200" />
                </CardHeader>
                <CardContent>
                  <div className="h-4 w-1/2 rounded bg-neutral-200" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}

        {resultsQuery.error ? (
          <Card className="bg-red-50">
            <CardContent className="py-4">
              <p className="text-red-600">
                {resultsQuery.error instanceof Error
                  ? resultsQuery.error.message
                  : "Failed to load results"}
              </p>
            </CardContent>
          </Card>
        ) : null}

        {!resultsQuery.isLoading && !resultsQuery.error ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card className="border-neutral-300">
                <CardContent className="space-y-2 pt-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Total points
                  </p>
                  <p className="font-['Orbitron'] text-4xl font-bold text-slate-950">
                    {summary?.totalPoints ?? 0}
                  </p>
                  <p className="text-sm text-slate-500">
                    Across all scored rounds in this league.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-neutral-300">
                <CardContent className="space-y-2 pt-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Current position
                  </p>
                  <p className="font-['Orbitron'] text-4xl font-bold text-slate-950">
                    {formatPosition(summary?.currentPosition)}
                  </p>
                  <p className="text-sm text-slate-500">
                    Cumulative standing for the selected league.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-neutral-300">
                <CardContent className="space-y-2 pt-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Rounds scored
                  </p>
                  <p className="font-['Orbitron'] text-4xl font-bold text-slate-950">
                    {summary?.roundsScored ?? 0}
                  </p>
                  <p className="text-sm text-slate-500">
                    Completed weekends with final scoring.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-neutral-300">
                <CardContent className="space-y-2 pt-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Average / round
                  </p>
                  <p className="font-['Orbitron'] text-4xl font-bold text-slate-950">
                    {summary?.averagePoints ?? 0}
                  </p>
                  <p className="text-sm text-slate-500">
                    Best round:{" "}
                    {typeof summary?.bestRoundPoints === "number"
                      ? `${summary.bestRoundPoints} pts`
                      : "—"}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.95fr)]">
              <Card className="overflow-hidden border-neutral-300 shadow-sm">
                <CardHeader className="border-b border-neutral-200 bg-[linear-gradient(135deg,rgba(248,113,113,0.18),rgba(59,130,246,0.12))]">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                        Latest scored round
                      </p>
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {latestRound?.round
                            ? `Round ${latestRound.round}`
                            : "Season opener pending"}
                        </p>
                        <h3 className="font-['Orbitron'] text-3xl font-bold uppercase text-slate-950">
                          {latestRound?.raceName ?? "No results yet"}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {formatDate(latestRound?.raceStartAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                        Weekend score
                      </p>
                      <p className="font-['Orbitron'] text-5xl font-bold text-slate-950">
                        {latestRound?.pointsTotal ?? 0}
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-500">
                        {formatPosition(latestRound?.rank)}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5 pt-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="info">
                      {latestRoundHeadline(latestRound)}
                    </Badge>
                    {latestRound?.submitted ? (
                      <Badge tone="success">Card submitted</Badge>
                    ) : (
                      <Badge tone="warning">No card submitted</Badge>
                    )}
                    {latestRound?.isBestRound ? (
                      <Badge tone="success">Best round</Badge>
                    ) : null}
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        League finish
                      </p>
                      <p className="mt-2 font-['Orbitron'] text-3xl font-bold text-slate-950">
                        {formatPosition(latestRound?.rank)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Vs season average
                      </p>
                      <p className="mt-2 font-['Orbitron'] text-3xl font-bold text-slate-950">
                        {formatSignedNumber(latestRound?.deltaFromAverage)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Status
                      </p>
                      <p className="mt-2 text-xl font-semibold text-slate-950">
                        {latestRound?.computedAt ? "Scored" : "Pending"}
                      </p>
                    </div>
                  </div>

                  {breakdownEntries(latestRound?.breakdown).length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Points breakdown
                      </p>
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {breakdownEntries(latestRound?.breakdown).map(
                          ([label, value]) => (
                            <div
                              key={label}
                              className="rounded-2xl border border-neutral-200 bg-white px-4 py-3"
                            >
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                {titleCaseBreakdownLabel(label)}
                              </p>
                              <p className="mt-1 text-lg font-semibold text-slate-950">
                                {value} pts
                              </p>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">
                      {latestRound?.submitted
                        ? "Score breakdown was not available for this round."
                        : "No card was submitted for this completed round."}
                    </p>
                  )}

                  {latestRound?.raceId ? (
                    <div className="flex justify-end">
                      <Button asChild variant="outline">
                        <Link
                          to={`/league/${selectedLeagueId}/races/${latestRound.raceId}/leaderboard`}
                        >
                          View race leaderboard
                        </Link>
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="border-neutral-300">
                <CardHeader>
                  <CardTitle className="font-['Orbitron'] text-xl uppercase tracking-[0.18em] text-slate-950">
                    Season snapshot
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-slate-600">
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Manager
                    </p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">
                      {resultsQuery.data?.user?.displayName ?? "Manager"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      League
                    </p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">
                      {resultsQuery.data?.league?.name ?? "League"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Season story
                    </p>
                    <p className="mt-2 leading-6 text-slate-600">
                      Your latest round is featured first, with every scored
                      weekend listed below in reverse chronological order.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Season Results
                  </p>
                  <h3 className="font-['Orbitron'] text-2xl font-bold uppercase text-slate-950">
                    Round history
                  </h3>
                </div>
              </div>

              {races.length === 0 ? (
                <Card className="border-neutral-300">
                  <CardContent className="py-10 text-center text-slate-500">
                    No completed and scored rounds yet for this league.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {races.map((race) => {
                    const entries = breakdownEntries(race.breakdown).slice(
                      0,
                      3,
                    );
                    return (
                      <Card
                        key={`${race.raceId}-${race.round}`}
                        className="border-neutral-300"
                      >
                        <CardContent className="flex flex-col gap-5 py-5 lg:flex-row lg:items-center lg:justify-between">
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge tone="info">R{race.round ?? "—"}</Badge>
                              {race.isBestRound ? (
                                <Badge tone="success">Best round</Badge>
                              ) : null}
                              {typeof race.rank === "number" ? (
                                <Badge tone="info">
                                  {formatPosition(race.rank)}
                                </Badge>
                              ) : null}
                            </div>
                            <div>
                              <h4 className="font-['Orbitron'] text-xl font-bold uppercase text-slate-950">
                                {race.raceName ?? "Race"}
                              </h4>
                              <p className="mt-1 text-sm text-slate-500">
                                {formatDate(race.raceStartAt)}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2 text-sm text-slate-500">
                              <span>
                                {race.performanceLabel ?? "Scored round"}
                              </span>
                              <span>•</span>
                              <span>
                                {formatSignedNumber(race.deltaFromAverage)} vs
                                average
                              </span>
                            </div>
                            {entries.length > 0 ? (
                              <div className="flex flex-wrap gap-2 pt-1">
                                {entries.map(([label, value]) => (
                                  <span
                                    key={label}
                                    className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium text-slate-600"
                                  >
                                    {titleCaseBreakdownLabel(label)} {value} pts
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>

                          <div className="flex items-center justify-between gap-6 lg:justify-end">
                            <div className="text-right">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Round score
                              </p>
                              <p className="font-['Orbitron'] text-3xl font-bold text-slate-950">
                                {race.pointsTotal ?? 0}
                              </p>
                            </div>
                            <Button asChild variant="outline">
                              <Link
                                to={`/league/${selectedLeagueId}/races/${race.raceId}/leaderboard`}
                              >
                                View results
                              </Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
