import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { apiClient, ApiError } from "@/api/apiClient";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";

type DetailResponse = {
  race: {
    raceId: string;
    seasonYear: number;
    round: number;
    name: string;
    raceStartAt: string;
  };
  safetyCar: {
    activeOverride: null | {
      id: string;
      value: boolean | null;
      reason: string;
      createdAt: string;
      createdByUserId: string;
      createdByDisplayName: string;
    };
    baseInput: null | {
      value: boolean | null;
      source: "ingestion" | "system_inference" | "admin_seed";
      updatedAt: string;
    };
  };
  scoringRuns: Array<{
    scoringRunId: string;
    leagueId: string;
    status: "pending" | "success" | "failed";
    source: "system" | "admin_override" | "admin_manual" | "internal_rescore";
    isCurrent: boolean;
    reason: string | null;
    createdAt: string;
    computedAt: string | null;
    inputSnapshot?: unknown;
  }>;
  resultWorkspace: {
    raw: {
      safetyCarDeployed: boolean | null;
      podium: { P1: string | null; P2: string | null; P3: string | null };
      fastestLapDriverId: string | null;
      biggestGainerDriverId: string | null;
      classifiedFinishersCount: number;
    };
    effective: {
      safetyCarDeployed: boolean | null;
      podium: { P1: string | null; P2: string | null; P3: string | null };
      fastestLapDriverId: string | null;
      biggestGainerDriverId: string | null;
      classifiedFinishersCount: number;
    };
    activeOverrides: Record<string, { reason: string; createdAt: string; createdByUserId: string } | undefined>;
    overrideHistory: Record<string, Array<{
      id: string;
      value: string | number | boolean | null;
      reason: string;
      createdAt: string;
      createdByUserId: string;
      createdByDisplayName: string;
      revokedAt: string | null;
      revokedByUserId: string | null;
      revokedByDisplayName: string | null;
      revokedReason: string | null;
    }> | undefined>;
    driverOptions: Array<{
      id: string;
      givenName: string;
      familyName: string;
      code?: string;
      number?: number;
      constructorName?: string;
    }>;
  };
  sourceWorkspace: {
    seasonEntryOptions: Array<{
      seasonEntryId: string;
      driverId: string;
      displayName: string;
    }>;
    qualifyingResults: Array<{
      resultId: string;
      seasonEntryId: string;
      driverId: string;
      driverDisplayName: string;
      gridPosition: number | null;
    }>;
    raceResults: Array<{
      resultId: string;
      seasonEntryId: string;
      driverId: string;
      driverDisplayName: string;
      finishPosition: number | null;
      classifiedPosition: number | null;
      isFastestLap: boolean | null;
    }>;
  };
  auditLog: Array<{
    id: string;
    action: string;
    summary: string;
    payload: unknown;
    createdAt: string;
    actorUserId: string;
    actorDisplayName: string;
  }>;
};

type ResultCorrectionPreviewResponse = {
  preview: {
    summary: {
      leaguesProcessed: number;
      totalChangedEntries: number;
      totalPointsDelta: number;
    };
    leagues: Array<{
      leagueId: string;
      changedEntries: number;
      comparedEntries: number;
      pointsDeltaTotal: number;
    }>;
  };
};

type SourceRepairPreviewResponse = {
  preview: {
    summary: {
      leaguesProcessed: number;
      totalChangedEntries: number;
      totalPointsDelta: number;
    };
    leagues: Array<{
      leagueId: string;
      changedEntries: number;
      comparedEntries: number;
      pointsDeltaTotal: number;
    }>;
  };
};

function formatDateTime(value: string | null): string {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Unable to load race operations details.";
}

