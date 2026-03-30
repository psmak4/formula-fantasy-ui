import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { apiClient } from "../api/apiClient";
import { AppPageHeader } from "../components/layout/AppPageHeader";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
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
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-4">
          <div className="skeleton-line h-4 w-32" />
          <div className="skeleton-line h-16 w-[560px] max-w-full" />
          <div className="flex flex-wrap gap-3">
            <div className="skeleton-line h-9 w-32" />
            <div className="skeleton-line h-9 w-32" />
          </div>
          <div className="skeleton-line h-5 w-full max-w-2xl" />
          <div className="skeleton-line h-5 w-5/6 max-w-xl" />
        </div>
      </div>

      <Card className="ff-table-card border-[#d9dee5]">
        <CardContent className="space-y-4 px-6 py-6">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e4e8ee] pb-3">
              <div className="skeleton-line h-4 w-28" />
              <div className="flex flex-wrap gap-2">
                <div className="skeleton-line h-9 w-40" />
                <div className="skeleton-line h-9 w-40" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="skeleton-line h-8 w-48" />
              <div className="skeleton-line h-4 w-64" />
            </div>
          </div>
          <div className="space-y-px bg-[#e7ebf0]">
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
  const isInitialLoading = loading && !data;

  return (
    <section className="ff-page">
      <div className="ff-shell space-y-6">
        {isInitialLoading ? (
          <RaceLeaderboardSkeleton />
        ) : (
          <>
            <AppPageHeader
              eyebrow="Race Leaderboard"
              title={raceName}
              description={`Race-level classification for ${leagueName}. Track gains, inspect the scoring mix, and see who left the weekend with the strongest haul.`}
              meta={
                <>
                  <Badge variant="secondary">
                    {leagueName}
                  </Badge>
                  <Badge tone={scoringTone(scoring)}>
                    {scoringLabel(scoring)}
                  </Badge>
                </>
              }
            />
          </>
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
          <Card className="ff-table-card border-[#d9dee5]">
              <CardContent className="space-y-4 px-6 py-6">
                <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e4e8ee] pb-3">
                  <p className="ff-kicker text-[#989aa2]">Race actions</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      asChild
                      variant="outline"
                      className="h-9 px-4"
                    >
                      <Link to={`/league/${leagueId}`}>Back to league overview</Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="h-9 px-4"
                    >
                      <Link to={`/league/${leagueId}/races/${raceId}/review`}>View race recap</Link>
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-3xl text-[#111318]">Classification</CardTitle>
                    <p className="text-sm text-[#989aa2]">
                      Ranked league finishers for this race.
                    </p>
                  </div>
                  {topScorer ? (
                    <Badge tone="success">Manager of the race: {topScorer.displayName}</Badge>
                  ) : null}
                </div>
              </div>
            </CardContent>
            <CardContent className="px-0 py-0">
              <div className="ff-data-list">
                <div className="ff-data-row bg-[#eef1f4] text-xs uppercase tracking-[0.18em] text-[#7b8592] md:grid-cols-[96px_minmax(0,1.4fr)_minmax(220px,1fr)_110px]">
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
                      data-interactive="true"
                      className="ff-data-row md:grid-cols-[96px_minmax(0,1.4fr)_minmax(220px,1fr)_110px] md:items-start"
                    >
                      <div className="rank-cell">
                        <span
                          className={`ff-display text-3xl ${row.rank === 1 ? "text-[#e9c400]" : "text-[#66707d]"}`}
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
                        <p className="font-semibold uppercase tracking-[0.08em] text-[#111318]">
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
                                className="inline-flex items-center gap-2 border border-[#d9dee5] bg-[#f8f9fb] px-3 py-2 text-xs font-medium text-[#45515f]"
                              >
                                <span>{scoreBreakdownLabel(key)}</span>
                                <span className="font-semibold text-[#111318]">+{value}</span>
                              </span>
                            ))}
                            {scoringItems.length > topScoringItems.length ? (
                              <span className="inline-flex items-center border border-[#d9dee5] bg-[#f8f9fb] px-3 py-2 text-xs text-[#66707d]">
                                +{scoringItems.length - topScoringItems.length} more
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-sm text-[#7f828b]">No scoring detail</span>
                        )}
                      </div>
                      <div className="text-left md:text-right">
                        <p className="text-2xl font-black text-[#111318]">{row.points}</p>
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
