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

type Scoring = {
  available?: boolean;
  status?: "not_started" | "pending" | "failed" | "successful";
  latestRunAt?: string;
  computedAt?: string;
  failureReason?: string;
};

type LeaderboardRow = {
  rank: number;
  userId: string;
  displayName: string;
  points: number;
  breakdown: Record<string, number>;
  rankChange?: number;
  movement?: number;
  delta?: number;
};

type ApiLeaderboardRow = {
  rank?: number;
  user?: {
    id?: string;
    displayName?: string;
  };
  displayName?: string;
  pointsTotal?: number;
  points?: number;
  breakdown?: Record<string, number>;
  rankChange?: number;
  movement?: number;
  delta?: number;
};

type LeaderboardResponse = {
  raceId?: string;
  raceName?: string;
  raceStartAt?: string;
  openAt?: string;
  lockAt?: string;
  isOpen?: boolean;
  isLocked?: boolean;
  scoring?: Scoring;
  myRow?: ApiLeaderboardRow;
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

function rankDelta(row: LeaderboardRow): number | null {
  const value = row.rankChange ?? row.movement ?? row.delta;
  return typeof value === "number" ? value : null;
}

function normalizeRows(data: LeaderboardResponse | null): LeaderboardRow[] {
  if (!data) return [];
  return (data.rows ?? []).map((row, index) => ({
    rank: typeof row.rank === "number" ? row.rank : index + 1,
    userId: row.user?.id ?? "",
    displayName: row.user?.displayName ?? row.displayName ?? "Unknown manager",
    points: row.pointsTotal ?? row.points ?? 0,
    breakdown: row.breakdown ?? {},
    rankChange: row.rankChange,
    movement: row.movement,
    delta: row.delta,
  }));
}

function raceNameLabel(response: LeaderboardResponse | null, raceId?: string): string {
  return response?.raceName ?? (raceId ? `Race ${raceId}` : "Race results");
}

function formatDateTimeLabel(raw?: string): string {
  if (!raw) return "Schedule unavailable";

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "Schedule unavailable";
  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function scoreBreakdownLabel(key: string): string {
  switch (key) {
    case "P1_exact":
      return "Winner picked exactly";
    case "P2_exact":
      return "P2 picked exactly";
    case "P3_exact":
      return "P3 picked exactly";
    case "podium_wrong_position":
      return "Right podium driver, wrong slot";
    case "fastest_lap":
      return "Fastest lap call";
    case "biggest_gainer":
      return "Biggest gainer call";
    case "safety_car":
      return "Safety car call";
    case "classified_finishers":
      return "Classified finishers bucket";
    default:
      return key.replace(/_/g, " ");
  }
}

function breakdownEntries(breakdown?: Record<string, number>) {
  return Object.entries(breakdown ?? {})
    .filter(([, value]) => typeof value === "number" && value > 0)
    .sort((left, right) => right[1] - left[1]);
}

function scoringTone(scoring?: Scoring): "success" | "warning" | "danger" | "neutral" {
  switch (scoring?.status) {
    case "successful":
      return "success";
    case "failed":
      return "danger";
    case "pending":
      return "warning";
    default:
      return "neutral";
  }
}

function scoringLabel(scoring?: Scoring): string {
  switch (scoring?.status) {
    case "successful":
      return "Results Posted";
    case "failed":
      return "Scoring Failed";
    case "pending":
      return "Scoring Pending";
    case "not_started":
      return "Awaiting Scoring";
    default:
      return scoring?.available ? "Results Posted" : "Awaiting Scoring";
  }
}

function RaceLeaderboardSkeleton() {
  return (
    <>
      <div className="ff-grid-main" data-layout="rail">
        <Card className="ff-hero-band border-white/8 text-white">
          <CardHeader className="space-y-5">
            <div className="flex flex-wrap gap-3">
              <div className="skeleton-line h-9 w-32" />
              <div className="skeleton-line h-9 w-24" />
              <div className="skeleton-line h-9 w-36" />
            </div>
            <div className="space-y-4">
              <div className="skeleton-line h-4 w-32" />
              <div className="skeleton-line h-16 w-2/3" />
              <div className="skeleton-line h-5 w-full max-w-2xl" />
              <div className="skeleton-line h-5 w-5/6 max-w-xl" />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[1, 2, 3].map((value) => (
                <div key={value} className="ff-stat">
                  <div className="skeleton-line h-4 w-24" />
                  <div className="mt-3 skeleton-line h-10 w-2/3" />
                </div>
              ))}
            </div>
          </CardHeader>
        </Card>

        <div className="ff-side-stack">
          <Card className="border-white/8">
            <div className="ff-panel-strip">
              <div className="skeleton-line h-8 w-40" />
              <div className="skeleton-line h-8 w-28" />
            </div>
            <CardContent className="space-y-4 px-6 py-6">
              {[1, 2].map((value) => (
                <div key={value} className="ff-field-shell">
                  <div className="skeleton-line h-4 w-20" />
                  <div className="skeleton-line h-5 w-3/4" />
                  <div className="skeleton-line h-4 w-full" />
                </div>
              ))}
              <div className="skeleton-line h-12 w-full" />
              <div className="skeleton-line h-12 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="ff-table-card border-white/8">
        <div className="ff-panel-strip">
          <div className="space-y-2">
            <div className="skeleton-line h-8 w-48" />
            <div className="skeleton-line h-4 w-64" />
          </div>
          <div className="skeleton-line h-8 w-56" />
        </div>
        <CardContent className="px-0 py-0">
          <div className="space-y-px bg-white/4">
            {[1, 2, 3, 4].map((value) => (
              <div
                key={value}
                className="grid gap-4 bg-[#15161b] px-6 py-5 md:grid-cols-[96px_minmax(0,1.4fr)_minmax(220px,1fr)_110px]"
              >
                <div className="skeleton-line h-10 w-16" />
                <div className="space-y-2">
                  <div className="skeleton-line h-5 w-40" />
                  <div className="skeleton-line h-4 w-24" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="skeleton-line h-8 w-32" />
                  <div className="skeleton-line h-8 w-36" />
                </div>
                <div className="skeleton-line h-10 w-16 md:justify-self-end" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
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

      const [leaderboard, league] = await Promise.all([
        apiClient.get<LeaderboardResponse>(
          `/leagues/${leagueId}/races/${raceId}/leaderboard`,
        ),
        apiClient
          .get<LeagueResponse>(`/leagues/${leagueId}`)
          .catch(() => ({}) as LeagueResponse),
      ]);

      return { leaderboard, league };
    },
  });

  const rows = useMemo(
    () => normalizeRows(data?.leaderboard ?? null),
    [data?.leaderboard],
  );
  const scoring = data?.leaderboard?.scoring;
  const topScorer = rows[0];
  const leagueName = data?.league?.name ?? data?.league?.league?.name ?? "League";
  const raceName = raceNameLabel(data?.leaderboard ?? null, raceId);
  const raceStart = formatDateTimeLabel(data?.leaderboard?.raceStartAt);
  const winningScore = topScorer ? `${topScorer.points} pts` : "TBD";
  const isInitialLoading = loading && !data;

  return (
    <section className="ff-page">
      <div className="ff-shell">
        {isInitialLoading ? (
          <RaceLeaderboardSkeleton />
        ) : (
          <div className="ff-grid-main" data-layout="rail">
            <Card className="ff-hero-band border-white/8 text-white">
              <CardHeader className="relative z-10 space-y-5">
              <div className="ff-status-row">
                <Badge tone="info">{leagueName}</Badge>
                <Badge tone={scoringTone(scoring)}>
                  {scoringLabel(scoring)}
                </Badge>
                </div>
                <div className="ff-section-title">
                  <p className="ff-kicker text-white/60">Race Leaderboard</p>
                  <h2 className="ff-display text-5xl text-white md:text-7xl">{raceName}</h2>
                  <p className="max-w-2xl text-sm leading-6 text-white/75 md:text-base">
                    Race-level classification for {leagueName}. Track gains, inspect
                    the scoring mix, and see who left the weekend with the strongest haul.
                  </p>
                </div>
                <div className="ff-stat-strip sm:grid-cols-3">
                  <div className="ff-stat">
                    <p className="ff-kicker">Top Manager</p>
                    <p className="mt-2 text-xl font-black uppercase text-white">
                      {topScorer?.displayName ?? "Waiting"}
                    </p>
                  </div>
                  <div className="ff-stat">
                    <p className="ff-kicker">Winning Score</p>
                    <p className="mt-2 text-xl font-black text-[#e9c400]">
                      {winningScore}
                    </p>
                  </div>
                  <div className="ff-stat">
                    <p className="ff-kicker">Event Date</p>
                    <p className="mt-2 text-sm font-medium text-white/82">{raceStart}</p>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <div className="ff-side-stack">
              <Card className="border-white/8">
                <div className="ff-panel-strip">
                  <CardTitle className="text-2xl">Event Status</CardTitle>
                  <Badge tone={scoringTone(scoring)}>{scoringLabel(scoring)}</Badge>
                </div>
                <CardContent className="space-y-4 px-6 py-6">
                <div className="ff-field-shell">
                  <p className="ff-kicker">Event</p>
                  <p className="text-sm font-semibold uppercase tracking-[0.08em] text-white">
                    {raceName}
                  </p>
                  <p className="text-sm leading-6 text-[#989aa2]">{raceStart}</p>
                </div>
                <Button asChild variant="outline" className="w-full">
                  <Link to={`/league/${leagueId}`}>Back to league overview</Link>
                </Button>
                  <Button
                    asChild
                    variant="secondary"
                    className="w-full"
                  >
                    <Link to={`/league/${leagueId}/races/${raceId}/review`}>View race recap</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {error ? (
          <Card className="border-[#7a0d0d] bg-[#350909]">
            <CardContent className="space-y-4 py-4">
              <p className="text-[#ff8e8e]">
                {error instanceof Error ? error.message : "Failed to load leaderboard"}
              </p>
              <Button variant="secondary" onClick={() => void refetch()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {!loading && !error && (
          <Card className="ff-table-card border-white/8">
            <div className="ff-panel-strip">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-3xl">Classification</CardTitle>
                  <p className="text-sm text-[#989aa2]">
                    Ranked league finishers for this race.
                  </p>
                </div>
                {topScorer ? (
                  <Badge tone="success">Manager of the race: {topScorer.displayName}</Badge>
                ) : null}
              </div>
            </div>
            <CardContent className="px-0 py-0">
              <div className="ff-data-list">
                <div className="ff-data-row bg-[#1d1e23] text-xs uppercase tracking-[0.18em] text-[#7f828b] md:grid-cols-[96px_minmax(0,1.4fr)_minmax(220px,1fr)_110px]">
                  <span>Rank</span>
                  <span>Manager</span>
                  <span>Scoring Mix</span>
                  <span className="md:text-right">Points</span>
                </div>
                {rows.map((row) => {
                  const delta = rankDelta(row);
                  const scoringItems = breakdownEntries(row.breakdown);
                  const topScoringItems = scoringItems.slice(0, 3);
                  return (
                    <div
                      key={`${row.rank}-${row.userId || row.displayName}`}
                      className="ff-data-row md:grid-cols-[96px_minmax(0,1.4fr)_minmax(220px,1fr)_110px] md:items-start"
                    >
                      <div className="rank-cell">
                        <span
                          className={`ff-display text-3xl ${row.rank === 1 ? "text-[#e9c400]" : "text-[#d7d9df]"}`}
                        >
                          {String(row.rank).padStart(2, "0")}
                        </span>
                        {delta !== null ? (
                          <span
                            className={`rank-delta ${delta > 0 ? "up" : delta < 0 ? "down" : "flat"}`}
                          >
                            {delta > 0 ? `+${delta}` : `${delta}`}
                          </span>
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold uppercase tracking-[0.08em] text-white">
                          {row.displayName}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[#7f828b]">
                          {delta === null
                            ? "No movement data"
                            : delta > 0
                              ? "Moved up"
                              : delta < 0
                            ? "Moved down"
                                : "Held position"}
                        </p>
                      </div>
                      <div className="min-w-0">
                        {topScoringItems.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {topScoringItems.map(([key, value]) => (
                              <span
                                key={key}
                                className="inline-flex items-center gap-2 bg-white/4 px-3 py-2 text-xs font-medium text-[#d7d9df]"
                              >
                                <span>{scoreBreakdownLabel(key)}</span>
                                <span className="font-semibold text-white">+{value}</span>
                              </span>
                            ))}
                            {scoringItems.length > topScoringItems.length ? (
                              <span className="inline-flex items-center bg-white/4 px-3 py-2 text-xs text-[#989aa2]">
                                +{scoringItems.length - topScoringItems.length} more
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-sm text-[#7f828b]">No scoring detail</span>
                        )}
                      </div>
                      <div className="text-left md:text-right">
                        <p className="text-2xl font-black text-white">{row.points}</p>
                      </div>
                    </div>
                  );
                })}
                {rows.length === 0 && (
                  <div className="ff-data-row text-center text-[#989aa2]">
                    No leaderboard entries yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