export function AdminRaceOperationsDetailPage() {
  const params = useParams<{ raceId: string }>();
  const raceId = params.raceId ?? "";
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ["admin-operations-race-detail", raceId],
    enabled: raceId.length > 0,
    queryFn: () => apiClient.get<DetailResponse>(`/admin/operations/races/${raceId}`),
  });

  const detail = detailQuery.data;
  const [reason, setReason] = useState("");
  const [formState, setFormState] = useState<{
    safetyCarDeployed: "true" | "false" | "unknown";
    P1: string;
    P2: string;
    P3: string;
    fastestLapDriverId: string;
    biggestGainerDriverId: string;
    classifiedFinishersCount: string;
  } | null>(null);
  const [qualifyingDrafts, setQualifyingDrafts] = useState<Record<string, {
    seasonEntryId: string;
    gridPosition: string;
    reason: string;
  }>>({});
  const [qualifyingPreviews, setQualifyingPreviews] = useState<Record<string, SourceRepairPreviewResponse["preview"] | undefined>>({});
  const [qualifyingDeletePreviews, setQualifyingDeletePreviews] = useState<Record<string, SourceRepairPreviewResponse["preview"] | undefined>>({});
  const [qualifyingCreateDraft, setQualifyingCreateDraft] = useState({
    seasonEntryId: "",
    gridPosition: "",
    reason: "",
  });
  const [qualifyingCreatePreview, setQualifyingCreatePreview] = useState<SourceRepairPreviewResponse["preview"] | undefined>(undefined);
  const [raceResultDrafts, setRaceResultDrafts] = useState<Record<string, {
    seasonEntryId: string;
    finishPosition: string;
    classifiedPosition: string;
    isFastestLap: "true" | "false" | "unknown";
    reason: string;
  }>>({});
  const [raceResultPreviews, setRaceResultPreviews] = useState<Record<string, SourceRepairPreviewResponse["preview"] | undefined>>({});
  const [raceResultDeletePreviews, setRaceResultDeletePreviews] = useState<Record<string, SourceRepairPreviewResponse["preview"] | undefined>>({});
  const [raceResultCreateDraft, setRaceResultCreateDraft] = useState({
    seasonEntryId: "",
    finishPosition: "",
    classifiedPosition: "",
    isFastestLap: "unknown" as "true" | "false" | "unknown",
    reason: "",
  });
  const [raceResultCreatePreview, setRaceResultCreatePreview] = useState<SourceRepairPreviewResponse["preview"] | undefined>(undefined);

  const previewMutation = useMutation({
    mutationFn: async (payload: ReturnType<typeof buildCorrectionPayload>) =>
      apiClient.post<ResultCorrectionPreviewResponse>(
        `/admin/operations/races/${raceId}/result-corrections/preview`,
        payload
      ),
  });

  const applyMutation = useMutation({
    mutationFn: async (payload: ReturnType<typeof buildCorrectionPayload> & { reason: string }) =>
      apiClient.post(
        `/admin/operations/races/${raceId}/result-corrections/apply`,
        payload
      ),
    onSuccess: async () => {
      setReason("");
      await queryClient.invalidateQueries({ queryKey: ["admin-operations-race-detail", raceId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-operations-races"] });
    },
  });
  const qualifyingRepairMutation = useMutation({
    mutationFn: async (payload: {
      resultId: string;
      seasonEntryId: string;
      gridPosition: string;
      reason: string;
    }) =>
      apiClient.post(
        `/admin/operations/races/${raceId}/source-repairs/qualifying/${payload.resultId}`,
        {
          seasonEntryId: Number(payload.seasonEntryId),
          gridPosition: payload.gridPosition.trim().length > 0 ? Number(payload.gridPosition) : null,
          reason: payload.reason.trim(),
        }
      ),
    onSuccess: async () => {
      setQualifyingPreviews({});
      await queryClient.invalidateQueries({ queryKey: ["admin-operations-race-detail", raceId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-operations-races"] });
    },
  });
  const qualifyingPreviewMutation = useMutation({
    mutationFn: async (payload: {
      resultId: string;
      seasonEntryId: string;
      gridPosition: string;
      reason: string;
    }) =>
      apiClient.post<SourceRepairPreviewResponse>(
        `/admin/operations/races/${raceId}/source-repairs/qualifying/${payload.resultId}/preview`,
        {
          seasonEntryId: Number(payload.seasonEntryId),
          gridPosition: payload.gridPosition.trim().length > 0 ? Number(payload.gridPosition) : null,
          reason: payload.reason.trim(),
        }
      ),
  });
  const qualifyingCreateMutation = useMutation({
    mutationFn: async (payload: { seasonEntryId: string; gridPosition: string; reason: string }) =>
      apiClient.post(`/admin/operations/races/${raceId}/source-repairs/qualifying/create`, {
        seasonEntryId: Number(payload.seasonEntryId),
        gridPosition: payload.gridPosition.trim().length > 0 ? Number(payload.gridPosition) : null,
        reason: payload.reason.trim(),
      }),
    onSuccess: async () => {
      setQualifyingCreatePreview(undefined);
      setQualifyingDeletePreviews({});
      await queryClient.invalidateQueries({ queryKey: ["admin-operations-race-detail", raceId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-operations-races"] });
    },
  });
  const qualifyingCreatePreviewMutation = useMutation({
    mutationFn: async (payload: { seasonEntryId: string; gridPosition: string; reason: string }) =>
      apiClient.post<SourceRepairPreviewResponse>(`/admin/operations/races/${raceId}/source-repairs/qualifying/create/preview`, {
        seasonEntryId: Number(payload.seasonEntryId),
        gridPosition: payload.gridPosition.trim().length > 0 ? Number(payload.gridPosition) : null,
        reason: payload.reason.trim(),
      }),
  });
  const qualifyingDeleteMutation = useMutation({
    mutationFn: async (payload: { resultId: string; reason: string }) =>
      apiClient.post(`/admin/operations/races/${raceId}/source-repairs/qualifying/${payload.resultId}/delete`, {
        reason: payload.reason.trim(),
      }),
    onSuccess: async () => {
      setQualifyingPreviews({});
      setQualifyingDeletePreviews({});
      await queryClient.invalidateQueries({ queryKey: ["admin-operations-race-detail", raceId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-operations-races"] });
    },
  });
  const qualifyingDeletePreviewMutation = useMutation({
    mutationFn: async (payload: { resultId: string; reason: string }) =>
      apiClient.post<SourceRepairPreviewResponse>(
        `/admin/operations/races/${raceId}/source-repairs/qualifying/${payload.resultId}/delete/preview`,
        { reason: payload.reason.trim() }
      ),
  });
  const raceResultRepairMutation = useMutation({
    mutationFn: async (payload: {
      resultId: string;
      seasonEntryId: string;
      finishPosition: string;
      classifiedPosition: string;
      isFastestLap: "true" | "false" | "unknown";
      reason: string;
    }) =>
      apiClient.post(
        `/admin/operations/races/${raceId}/source-repairs/race-results/${payload.resultId}`,
        {
          seasonEntryId: Number(payload.seasonEntryId),
          finishPosition: payload.finishPosition.trim().length > 0 ? Number(payload.finishPosition) : null,
          classifiedPosition: payload.classifiedPosition.trim().length > 0 ? Number(payload.classifiedPosition) : null,
          isFastestLap:
            payload.isFastestLap === "unknown" ? null : payload.isFastestLap === "true",
          reason: payload.reason.trim(),
        }
      ),
    onSuccess: async () => {
      setRaceResultPreviews({});
      await queryClient.invalidateQueries({ queryKey: ["admin-operations-race-detail", raceId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-operations-races"] });
    },
  });
  const raceResultPreviewMutation = useMutation({
    mutationFn: async (payload: {
      resultId: string;
      seasonEntryId: string;
      finishPosition: string;
      classifiedPosition: string;
      isFastestLap: "true" | "false" | "unknown";
      reason: string;
    }) =>
      apiClient.post<SourceRepairPreviewResponse>(
        `/admin/operations/races/${raceId}/source-repairs/race-results/${payload.resultId}/preview`,
        {
          seasonEntryId: Number(payload.seasonEntryId),
          finishPosition: payload.finishPosition.trim().length > 0 ? Number(payload.finishPosition) : null,
          classifiedPosition: payload.classifiedPosition.trim().length > 0 ? Number(payload.classifiedPosition) : null,
          isFastestLap:
            payload.isFastestLap === "unknown" ? null : payload.isFastestLap === "true",
          reason: payload.reason.trim(),
        }
      ),
  });
  const raceResultCreateMutation = useMutation({
    mutationFn: async (payload: { seasonEntryId: string; finishPosition: string; classifiedPosition: string; isFastestLap: "true" | "false" | "unknown"; reason: string }) =>
      apiClient.post(`/admin/operations/races/${raceId}/source-repairs/race-results/create`, {
        seasonEntryId: Number(payload.seasonEntryId),
        finishPosition: payload.finishPosition.trim().length > 0 ? Number(payload.finishPosition) : null,
        classifiedPosition: payload.classifiedPosition.trim().length > 0 ? Number(payload.classifiedPosition) : null,
        isFastestLap: payload.isFastestLap === "unknown" ? null : payload.isFastestLap === "true",
        reason: payload.reason.trim(),
      }),
    onSuccess: async () => {
      setRaceResultCreatePreview(undefined);
      setRaceResultDeletePreviews({});
      await queryClient.invalidateQueries({ queryKey: ["admin-operations-race-detail", raceId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-operations-races"] });
    },
  });
  const raceResultCreatePreviewMutation = useMutation({
    mutationFn: async (payload: { seasonEntryId: string; finishPosition: string; classifiedPosition: string; isFastestLap: "true" | "false" | "unknown"; reason: string }) =>
      apiClient.post<SourceRepairPreviewResponse>(`/admin/operations/races/${raceId}/source-repairs/race-results/create/preview`, {
        seasonEntryId: Number(payload.seasonEntryId),
        finishPosition: payload.finishPosition.trim().length > 0 ? Number(payload.finishPosition) : null,
        classifiedPosition: payload.classifiedPosition.trim().length > 0 ? Number(payload.classifiedPosition) : null,
        isFastestLap: payload.isFastestLap === "unknown" ? null : payload.isFastestLap === "true",
        reason: payload.reason.trim(),
      }),
  });
  const raceResultDeleteMutation = useMutation({
    mutationFn: async (payload: { resultId: string; reason: string }) =>
      apiClient.post(`/admin/operations/races/${raceId}/source-repairs/race-results/${payload.resultId}/delete`, {
        reason: payload.reason.trim(),
      }),
    onSuccess: async () => {
      setRaceResultPreviews({});
      setRaceResultDeletePreviews({});
      await queryClient.invalidateQueries({ queryKey: ["admin-operations-race-detail", raceId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-operations-races"] });
    },
  });
  const raceResultDeletePreviewMutation = useMutation({
    mutationFn: async (payload: { resultId: string; reason: string }) =>
      apiClient.post<SourceRepairPreviewResponse>(
        `/admin/operations/races/${raceId}/source-repairs/race-results/${payload.resultId}/delete/preview`,
        { reason: payload.reason.trim() }
      ),
  });

  useEffect(() => {
    if (!detail) return;
    setFormState({
      safetyCarDeployed: toSafetyCarFormValue(detail.resultWorkspace.effective.safetyCarDeployed),
      P1: detail.resultWorkspace.effective.podium.P1 ?? "",
      P2: detail.resultWorkspace.effective.podium.P2 ?? "",
      P3: detail.resultWorkspace.effective.podium.P3 ?? "",
      fastestLapDriverId: detail.resultWorkspace.effective.fastestLapDriverId ?? "",
      biggestGainerDriverId: detail.resultWorkspace.effective.biggestGainerDriverId ?? "",
      classifiedFinishersCount: String(detail.resultWorkspace.effective.classifiedFinishersCount),
    });
    setQualifyingDrafts(
      Object.fromEntries(
        detail.sourceWorkspace.qualifyingResults.map((row) => [
          row.resultId,
          {
            seasonEntryId: row.seasonEntryId,
            gridPosition: row.gridPosition === null ? "" : String(row.gridPosition),
            reason: "",
          },
        ])
      )
    );
    setQualifyingPreviews({});
    setQualifyingDeletePreviews({});
    setQualifyingCreateDraft({
      seasonEntryId: detail.sourceWorkspace.seasonEntryOptions[0]?.seasonEntryId ?? "",
      gridPosition: "",
      reason: "",
    });
    setQualifyingCreatePreview(undefined);
    setRaceResultDrafts(
      Object.fromEntries(
        detail.sourceWorkspace.raceResults.map((row) => [
          row.resultId,
          {
            seasonEntryId: row.seasonEntryId,
            finishPosition: row.finishPosition === null ? "" : String(row.finishPosition),
            classifiedPosition: row.classifiedPosition === null ? "" : String(row.classifiedPosition),
            isFastestLap: row.isFastestLap === null ? "unknown" : row.isFastestLap ? "true" : "false",
            reason: "",
          },
        ])
      )
    );
    setRaceResultPreviews({});
    setRaceResultDeletePreviews({});
    setRaceResultCreateDraft({
      seasonEntryId: detail.sourceWorkspace.seasonEntryOptions[0]?.seasonEntryId ?? "",
      finishPosition: "",
      classifiedPosition: "",
      isFastestLap: "unknown",
      reason: "",
    });
    setRaceResultCreatePreview(undefined);
  }, [detail]);

  useEffect(() => {
    previewMutation.reset();
  }, [
    formState?.safetyCarDeployed,
    formState?.P1,
    formState?.P2,
    formState?.P3,
    formState?.fastestLapDriverId,
    formState?.biggestGainerDriverId,
    formState?.classifiedFinishersCount,
  ]);

  const driverOptions = detail?.resultWorkspace.driverOptions ?? [];
  const seasonEntryOptions = detail?.sourceWorkspace.seasonEntryOptions ?? [];
  const setFieldValue = <K extends keyof NonNullable<typeof formState>>(key: K, value: NonNullable<typeof formState>[K]) => {
    setFormState((current) => (current ? { ...current, [key]: value } : current));
  };
  const setQualifyingDraftValue = (resultId: string, key: "seasonEntryId" | "gridPosition" | "reason", value: string) => {
    setQualifyingPreviews((current) => ({ ...current, [resultId]: undefined }));
    setQualifyingDeletePreviews((current) => ({ ...current, [resultId]: undefined }));
    setQualifyingDrafts((current) => ({
      ...current,
      [resultId]: {
        ...(current[resultId] ?? { seasonEntryId: "", gridPosition: "", reason: "" }),
        [key]: value,
      },
    }));
  };
  const setRaceResultDraftValue = (
    resultId: string,
    key: "seasonEntryId" | "finishPosition" | "classifiedPosition" | "isFastestLap" | "reason",
    value: string
  ) => {
    setRaceResultPreviews((current) => ({ ...current, [resultId]: undefined }));
    setRaceResultDeletePreviews((current) => ({ ...current, [resultId]: undefined }));
    setRaceResultDrafts((current) => ({
      ...current,
      [resultId]: {
        ...(current[resultId] ?? {
          seasonEntryId: "",
          finishPosition: "",
          classifiedPosition: "",
          isFastestLap: "unknown",
          reason: "",
        }),
        [key]: value,
      },
    }));
  };

  const qualifyingWarnings = getQualifyingWarnings(detail?.sourceWorkspace.qualifyingResults ?? [], qualifyingDrafts, qualifyingCreateDraft);
  const raceResultWarnings = getRaceResultWarnings(detail?.sourceWorkspace.raceResults ?? [], raceResultDrafts, raceResultCreateDraft);

  const resetAllToRaw = () => {
    if (!detail) return;
    setFormState({
      safetyCarDeployed: toSafetyCarFormValue(detail.resultWorkspace.raw.safetyCarDeployed),
      P1: detail.resultWorkspace.raw.podium.P1 ?? "",
      P2: detail.resultWorkspace.raw.podium.P2 ?? "",
      P3: detail.resultWorkspace.raw.podium.P3 ?? "",
      fastestLapDriverId: detail.resultWorkspace.raw.fastestLapDriverId ?? "",
      biggestGainerDriverId: detail.resultWorkspace.raw.biggestGainerDriverId ?? "",
      classifiedFinishersCount: String(detail.resultWorkspace.raw.classifiedFinishersCount),
    });
  };

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Link to="/admin" className="text-sm font-medium text-red-700 hover:text-red-800">
          ← Back to Race Ops
        </Link>
        <div className="space-y-2">
          <h2 className="font-['Orbitron'] text-3xl font-bold uppercase tracking-tight text-black">
            Race Detail
          </h2>
          <p className="text-slate-600">
            Audit view for one race, including base inputs, active overrides, and recent scoring runs.
          </p>
        </div>
      </div>

      {detailQuery.isLoading ? <p className="text-slate-600">Loading race detail...</p> : null}
      {detailQuery.isError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {getErrorMessage(detailQuery.error)}
        </p>
      ) : null}

      {detail ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                {detail.race.seasonYear} Round {detail.race.round}: {detail.race.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-700">
              <p>Race start: {formatDateTime(detail.race.raceStartAt)}</p>
              <p>Corrections are managed through the unified round repair workspace below.</p>
            </CardContent>
          </Card>

          {detail.resultWorkspace && formState ? (
          <Card>
            <CardHeader>
              <CardTitle>Round Repair Workspace</CardTitle>
            </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900">
                  Use this workspace to stage corrections against the ingested round inputs used for scoring. Setting a
                  field back to its ingested value will revoke that override on apply rather than mutating source rows.
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button variant="secondary" onClick={resetAllToRaw}>
                    Reset Form To Ingested
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-900">Safety Car</p>
                    <Select value={formState.safetyCarDeployed} onValueChange={(value) => setFieldValue("safetyCarDeployed", value as "true" | "false" | "unknown")}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select safety car state" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Deployed</SelectItem>
                        <SelectItem value="false">Not deployed</SelectItem>
                        <SelectItem value="unknown">Unknown / use ingested</SelectItem>
                      </SelectContent>
                    </Select>
                    <FieldComparison
                      rawLabel={formatSafetyCarValue(detail.resultWorkspace.raw.safetyCarDeployed)}
                      effectiveLabel={formatSafetyCarValue(detail.resultWorkspace.effective.safetyCarDeployed)}
                      override={detail.resultWorkspace.activeOverrides.safety_car_deployed}
                      history={toFieldHistory(
                        detail.resultWorkspace.overrideHistory.safety_car_deployed,
                        (value) => formatSafetyCarValue(typeof value === "boolean" ? value : null)
                      )}
                      onReset={() => setFieldValue("safetyCarDeployed", toSafetyCarFormValue(detail.resultWorkspace.raw.safetyCarDeployed))}
                    />
                  </div>
                  <div className="space-y-2">
                    <DriverSelect label="P1" value={formState.P1} options={driverOptions} onChange={(value) => setFieldValue("P1", value)} />
                    <FieldComparison
                      rawLabel={formatDriverValue(detail.resultWorkspace.raw.podium.P1, driverOptions)}
                      effectiveLabel={formatDriverValue(detail.resultWorkspace.effective.podium.P1, driverOptions)}
                      override={detail.resultWorkspace.activeOverrides.podium_p1_driver_id}
                      history={toFieldHistory(
                        detail.resultWorkspace.overrideHistory.podium_p1_driver_id,
                        (value) => formatDriverValue(typeof value === "string" ? value : null, driverOptions)
                      )}
                      onReset={() => setFieldValue("P1", detail.resultWorkspace.raw.podium.P1 ?? "")}
                    />
                  </div>
                  <div className="space-y-2">
                    <DriverSelect label="P2" value={formState.P2} options={driverOptions} onChange={(value) => setFieldValue("P2", value)} />
                    <FieldComparison
                      rawLabel={formatDriverValue(detail.resultWorkspace.raw.podium.P2, driverOptions)}
                      effectiveLabel={formatDriverValue(detail.resultWorkspace.effective.podium.P2, driverOptions)}
                      override={detail.resultWorkspace.activeOverrides.podium_p2_driver_id}
                      history={toFieldHistory(
                        detail.resultWorkspace.overrideHistory.podium_p2_driver_id,
                        (value) => formatDriverValue(typeof value === "string" ? value : null, driverOptions)
                      )}
                      onReset={() => setFieldValue("P2", detail.resultWorkspace.raw.podium.P2 ?? "")}
                    />
                  </div>
                  <div className="space-y-2">
                    <DriverSelect label="P3" value={formState.P3} options={driverOptions} onChange={(value) => setFieldValue("P3", value)} />
                    <FieldComparison
                      rawLabel={formatDriverValue(detail.resultWorkspace.raw.podium.P3, driverOptions)}
                      effectiveLabel={formatDriverValue(detail.resultWorkspace.effective.podium.P3, driverOptions)}
                      override={detail.resultWorkspace.activeOverrides.podium_p3_driver_id}
                      history={toFieldHistory(
                        detail.resultWorkspace.overrideHistory.podium_p3_driver_id,
                        (value) => formatDriverValue(typeof value === "string" ? value : null, driverOptions)
                      )}
                      onReset={() => setFieldValue("P3", detail.resultWorkspace.raw.podium.P3 ?? "")}
                    />
                  </div>
                  <div className="space-y-2">
                    <DriverSelect label="Fastest Lap" value={formState.fastestLapDriverId} options={driverOptions} onChange={(value) => setFieldValue("fastestLapDriverId", value)} />
                    <FieldComparison
                      rawLabel={formatDriverValue(detail.resultWorkspace.raw.fastestLapDriverId, driverOptions)}
                      effectiveLabel={formatDriverValue(detail.resultWorkspace.effective.fastestLapDriverId, driverOptions)}
                      override={detail.resultWorkspace.activeOverrides.fastest_lap_driver_id}
                      history={toFieldHistory(
                        detail.resultWorkspace.overrideHistory.fastest_lap_driver_id,
                        (value) => formatDriverValue(typeof value === "string" ? value : null, driverOptions)
                      )}
                      onReset={() => setFieldValue("fastestLapDriverId", detail.resultWorkspace.raw.fastestLapDriverId ?? "")}
                    />
                  </div>
                  <div className="space-y-2">
                    <DriverSelect label="Biggest Gainer" value={formState.biggestGainerDriverId} options={driverOptions} onChange={(value) => setFieldValue("biggestGainerDriverId", value)} />
                    <FieldComparison
                      rawLabel={formatDriverValue(detail.resultWorkspace.raw.biggestGainerDriverId, driverOptions)}
                      effectiveLabel={formatDriverValue(detail.resultWorkspace.effective.biggestGainerDriverId, driverOptions)}
                      override={detail.resultWorkspace.activeOverrides.biggest_gainer_driver_id}
                      history={toFieldHistory(
                        detail.resultWorkspace.overrideHistory.biggest_gainer_driver_id,
                        (value) => formatDriverValue(typeof value === "string" ? value : null, driverOptions)
                      )}
                      onReset={() => setFieldValue("biggestGainerDriverId", detail.resultWorkspace.raw.biggestGainerDriverId ?? "")}
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-900">Classified Finishers</p>
                    <Input value={formState.classifiedFinishersCount} onChange={(event) => setFieldValue("classifiedFinishersCount", event.target.value)} />
                    <FieldComparison
                      rawLabel={String(detail.resultWorkspace.raw.classifiedFinishersCount)}
                      effectiveLabel={String(detail.resultWorkspace.effective.classifiedFinishersCount)}
                      override={detail.resultWorkspace.activeOverrides.classified_finishers_count}
                      history={toFieldHistory(
                        detail.resultWorkspace.overrideHistory.classified_finishers_count,
                        (value) => typeof value === "number" ? String(value) : "Unknown"
                      )}
                      onReset={() => setFieldValue("classifiedFinishersCount", String(detail.resultWorkspace.raw.classifiedFinishersCount))}
                    />
                  </div>
                </div>

                <Input
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Reason for manual correction"
                />

                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    disabled={previewMutation.isPending}
                    onClick={() => {
                      void previewMutation.mutateAsync(buildCorrectionPayload(formState));
                    }}
                  >
                    {previewMutation.isPending ? "Previewing..." : "Preview Correction"}
                  </Button>
                  <Button
                    disabled={applyMutation.isPending || reason.trim().length < 8}
                    onClick={() => {
                      void applyMutation.mutateAsync({
                        ...buildCorrectionPayload(formState),
                        reason: reason.trim(),
                      });
                    }}
                  >
                    {applyMutation.isPending ? "Applying..." : "Apply Correction"}
                  </Button>
                </div>

                {previewMutation.data ? (
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-slate-700">
                    Preview: {previewMutation.data.preview.summary.leaguesProcessed} leagues,{" "}
                    {previewMutation.data.preview.summary.totalChangedEntries} changed entries,{" "}
                    {previewMutation.data.preview.summary.totalPointsDelta >= 0 ? "+" : ""}
                    {previewMutation.data.preview.summary.totalPointsDelta} points delta.
                  </div>
                ) : null}
                {previewMutation.isError ? (
                  <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {getErrorMessage(previewMutation.error)}
                  </p>
                ) : null}
                {applyMutation.isError ? (
                  <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {getErrorMessage(applyMutation.error)}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {detail.sourceWorkspace ? (
            <Card>
              <CardHeader>
                <CardTitle>Raw Source Repair</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900">
                  Use this section when ingestion attached the wrong season entry or source values. These changes update
                  underlying qualifying and race-result rows, write an audit record, and then rescore the race.
                </div>

                <div className="space-y-3">
                  <h3 className="text-base font-semibold text-slate-950">Qualifying Results</h3>
                  <div className="grid gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 md:grid-cols-[minmax(0,1.2fr)_140px_minmax(0,1fr)_auto_auto]">
                    <Select
                      value={qualifyingCreateDraft.seasonEntryId}
                      onValueChange={(value) => {
                        setQualifyingCreatePreview(undefined);
                        setQualifyingCreateDraft((current) => ({ ...current, seasonEntryId: value }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select entry" />
                      </SelectTrigger>
                      <SelectContent>
                        {seasonEntryOptions.map((option) => (
                          <SelectItem key={option.seasonEntryId} value={option.seasonEntryId}>
                            {option.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={qualifyingCreateDraft.gridPosition}
                      onChange={(event) => {
                        setQualifyingCreatePreview(undefined);
                        setQualifyingCreateDraft((current) => ({ ...current, gridPosition: event.target.value }));
                      }}
                      placeholder="Grid"
                    />
                    <Input
                      value={qualifyingCreateDraft.reason}
                      onChange={(event) => {
                        setQualifyingCreatePreview(undefined);
                        setQualifyingCreateDraft((current) => ({ ...current, reason: event.target.value }));
                      }}
                      placeholder="Reason for adding source row"
                    />
                    <Button
                      variant="secondary"
                      disabled={qualifyingCreateDraft.reason.trim().length < 8 || qualifyingCreatePreviewMutation.isPending}
                      onClick={() => {
                        void qualifyingCreatePreviewMutation.mutateAsync(qualifyingCreateDraft).then((response) => {
                          setQualifyingCreatePreview(response.preview);
                        });
                      }}
                    >
                      Preview Add
                    </Button>
                    <Button
                      disabled={qualifyingCreateDraft.reason.trim().length < 8 || qualifyingCreateMutation.isPending}
                      onClick={() => {
                        void qualifyingCreateMutation.mutateAsync(qualifyingCreateDraft);
                      }}
                    >
                      Add Row
                    </Button>
                  </div>
                  {qualifyingCreatePreview ? (
                    <p className="text-xs text-slate-600">
                      Add preview: {qualifyingCreatePreview.summary.leaguesProcessed} leagues, {qualifyingCreatePreview.summary.totalChangedEntries} changed entries, {qualifyingCreatePreview.summary.totalPointsDelta >= 0 ? "+" : ""}{qualifyingCreatePreview.summary.totalPointsDelta} points.
                    </p>
                  ) : null}
                  {qualifyingWarnings.create.length > 0 ? (
                    <p className="text-xs text-amber-700">{qualifyingWarnings.create.join(" ")}</p>
                  ) : null}
                  <Table ariaLabel="Qualifying source repair">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Driver</TableHead>
                        <TableHead>Season Entry</TableHead>
                        <TableHead>Grid</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.sourceWorkspace.qualifyingResults.map((row) => {
                        const draft = qualifyingDrafts[row.resultId];
                        const reasonValid = (draft?.reason ?? "").trim().length >= 8;
                        const warnings = qualifyingWarnings.rows[row.resultId] ?? [];
                        return (
                          <TableRow key={row.resultId}>
                            <TableCell>{row.driverDisplayName}</TableCell>
                            <TableCell>
                              <Select
                                value={draft?.seasonEntryId ?? row.seasonEntryId}
                                onValueChange={(value) => setQualifyingDraftValue(row.resultId, "seasonEntryId", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select entry" />
                                </SelectTrigger>
                                <SelectContent>
                                  {seasonEntryOptions.map((option) => (
                                    <SelectItem key={option.seasonEntryId} value={option.seasonEntryId}>
                                      {option.displayName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                value={draft?.gridPosition ?? ""}
                                onChange={(event) => setQualifyingDraftValue(row.resultId, "gridPosition", event.target.value)}
                                placeholder="Grid"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={draft?.reason ?? ""}
                                onChange={(event) => setQualifyingDraftValue(row.resultId, "reason", event.target.value)}
                                placeholder="Reason for source repair"
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  disabled={!reasonValid || qualifyingPreviewMutation.isPending}
                                  onClick={() => {
                                    const nextDraft = qualifyingDrafts[row.resultId];
                                    if (!nextDraft) return;
                                    void qualifyingPreviewMutation.mutateAsync({
                                      resultId: row.resultId,
                                      seasonEntryId: nextDraft.seasonEntryId,
                                      gridPosition: nextDraft.gridPosition,
                                      reason: nextDraft.reason,
                                    }).then((response) => {
                                      setQualifyingPreviews((current) => ({ ...current, [row.resultId]: response.preview }));
                                    });
                                  }}
                                >
                                  Preview
                                </Button>
                                <Button
                                  size="sm"
                                  disabled={!reasonValid || qualifyingRepairMutation.isPending}
                                  onClick={() => {
                                    const nextDraft = qualifyingDrafts[row.resultId];
                                    if (!nextDraft) return;
                                    void qualifyingRepairMutation.mutateAsync({
                                      resultId: row.resultId,
                                      seasonEntryId: nextDraft.seasonEntryId,
                                      gridPosition: nextDraft.gridPosition,
                                      reason: nextDraft.reason,
                                    });
                                  }}
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={!reasonValid || qualifyingDeleteMutation.isPending}
                                  onClick={() => {
                                    const nextDraft = qualifyingDrafts[row.resultId];
                                    if (!nextDraft) return;
                                    void qualifyingDeletePreviewMutation.mutateAsync({
                                      resultId: row.resultId,
                                      reason: nextDraft.reason,
                                    }).then((response) => {
                                      setQualifyingDeletePreviews((current) => ({ ...current, [row.resultId]: response.preview }));
                                    });
                                  }}
                                >
                                  Preview Remove
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={!reasonValid || qualifyingDeleteMutation.isPending}
                                  onClick={() => {
                                    const nextDraft = qualifyingDrafts[row.resultId];
                                    if (!nextDraft) return;
                                    void qualifyingDeleteMutation.mutateAsync({
                                      resultId: row.resultId,
                                      reason: nextDraft.reason,
                                    });
                                  }}
                                >
                                  Remove
                                </Button>
                              </div>
                              {qualifyingPreviews[row.resultId] ? (
                                <p className="mt-2 text-xs text-slate-600">
                                  Preview: {qualifyingPreviews[row.resultId]!.summary.leaguesProcessed} leagues,{" "}
                                  {qualifyingPreviews[row.resultId]!.summary.totalChangedEntries} changed entries,{" "}
                                  {qualifyingPreviews[row.resultId]!.summary.totalPointsDelta >= 0 ? "+" : ""}
                                  {qualifyingPreviews[row.resultId]!.summary.totalPointsDelta} points.
                                </p>
                              ) : null}
                              {qualifyingDeletePreviews[row.resultId] ? (
                                <p className="mt-2 text-xs text-slate-600">
                                  Remove preview: {qualifyingDeletePreviews[row.resultId]!.summary.leaguesProcessed} leagues,{" "}
                                  {qualifyingDeletePreviews[row.resultId]!.summary.totalChangedEntries} changed entries,{" "}
                                  {qualifyingDeletePreviews[row.resultId]!.summary.totalPointsDelta >= 0 ? "+" : ""}
                                  {qualifyingDeletePreviews[row.resultId]!.summary.totalPointsDelta} points.
                                </p>
                              ) : null}
                              {warnings.length > 0 ? (
                                <p className="mt-2 text-xs text-amber-700">{warnings.join(" ")}</p>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="space-y-3">
                  <h3 className="text-base font-semibold text-slate-950">Race Results</h3>
                  <div className="grid gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 md:grid-cols-[minmax(0,1.2fr)_100px_110px_120px_minmax(0,1fr)_auto_auto]">
                    <Select
                      value={raceResultCreateDraft.seasonEntryId}
                      onValueChange={(value) => {
                        setRaceResultCreatePreview(undefined);
                        setRaceResultCreateDraft((current) => ({ ...current, seasonEntryId: value }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select entry" />
                      </SelectTrigger>
                      <SelectContent>
                        {seasonEntryOptions.map((option) => (
                          <SelectItem key={option.seasonEntryId} value={option.seasonEntryId}>
                            {option.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={raceResultCreateDraft.finishPosition}
                      onChange={(event) => {
                        setRaceResultCreatePreview(undefined);
                        setRaceResultCreateDraft((current) => ({ ...current, finishPosition: event.target.value }));
                      }}
                      placeholder="Finish"
                    />
                    <Input
                      value={raceResultCreateDraft.classifiedPosition}
                      onChange={(event) => {
                        setRaceResultCreatePreview(undefined);
                        setRaceResultCreateDraft((current) => ({ ...current, classifiedPosition: event.target.value }));
                      }}
                      placeholder="Classified"
                    />
                    <Select
                      value={raceResultCreateDraft.isFastestLap}
                      onValueChange={(value) => {
                        setRaceResultCreatePreview(undefined);
                        setRaceResultCreateDraft((current) => ({ ...current, isFastestLap: value as "true" | "false" | "unknown" }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Fastest lap" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                        <SelectItem value="unknown">Unknown</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      value={raceResultCreateDraft.reason}
                      onChange={(event) => {
                        setRaceResultCreatePreview(undefined);
                        setRaceResultCreateDraft((current) => ({ ...current, reason: event.target.value }));
                      }}
                      placeholder="Reason for adding source row"
                    />
                    <Button
                      variant="secondary"
                      disabled={raceResultCreateDraft.reason.trim().length < 8 || raceResultCreatePreviewMutation.isPending}
                      onClick={() => {
                        void raceResultCreatePreviewMutation.mutateAsync(raceResultCreateDraft).then((response) => {
                          setRaceResultCreatePreview(response.preview);
                        });
                      }}
                    >
                      Preview Add
                    </Button>
                    <Button
                      disabled={raceResultCreateDraft.reason.trim().length < 8 || raceResultCreateMutation.isPending}
                      onClick={() => {
                        void raceResultCreateMutation.mutateAsync(raceResultCreateDraft);
                      }}
                    >
                      Add Row
                    </Button>
                  </div>
                  {raceResultCreatePreview ? (
                    <p className="text-xs text-slate-600">
                      Add preview: {raceResultCreatePreview.summary.leaguesProcessed} leagues, {raceResultCreatePreview.summary.totalChangedEntries} changed entries, {raceResultCreatePreview.summary.totalPointsDelta >= 0 ? "+" : ""}{raceResultCreatePreview.summary.totalPointsDelta} points.
                    </p>
                  ) : null}
                  {raceResultWarnings.create.length > 0 ? (
                    <p className="text-xs text-amber-700">{raceResultWarnings.create.join(" ")}</p>
                  ) : null}
                  <Table ariaLabel="Race result source repair">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Driver</TableHead>
                        <TableHead>Season Entry</TableHead>
                        <TableHead>Finish</TableHead>
                        <TableHead>Classified</TableHead>
                        <TableHead>Fastest Lap</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.sourceWorkspace.raceResults.map((row) => {
                        const draft = raceResultDrafts[row.resultId];
                        const reasonValid = (draft?.reason ?? "").trim().length >= 8;
                        const warnings = raceResultWarnings.rows[row.resultId] ?? [];
                        return (
                          <TableRow key={row.resultId}>
                            <TableCell>{row.driverDisplayName}</TableCell>
                            <TableCell>
                              <Select
                                value={draft?.seasonEntryId ?? row.seasonEntryId}
                                onValueChange={(value) => setRaceResultDraftValue(row.resultId, "seasonEntryId", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select entry" />
                                </SelectTrigger>
                                <SelectContent>
                                  {seasonEntryOptions.map((option) => (
                                    <SelectItem key={option.seasonEntryId} value={option.seasonEntryId}>
                                      {option.displayName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                value={draft?.finishPosition ?? ""}
                                onChange={(event) => setRaceResultDraftValue(row.resultId, "finishPosition", event.target.value)}
                                placeholder="Finish"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={draft?.classifiedPosition ?? ""}
                                onChange={(event) => setRaceResultDraftValue(row.resultId, "classifiedPosition", event.target.value)}
                                placeholder="Classified"
                              />
                            </TableCell>
                            <TableCell>
                              <Select
                                value={draft?.isFastestLap ?? "unknown"}
                                onValueChange={(value) => setRaceResultDraftValue(row.resultId, "isFastestLap", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Fastest lap" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="true">Yes</SelectItem>
                                  <SelectItem value="false">No</SelectItem>
                                  <SelectItem value="unknown">Unknown</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                value={draft?.reason ?? ""}
                                onChange={(event) => setRaceResultDraftValue(row.resultId, "reason", event.target.value)}
                                placeholder="Reason for source repair"
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  disabled={!reasonValid || raceResultPreviewMutation.isPending}
                                  onClick={() => {
                                    const nextDraft = raceResultDrafts[row.resultId];
                                    if (!nextDraft) return;
                                    void raceResultPreviewMutation.mutateAsync({
                                      resultId: row.resultId,
                                      seasonEntryId: nextDraft.seasonEntryId,
                                      finishPosition: nextDraft.finishPosition,
                                      classifiedPosition: nextDraft.classifiedPosition,
                                      isFastestLap: nextDraft.isFastestLap,
                                      reason: nextDraft.reason,
                                    }).then((response) => {
                                      setRaceResultPreviews((current) => ({ ...current, [row.resultId]: response.preview }));
                                    });
                                  }}
                                >
                                  Preview
                                </Button>
                                <Button
                                  size="sm"
                                  disabled={!reasonValid || raceResultRepairMutation.isPending}
                                  onClick={() => {
                                    const nextDraft = raceResultDrafts[row.resultId];
                                    if (!nextDraft) return;
                                    void raceResultRepairMutation.mutateAsync({
                                      resultId: row.resultId,
                                      seasonEntryId: nextDraft.seasonEntryId,
                                      finishPosition: nextDraft.finishPosition,
                                      classifiedPosition: nextDraft.classifiedPosition,
                                      isFastestLap: nextDraft.isFastestLap,
                                      reason: nextDraft.reason,
                                    });
                                  }}
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={!reasonValid || raceResultDeleteMutation.isPending}
                                  onClick={() => {
                                    const nextDraft = raceResultDrafts[row.resultId];
                                    if (!nextDraft) return;
                                    void raceResultDeletePreviewMutation.mutateAsync({
                                      resultId: row.resultId,
                                      reason: nextDraft.reason,
                                    }).then((response) => {
                                      setRaceResultDeletePreviews((current) => ({ ...current, [row.resultId]: response.preview }));
                                    });
                                  }}
                                >
                                  Preview Remove
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={!reasonValid || raceResultDeleteMutation.isPending}
                                  onClick={() => {
                                    const nextDraft = raceResultDrafts[row.resultId];
                                    if (!nextDraft) return;
                                    void raceResultDeleteMutation.mutateAsync({
                                      resultId: row.resultId,
                                      reason: nextDraft.reason,
                                    });
                                  }}
                                >
                                  Remove
                                </Button>
                              </div>
                              {raceResultPreviews[row.resultId] ? (
                                <p className="mt-2 text-xs text-slate-600">
                                  Preview: {raceResultPreviews[row.resultId]!.summary.leaguesProcessed} leagues,{" "}
                                  {raceResultPreviews[row.resultId]!.summary.totalChangedEntries} changed entries,{" "}
                                  {raceResultPreviews[row.resultId]!.summary.totalPointsDelta >= 0 ? "+" : ""}
                                  {raceResultPreviews[row.resultId]!.summary.totalPointsDelta} points.
                                </p>
                              ) : null}
                              {raceResultDeletePreviews[row.resultId] ? (
                                <p className="mt-2 text-xs text-slate-600">
                                  Remove preview: {raceResultDeletePreviews[row.resultId]!.summary.leaguesProcessed} leagues,{" "}
                                  {raceResultDeletePreviews[row.resultId]!.summary.totalChangedEntries} changed entries,{" "}
                                  {raceResultDeletePreviews[row.resultId]!.summary.totalPointsDelta >= 0 ? "+" : ""}
                                  {raceResultDeletePreviews[row.resultId]!.summary.totalPointsDelta} points.
                                </p>
                              ) : null}
                              {warnings.length > 0 ? (
                                <p className="mt-2 text-xs text-amber-700">{warnings.join(" ")}</p>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {qualifyingRepairMutation.isError ? (
                  <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {getErrorMessage(qualifyingRepairMutation.error)}
                  </p>
                ) : null}
                {qualifyingPreviewMutation.isError ? (
                  <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {getErrorMessage(qualifyingPreviewMutation.error)}
                  </p>
                ) : null}
                {qualifyingDeletePreviewMutation.isError ? (
                  <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {getErrorMessage(qualifyingDeletePreviewMutation.error)}
                  </p>
                ) : null}
                {raceResultRepairMutation.isError ? (
                  <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {getErrorMessage(raceResultRepairMutation.error)}
                  </p>
                ) : null}
                {raceResultPreviewMutation.isError ? (
                  <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {getErrorMessage(raceResultPreviewMutation.error)}
                  </p>
                ) : null}
                {raceResultDeletePreviewMutation.isError ? (
                  <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {getErrorMessage(raceResultDeletePreviewMutation.error)}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Recent Scoring Runs</CardTitle>
            </CardHeader>
            <CardContent>
              <Table ariaLabel="Race scoring run history">
                <TableHeader>
                  <TableRow>
                    <TableHead>Run</TableHead>
                    <TableHead>League</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.scoringRuns.map((run) => (
                    <TableRow key={run.scoringRunId}>
                      <TableCell className="font-mono text-xs">
                        {run.scoringRunId.slice(0, 8)}
                        {run.isCurrent ? (
                          <span className="ml-2 inline-block rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                            current
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{run.leagueId.slice(0, 8)}</TableCell>
                      <TableCell>
                        <Badge tone={run.status === "success" ? "success" : run.status === "failed" ? "danger" : "warning"}>
                          {run.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatRunSource(run.source)}</TableCell>
                      <TableCell>{run.reason ?? "None recorded"}</TableCell>
                      <TableCell>
                        <div>{formatDateTime(run.createdAt)}</div>
                        <div className="mt-1 text-[11px] text-slate-500">
                          {formatRunInputSnapshot(run.inputSnapshot, detail.resultWorkspace.driverOptions)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Audit Log</CardTitle>
            </CardHeader>
            <CardContent>
              <Table ariaLabel="Race audit log">
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Summary</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.auditLog.length > 0 ? (
                    detail.auditLog.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{formatDateTime(item.createdAt)}</TableCell>
                        <TableCell>{item.actorDisplayName}</TableCell>
                        <TableCell>{item.action}</TableCell>
                        <TableCell>{item.summary}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-slate-600">
                        No audit entries recorded for this race yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function formatSafetyCarValue(value: boolean | null): string {
  if (value === null) return "Unknown";
  return value ? "Deployed" : "Not deployed";
}

function formatRunSource(source: DetailResponse["scoringRuns"][number]["source"]) {
  if (source === "admin_override") return "Admin override";
  if (source === "admin_manual") return "Admin manual";
  if (source === "internal_rescore") return "Internal rescore";
  return "System";
}

function DriverSelect(props: {
  label: string;
  value: string;
  options: DetailResponse["resultWorkspace"]["driverOptions"];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-900">{props.label}</p>
      <Select value={props.value} onValueChange={props.onChange}>
        <SelectTrigger>
          <SelectValue placeholder={`Select ${props.label}`} />
        </SelectTrigger>
        <SelectContent>
          {props.options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {formatDriverOption(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function FieldComparison(props: {
  rawLabel: string;
  effectiveLabel: string;
  override?: { reason: string; createdAt: string; createdByUserId: string };
  history?: Array<{
    id: string;
    valueLabel: string;
    reason: string;
    createdAt: string;
    createdByDisplayName: string;
    revokedAt: string | null;
    revokedByDisplayName: string | null;
    revokedReason: string | null;
  }>;
  onReset: () => void;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-xs text-slate-700">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p>
            Ingested: <span className="font-medium text-slate-900">{props.rawLabel}</span>
          </p>
          <p>
            Effective: <span className="font-medium text-slate-900">{props.effectiveLabel}</span>
          </p>
          {props.override ? (
            <p className="text-amber-800">
              Override active. {props.override.reason} • {formatDateTime(props.override.createdAt)}
            </p>
          ) : (
            <p className="text-emerald-700">No active override.</p>
          )}
        </div>
        <Button variant="ghost" className="h-auto px-2 py-1 text-xs" onClick={props.onReset}>
          Use ingested
        </Button>
      </div>
      {props.history && props.history.length > 0 ? (
        <div className="mt-3 border-t border-neutral-200 pt-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Recent field history</p>
          <div className="space-y-2">
            {props.history.slice(0, 3).map((item) => (
              <div key={item.id} className="rounded-lg border border-neutral-200 bg-white px-3 py-2">
                <p className="font-medium text-slate-900">{item.valueLabel}</p>
                <p className="text-slate-600">
                  {item.createdByDisplayName} • {formatDateTime(item.createdAt)}
                </p>
                <p className="text-slate-700">{item.reason}</p>
                {item.revokedAt ? (
                  <p className="text-amber-800">
                    Revoked by {item.revokedByDisplayName ?? "Unknown admin"} on {formatDateTime(item.revokedAt)}
                    {item.revokedReason ? ` • ${item.revokedReason}` : ""}
                  </p>
                ) : (
                  <p className="text-emerald-700">Still active until replaced or reset.</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatDriverOption(option: DetailResponse["resultWorkspace"]["driverOptions"][number]): string {
  const code = option.code ? ` (${option.code})` : "";
  const constructor = option.constructorName ? ` • ${option.constructorName}` : "";
  return `${option.givenName} ${option.familyName}${code}${constructor}`;
}

function formatDriverValue(
  driverId: string | null | undefined,
  options: DetailResponse["resultWorkspace"]["driverOptions"]
): string {
  if (!driverId) return "Unknown";
  const match = options.find((option) => option.id === driverId);
  return match ? formatDriverOption(match) : `Driver ${driverId}`;
}

function buildCorrectionPayload(state: {
  safetyCarDeployed: "true" | "false" | "unknown";
  P1: string;
  P2: string;
  P3: string;
  fastestLapDriverId: string;
  biggestGainerDriverId: string;
  classifiedFinishersCount: string;
}) {
  return {
    safetyCarDeployed:
      state.safetyCarDeployed === "unknown"
        ? undefined
        : state.safetyCarDeployed === "true",
    podium: {
      P1: state.P1,
      P2: state.P2,
      P3: state.P3,
    },
    fastestLapDriverId: state.fastestLapDriverId || undefined,
    biggestGainerDriverId: state.biggestGainerDriverId || undefined,
    classifiedFinishersCount: Number(state.classifiedFinishersCount),
  };
}

function formatRunInputSnapshot(
  snapshot: unknown,
  options: DetailResponse["resultWorkspace"]["driverOptions"]
): string {
  if (!snapshot || typeof snapshot !== "object") return "No input snapshot";
  const payload = snapshot as {
    safetyCarDeployed?: boolean | null;
    podium?: { P1?: string | null; P2?: string | null; P3?: string | null };
    fastestLapDriverId?: string | null;
    biggestGainerDriverId?: string | null;
    classifiedFinishersCount?: number | null;
  };

  const podium = payload.podium
    ? [
        formatDriverValue(payload.podium.P1, options),
        formatDriverValue(payload.podium.P2, options),
        formatDriverValue(payload.podium.P3, options),
      ].join(" / ")
    : "Unknown podium";
  const safetyCar = payload.safetyCarDeployed === undefined || payload.safetyCarDeployed === null
    ? "SC unknown"
    : payload.safetyCarDeployed
      ? "SC yes"
      : "SC no";

  return `${safetyCar} • Podium ${podium} • FL ${formatDriverValue(payload.fastestLapDriverId, options)} • BG ${formatDriverValue(payload.biggestGainerDriverId, options)} • CF ${payload.classifiedFinishersCount ?? "?"}`;
}

function toSafetyCarFormValue(value: boolean | null | undefined): "true" | "false" | "unknown" {
  if (value === true) return "true";
  if (value === false) return "false";
  return "unknown";
}

function toFieldHistory(
  history: DetailResponse["resultWorkspace"]["overrideHistory"][string],
  formatValue: (value: string | number | boolean | null) => string
) {
  return (history ?? []).map((item) => ({
    id: item.id,
    valueLabel: formatValue(item.value),
    reason: item.reason,
    createdAt: item.createdAt,
    createdByDisplayName: item.createdByDisplayName,
    revokedAt: item.revokedAt,
    revokedByDisplayName: item.revokedByDisplayName,
    revokedReason: item.revokedReason,
  }));
}

function getQualifyingWarnings(
  rows: DetailResponse["sourceWorkspace"]["qualifyingResults"],
  drafts: Record<string, { seasonEntryId: string; gridPosition: string; reason: string }>,
  createDraft: { seasonEntryId: string; gridPosition: string; reason: string }
) {
  const warnings: { rows: Record<string, string[]>; create: string[] } = { rows: {}, create: [] };
  const seasonEntryCounts = new Map<string, number>();
  const gridCounts = new Map<string, number>();

  for (const row of rows) {
    const draft = drafts[row.resultId];
    const seasonEntryId = draft?.seasonEntryId ?? row.seasonEntryId;
    const gridPosition = (draft?.gridPosition ?? (row.gridPosition === null ? "" : String(row.gridPosition))).trim();
    if (seasonEntryId) {
      seasonEntryCounts.set(seasonEntryId, (seasonEntryCounts.get(seasonEntryId) ?? 0) + 1);
    }
    if (gridPosition) {
      gridCounts.set(gridPosition, (gridCounts.get(gridPosition) ?? 0) + 1);
    }
  }
  if (createDraft.seasonEntryId) {
    seasonEntryCounts.set(createDraft.seasonEntryId, (seasonEntryCounts.get(createDraft.seasonEntryId) ?? 0) + 1);
  }
  if (createDraft.gridPosition.trim()) {
    gridCounts.set(createDraft.gridPosition.trim(), (gridCounts.get(createDraft.gridPosition.trim()) ?? 0) + 1);
  }

  for (const row of rows) {
    const draft = drafts[row.resultId];
    const rowWarnings: string[] = [];
    const seasonEntryId = draft?.seasonEntryId ?? row.seasonEntryId;
    const gridPosition = (draft?.gridPosition ?? (row.gridPosition === null ? "" : String(row.gridPosition))).trim();
    if (seasonEntryId && (seasonEntryCounts.get(seasonEntryId) ?? 0) > 1) {
      rowWarnings.push("Duplicate season entry in qualifying rows.");
    }
    if (gridPosition && (gridCounts.get(gridPosition) ?? 0) > 1) {
      rowWarnings.push("Duplicate grid position.");
    }
    warnings.rows[row.resultId] = rowWarnings;
  }

  if (createDraft.seasonEntryId && (seasonEntryCounts.get(createDraft.seasonEntryId) ?? 0) > 1) {
    warnings.create.push("Adding this row would duplicate a season entry in qualifying.");
  }
  if (createDraft.gridPosition.trim() && (gridCounts.get(createDraft.gridPosition.trim()) ?? 0) > 1) {
    warnings.create.push("Adding this row would duplicate a grid position.");
  }

  return warnings;
}

function getRaceResultWarnings(
  rows: DetailResponse["sourceWorkspace"]["raceResults"],
  drafts: Record<string, { seasonEntryId: string; finishPosition: string; classifiedPosition: string; isFastestLap: "true" | "false" | "unknown"; reason: string }>,
  createDraft: { seasonEntryId: string; finishPosition: string; classifiedPosition: string; isFastestLap: "true" | "false" | "unknown"; reason: string }
) {
  const warnings: { rows: Record<string, string[]>; create: string[] } = { rows: {}, create: [] };
  const seasonEntryCounts = new Map<string, number>();
  const finishCounts = new Map<string, number>();
  const classifiedCounts = new Map<string, number>();
  let fastestLapCount = 0;

  for (const row of rows) {
    const draft = drafts[row.resultId];
    const seasonEntryId = draft?.seasonEntryId ?? row.seasonEntryId;
    const finishPosition = (draft?.finishPosition ?? (row.finishPosition === null ? "" : String(row.finishPosition))).trim();
    const classifiedPosition = (draft?.classifiedPosition ?? (row.classifiedPosition === null ? "" : String(row.classifiedPosition))).trim();
    const isFastestLap = draft?.isFastestLap ?? (row.isFastestLap === null ? "unknown" : row.isFastestLap ? "true" : "false");
    if (seasonEntryId) seasonEntryCounts.set(seasonEntryId, (seasonEntryCounts.get(seasonEntryId) ?? 0) + 1);
    if (finishPosition) finishCounts.set(finishPosition, (finishCounts.get(finishPosition) ?? 0) + 1);
    if (classifiedPosition) classifiedCounts.set(classifiedPosition, (classifiedCounts.get(classifiedPosition) ?? 0) + 1);
    if (isFastestLap === "true") fastestLapCount += 1;
  }
  if (createDraft.seasonEntryId) seasonEntryCounts.set(createDraft.seasonEntryId, (seasonEntryCounts.get(createDraft.seasonEntryId) ?? 0) + 1);
  if (createDraft.finishPosition.trim()) finishCounts.set(createDraft.finishPosition.trim(), (finishCounts.get(createDraft.finishPosition.trim()) ?? 0) + 1);
  if (createDraft.classifiedPosition.trim()) classifiedCounts.set(createDraft.classifiedPosition.trim(), (classifiedCounts.get(createDraft.classifiedPosition.trim()) ?? 0) + 1);
  if (createDraft.isFastestLap === "true") fastestLapCount += 1;

  for (const row of rows) {
    const draft = drafts[row.resultId];
    const rowWarnings: string[] = [];
    const seasonEntryId = draft?.seasonEntryId ?? row.seasonEntryId;
    const finishPosition = (draft?.finishPosition ?? (row.finishPosition === null ? "" : String(row.finishPosition))).trim();
    const classifiedPosition = (draft?.classifiedPosition ?? (row.classifiedPosition === null ? "" : String(row.classifiedPosition))).trim();
    const isFastestLap = draft?.isFastestLap ?? (row.isFastestLap === null ? "unknown" : row.isFastestLap ? "true" : "false");
    if (seasonEntryId && (seasonEntryCounts.get(seasonEntryId) ?? 0) > 1) rowWarnings.push("Duplicate season entry in race results.");
    if (finishPosition && (finishCounts.get(finishPosition) ?? 0) > 1) rowWarnings.push("Duplicate finish position.");
    if (classifiedPosition && (classifiedCounts.get(classifiedPosition) ?? 0) > 1) rowWarnings.push("Duplicate classified position.");
    if (isFastestLap === "true" && fastestLapCount > 1) rowWarnings.push("More than one row is marked fastest lap.");
    warnings.rows[row.resultId] = rowWarnings;
  }

  if (createDraft.seasonEntryId && (seasonEntryCounts.get(createDraft.seasonEntryId) ?? 0) > 1) warnings.create.push("Adding this row would duplicate a season entry in race results.");
  if (createDraft.finishPosition.trim() && (finishCounts.get(createDraft.finishPosition.trim()) ?? 0) > 1) warnings.create.push("Adding this row would duplicate a finish position.");
  if (createDraft.classifiedPosition.trim() && (classifiedCounts.get(createDraft.classifiedPosition.trim()) ?? 0) > 1) warnings.create.push("Adding this row would duplicate a classified position.");
  if (createDraft.isFastestLap === "true" && fastestLapCount > 1) warnings.create.push("Adding this row would create multiple fastest-lap winners.");

  return warnings;
}
