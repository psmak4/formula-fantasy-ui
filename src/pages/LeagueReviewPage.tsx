import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { apiClient } from "../api/apiClient";
import { AppPageHeader, AppPageHeaderStat } from "../components/layout/AppPageHeader";
import { ScoringBreakdownTable } from "../components/results/ScoringBreakdownTable";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";
import { type BreakdownRow, resultStatusLabel, resultStatusTone, type ResultStatus } from "../lib/resultDetails";

type PredictionPicks = {
  P1: string;
  P2: string;
  P3: string;
  FASTEST_LAP: string;
  BIGGEST_GAINER: string;
  SAFETY_CAR: boolean;
  CLASSIFIED_FINISHERS: ClassifiedFinishersBucket;
};

type ClassifiedFinishersBucket =
  | "0_TO_9"
  | "10_TO_12"
  | "13_TO_15"
  | "16_TO_20";

type ReviewActual = {
  available?: boolean;
  picks?: Partial<PredictionPicks>;
};

type ReviewRace = {
  raceId?: string;
  raceName?: string;
  raceStartAt?: string;
};

type HistoricalEntryResponse = {
  status?: ResultStatus;
  race?: ReviewRace;
  actual?: ReviewActual;
  breakdownRows?: BreakdownRow[];
  scoring?: {
    status?: ResultStatus;
    totalPoints?: number | null;
    computedAt?: string;
    latestRunStatus?: string;
  };
};

export function LeagueReviewPage() {
  const { leagueId, raceId } = useParams<{ leagueId: string; raceId: string }>();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["league-review", leagueId, raceId],
    enabled: Boolean(leagueId && raceId),
    queryFn: async () => {
      if (!leagueId || !raceId) {
        throw new Error("Missing route parameters");
      }

      return await apiClient.get<HistoricalEntryResponse>(
        `/leagues/${leagueId}/races/${raceId}/entry/me`,
      );
    },
  });

  const status = data?.status;
  const hits = useMemo(
    () => (data?.breakdownRows ?? []).filter((row) => row.outcome === "exact").length,
    [data?.breakdownRows],
  );

  return (
    <section className="ff-page">
      <div className="ff-shell space-y-6">
        <AppPageHeader
          eyebrow="Race Review"
          title="Result Details"
          description="Step through each prediction, compare your call to the final result, and inspect how the whole round came together."
          meta={
            <>
              <Badge variant="secondary">
                {data?.race?.raceName ?? "Race review"}
              </Badge>
              <Badge tone={resultStatusTone(status)}>
                {resultStatusLabel(status)}
              </Badge>
            </>
          }
          stats={
            <>
              <AppPageHeaderStat
                label="Round total"
                value={typeof data?.scoring?.totalPoints === "number" ? data.scoring.totalPoints : "—"}
              />
              <AppPageHeaderStat label="Hits" value={hits} accentClassName="text-tertiary" />
            </>
          }
        />

        {isLoading ? (
          <Card className="animate-pulse bg-surface-container-lowest">
            <CardContent className="py-20">
              <div className="h-8 w-1/3 rounded bg-surface-container-high" />
            </CardContent>
          </Card>
        ) : null}

        {error ? (
          <Card className="bg-error-container">
            <CardContent className="space-y-4 py-5">
              <Badge tone="danger">
                {error instanceof Error ? error.message : "Failed to load race review"}
              </Badge>
              <Button variant="outline" onClick={() => void refetch()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {!isLoading && !error ? (
          <>
            <Card className="ff-table-card ">
              <CardContent className="space-y-4 px-6 py-6">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2  pb-3">
                    <p className="ff-kicker text-on-surface-variant">Round actions</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        asChild
                        variant="outline"
                        className="h-9 px-4"
                      >
                        <Link to={`/league/${leagueId}`}>Back to league</Link>
                      </Button>
                      <Button
                        asChild
                        variant="outline"
                        className="h-9 px-4"
                      >
                        <Link to={`/league/${leagueId}/races/${raceId}/leaderboard`}>
                          Open race leaderboard
                        </Link>
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-lg font-semibold uppercase tracking-[0.04em] text-on-surface">
                      Score breakdown
                    </p>
                    <p className="text-sm text-on-surface-variant">
                      Every category, your pick, the final result, and why the points landed the way they did.
                    </p>
                  </div>
                </div>
                </div>
                <ScoringBreakdownTable
                  status={status}
                  rows={data?.breakdownRows}
                  emptyCopy="No scoring breakdown is available yet."
                />
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </section>
  );
}
