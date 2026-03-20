import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, ApiError } from "@/api/apiClient";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";

type IncidentResponse = {
  providerHealth: {
    jolpica: {
      ok: boolean;
      message?: string;
    };
  };
  incidents: Array<{
    raceId: string;
    seasonYear: number;
    round: number;
    name: string;
    raceStartAt: string;
    status: string;
    healthStatus: "healthy" | "warning" | "incident";
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
    failedRuns: Array<{
      leagueId: string;
      errorMessage: string | null;
      createdAt: string;
    }>;
  }>;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Unable to load incidents.";
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function AdminIncidentsPage() {
  const queryClient = useQueryClient();
  const incidentsQuery = useQuery({
    queryKey: ["admin-incidents"],
    queryFn: () => apiClient.get<IncidentResponse>("/admin/incidents"),
  });
  const [reasonByRace, setReasonByRace] = useState<Record<string, string>>({});

  const syncMutation = useMutation({
    mutationFn: async (raceId: string) => apiClient.post(`/admin/incidents/races/${raceId}/sync-weekend`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-incidents"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-operations-races"] });
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: async (raceId: string) => apiClient.post(`/admin/incidents/races/${raceId}/finalize`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-incidents"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-operations-races"] });
    },
  });

  const rescoreMutation = useMutation({
    mutationFn: async (input: { raceId: string; dryRun: boolean; reason?: string }) =>
      apiClient.post(`/admin/incidents/races/${input.raceId}/rescore`, {
        dryRun: input.dryRun,
        reason: input.reason,
      }),
    onSuccess: async (_data, variables) => {
      if (!variables.dryRun) {
        setReasonByRace((current) => ({ ...current, [variables.raceId]: "" }));
      }
      await queryClient.invalidateQueries({ queryKey: ["admin-incidents"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-operations-races"] });
    },
  });

  const incidents = incidentsQuery.data?.incidents ?? [];
  const providerHealth = incidentsQuery.data?.providerHealth;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="font-['Orbitron'] text-3xl font-bold uppercase tracking-tight text-black">
          Incidents
        </h2>
        <p className="max-w-3xl text-slate-600">
          Monitor ingestion and scoring health, then run targeted sync, finalize, or rescore actions. Rescore apply requires a reason and stays append-only.
        </p>
      </div>

      {incidentsQuery.isLoading ? <p className="text-slate-600">Loading incidents...</p> : null}
      {incidentsQuery.isError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {getErrorMessage(incidentsQuery.error)}
        </p>
      ) : null}

      {providerHealth ? (
        <Card>
          <CardHeader>
            <CardTitle>Provider Health</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700">
            <p>
              Jolpica:{" "}
              <Badge tone={providerHealth.jolpica.ok ? "success" : "danger"}>
                {providerHealth.jolpica.ok ? "healthy" : "failing"}
              </Badge>
              {providerHealth.jolpica.message ? ` • ${providerHealth.jolpica.message}` : ""}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {incidents.map((incident) => (
        <Card key={incident.raceId}>
          <CardHeader>
            <CardTitle>
              {incident.seasonYear} Round {incident.round}: {incident.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
              <Badge tone={incident.healthStatus === "incident" ? "danger" : "warning"}>
                {incident.healthStatus}
              </Badge>
              <span>{incident.healthSummary}</span>
              <span>Race start: {formatDateTime(incident.raceStartAt)}</span>
            </div>

            <div className="grid gap-3 md:grid-cols-4 text-sm text-slate-700">
              <p>Qualifying: {incident.counts.qualifyingResults}</p>
              <p>Race results: {incident.counts.raceResults}</p>
              <p>Podium rows: {incident.counts.podiumConfirmed}</p>
              <p>Failed scoring runs: {incident.counts.failedLeagueScores}</p>
            </div>

            {incident.failedRuns.length > 0 ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                {incident.failedRuns.map((run) => (
                  <p key={`${incident.raceId}-${run.leagueId}-${run.createdAt}`}>
                    League {run.leagueId.slice(0, 8)} • {run.errorMessage ?? "Unknown failure"} • {formatDateTime(run.createdAt)}
                  </p>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" disabled={syncMutation.isPending} onClick={() => void syncMutation.mutateAsync(incident.raceId)}>
                {syncMutation.isPending ? "Syncing..." : "Sync Weekend"}
              </Button>
              <Button variant="secondary" disabled={finalizeMutation.isPending} onClick={() => void finalizeMutation.mutateAsync(incident.raceId)}>
                {finalizeMutation.isPending ? "Finalizing..." : "Finalize"}
              </Button>
              <Button variant="secondary" disabled={rescoreMutation.isPending} onClick={() => void rescoreMutation.mutateAsync({ raceId: incident.raceId, dryRun: true })}>
                {rescoreMutation.isPending ? "Running..." : "Preview Rescore"}
              </Button>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[280px] flex-1">
                <Input
                  value={reasonByRace[incident.raceId] ?? ""}
                  onChange={(event) => setReasonByRace((current) => ({ ...current, [incident.raceId]: event.target.value }))}
                  placeholder="Reason for live rescore"
                />
              </div>
              <Button
                disabled={rescoreMutation.isPending || (reasonByRace[incident.raceId] ?? "").trim().length < 8}
                onClick={() => void rescoreMutation.mutateAsync({ raceId: incident.raceId, dryRun: false, reason: (reasonByRace[incident.raceId] ?? "").trim() })}
              >
                {rescoreMutation.isPending ? "Rescoring..." : "Apply Rescore"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {!incidentsQuery.isLoading && !incidentsQuery.isError && incidents.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-slate-600">
            No current incidents detected.
          </CardContent>
        </Card>
      ) : null}

      {syncMutation.isError || finalizeMutation.isError || rescoreMutation.isError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {getErrorMessage(syncMutation.error ?? finalizeMutation.error ?? rescoreMutation.error)}
        </p>
      ) : null}
    </div>
  );
}
