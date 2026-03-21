import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { apiClient } from "@/api/apiClient";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import {
  buildCorrectionPayload,
  DetailResponse,
  DriverSelect,
  FieldComparison,
  formatDateTime,
  formatDriverValue,
  formatRunInputSnapshot,
  formatRunSource,
  formatSafetyCarValue,
  getErrorMessage,
  getQualifyingWarnings,
  getRaceResultWarnings,
  ResultCorrectionPreviewResponse,
  SourceRepairPreviewResponse,
  toFieldHistory,
  toSafetyCarFormValue,
} from "@/pages/adminRaceOperations/shared";

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
        <Link to="/admin" className="ff-kicker text-[#ff7373] hover:text-white">
          Back To Race Ops
        </Link>
        <div className="space-y-3">
          <p className="ff-kicker">Race Detail</p>
          <h2 className="ff-display text-4xl text-white md:text-5xl">
            Round Mission Control
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-[#989aa2] md:text-base">
            Audit view for one race, including base inputs, active overrides, and recent scoring runs.
          </p>
        </div>
      </div>

      {detailQuery.isLoading ? <p className="text-[#989aa2]">Loading race detail...</p> : null}
      {detailQuery.isError ? (
        <p className="border border-[#7a0d0d] bg-[#350909] px-3 py-2 text-sm text-[#ff8e8e]">
          {getErrorMessage(detailQuery.error)}
        </p>
      ) : null}

      {detail ? (
        <>
          <Card className="overflow-hidden border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(204,0,0,0.18),transparent_24%),linear-gradient(135deg,#0d0e12_0%,#15171c_52%,#20232b_100%)]">
            <CardHeader className="border-b border-white/8">
              <CardTitle className="text-3xl md:text-4xl">
                {detail.race.seasonYear} Round {detail.race.round}: {detail.race.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 px-8 py-7 text-sm text-[#d0d3d9] md:grid-cols-3">
              <div className="border border-white/8 bg-black/20 p-4">
                <p className="ff-kicker">Race Start</p>
                <p className="mt-2 text-sm font-semibold text-white">{formatDateTime(detail.race.raceStartAt)}</p>
              </div>
              <div className="border border-white/8 bg-black/20 p-4">
                <p className="ff-kicker">Scoring Runs</p>
                <p className="mt-2 text-3xl font-black text-white">{detail.scoringRuns.length}</p>
              </div>
              <div className="border border-white/8 bg-black/20 p-4">
                <p className="ff-kicker">Workflow</p>
                <p className="mt-2 text-sm leading-6 text-white">Corrections are staged below through unified repair and source-repair workspaces.</p>
              </div>
            </CardContent>
          </Card>

          {detail.resultWorkspace && formState ? (
          <Card className="border-white/8 bg-[#15161b]">
            <CardHeader>
              <CardTitle>Round Repair Workspace</CardTitle>
            </CardHeader>
              <CardContent className="space-y-4">
                <div className="border border-[#594b11] bg-[#2b2508] p-4 text-sm text-[#f3db53]">
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
                    <p className="ff-kicker text-[#d0d3d9]">Safety Car</p>
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
                    <p className="ff-kicker text-[#d0d3d9]">Classified Finishers</p>
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
                  <div className="border border-white/8 bg-white/3 p-4 text-sm text-[#d0d3d9]">
                    Preview: {previewMutation.data.preview.summary.leaguesProcessed} leagues,{" "}
                    {previewMutation.data.preview.summary.totalChangedEntries} changed entries,{" "}
                    {previewMutation.data.preview.summary.totalPointsDelta >= 0 ? "+" : ""}
                    {previewMutation.data.preview.summary.totalPointsDelta} points delta.
                  </div>
                ) : null}
                {previewMutation.isError ? (
                  <p className="border border-[#7a0d0d] bg-[#350909] px-3 py-2 text-sm text-[#ff8e8e]">
                    {getErrorMessage(previewMutation.error)}
                  </p>
                ) : null}
                {applyMutation.isError ? (
                  <p className="border border-[#7a0d0d] bg-[#350909] px-3 py-2 text-sm text-[#ff8e8e]">
                    {getErrorMessage(applyMutation.error)}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {detail.sourceWorkspace ? (
            <Card className="border-white/8 bg-[#15161b]">
              <CardHeader>
                <CardTitle>Raw Source Repair</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border border-[#594b11] bg-[#2b2508] p-4 text-sm text-[#f3db53]">
                  Use this section when ingestion attached the wrong season entry or source values. These changes update
                  underlying qualifying and race-result rows, write an audit record, and then rescore the race.
                </div>

                <div className="space-y-3">
                  <h3 className="ff-display text-2xl text-white">Qualifying Results</h3>
                  <div className="grid gap-3 border border-white/8 bg-white/3 p-4 md:grid-cols-[minmax(0,1.2fr)_140px_minmax(0,1fr)_auto_auto]">
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
                    <p className="text-xs text-[#989aa2]">
                      Add preview: {qualifyingCreatePreview.summary.leaguesProcessed} leagues, {qualifyingCreatePreview.summary.totalChangedEntries} changed entries, {qualifyingCreatePreview.summary.totalPointsDelta >= 0 ? "+" : ""}{qualifyingCreatePreview.summary.totalPointsDelta} points.
                    </p>
                  ) : null}
                  {qualifyingWarnings.create.length > 0 ? (
                    <p className="text-xs text-[#f3db53]">{qualifyingWarnings.create.join(" ")}</p>
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
                                <p className="mt-2 text-xs text-[#989aa2]">
                                  Preview: {qualifyingPreviews[row.resultId]!.summary.leaguesProcessed} leagues,{" "}
                                  {qualifyingPreviews[row.resultId]!.summary.totalChangedEntries} changed entries,{" "}
                                  {qualifyingPreviews[row.resultId]!.summary.totalPointsDelta >= 0 ? "+" : ""}
                                  {qualifyingPreviews[row.resultId]!.summary.totalPointsDelta} points.
                                </p>
                              ) : null}
                              {qualifyingDeletePreviews[row.resultId] ? (
                                <p className="mt-2 text-xs text-[#989aa2]">
                                  Remove preview: {qualifyingDeletePreviews[row.resultId]!.summary.leaguesProcessed} leagues,{" "}
                                  {qualifyingDeletePreviews[row.resultId]!.summary.totalChangedEntries} changed entries,{" "}
                                  {qualifyingDeletePreviews[row.resultId]!.summary.totalPointsDelta >= 0 ? "+" : ""}
                                  {qualifyingDeletePreviews[row.resultId]!.summary.totalPointsDelta} points.
                                </p>
                              ) : null}
                              {warnings.length > 0 ? (
                                <p className="mt-2 text-xs text-[#f3db53]">{warnings.join(" ")}</p>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="space-y-3">
                  <h3 className="ff-display text-2xl text-white">Race Results</h3>
                  <div className="grid gap-3 border border-white/8 bg-white/3 p-4 md:grid-cols-[minmax(0,1.2fr)_100px_110px_120px_minmax(0,1fr)_auto_auto]">
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
                    <p className="text-xs text-[#989aa2]">
                      Add preview: {raceResultCreatePreview.summary.leaguesProcessed} leagues, {raceResultCreatePreview.summary.totalChangedEntries} changed entries, {raceResultCreatePreview.summary.totalPointsDelta >= 0 ? "+" : ""}{raceResultCreatePreview.summary.totalPointsDelta} points.
                    </p>
                  ) : null}
                  {raceResultWarnings.create.length > 0 ? (
                    <p className="text-xs text-[#f3db53]">{raceResultWarnings.create.join(" ")}</p>
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
                                <p className="mt-2 text-xs text-[#989aa2]">
                                  Preview: {raceResultPreviews[row.resultId]!.summary.leaguesProcessed} leagues,{" "}
                                  {raceResultPreviews[row.resultId]!.summary.totalChangedEntries} changed entries,{" "}
                                  {raceResultPreviews[row.resultId]!.summary.totalPointsDelta >= 0 ? "+" : ""}
                                  {raceResultPreviews[row.resultId]!.summary.totalPointsDelta} points.
                                </p>
                              ) : null}
                              {raceResultDeletePreviews[row.resultId] ? (
                                <p className="mt-2 text-xs text-[#989aa2]">
                                  Remove preview: {raceResultDeletePreviews[row.resultId]!.summary.leaguesProcessed} leagues,{" "}
                                  {raceResultDeletePreviews[row.resultId]!.summary.totalChangedEntries} changed entries,{" "}
                                  {raceResultDeletePreviews[row.resultId]!.summary.totalPointsDelta >= 0 ? "+" : ""}
                                  {raceResultDeletePreviews[row.resultId]!.summary.totalPointsDelta} points.
                                </p>
                              ) : null}
                              {warnings.length > 0 ? (
                                <p className="mt-2 text-xs text-[#f3db53]">{warnings.join(" ")}</p>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {qualifyingRepairMutation.isError ? (
                  <p className="border border-[#7a0d0d] bg-[#350909] px-3 py-2 text-sm text-[#ff8e8e]">
                    {getErrorMessage(qualifyingRepairMutation.error)}
                  </p>
                ) : null}
                {qualifyingPreviewMutation.isError ? (
                  <p className="border border-[#7a0d0d] bg-[#350909] px-3 py-2 text-sm text-[#ff8e8e]">
                    {getErrorMessage(qualifyingPreviewMutation.error)}
                  </p>
                ) : null}
                {qualifyingDeletePreviewMutation.isError ? (
                  <p className="border border-[#7a0d0d] bg-[#350909] px-3 py-2 text-sm text-[#ff8e8e]">
                    {getErrorMessage(qualifyingDeletePreviewMutation.error)}
                  </p>
                ) : null}
                {raceResultRepairMutation.isError ? (
                  <p className="border border-[#7a0d0d] bg-[#350909] px-3 py-2 text-sm text-[#ff8e8e]">
                    {getErrorMessage(raceResultRepairMutation.error)}
                  </p>
                ) : null}
                {raceResultPreviewMutation.isError ? (
                  <p className="border border-[#7a0d0d] bg-[#350909] px-3 py-2 text-sm text-[#ff8e8e]">
                    {getErrorMessage(raceResultPreviewMutation.error)}
                  </p>
                ) : null}
                {raceResultDeletePreviewMutation.isError ? (
                  <p className="border border-[#7a0d0d] bg-[#350909] px-3 py-2 text-sm text-[#ff8e8e]">
                    {getErrorMessage(raceResultDeletePreviewMutation.error)}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <Card className="border-white/8 bg-[#15161b]">
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
                          <span className="ml-2 inline-block border border-[#205038] bg-[#102317] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#6ee7a8]">
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
                        <div className="mt-1 text-[11px] text-[#7f828b]">
                          {formatRunInputSnapshot(run.inputSnapshot, detail.resultWorkspace.driverOptions)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="border-white/8 bg-[#15161b]">
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
                      <TableCell colSpan={4} className="text-[#989aa2]">
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
