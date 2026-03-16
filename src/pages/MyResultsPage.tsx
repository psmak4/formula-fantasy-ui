import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { apiClient } from "../api/apiClient";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";

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
    roundsScored?: number;
    averagePoints?: number;
  };
  races?: MyResultsRace[];
};

function formatDate(value?: string): string {
  if (!value) return "Date pending";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Date pending";
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function breakdownEntries(breakdown?: Record<string, number>) {
  return Object.entries(breakdown ?? {}).filter(([, value]) => typeof value === "number");
}

export function MyResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedLeagueId, setSelectedLeagueId] = useState(searchParams.get("leagueId") ?? "");
  const [selectedSeason, setSelectedSeason] = useState(searchParams.get("season") ?? "");

  const leaguesQuery = useQuery({
    queryKey: ["my-leagues-for-results"],
    queryFn: () => apiClient.get<LeaguesResponse>("/me/leagues")
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
    } else {
      next.delete("leagueId");
    }
    if (selectedSeason) {
      next.set("season", selectedSeason);
    } else {
      next.delete("season");
    }
    setSearchParams(next, { replace: true });
  }, [selectedLeagueId, selectedSeason, setSearchParams]);

  const resultsQuery = useQuery({
    queryKey: ["my-results", selectedLeagueId, selectedSeason],
    enabled: Boolean(selectedLeagueId),
    queryFn: async () => {
      const params = new URLSearchParams({ leagueId: selectedLeagueId });
      if (selectedSeason) {
        params.set("season", selectedSeason);
      }
      return apiClient.get<MyResultsResponse>(`/me/results?${params.toString()}`);
    }
  });

  useEffect(() => {
    const apiSeason = resultsQuery.data?.seasonYear;
    if (!selectedSeason && apiSeason) {
      setSelectedSeason(String(apiSeason));
    }
  }, [resultsQuery.data?.seasonYear, selectedSeason]);

  const races = useMemo(() => resultsQuery.data?.races ?? [], [resultsQuery.data?.races]);
  const summary = resultsQuery.data?.summary;
  const seasonOptions = resultsQuery.data?.availableSeasons ?? [];

  return (
    <section className="pb-12 pt-20">
      <div className="relative z-10 mx-auto max-w-7xl space-y-8 px-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]">
          <Card className="overflow-hidden border-neutral-900 bg-[radial-gradient(circle_at_top_left,_rgba(239,68,68,0.22),_transparent_35%),linear-gradient(140deg,_#121212_0%,_#0f172a_52%,_#18181b_100%)] text-white shadow-[0_24px_80px_rgba(15,23,42,0.26)]">
            <CardHeader className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-white/12 text-white" tone="info">
                  {resultsQuery.data?.league?.name ?? "League results"}
                </Badge>
                <Badge className="bg-white/12 text-white" tone="info">
                  {resultsQuery.data?.seasonYear ?? "Season"}
                </Badge>
              </div>
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.36em] text-white/60">
                  Championship Archive
                </p>
                <h2 className="font-['Orbitron'] text-4xl font-bold uppercase tracking-tight text-white md:text-5xl">
                  My Results
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-white/72 md:text-base">
                  Review every completed weekend for your current league, track the scoring trend, and jump back into any race leaderboard.
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
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Season
                </label>
                <select
                  className="h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm"
                  value={selectedSeason}
                  onChange={(event) => setSelectedSeason(event.target.value)}
                >
                  {seasonOptions.length === 0 ? <option value="">Current season</option> : null}
                  {seasonOptions.map((season) => (
                    <option key={season} value={season}>
                      {season}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>
        </div>

        {resultsQuery.isLoading ? (
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((value) => (
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
                {resultsQuery.error instanceof Error ? resultsQuery.error.message : "Failed to load results"}
              </p>
            </CardContent>
          </Card>
        ) : null}

        {!resultsQuery.isLoading && !resultsQuery.error ? (
          <>
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="border-neutral-300">
                <CardHeader>
                  <CardTitle className="font-['Orbitron'] text-xl uppercase tracking-[0.14em]">Total points</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-['Orbitron'] text-4xl font-bold text-slate-950">
                    {summary?.totalPoints ?? 0}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-neutral-300">
                <CardHeader>
                  <CardTitle className="font-['Orbitron'] text-xl uppercase tracking-[0.14em]">Rounds scored</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-['Orbitron'] text-4xl font-bold text-slate-950">
                    {summary?.roundsScored ?? 0}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-neutral-300">
                <CardHeader>
                  <CardTitle className="font-['Orbitron'] text-xl uppercase tracking-[0.14em]">Average points</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-['Orbitron'] text-4xl font-bold text-slate-950">
                    {summary?.averagePoints ?? 0}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              {races.length === 0 ? (
                <Card className="border-neutral-300">
                  <CardContent className="py-8 text-center text-slate-500">
                    No completed and scored rounds yet for this league.
                  </CardContent>
                </Card>
              ) : null}

              {races.map((race) => {
                const entries = breakdownEntries(race.breakdown);
                return (
                  <Card key={`${race.raceId}-${race.round}`} className="overflow-hidden border-neutral-300">
                    <CardHeader className="border-b border-neutral-200 bg-[linear-gradient(135deg,_rgba(248,113,113,0.18),_rgba(59,130,246,0.12))]">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                            Round {race.round}
                          </p>
                          <h3 className="font-['Orbitron'] text-2xl font-bold uppercase text-slate-950">
                            {race.raceName ?? "Race"}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">{formatDate(race.raceStartAt)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Weekend score</p>
                          <p className="font-['Orbitron'] text-3xl font-bold uppercase text-slate-950">
                            {race.pointsTotal ?? 0} pts
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                      <div className="flex flex-wrap items-center gap-2">
                        {race.submitted ? <Badge tone="success">Submitted</Badge> : <Badge tone="warning">Missed round</Badge>}
                        {race.computedAt ? <Badge tone="info">Scored</Badge> : null}
                      </div>
                      {entries.length > 0 ? (
                        <div className="grid gap-3 md:grid-cols-3">
                          {entries.map(([label, value]) => (
                            <div key={label} className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label.replace(/_/g, " ")}</p>
                              <p className="mt-1 text-lg font-semibold text-slate-950">{value} pts</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">
                          {race.submitted ? "Score breakdown was not available for this round." : "No card was submitted for this completed round."}
                        </p>
                      )}
                      <div className="flex justify-end">
                        <Button asChild variant="outline">
                          <Link to={`/league/${selectedLeagueId}/races/${race.raceId}/leaderboard`}>
                            View race leaderboard
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
