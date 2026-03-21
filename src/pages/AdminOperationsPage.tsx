import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Clock3, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { apiClient, ApiError } from "@/api/apiClient";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";

type RaceHealthStatus = "healthy" | "warning" | "incident";

type AdminOperationsResponse = {
  summary: {
    totalRaces: number;
    healthyRaces: number;
    warningRaces: number;
    incidentRaces: number;
  };
  races: Array<{
    raceId: string;
    seasonYear: number;
    round: number;
    name: string;
    raceStartAt: string;
    status: string;
    healthStatus: RaceHealthStatus;
    healthSummary: string;
    counts: {
      qualifyingResults: number;
      raceResults: number;
      podiumConfirmed: number;
      classifiedFinishers: number;
      leaguesWithEntries: number;
      successfulLeagueScores: number;
      failedLeagueScores: number;
      pendingLeagueScores: number;
    };
    latestScoredAt: string | null;
  }>;
};

function formatDateTime(value: string | null): string {
  if (!value) return "Not yet scored";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getStatusBadgeTone(status: RaceHealthStatus): "success" | "warning" | "danger" {
  if (status === "incident") return "danger";
  if (status === "warning") return "warning";
  return "success";
}

function getStatusIcon(status: RaceHealthStatus) {
  if (status === "incident") {
    return <ShieldAlert className="h-4 w-4 text-[#ff7373]" />;
  }
  if (status === "warning") {
    return <AlertTriangle className="h-4 w-4 text-[#f3db53]" />;
  }
  return <CheckCircle2 className="h-4 w-4 text-[#6ee7a8]" />;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unable to load admin race operations.";
}

export function AdminOperationsPage() {
  const operationsQuery = useQuery({
    queryKey: ["admin-operations-races"],
    queryFn: () => apiClient.get<AdminOperationsResponse>("/admin/operations/races"),
  });

  const summary = operationsQuery.data?.summary;
  const races = operationsQuery.data?.races ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-4">
          <p className="ff-kicker">Operational Queue</p>
          <h2 className="ff-display text-4xl text-white md:text-5xl">Race Operations</h2>
          <p className="max-w-3xl text-sm leading-6 text-[#989aa2] md:text-base">
            Monitor ingestion coverage, scoring health, and round readiness. Open a race detail to repair data, review scoring history, and apply audited corrections.
          </p>
        </div>

        <div className="border border-[#594b11] bg-[#2b2508] px-5 py-4 text-sm text-[#f3db53] xl:max-w-sm">
          <p className="ff-kicker text-[#d4c68b]">Control Note</p>
          <p className="mt-2 leading-6">
            Use this queue as the first stop before manual overrides. Warning and incident rounds should be triaged here before downstream corrections.
          </p>
        </div>
      </div>

      {operationsQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((value) => (
            <div
              key={value}
              className="h-36 animate-pulse border border-white/8 bg-[#15161b]"
            />
          ))}
        </div>
      ) : null}

      {operationsQuery.isError ? (
        <div className="border border-[#7a0d0d] bg-[#350909] px-4 py-3 text-sm text-[#ff8e8e]">
          {getErrorMessage(operationsQuery.error)}
        </div>
      ) : null}

      {summary ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Tracked Races"
            value={summary.totalRaces}
            subtitle="Rounds currently in the operational queue"
          />
          <MetricCard
            title="Healthy"
            value={summary.healthyRaces}
            subtitle="No operational gaps detected"
            accent="success"
          />
          <MetricCard
            title="Warnings"
            value={summary.warningRaces}
            subtitle="Needs review before it escalates"
            accent="warning"
          />
          <MetricCard
            title="Incidents"
            value={summary.incidentRaces}
            subtitle="Missing or failed operational state"
            accent="danger"
          />
        </div>
      ) : null}

      <Card className="border-white/8 bg-[#15161b]">
        <CardContent className="px-0 py-0">
          <div className="flex flex-col gap-3 border-b border-white/6 px-6 py-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="ff-display text-3xl text-white">Round Health Queue</p>
              <p className="mt-2 text-sm text-[#989aa2]">
                Prioritized races with scoring coverage, ingestion state, and latest run timing.
              </p>
            </div>
            <span className="ff-kicker text-[#7f828b]">Mission Control Feed</span>
          </div>

          <div className="space-y-0">
            {races.map((race) => (
              <div
                key={race.raceId}
                className="border-b border-white/6 bg-white/2 px-6 py-6 last:border-b-0"
              >
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_280px]">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {getStatusIcon(race.healthStatus)}
                      <span className="ff-kicker">{race.seasonYear} Round {race.round}</span>
                      <Badge tone={getStatusBadgeTone(race.healthStatus)}>
                        {race.healthStatus}
                      </Badge>
                      <Badge tone="neutral">{race.status}</Badge>
                    </div>

                    <div>
                      <p className="ff-display text-3xl text-white">{race.name}</p>
                      <p className="mt-2 text-sm leading-6 text-[#989aa2]">{race.healthSummary}</p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="border border-white/8 bg-white/3 px-4 py-4">
                        <p className="ff-kicker">Source coverage</p>
                        <p className="mt-2 text-sm text-white">
                          Qualifying {race.counts.qualifyingResults} · Race {race.counts.raceResults}
                        </p>
                      </div>
                      <div className="border border-white/8 bg-white/3 px-4 py-4">
                        <p className="ff-kicker">Result integrity</p>
                        <p className="mt-2 text-sm text-white">
                          Podium {race.counts.podiumConfirmed} · Classified {race.counts.classifiedFinishers}
                        </p>
                      </div>
                      <div className="border border-white/8 bg-white/3 px-4 py-4">
                        <p className="ff-kicker">League scoring</p>
                        <p className="mt-2 text-sm text-white">
                          Success {race.counts.successfulLeagueScores}
                          {race.counts.pendingLeagueScores > 0
                            ? ` · Pending ${race.counts.pendingLeagueScores}`
                            : ""}
                          {race.counts.failedLeagueScores > 0
                            ? ` · Failed ${race.counts.failedLeagueScores}`
                            : ""}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 border border-white/8 bg-black/20 px-5 py-5">
                    <div className="flex items-center gap-2 text-sm text-[#d0d3d9]">
                      <Clock3 className="h-4 w-4" />
                      <span>Race start: {formatDateTime(race.raceStartAt)}</span>
                    </div>

                    <div className="space-y-3">
                      <div className="border border-white/8 bg-white/4 p-4">
                        <p className="ff-kicker">Latest scored</p>
                        <p className="mt-2 text-sm font-semibold text-white">
                          {formatDateTime(race.latestScoredAt)}
                        </p>
                      </div>
                      <div className="border border-white/8 bg-white/4 p-4">
                        <p className="ff-kicker">Active leagues</p>
                        <p className="mt-2 text-3xl font-black text-[#e9c400]">
                          {race.counts.leaguesWithEntries}
                        </p>
                      </div>
                    </div>

                    <Button asChild className="w-full">
                      <Link to={`/admin/races/${race.raceId}`}>Open Detail</Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {!operationsQuery.isLoading && races.length === 0 ? (
              <div className="px-6 py-10 text-center text-[#989aa2]">
                No races available in the operational queue.
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard(props: {
  title: string;
  value: number;
  subtitle: string;
  accent?: "neutral" | "success" | "warning" | "danger";
}) {
  const accentClass =
    props.accent === "danger"
      ? "text-[#ff7373]"
      : props.accent === "warning"
        ? "text-[#f3db53]"
        : props.accent === "success"
          ? "text-[#6ee7a8]"
          : "text-white";

  return (
    <Card className="border-white/8 bg-[#15161b]">
      <CardContent className="space-y-2 px-6 py-6">
        <p className="ff-kicker">{props.title}</p>
        <p className={`text-5xl font-black ${accentClass}`}>{props.value}</p>
        <p className="text-sm leading-6 text-[#989aa2]">{props.subtitle}</p>
      </CardContent>
    </Card>
  );
}
