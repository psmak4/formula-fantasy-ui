import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, ApiError } from "@/api/apiClient";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
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
    mutationFn: async (raceId: string) =>
      apiClient.post(`/admin/incidents/races/${raceId}/sync-weekend`),
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
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-4">
          <p className="ff-kicker">Escalation Queue</p>
          <h2 className="ff-display text-4xl text-white md:text-5xl">Incidents</h2>
          <p className="max-w-3xl text-sm leading-6 text-[#989aa2] md:text-base">
            Monitor ingestion and scoring failures, then run targeted sync, finalize, or rescore actions. Live rescore remains append-only and requires an audit reason.
          </p>
        </div>

        <div className="border border-[#5a1010] bg-[#2a0c0c] px-5 py-4 text-sm text-[#ffb1b1] xl:max-w-sm">
          <p className="ff-kicker text-[#ff7373]">Ops Guardrail</p>
          <p className="mt-2 leading-6">
            Preview rescore before applying it live. Use live rescore only after source state and failed run context have been reviewed.
          </p>
        </div>
      </div>

      {incidentsQuery.isLoading ? (
        <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
          <div className="h-40 animate-pulse border border-white/8 bg-[#15161b]" />
          <div className="h-96 animate-pulse border border-white/8 bg-[#15161b]" />
        </div>
      ) : null}

      {incidentsQuery.isError ? (
        <div className="border border-[#7a0d0d] bg-[#350909] px-4 py-3 text-sm text-[#ff8e8e]">
          {getErrorMessage(incidentsQuery.error)}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="border-white/8 bg-[#15161b]">
          <CardContent className="space-y-5 px-6 py-6">
            <p className="ff-display text-3xl text-white">Provider Health</p>
            {providerHealth ? (
              <div className="space-y-4">
                <div className="border border-white/8 bg-white/3 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="ff-kicker">Jolpica</p>
                    <Badge tone={providerHealth.jolpica.ok ? "success" : "danger"}>
                      {providerHealth.jolpica.ok ? "Healthy" : "Failing"}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[#d0d3d9]">
                    {providerHealth.jolpica.message ?? "No provider issues reported."}
                  </p>
                </div>

                <div className="border border-white/8 bg-white/3 p-4">
                  <p className="ff-kicker">Open incidents</p>
                  <p className="mt-2 text-4xl font-black text-[#ff7373]">{incidents.length}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#989aa2]">Provider telemetry unavailable.</p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {incidents.map((incident) => (
            <Card key={incident.raceId} className="border-white/8 bg-[#15161b]">
              <CardContent className="space-y-5 px-6 py-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="ff-kicker">
                        {incident.seasonYear} Round {incident.round}
                      </span>
                      <Badge
                        tone={
                          incident.healthStatus === "incident" ? "danger" : "warning"
                        }
                      >
                        {incident.healthStatus}
                      </Badge>
                      <Badge tone="neutral">{incident.status}</Badge>
                    </div>

                    <div>
                      <p className="ff-display text-3xl text-white">{incident.name}</p>
                      <p className="mt-2 text-sm leading-6 text-[#989aa2]">
                        {incident.healthSummary}
                      </p>
                    </div>
                  </div>

                  <div className="border border-white/8 bg-black/20 px-4 py-4 text-sm text-[#d0d3d9]">
                    <p className="ff-kicker">Race start</p>
                    <p className="mt-2 font-semibold text-white">
                      {formatDateTime(incident.raceStartAt)}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <div className="border border-white/8 bg-white/3 p-4">
                    <p className="ff-kicker">Qualifying</p>
                    <p className="mt-2 text-3xl font-black text-white">
                      {incident.counts.qualifyingResults}
                    </p>
                  </div>
                  <div className="border border-white/8 bg-white/3 p-4">
                    <p className="ff-kicker">Race Results</p>
                    <p className="mt-2 text-3xl font-black text-white">
                      {incident.counts.raceResults}
                    </p>
                  </div>
                  <div className="border border-white/8 bg-white/3 p-4">
                    <p className="ff-kicker">Podium Rows</p>
                    <p className="mt-2 text-3xl font-black text-white">
                      {incident.counts.podiumConfirmed}
                    </p>
                  </div>
                  <div className="border border-white/8 bg-white/3 p-4">
                    <p className="ff-kicker">Failed Runs</p>
                    <p className="mt-2 text-3xl font-black text-[#ff7373]">
                      {incident.counts.failedLeagueScores}
                    </p>
                  </div>
                </div>

                {incident.failedRuns.length > 0 ? (
                  <div className="border border-[#5a1010] bg-[#2a0c0c] p-4 text-sm text-[#ffb1b1]">
                    <p className="ff-kicker text-[#ff7373]">Failed scoring runs</p>
                    <div className="mt-3 space-y-3">
                      {incident.failedRuns.map((run) => (
                        <div key={`${incident.raceId}-${run.leagueId}-${run.createdAt}`}>
                          <p className="font-semibold text-white">
                            League {run.leagueId.slice(0, 8)}
                          </p>
                          <p className="mt-1 leading-6">
                            {run.errorMessage ?? "Unknown failure"} · {formatDateTime(run.createdAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                  <div className="space-y-3">
                    <p className="ff-kicker">Operational Actions</p>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="secondary"
                        disabled={syncMutation.isPending}
                        onClick={() => void syncMutation.mutateAsync(incident.raceId)}
                      >
                        {syncMutation.isPending ? "Syncing..." : "Sync Weekend"}
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={finalizeMutation.isPending}
                        onClick={() => void finalizeMutation.mutateAsync(incident.raceId)}
                      >
                        {finalizeMutation.isPending ? "Finalizing..." : "Finalize"}
                      </Button>
                      <Button
                        variant="outline"
                        disabled={rescoreMutation.isPending}
                        onClick={() =>
                          void rescoreMutation.mutateAsync({
                            raceId: incident.raceId,
                            dryRun: true,
                          })
                        }
                      >
                        {rescoreMutation.isPending ? "Running..." : "Preview Rescore"}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3 border border-white/8 bg-black/20 p-4">
                    <p className="ff-kicker">Live Rescore</p>
                    <Input
                      value={reasonByRace[incident.raceId] ?? ""}
                      onChange={(event) =>
                        setReasonByRace((current) => ({
                          ...current,
                          [incident.raceId]: event.target.value,
                        }))
                      }
                      placeholder="Reason for live rescore"
                    />
                    <Button
                      className="w-full"
                      disabled={
                        rescoreMutation.isPending ||
                        (reasonByRace[incident.raceId] ?? "").trim().length < 8
                      }
                      onClick={() =>
                        void rescoreMutation.mutateAsync({
                          raceId: incident.raceId,
                          dryRun: false,
                          reason: (reasonByRace[incident.raceId] ?? "").trim(),
                        })
                      }
                    >
                      {rescoreMutation.isPending ? "Rescoring..." : "Apply Rescore"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {!incidentsQuery.isLoading && !incidentsQuery.isError && incidents.length === 0 ? (
            <Card className="border-white/8 bg-[#15161b]">
              <CardContent className="py-10 text-center text-[#989aa2]">
                No current incidents detected.
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      {syncMutation.isError || finalizeMutation.isError || rescoreMutation.isError ? (
        <div className="border border-[#7a0d0d] bg-[#350909] px-4 py-3 text-sm text-[#ff8e8e]">
          {getErrorMessage(
            syncMutation.error ?? finalizeMutation.error ?? rescoreMutation.error,
          )}
        </div>
      ) : null}
    </div>
  );
}
