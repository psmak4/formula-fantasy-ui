import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Clock3, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { apiClient } from "@/api/apiClient";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { formatAdminDateTime, getAdminPageErrorMessage } from "@/lib/adminPage";

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

const getErrorMessage = (error: unknown) =>
  getAdminPageErrorMessage(error, "Unable to load admin race operations.");
const formatDateTime = (value: string | null) => formatAdminDateTime(value, "Not yet scored");

function getStatusBadgeTone(status: RaceHealthStatus): "success" | "warning" | "danger" {
  if (status === "incident") return "danger";
  if (status === "warning") return "warning";
  return "success";
}

function getStatusIcon(status: RaceHealthStatus) {
  if (status === "incident") {
    return <ShieldAlert className="h-4 w-4 text-primary" />;
  }
  if (status === "warning") {
    return <AlertTriangle className="h-4 w-4 text-warning" />;
  }
  return <CheckCircle2 className="h-4 w-4 text-success" />;
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
          <h2 className="ff-display text-4xl text-on-surface md:text-5xl">Race Operations</h2>
          <p className="max-w-3xl text-sm leading-6 text-on-surface-variant md:text-base">
            Monitor ingestion coverage, scoring health, and round readiness. Open a race detail to repair data, review scoring history, and apply audited corrections.
          </p>
        </div>

        <div className="bg-tertiary-container px-5 py-4 text-sm text-on-tertiary-container xl:max-w-sm">
          <p className="ff-kicker text-on-tertiary-container">Control Note</p>
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
              className="h-36 rounded-lg animate-pulse bg-surface-container-low"
            />
          ))}
        </div>
      ) : null}

      {operationsQuery.isError ? (
        <div className="bg-error-container px-4 py-3 text-sm text-on-error-container">
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

      <Card className=" bg-surface-container-low">
        <CardContent className="px-0 py-0">
          <div className="flex flex-col gap-3 px-6 py-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="ff-display text-3xl text-on-surface">Round Health Queue</p>
              <p className="mt-2 text-sm text-on-surface-variant">
                Prioritized races with scoring coverage, ingestion state, and latest run timing.
              </p>
            </div>
            <span className="ff-kicker text-on-surface-variant">Mission Control Feed</span>
          </div>

          <div className="space-y-0">
            {races.map((race) => (
              <div
                key={race.raceId}
                className="bg-surface-container-lowest px-6 py-6 last:border-b-0"
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
                      <p className="ff-display text-3xl text-on-surface">{race.name}</p>
                      <p className="mt-2 text-sm leading-6 text-on-surface-variant">{race.healthSummary}</p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="bg-surface-container-lowest px-4 py-4">
                        <p className="ff-kicker">Source coverage</p>
                        <p className="mt-2 text-sm text-on-surface">
                          Qualifying {race.counts.qualifyingResults} · Race {race.counts.raceResults}
                        </p>
                      </div>
                      <div className="bg-surface-container-lowest px-4 py-4">
                        <p className="ff-kicker">Result integrity</p>
                        <p className="mt-2 text-sm text-on-surface">
                          Podium {race.counts.podiumConfirmed} · Classified {race.counts.classifiedFinishers}
                        </p>
                      </div>
                      <div className="bg-surface-container-lowest px-4 py-4">
                        <p className="ff-kicker">League scoring</p>
                        <p className="mt-2 text-sm text-on-surface">
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

                  <div className="space-y-4 bg-surface-container-lowest px-5 py-5">
                    <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                      <Clock3 className="h-4 w-4" />
                      <span>Race start: {formatDateTime(race.raceStartAt)}</span>
                    </div>

                    <div className="space-y-3">
                      <div className="bg-surface-container-lowest p-4">
                        <p className="ff-kicker">Latest scored</p>
                        <p className="mt-2 text-sm font-semibold text-on-surface">
                          {formatDateTime(race.latestScoredAt)}
                        </p>
                      </div>
                      <div className="bg-surface-container-lowest p-4">
                        <p className="ff-kicker">Active leagues</p>
                        <p className="mt-2 text-3xl font-black text-warning">
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
              <div className="px-6 py-10 text-center text-on-surface-variant">
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
      ? "text-primary"
      : props.accent === "warning"
        ? "text-warning"
        : props.accent === "success"
          ? "text-success"
          : "text-on-surface";

  return (
    <Card className=" bg-surface-container-low">
      <CardContent className="space-y-2 px-6 py-6">
        <p className="ff-kicker">{props.title}</p>
        <p className={`text-5xl font-black ${accentClass}`}>{props.value}</p>
        <p className="text-sm leading-6 text-on-surface-variant">{props.subtitle}</p>
      </CardContent>
    </Card>
  );
}
