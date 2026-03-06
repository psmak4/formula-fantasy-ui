import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ApiError, apiClient } from "../api/apiClient";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";

type Driver = {
  id?: string;
  driverId?: string;
  code?: string;
  number?: string;
  givenName?: string;
  familyName?: string;
  shortName?: string;
  displayName?: string;
  name?: string;
  constructorName?: string;
  constructor?: string;
  teamName?: string;
  team?: string;
};

type DriversResponse = Driver[];

type PredictionPicks = {
  P1: string;
  P2: string;
  P3: string;
  FASTEST_LAP: string;
  BIGGEST_GAINER: string;
  SAFETY_CAR: boolean;
};

type EntryResponse = {
  picks?: PredictionPicks;
  window?: {
    openAt?: string;
    lockAt?: string;
    isLocked?: boolean;
  };
  lockedAt?: string;
};

type NextRaceResponse = {
  predictionLocked?: boolean;
  entriesLocked?: boolean;
  lockStatus?: "open" | "locked";
  entryOpensAt?: string;
  predictionOpensAt?: string;
  openAt?: string;
  entryClosesAt?: string;
  predictionClosesAt?: string;
  lockAt?: string;
};

type PredictionWindowStatus = "open" | "locked" | "opening_soon";

type DriverPickerProps = {
  label: string;
  value: string;
  drivers: Driver[];
  disabled: boolean;
  excludedDriverIds?: string[];
  onChange: (nextValue: string) => void;
};

function driverId(driver: Driver): string {
  return driver.id ?? driver.driverId ?? "";
}

function driverName(driver: Driver): string {
  // API returns givenName + familyName
  if (driver.givenName || driver.familyName) {
    return `${driver.givenName ?? ""} ${driver.familyName ?? ""}`.trim();
  }
  return (
    driver.displayName ??
    driver.name ??
    driver.shortName ??
    driver.code ??
    driverId(driver)
  );
}

function driverDisplayLabel(driver: Driver): string {
  const code = driver.code ? ` (${driver.code})` : "";
  return `${driverName(driver)}${code}`;
}

function DriverPicker({
  label,
  value,
  drivers,
  disabled,
  excludedDriverIds = [],
  onChange,
}: DriverPickerProps) {
  const filteredDrivers = useMemo(() => {
    let available = drivers;

    // Filter out excluded drivers (but always allow current value)
    if (excludedDriverIds.length > 0) {
      available = available.filter((driver) => {
        const id = driverId(driver);
        return id === value || !excludedDriverIds.includes(id);
      });
    }

    return available;
  }, [drivers, excludedDriverIds, value]);

  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="text-sm font-medium text-slate-700">{label}</legend>
      <select
        className="w-full rounded-xl border border-neutral-300 px-4 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
      >
        <option value="">Select driver</option>
        {filteredDrivers.map((driver) => {
          const id = driverId(driver);
          return (
            <option key={id} value={id}>
              {driverDisplayLabel(driver)}
            </option>
          );
        })}
      </select>
    </fieldset>
  );
}

