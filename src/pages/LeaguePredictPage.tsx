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
  CLASSIFIED_FINISHERS: ClassifiedFinishersBucket;
};

type ClassifiedFinishersBucket =
  | "0_TO_9"
  | "10_TO_12"
  | "13_TO_15"
  | "16_TO_20";

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
  id?: string;
  raceId?: string;
  name?: string;
  raceName?: string;
  grandPrixName?: string;
  startsAt?: string;
  startTime?: string;
  raceAt?: string;
  raceStartAt?: string;
  scheduledAt?: string;
  date?: string;
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

function raceDisplayName(nextRace: NextRaceResponse | undefined): string {
  return (
    nextRace?.name ??
    nextRace?.raceName ??
    nextRace?.grandPrixName ??
    "Next Grand Prix"
  );
}

function raceStartLabel(nextRace: NextRaceResponse | undefined): string | null {
  const value =
    nextRace?.startsAt ??
    nextRace?.startTime ??
    nextRace?.raceAt ??
    nextRace?.raceStartAt ??
    nextRace?.scheduledAt ??
    nextRace?.date;

  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleString();
}

function driverLabelById(drivers: Driver[], value: string): string {
  if (!value) return "Pending";
  const match = drivers.find((driver) => driverId(driver) === value);
  return match ? driverDisplayLabel(match) : value;
}

const classifiedFinisherOptions: Array<{
  value: ClassifiedFinishersBucket;
  label: string;
  description: string;
}> = [
  {
    value: "0_TO_9",
    label: "0 to 9 finishers",
    description: "Heavy attrition race",
  },
  {
    value: "10_TO_12",
    label: "10 to 12 finishers",
    description: "Several retirements",
  },
  {
    value: "13_TO_15",
    label: "13 to 15 finishers",
    description: "Typical mixed-incident race",
  },
  {
    value: "16_TO_20",
    label: "16 to 20 finishers",
    description: "Mostly clean race",
  },
];

