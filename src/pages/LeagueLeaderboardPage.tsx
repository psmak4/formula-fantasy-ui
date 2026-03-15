import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { apiClient } from "../api/apiClient";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { Table } from "../components/ui/Table";

type Scoring = {
  available: boolean;
};

type LeaderboardRow = {
  rank: number;
  displayName: string;
  points: number;
  breakdown?: unknown;
  rankChange?: number;
  movement?: number;
  delta?: number;
};

type ApiLeaderboardRow = {
  rank?: number;
  user?: {
    displayName?: string;
  };
  displayName?: string;
  pointsTotal?: number;
  points?: number;
  breakdown?: unknown;
  rankChange?: number;
  movement?: number;
  delta?: number;
};

type LeaderboardResponse = {
  scoring?: Scoring;
  rows?: ApiLeaderboardRow[];
};

type LeagueResponse = {
  id?: string;
  name?: string;
  league?: {
    id?: string;
    name?: string;
  };
};

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
};

function breakdownText(breakdown: unknown): string {
  if (breakdown == null) return "No breakdown provided";
  if (typeof breakdown === "string") return breakdown;
  return JSON.stringify(breakdown, null, 2);
}

function rankDelta(row: LeaderboardRow): number | null {
  const value = row.rankChange ?? row.movement ?? row.delta;
  return typeof value === "number" ? value : null;
}

function normalizeRows(data: LeaderboardResponse | null): LeaderboardRow[] {
  if (!data) return [];
  return (data.rows ?? []).map((row, index) => ({
    rank: typeof row.rank === "number" ? row.rank : index + 1,
    displayName: row.user?.displayName ?? row.displayName ?? "Unknown manager",
    points: row.pointsTotal ?? row.points ?? 0,
    breakdown: row.breakdown,
    rankChange: row.rankChange,
    movement: row.movement,
    delta: row.delta,
  }));
}

function raceNameLabel(nextRace: NextRaceResponse | null, raceId?: string): string {
  if (!nextRace) {
    return raceId ? `Race ${raceId}` : "Race results";
  }

  const nextRaceId = nextRace.id ?? nextRace.raceId;
  if (raceId && nextRaceId && raceId === nextRaceId) {
    return (
      nextRace.name ??
      nextRace.raceName ??
      nextRace.grandPrixName ??
      `Race ${raceId}`
    );
  }

  return raceId ? `Race ${raceId}` : "Race results";
}

function raceStartLabel(nextRace: NextRaceResponse | null, raceId?: string): string {
  const nextRaceId = nextRace?.id ?? nextRace?.raceId;
  if (!nextRace || !raceId || !nextRaceId || raceId !== nextRaceId) {
    return "Historical race";
  }

  const raw =
    nextRace.startsAt ??
    nextRace.startTime ??
    nextRace.raceAt ??
    nextRace.raceStartAt ??
    nextRace.scheduledAt ??
    nextRace.date;
  if (!raw) return "Schedule unavailable";

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "Schedule unavailable";
  return parsed.toLocaleString();
}