export function LeaguePredictPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const queryClient = useQueryClient();

  const { data, isLoading: loading, error } = useQuery({
    queryKey: ["league-predict", leagueId],
    enabled: Boolean(leagueId),
    queryFn: async () => {
      if (!leagueId) {
        throw new Error("Missing league ID");
      }
      const [driversData, entryData, nextRaceData] = await Promise.all([
        apiClient.get<DriversResponse>("/f1/next-race/drivers"),
        apiClient
          .get<EntryResponse>(`/leagues/${leagueId}/races/next/entry/me`)
          .catch(() => ({}) as EntryResponse),
        apiClient.get<NextRaceResponse>("/f1/next-race"),
      ]);

      return {
        drivers: driversData ?? [],
        entry: entryData,
        nextRace: nextRaceData
      };
    }
  });
  const drivers = data?.drivers ?? [];

  const [podium, setPodium] = useState<string[]>(["", "", ""]);
  const [fastestLapDriverId, setFastestLapDriverId] = useState("");
  const [biggestGainerDriverId, setBiggestGainerDriverId] = useState("");
  const [safetyCarDeployed, setSafetyCarDeployed] = useState(false);

  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [windowStatus, setWindowStatus] =
    useState<PredictionWindowStatus>("opening_soon");
  const [windowMessage, setWindowMessage] = useState(
    "Checking prediction window...",
  );
  const [opensAt, setOpensAt] = useState<number | null>(null);
  const [closesAt, setClosesAt] = useState<number | null>(null);
  const [countdownLabel, setCountdownLabel] = useState("");

  function formatServerError(err: unknown, fallback: string): string {
    if (err instanceof ApiError) {
      if (err.code) return `${err.message} (${err.code})`;
      return err.message;
    }
    return err instanceof Error ? err.message : fallback;
  }

  useEffect(() => {
    if (!data) {
      return;
    }
    const entryData = data.entry;
    const nextRaceData = data.nextRace;

    const existingPodium = entryData.picks
      ? [entryData.picks.P1, entryData.picks.P2, entryData.picks.P3]
      : [];

    setPodium([
      existingPodium[0] ?? "",
      existingPodium[1] ?? "",
      existingPodium[2] ?? "",
    ]);
    setFastestLapDriverId(entryData.picks?.FASTEST_LAP ?? "");
    setBiggestGainerDriverId(entryData.picks?.BIGGEST_GAINER ?? "");
    setSafetyCarDeployed(entryData.picks?.SAFETY_CAR ?? false);

    const raceOpenAt =
      entryData.window?.openAt ??
      nextRaceData.entryOpensAt ??
      nextRaceData.predictionOpensAt ??
      nextRaceData.openAt;
    const raceCloseAt =
      entryData.window?.lockAt ??
      nextRaceData.entryClosesAt ??
      nextRaceData.predictionClosesAt ??
      nextRaceData.lockAt;
    const raceOpenTime = raceOpenAt ? new Date(raceOpenAt).getTime() : null;
    const raceCloseTime = raceCloseAt
      ? new Date(raceCloseAt).getTime()
      : null;

    const now = Date.now();
    const lockedByTime =
      raceCloseTime !== null &&
      !Number.isNaN(raceCloseTime) &&
      now >= raceCloseTime;
    const opensInFuture =
      raceOpenTime !== null &&
      !Number.isNaN(raceOpenTime) &&
      now < raceOpenTime;
    const lockedByApi =
      entryData.window?.isLocked === true ||
      Boolean(entryData.lockedAt) ||
      nextRaceData.predictionLocked === true ||
      nextRaceData.entriesLocked === true ||
      nextRaceData.lockStatus === "locked";

    setOpensAt(
      raceOpenTime !== null && !Number.isNaN(raceOpenTime)
        ? raceOpenTime
        : null,
    );
    setClosesAt(
      raceCloseTime !== null && !Number.isNaN(raceCloseTime)
        ? raceCloseTime
        : null,
    );

    if (lockedByApi || lockedByTime) {
      setWindowStatus("locked");
      setWindowMessage("Locked");
    } else if (opensInFuture) {
      setWindowStatus("opening_soon");
      setWindowMessage(
        `Opens at ${new Date(raceOpenTime as number).toLocaleString()}`,
      );
    } else {
      setWindowStatus("open");
      setWindowMessage(
        raceCloseTime
          ? `Locks at ${new Date(raceCloseTime).toLocaleString()}`
          : "Open for entries",
      );
    }
  }, [data]);

  const missingRequiredPick = useMemo(
    () => podium.some((value) => !value) || !fastestLapDriverId || !biggestGainerDriverId,
    [podium, fastestLapDriverId, biggestGainerDriverId],
  );
  const duplicatePodiumPick = useMemo(() => {
    const selectedPodium = podium.filter(Boolean);
    return new Set(selectedPodium).size !== selectedPodium.length;
  }, [podium]);
  const isOpen = windowStatus === "open";

  useEffect(() => {
    if (!opensAt && !closesAt) {
      setCountdownLabel("");
      return;
    }

    const formatDuration = (targetTs: number): string => {
      const totalSeconds = Math.max(
        0,
        Math.floor((targetTs - Date.now()) / 1000),
      );
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      return `${days}d ${hours}h ${minutes}m`;
    };

    const tick = () => {
      if (windowStatus === "opening_soon" && opensAt) {
        setCountdownLabel(`Opens in ${formatDuration(opensAt)}`);
        return;
      }
      if (windowStatus === "open" && closesAt) {
        setCountdownLabel(`Locks in ${formatDuration(closesAt)}`);
        return;
      }
      setCountdownLabel("Locked");
    };

    tick();
    const interval = window.setInterval(tick, 30000);
    return () => window.clearInterval(interval);
  }, [opensAt, closesAt, windowStatus]);

  const saveEntryMutation = useMutation({
    mutationFn: async () => {
      if (!leagueId || !isOpen || missingRequiredPick || duplicatePodiumPick) {
        return;
      }
      await apiClient.put(`/leagues/${leagueId}/races/next/entry/me`, {
        picks: {
          P1: podium[0],
          P2: podium[1],
          P3: podium[2],
          FASTEST_LAP: fastestLapDriverId,
          BIGGEST_GAINER: biggestGainerDriverId,
          SAFETY_CAR: safetyCarDeployed,
        },
      });
    },
    onSuccess: async () => {
      setSaveState("saved");
      await queryClient.invalidateQueries({ queryKey: ["league-predict", leagueId] });
      await queryClient.invalidateQueries({ queryKey: ["league-page", leagueId] });
      await queryClient.invalidateQueries({ queryKey: ["league-leaderboard"] });
    },
    onError: (err: unknown) => {
      setSubmitError(formatServerError(err, "Failed to submit prediction"));
      setSaveState("idle");
    }
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!leagueId || !isOpen || missingRequiredPick || duplicatePodiumPick) return;

    setSaveState("saving");
    setSubmitError(null);
    await saveEntryMutation.mutateAsync();
  }

  return (
    <section className="relative w-full overflow-hidden bg-background bg-linear-to-b from-neutral-50 to-white pb-12 pt-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(0,0,0,0.015) 0px, rgba(0,0,0,0.015) 1px, rgba(0,0,0,0) 9px, rgba(0,0,0,0) 14px)",
          opacity: 0.02,
        }}
      />
      <div className="relative z-10 mx-auto max-w-7xl space-y-8 px-6">
        {/* Header */}
        <div className="space-y-2">
          <h2 className="font-['Orbitron'] text-3xl font-bold uppercase tracking-tight text-black">
            Make Predictions
          </h2>
        </div>

        {/* Status Banner */}
        <div
          className={`rounded-3xl border p-6 ${
            windowStatus === "locked"
              ? "border-red-200 bg-red-50"
              : windowStatus === "opening_soon"
                ? "border-yellow-200 bg-yellow-50"
                : "border-green-200 bg-green-50"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {windowStatus === "locked" && <Badge tone="danger">Locked</Badge>}
              {windowStatus === "opening_soon" && (
                <Badge tone="warning">Opening Soon</Badge>
              )}
              {windowStatus === "open" && <Badge tone="success">Open</Badge>}
              <span className="text-sm text-slate-600">
                {countdownLabel || windowMessage}
              </span>
            </div>
            {windowStatus !== "locked" && (
              <Link
                to={`/league/${leagueId}`}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Back to league
              </Link>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <Card className="animate-pulse bg-background">
            <CardContent className="py-8">
              <div className="h-6 w-1/3 rounded bg-neutral-200" />
            </CardContent>
          </Card>
        ) : null}

        {/* Error State */}
        {error ? (
          <Card className="bg-red-50">
            <CardContent className="py-4">
              <Badge tone="danger">{formatServerError(error, "Failed to load prediction page")}</Badge>
            </CardContent>
          </Card>
        ) : null}

        {/* Prediction Form */}
        {!loading && !error && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Podium Picks */}
            <Card className="bg-background transition hover:border-neutral-400">
              <CardHeader>
                <CardTitle>Podium Picks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <DriverPicker
                    label="P1 Winner"
                    value={podium[0]}
                    drivers={drivers}
                    excludedDriverIds={[podium[1], podium[2]].filter(Boolean)}
                    disabled={!isOpen || saveState === "saving"}
                    onChange={(value) =>
                      setPodium((prev) => [value, prev[1], prev[2]])
                    }
                  />
                  <DriverPicker
                    label="P2"
                    value={podium[1]}
                    drivers={drivers}
                    excludedDriverIds={[podium[0], podium[2]].filter(Boolean)}
                    disabled={!isOpen || saveState === "saving"}
                    onChange={(value) =>
                      setPodium((prev) => [prev[0], value, prev[2]])
                    }
                  />
                  <DriverPicker
                    label="P3"
                    value={podium[2]}
                    drivers={drivers}
                    excludedDriverIds={[podium[0], podium[1]].filter(Boolean)}
                    disabled={!isOpen || saveState === "saving"}
                    onChange={(value) =>
                      setPodium((prev) => [prev[0], prev[1], value])
                    }
                  />
                </div>

                {missingRequiredPick && (
                  <p className="text-sm text-yellow-600">
                    Select every required slot.
                  </p>
                )}
                {duplicatePodiumPick && (
                  <p className="text-sm text-red-600">
                    P1, P2, and P3 must be unique.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Race Props */}
            <Card className="bg-background transition hover:border-neutral-400">
              <CardHeader>
                <CardTitle>Race Props</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <DriverPicker
                    label="Fastest Lap"
                    value={fastestLapDriverId}
                    drivers={drivers}
                    disabled={!isOpen || saveState === "saving"}
                    onChange={setFastestLapDriverId}
                  />
                  <DriverPicker
                    label="Biggest Gainer"
                    value={biggestGainerDriverId}
                    drivers={drivers}
                    disabled={!isOpen || saveState === "saving"}
                    onChange={setBiggestGainerDriverId}
                  />
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={safetyCarDeployed}
                    disabled={!isOpen || saveState === "saving"}
                    onChange={(event) =>
                      setSafetyCarDeployed(event.target.checked)
                    }
                    className="h-4 w-4 rounded border-neutral-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm text-slate-700">
                    Safety car deployed
                  </span>
                </label>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-4">
              <Button
                type="submit"
                disabled={
                  !isOpen ||
                  missingRequiredPick ||
                  duplicatePodiumPick ||
                  saveState === "saving"
                }
              >
                {saveState === "saving" ? "Saving Entry..." : "Save Entry"}
              </Button>
              {saveState === "saved" && (
                <Badge tone="success">Entry saved</Badge>
              )}
              {submitError && <Badge tone="danger">{submitError}</Badge>}
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