function classifiedFinishersLabel(
  value?: ClassifiedFinishersBucket | string,
): string {
  return (
    classifiedFinisherOptions.find((option) => option.value === value)?.label ??
    "Pending"
  );
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
  const raceName = raceDisplayName(data?.nextRace);
  const raceStart = raceStartLabel(data?.nextRace);

  const [podium, setPodium] = useState<string[]>(["", "", ""]);
  const [fastestLapDriverId, setFastestLapDriverId] = useState("");
  const [biggestGainerDriverId, setBiggestGainerDriverId] = useState("");
  const [safetyCarDeployed, setSafetyCarDeployed] = useState(false);
  const [classifiedFinishersBucket, setClassifiedFinishersBucket] =
    useState<ClassifiedFinishersBucket | "">("");

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
    setClassifiedFinishersBucket(
      entryData.picks?.CLASSIFIED_FINISHERS ?? "",
    );

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
    () =>
      podium.some((value) => !value) ||
      !fastestLapDriverId ||
      !biggestGainerDriverId ||
      !classifiedFinishersBucket,
    [podium, fastestLapDriverId, biggestGainerDriverId, classifiedFinishersBucket],
  );
  const duplicatePodiumPick = useMemo(() => {
    const selectedPodium = podium.filter(Boolean);
    return new Set(selectedPodium).size !== selectedPodium.length;
  }, [podium]);
  const isOpen = windowStatus === "open";
  const selectedDriverCount = useMemo(() => {
    let count = podium.filter(Boolean).length;
    if (fastestLapDriverId) count += 1;
    if (biggestGainerDriverId) count += 1;
    if (classifiedFinishersBucket) count += 1;
    return count;
  }, [podium, fastestLapDriverId, biggestGainerDriverId, classifiedFinishersBucket]);
  const pickProgress = `${selectedDriverCount}/6 calls made`;
  const statusTone =
    windowStatus === "locked"
      ? "danger"
      : windowStatus === "opening_soon"
        ? "warning"
        : "success";

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
          CLASSIFIED_FINISHERS:
            classifiedFinishersBucket as ClassifiedFinishersBucket,
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
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.95fr)]">
          <Card className="overflow-hidden border-neutral-900 bg-[radial-gradient(circle_at_top_left,_rgba(248,113,113,0.22),_transparent_32%),linear-gradient(145deg,_#140f14_0%,_#111827_48%,_#191919_100%)] text-white shadow-[0_24px_80px_rgba(15,23,42,0.28)]">
            <CardHeader className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-white/12 text-white" tone="info">
                  Prediction Card
                </Badge>
                <Badge className="bg-white/12 text-white" tone="info">
                  {pickProgress}
                </Badge>
                <Badge className="bg-white/12 text-white" tone="info">
                  {safetyCarDeployed ? "Safety car: yes" : "Safety car: no"}
                </Badge>
              </div>
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.36em] text-white/60">
                  {raceName}
                </p>
                <h2 className="font-['Orbitron'] text-4xl font-bold uppercase tracking-tight text-white md:text-5xl">
                  Race Weekend Calls
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-white/72 md:text-base">
                  Lock in your podium, fastest lap, biggest gainer, and safety car
                  call, then forecast how many cars make the flag.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-white/6 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/58">
                    Window
                  </p>
                  <p className="mt-2 font-['Orbitron'] text-xl font-bold uppercase text-white">
                    {windowStatus === "open"
                      ? "Open"
                      : windowStatus === "opening_soon"
                        ? "Opens soon"
                        : "Locked"}
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/6 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/58">
                    Countdown
                  </p>
                  <p className="mt-2 font-['Orbitron'] text-xl font-bold uppercase text-white">
                    {countdownLabel || "Awaiting schedule"}
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/6 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/58">
                    Race start
                  </p>
                  <p className="mt-2 text-sm font-medium text-white/82">
                    {raceStart ?? "TBD"}
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="border-neutral-300 bg-white/96">
            <CardHeader className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="font-['Orbitron'] text-xl uppercase tracking-[0.18em] text-slate-900">
                  Race Status
                </CardTitle>
                <Badge tone={statusTone}>{windowMessage}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Card status
                </p>
                <p className="mt-2 font-['Orbitron'] text-2xl font-bold uppercase text-slate-950">
                  {saveState === "saved"
                    ? "Saved"
                    : windowStatus === "locked"
                      ? "Closed"
                      : "Editable"}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {saveState === "saved"
                    ? "Your latest calls are stored."
                    : "Changes are local until you save the card."}
                </p>
              </div>
              <div className="rounded-3xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-3 text-sm text-slate-600">
                {windowStatus === "locked"
                  ? "The prediction window has closed for this race."
                  : windowStatus === "opening_soon"
                    ? "The race card is not open yet. Review your likely picks and come back at launch."
                    : "You can edit repeatedly until lock. Save early so the card is already in if you miss final changes."}
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link to={`/league/${leagueId}`}>Back to league</Link>
              </Button>
            </CardContent>
          </Card>
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
          <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.95fr)]">
            <div className="space-y-6">
            <Card className="bg-background transition hover:border-neutral-400">
              <CardHeader>
                <CardTitle className="font-['Orbitron'] uppercase tracking-[0.14em]">
                  Podium Picks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    {
                      label: "P1 Winner",
                      value: driverLabelById(drivers, podium[0]),
                      tone: "success" as const,
                    },
                    {
                      label: "P2",
                      value: driverLabelById(drivers, podium[1]),
                      tone: "warning" as const,
                    },
                    {
                      label: "P3",
                      value: driverLabelById(drivers, podium[2]),
                      tone: "info" as const,
                    },
                  ].map((slot) => (
                    <div
                      key={slot.label}
                      className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                          {slot.label}
                        </p>
                        <Badge tone={slot.tone}>{slot.value === "Pending" ? "Pending" : "Ready"}</Badge>
                      </div>
                      <p className="mt-3 font-medium text-slate-900">
                        {slot.value}
                      </p>
                    </div>
                  ))}
                </div>
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
                <CardTitle className="font-['Orbitron'] uppercase tracking-[0.14em]">
                  Race Props
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Fastest lap
                    </p>
                    <p className="mt-2 font-medium text-slate-900">
                      {driverLabelById(drivers, fastestLapDriverId)}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Biggest gainer
                    </p>
                    <p className="mt-2 font-medium text-slate-900">
                      {driverLabelById(drivers, biggestGainerDriverId)}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Safety car
                    </p>
                    <p className="mt-2 font-medium text-slate-900">
                      {safetyCarDeployed ? "Deployed" : "No call"}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4 md:col-span-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Classified finishers
                    </p>
                    <p className="mt-2 font-medium text-slate-900">
                      {classifiedFinishersLabel(classifiedFinishersBucket)}
                    </p>
                  </div>
                </div>
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
                <fieldset className="space-y-2" disabled={!isOpen || saveState === "saving"}>
                  <legend className="text-sm font-medium text-slate-700">
                    Classified Finishers
                  </legend>
                  <select
                    className="w-full rounded-xl border border-neutral-300 px-4 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    value={classifiedFinishersBucket}
                    onChange={(event) =>
                      setClassifiedFinishersBucket(
                        event.target.value as ClassifiedFinishersBucket,
                      )
                    }
                    aria-label="Classified Finishers"
                  >
                    <option value="">Select finishers bucket</option>
                    {classifiedFinisherOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-slate-500">
                    Predict how many cars will be classified at the finish.
                  </p>
                </fieldset>

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
            </div>
            <div className="space-y-6">
              <Card className="border-neutral-300">
                <CardHeader>
                  <CardTitle className="font-['Orbitron'] text-xl uppercase tracking-[0.14em]">
                    Submit Card
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Validation
                    </p>
                    <ul className="mt-3 space-y-2 text-sm text-slate-600">
                      <li>{missingRequiredPick ? "Complete every required slot." : "All required slots filled."}</li>
                      <li>{duplicatePodiumPick ? "Podium picks must be unique." : "Podium picks are unique."}</li>
                      <li>{isOpen ? "Prediction window is open." : "Prediction window is not open."}</li>
                    </ul>
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
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
                    <Badge className="w-full justify-center" tone="success">
                      Entry saved
                    </Badge>
                  )}
                  {submitError && (
                    <Badge className="w-full justify-center" tone="danger">
                      {submitError}
                    </Badge>
                  )}
                </CardContent>
              </Card>

              <Card className="border-neutral-300">
                <CardHeader>
                  <CardTitle className="font-['Orbitron'] text-xl uppercase tracking-[0.14em]">
                    Pick Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm leading-6 text-slate-600">
                  <p>
                    Podium calls are exclusive. Once a driver is in P1, they cannot
                    also appear in P2 or P3.
                  </p>
                  <p>
                    Classified finishers are scored in buckets, so you are
                    calling the race shape as much as the result.
                  </p>
                  <p>
                    Save as early as possible. You can keep editing until the lock
                    window closes.
                  </p>
                </CardContent>
              </Card>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
