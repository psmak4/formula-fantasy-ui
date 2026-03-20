import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Clock3, ShieldAlert } from "lucide-react";
import { apiClient, ApiError } from "@/api/apiClient";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Link } from "react-router-dom";

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
    return <ShieldAlert className="h-4 w-4 text-red-600" />;
  }
  if (status === "warning") {
    return <AlertTriangle className="h-4 w-4 text-amber-600" />;
  }
  return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
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
      <div className="space-y-2">
        <h2 className="font-['Orbitron'] text-3xl font-bold uppercase tracking-tight text-black">
          Race Operations
        </h2>
        <p className="max-w-3xl text-slate-600">
          Operational view of ingestion coverage, round completeness, and scoring health. Open a
          round detail to use the unified repair workspace and review override history.
        </p>
      </div>

      {operationsQuery.isLoading ? (
        <p className="text-slate-600">Loading race operations...</p>
      ) : null}

      {operationsQuery.isError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {getErrorMessage(operationsQuery.error)}
        </p>
      ) : null}

      {summary ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Tracked Races"
            value={summary.totalRaces}
            subtitle="Recent rounds across seasons"
          />
          <MetricCard
            title="Healthy"
            value={summary.healthyRaces}
            subtitle="No operational gaps detected"
          />
          <MetricCard
            title="Warnings"
            value={summary.warningRaces}
            subtitle="Needs review, not yet a hard incident"
          />
          <MetricCard
            title="Incidents"
            value={summary.incidentRaces}
            subtitle="Missing or failed operational state"
          />
        </div>
      ) : null}

      <Card>
        <CardHeader className="gap-3">
          <CardTitle>Round Health Queue</CardTitle>
          <p className="text-sm text-slate-600">
            Start here before adding manual correction workflows. This flags races where ingestion
            data is incomplete or scoring coverage is missing.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {races.map((race) => (
              <div
                key={race.raceId}
                className="rounded-3xl border border-neutral-200 bg-neutral-50/60 p-5"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {getStatusIcon(race.healthStatus)}
                      <h3 className="text-lg font-semibold text-slate-950">
                        {race.seasonYear} Round {race.round}
                      </h3>
                      <Badge tone={getStatusBadgeTone(race.healthStatus)}>
                        {race.healthStatus}
                      </Badge>
                      <Badge tone="neutral">{race.status}</Badge>
                    </div>
                    <p className="text-sm font-medium text-slate-800">{race.name}</p>
                    <p className="text-sm text-slate-600">{race.healthSummary}</p>
                  </div>

                  <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Clock3 className="h-4 w-4" />
                      <span>Race start: {formatDateTime(race.raceStartAt)}</span>
                    </div>
                    <p className="mt-2">Latest scored: {formatDateTime(race.latestScoredAt)}</p>
                    <Button asChild size="sm" variant="secondary" className="mt-3">
                      <Link to={`/admin/races/${race.raceId}`}>Open detail</Link>
                    </Button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
                  <span>Entries: {race.counts.leaguesWithEntries}</span>
                  <span>Successful scores: {race.counts.successfulLeagueScores}</span>
                  {race.counts.pendingLeagueScores > 0 ? <span>Pending: {race.counts.pendingLeagueScores}</span> : null}
                  {race.counts.failedLeagueScores > 0 ? <span>Failed: {race.counts.failedLeagueScores}</span> : null}
                </div>
              </div>
            ))}

            {!operationsQuery.isLoading && races.length === 0 ? (
              <p className="text-sm text-slate-600">No races available in the operational queue.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard(props: { title: string; value: number; subtitle: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{props.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-3xl font-semibold text-slate-900">{props.value}</p>
        <p className="text-sm text-slate-600">{props.subtitle}</p>
      </CardContent>
    </Card>
  );
}
