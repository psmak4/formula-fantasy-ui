import { ApiError } from "@/api/apiClient";
import { Button } from "@/components/ui/Button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type DetailResponse = {
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

export type ResultCorrectionPreviewResponse = {
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

export type SourceRepairPreviewResponse = {
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

export function formatDateTime(value: string | null): string {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Unable to load race operations details.";
}

export function formatSafetyCarValue(value: boolean | null): string {
  if (value === null) return "Unknown";
  return value ? "Deployed" : "Not deployed";
}

export function formatRunSource(source: DetailResponse["scoringRuns"][number]["source"]) {
  if (source === "admin_override") return "Admin override";
  if (source === "admin_manual") return "Admin manual";
  if (source === "internal_rescore") return "Internal rescore";
  return "System";
}

export function formatDriverOption(option: DetailResponse["resultWorkspace"]["driverOptions"][number]): string {
  const code = option.code ? ` (${option.code})` : "";
  const constructor = option.constructorName ? ` • ${option.constructorName}` : "";
  return `${option.givenName} ${option.familyName}${code}${constructor}`;
}

export function formatDriverValue(
  driverId: string | null | undefined,
  options: DetailResponse["resultWorkspace"]["driverOptions"]
): string {
  if (!driverId) return "Unknown";
  const match = options.find((option) => option.id === driverId);
  return match ? formatDriverOption(match) : `Driver ${driverId}`;
}

export function buildCorrectionPayload(state: {
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

export function formatRunInputSnapshot(
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

export function toSafetyCarFormValue(value: boolean | null | undefined): "true" | "false" | "unknown" {
  if (value === true) return "true";
  if (value === false) return "false";
  return "unknown";
}

export function toFieldHistory(
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

export function getQualifyingWarnings(
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

export function getRaceResultWarnings(
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

export function DriverSelect(props: {
  label: string;
  value: string;
  options: DetailResponse["resultWorkspace"]["driverOptions"];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="ff-kicker text-[#d0d3d9]">{props.label}</p>
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

export function FieldComparison(props: {
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
    <div className="border border-white/8 bg-white/3 p-3 text-xs text-[#d0d3d9]">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p>
            Ingested: <span className="font-medium text-white">{props.rawLabel}</span>
          </p>
          <p>
            Effective: <span className="font-medium text-white">{props.effectiveLabel}</span>
          </p>
          {props.override ? (
            <p className="text-[#f3db53]">
              Override active. {props.override.reason} • {formatDateTime(props.override.createdAt)}
            </p>
          ) : (
            <p className="text-[#6ee7a8]">No active override.</p>
          )}
        </div>
        <Button variant="ghost" className="h-auto px-2 py-1 text-xs text-[#d0d3d9]" onClick={props.onReset}>
          Use ingested
        </Button>
      </div>
      {props.history && props.history.length > 0 ? (
        <div className="mt-3 border-t border-white/8 pt-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7f828b]">Recent field history</p>
          <div className="space-y-2">
            {props.history.slice(0, 3).map((item) => (
              <div key={item.id} className="border border-white/8 bg-black/20 px-3 py-2">
                <p className="font-medium text-white">{item.valueLabel}</p>
                <p className="text-[#989aa2]">
                  {item.createdByDisplayName} • {formatDateTime(item.createdAt)}
                </p>
                <p className="text-[#d0d3d9]">{item.reason}</p>
                {item.revokedAt ? (
                  <p className="text-[#f3db53]">
                    Revoked by {item.revokedByDisplayName ?? "Unknown admin"} on {formatDateTime(item.revokedAt)}
                    {item.revokedReason ? ` • ${item.revokedReason}` : ""}
                  </p>
                ) : (
                  <p className="text-[#6ee7a8]">Still active until replaced or reset.</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