export function LeagueLeaderboardPage() {
  const { leagueId, raceId } = useParams<{ leagueId: string; raceId: string }>();
  const { data, isLoading: loading, error, refetch } = useQuery({
    queryKey: ["league-leaderboard", leagueId, raceId],
    enabled: Boolean(leagueId && raceId),
    queryFn: async () => {
      if (!leagueId || !raceId) {
        throw new Error("Missing route parameters");
      }

      const [leaderboard, league, nextRace] = await Promise.all([
        apiClient.get<LeaderboardResponse>(
          `/leagues/${leagueId}/races/${raceId}/leaderboard`,
        ),
        apiClient
          .get<LeagueResponse>(`/leagues/${leagueId}`)
          .catch(() => ({}) as LeagueResponse),
        apiClient
          .get<NextRaceResponse>("/f1/next-race")
          .catch(() => null),
      ]);

      return { leaderboard, league, nextRace };
    },
  });

  const rows = useMemo(
    () => normalizeRows(data?.leaderboard ?? null),
    [data?.leaderboard],
  );
  const scoringAvailable = data?.leaderboard?.scoring?.available ?? true;
  const topScorer = rows[0];
  const leagueName = data?.league?.name ?? data?.league?.league?.name ?? "League";
  const raceName = raceNameLabel(data?.nextRace ?? null, raceId);
  const raceStart = raceStartLabel(data?.nextRace ?? null, raceId);

  return (
    <section className="relative w-full overflow-hidden bg-background bg-linear-to-b from-neutral-50 to-white pb-12 pt-20">
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
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]">
          <Card className="overflow-hidden border-neutral-900 bg-[radial-gradient(circle_at_top_left,_rgba(251,113,133,0.22),_transparent_34%),linear-gradient(145deg,_#18181b_0%,_#0f172a_44%,_#111827_100%)] text-white shadow-[0_24px_80px_rgba(15,23,42,0.28)]">
            <CardHeader className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-white/12 text-white" tone="info">
                  {leagueName}
                </Badge>
                <Badge className="bg-white/12 text-white" tone="info">
                  {raceName}
                </Badge>
                {scoringAvailable ? (
                  <Badge className="bg-emerald-200 text-emerald-950" tone="success">
                    Scored
                  </Badge>
                ) : (
                  <Badge className="bg-amber-200 text-amber-950" tone="warning">
                    Pending
                  </Badge>
                )}
              </div>
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.36em] text-white/60">
                  Race Results
                </p>
                <h2 className="font-['Orbitron'] text-4xl font-bold uppercase tracking-tight text-white md:text-5xl">
                  Leaderboard
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-white/72 md:text-base">
                  Final ranking for this race. Compare points swings, inspect the
                  scoring breakdown, and see who owned the weekend.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-white/6 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/58">
                    Leader
                  </p>
                  <p className="mt-2 font-['Orbitron'] text-xl font-bold uppercase text-white">
                    {topScorer?.displayName ?? "Waiting"}
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/6 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/58">
                    Winning score
                  </p>
                  <p className="mt-2 font-['Orbitron'] text-xl font-bold uppercase text-white">
                    {topScorer ? `${topScorer.points} pts` : "TBD"}
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/6 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/58">
                    Schedule
                  </p>
                  <p className="mt-2 text-sm font-medium text-white/82">
                    {raceStart}
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="border-neutral-300 bg-white/96">
            <CardHeader className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="font-['Orbitron'] text-xl uppercase tracking-[0.18em] text-slate-900">
                  Event Status
                </CardTitle>
                <Badge tone={scoringAvailable ? "success" : "warning"}>
                  {scoringAvailable ? "Results posted" : "Scoring pending"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Summary
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {scoringAvailable
                    ? "The race has been scored. Expand any row below to inspect its points breakdown."
                    : "Race scoring is not available yet. Final standings will populate after the result set is complete."}
                </p>
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link to={`/league/${leagueId}`}>Back to league</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <Card className="animate-pulse bg-background">
            <CardHeader>
              <div className="h-6 w-1/4 rounded bg-neutral-200" />
            </CardHeader>
            <CardContent>
              <div className="h-64 rounded bg-neutral-200" />
            </CardContent>
          </Card>
        ) : null}

        {error ? (
          <Card className="bg-red-50">
            <CardContent className="space-y-4 py-4">
              <p className="text-red-600">
                {error instanceof Error ? error.message : "Failed to load leaderboard"}
              </p>
              <Button variant="secondary" onClick={() => void refetch()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {!loading && !error && (
          <Card className="overflow-hidden bg-background transition hover:border-neutral-400">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="font-['Orbitron'] text-2xl uppercase tracking-[0.18em]">
                    Classification
                  </CardTitle>
                  <p className="text-sm text-slate-500">
                    Ranked league finishers for this race.
                  </p>
                </div>
                {topScorer ? (
                  <Badge tone="success">Manager of the race: {topScorer.displayName}</Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              <Table ariaLabel="Race leaderboard">
                <thead>
                  <tr>
                    <th className="w-20">Rank</th>
                    <th>Manager</th>
                    <th className="text-right">Points</th>
                    <th className="w-32">Breakdown</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={`${row.rank}-${row.displayName}`}>
                      <td>
                        <span className="rank-cell">
                          <span className="font-semibold">{row.rank}</span>
                          {rankDelta(row) !== null && (
                            <span
                              className={`rank-delta ${
                                (rankDelta(row) as number) > 0
                                  ? "up"
                                  : (rankDelta(row) as number) < 0
                                    ? "down"
                                    : "flat"
                              }`}
                            >
                              {(rankDelta(row) as number) > 0
                                ? `+${rankDelta(row)}`
                                : `${rankDelta(row)}`}
                            </span>
                          )}
                        </span>
                      </td>
                      <td>{row.displayName}</td>
                      <td className="text-right font-semibold">{row.points}</td>
                      <td>
                        {row.breakdown ? (
                          <details className="text-sm">
                            <summary className="cursor-pointer text-slate-500 hover:text-slate-700">
                              Show
                            </summary>
                            <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-600">
                              {breakdownText(row.breakdown)}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500">
                        No leaderboard entries yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
