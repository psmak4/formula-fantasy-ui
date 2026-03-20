import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Check, ChevronLeft, ChevronRight, CircleOff, Trophy, X } from "lucide-react";
import { ApiError, apiClient } from "../api/apiClient";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";

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

type ReviewScore = {
  scoringRunId?: string;
  computedAt?: string;
  pointsTotal?: number;
  breakdown?: Record<string, number>;
};

type ReviewActual = {
  available?: boolean;
  picks?: Partial<PredictionPicks>;
};

type ReviewRace = {
  raceId?: string;
  raceName?: string;
  raceStartAt?: string;
};

type HistoricalEntryResponse = {
  race?: ReviewRace;
  picks?: Partial<PredictionPicks>;
  actual?: ReviewActual;
  driverDirectory?: Driver[];
  score?: ReviewScore;
};

type ReviewSlide = {
  slot: keyof PredictionPicks;
  label: string;
  prompt: string;
  pickedLabel: string;
  actualLabel: string;
  pickedShort: string;
  actualShort: string;
  isMatch: boolean;
  isPending: boolean;
  kind: "driver" | "boolean" | "bucket";
};

function driverId(driver: Driver): string {
  return driver.id ?? driver.driverId ?? "";
}

function driverName(driver: Driver): string {
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
  const constructorName =
    driver.constructorName ?? driver.constructor ?? driver.teamName ?? driver.team;
  const number = driver.number ? ` #${driver.number}` : "";
  return `${driverName(driver)}${code}${number}${constructorName ? ` · ${constructorName}` : ""}`;
}

function driverShortLabel(driver: Driver): string {
  return driver.code ?? driver.shortName ?? driver.familyName ?? driverName(driver);
}

function driverLabelFromDirectory(
  directory: Map<string, Driver>,
  value?: string,
): string {
  if (!value) return "Unavailable";
  const found = directory.get(value);
  return found ? driverDisplayLabel(found) : value;
}

function driverShortLabelFromDirectory(
  directory: Map<string, Driver>,
  value?: string,
): string {
  if (!value) return "—";
  const found = directory.get(value);
  return found ? driverShortLabel(found) : value;
}

function classifiedFinishersLabel(
  value?: ClassifiedFinishersBucket | string,
): string {
  switch (value) {
    case "0_TO_9":
      return "0 to 9 finishers";
    case "10_TO_12":
      return "10 to 12 finishers";
    case "13_TO_15":
      return "13 to 15 finishers";
    case "16_TO_20":
      return "16 to 20 finishers";
    default:
      return "Pending";
  }
}

function slotLabel(slot: keyof PredictionPicks): string {
  switch (slot) {
    case "P1":
      return "P1 Winner";
    case "P2":
      return "P2";
    case "P3":
      return "P3";
    case "FASTEST_LAP":
      return "Fastest Lap";
    case "BIGGEST_GAINER":
      return "Biggest Gainer";
    case "SAFETY_CAR":
      return "Safety Car";
    case "CLASSIFIED_FINISHERS":
      return "Classified Finishers";
  }
}

function slotPrompt(slot: keyof PredictionPicks, raceName?: string): string {
  const raceLabel = raceName ?? "this Grand Prix";
  switch (slot) {
    case "P1":
      return `Who did you back to win ${raceLabel}?`;
    case "P2":
      return `Who did you place second for ${raceLabel}?`;
    case "P3":
      return `Who did you put on the final podium step for ${raceLabel}?`;
    case "FASTEST_LAP":
      return `Who did you predict to take fastest lap in ${raceLabel}?`;
    case "BIGGEST_GAINER":
      return `Who did you expect to gain the most places in ${raceLabel}?`;
    case "SAFETY_CAR":
      return `Did you expect a safety car during ${raceLabel}?`;
    case "CLASSIFIED_FINISHERS":
      return `How many classified finishers did you predict for ${raceLabel}?`;
  }
}

function formatComputedAt(value?: string): string {
  if (!value) return "Pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Pending";
  return date.toLocaleString();
}

function shortToken(value: string): string {
  const words = value
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "—";
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
}

function valueTokenClass(kind: ReviewSlide["kind"], matched?: boolean): string {
  if (matched) {
    return "border-emerald-300 bg-emerald-100 text-emerald-800";
  }
  if (kind === "boolean") {
    return "border-amber-300 bg-amber-100 text-amber-800";
  }
  if (kind === "bucket") {
    return "border-sky-300 bg-sky-100 text-sky-800";
  }
  return "border-rose-300 bg-rose-100 text-rose-800";
}

export function LeagueReviewPage() {
  const { leagueId, raceId } = useParams<{ leagueId: string; raceId: string }>();
  const [activeIndex, setActiveIndex] = useState(0);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["league-review", leagueId, raceId],
    enabled: Boolean(leagueId && raceId),
    queryFn: async () => {
      if (!leagueId || !raceId) {
        throw new Error("Missing route parameters");
      }

      try {
        return await apiClient.get<HistoricalEntryResponse>(
          `/leagues/${leagueId}/races/${raceId}/entry/me`,
        );
      } catch (queryError) {
        if (queryError instanceof ApiError && queryError.code === "entry_not_found") {
          return null;
        }
        throw queryError;
      }
    },
  });

  const driverDirectory = useMemo(() => {
    const map = new Map<string, Driver>();
    for (const driver of data?.driverDirectory ?? []) {
      const id = driverId(driver);
      if (!id || map.has(id)) continue;
      map.set(id, driver);
    }
    return map;
  }, [data?.driverDirectory]);

  const reviewSlides = useMemo<ReviewSlide[]>(() => {
    const reviewPicks = data?.picks ?? {};
    const actualPicks = data?.actual?.picks ?? {};
    const hasActual = data?.actual?.available === true;

    return ([
      "P1",
      "P2",
      "P3",
      "FASTEST_LAP",
      "BIGGEST_GAINER",
      "CLASSIFIED_FINISHERS",
      "SAFETY_CAR",
    ] as const).map((slot) => {
      const pickedValue = reviewPicks[slot];
      const actualValue = actualPicks[slot];
      const kind =
        slot === "SAFETY_CAR"
          ? "boolean"
          : slot === "CLASSIFIED_FINISHERS"
            ? "bucket"
            : "driver";

      const pickedLabel =
        slot === "CLASSIFIED_FINISHERS"
          ? classifiedFinishersLabel(typeof pickedValue === "string" ? pickedValue : undefined)
          : slot === "SAFETY_CAR"
            ? typeof pickedValue === "boolean"
              ? pickedValue ? "Yes" : "No"
              : "Not submitted"
            : typeof pickedValue === "string"
              ? driverLabelFromDirectory(driverDirectory, pickedValue)
              : "Not submitted";

      const actualLabel =
        slot === "CLASSIFIED_FINISHERS"
          ? classifiedFinishersLabel(typeof actualValue === "string" ? actualValue : undefined)
          : slot === "SAFETY_CAR"
            ? typeof actualValue === "boolean"
              ? actualValue ? "Yes" : "No"
              : "Not tracked"
            : typeof actualValue === "string"
              ? driverLabelFromDirectory(driverDirectory, actualValue)
              : hasActual
                ? "Unavailable"
                : "Waiting for result";

      const pickedShort =
        slot === "CLASSIFIED_FINISHERS"
          ? shortToken(classifiedFinishersLabel(typeof pickedValue === "string" ? pickedValue : undefined))
          : slot === "SAFETY_CAR"
            ? typeof pickedValue === "boolean"
              ? pickedValue ? "YES" : "NO"
              : "—"
            : typeof pickedValue === "string"
              ? driverShortLabelFromDirectory(driverDirectory, pickedValue)
              : "—";

      const actualShort =
        slot === "CLASSIFIED_FINISHERS"
          ? shortToken(classifiedFinishersLabel(typeof actualValue === "string" ? actualValue : undefined))
          : slot === "SAFETY_CAR"
            ? typeof actualValue === "boolean"
              ? actualValue ? "YES" : "NO"
              : "—"
            : typeof actualValue === "string"
              ? driverShortLabelFromDirectory(driverDirectory, actualValue)
              : hasActual
                ? "—"
                : "…";

      const isMatch =
        hasActual &&
        ((slot === "SAFETY_CAR" && typeof pickedValue === "boolean" && pickedValue === actualValue) ||
          (slot !== "SAFETY_CAR" && pickedValue === actualValue));

      return {
        slot,
        label: slotLabel(slot),
        prompt: slotPrompt(slot, data?.race?.raceName),
        pickedLabel,
        actualLabel,
        pickedShort,
        actualShort,
        isMatch,
        isPending: !hasActual,
        kind,
      };
    });
  }, [data?.actual, data?.picks, data?.race?.raceName, driverDirectory]);

  const reviewBreakdownEntries = useMemo(
    () =>
      Object.entries(data?.score?.breakdown ?? {})
        .filter(([, value]) => typeof value === "number" && value > 0)
        .sort((left, right) => right[1] - left[1]),
    [data?.score?.breakdown],
  );

  const activeSlide = reviewSlides[activeIndex] ?? null;
  const hits = reviewSlides.filter((slide) => slide.isMatch).length;
  const misses = reviewSlides.filter((slide) => !slide.isMatch && !slide.isPending).length;

  useEffect(() => {
    setActiveIndex(0);
  }, [leagueId, raceId]);

  useEffect(() => {
    if (activeIndex >= reviewSlides.length && reviewSlides.length > 0) {
      setActiveIndex(reviewSlides.length - 1);
    }
  }, [activeIndex, reviewSlides.length]);

  return (
    <section className="bg-[linear-gradient(180deg,#f6f3ee_0%,#f2ede6_100%)] pb-14 pt-10">
      <div className="mx-auto max-w-6xl space-y-8 px-6">
        <div className="rounded-[32px] bg-black px-6 py-5 text-white">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full bg-white/10 text-white" tone="info">
                  {data?.race?.raceName ?? "Race review"}
                </Badge>
                <Badge className="rounded-full bg-white/10 text-white" tone="neutral">
                  {data ? "Submitted card" : "No card found"}
                </Badge>
              </div>
              <div>
                <h1 className="font-['Orbitron'] text-4xl font-black uppercase tracking-tight text-white md:text-5xl">
                  Result Details
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-white/72 md:text-base">
                  Step through each prediction, compare your call to the final
                  result, and inspect how the whole round came together.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-white/8 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
                  Round total
                </p>
                <p className="mt-2 font-['Orbitron'] text-4xl font-black text-white">
                  {data?.score?.pointsTotal ?? 0}
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/8 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
                  Hits
                </p>
                <p className="mt-2 font-['Orbitron'] text-4xl font-black text-white">
                  {hits}
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/8 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
                  Scored at
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-white/82">
                  {formatComputedAt(data?.score?.computedAt)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <Card className="animate-pulse rounded-[32px] border-[#ddd6cc] bg-white">
            <CardContent className="py-20">
              <div className="h-8 w-1/3 rounded bg-neutral-200" />
            </CardContent>
          </Card>
        ) : null}

        {error ? (
          <Card className="rounded-[32px] border-red-200 bg-red-50">
            <CardContent className="space-y-4 py-5">
              <Badge tone="danger">
                {error instanceof Error ? error.message : "Failed to load race review"}
              </Badge>
              <Button variant="outline" onClick={() => void refetch()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {!isLoading && !error ? (
          <>
            <Card className="overflow-hidden rounded-[32px] border-[#ddd6cc] bg-white shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
              <CardContent className="px-8 py-8">
                {activeSlide ? (
                  <div className="space-y-8">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-4">
                        <p className="font-['Orbitron'] text-5xl font-black tracking-tight text-slate-300">
                          Q{activeIndex + 1}
                        </p>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            {activeSlide.label}
                          </p>
                          <h2 className="mt-2 max-w-3xl text-2xl font-semibold leading-tight text-slate-950 md:text-3xl">
                            {activeSlide.prompt}
                          </h2>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={activeSlide.isPending ? "warning" : activeSlide.isMatch ? "success" : "danger"}>
                          {activeSlide.isPending
                            ? "Awaiting result"
                            : activeSlide.isMatch
                              ? "Correct"
                              : "Missed"}
                        </Badge>
                        <Badge tone="neutral">
                          {activeSlide.isPending
                            ? "No result yet"
                            : activeSlide.isMatch
                              ? "Call matched"
                              : "Review call"}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_88px_minmax(0,1fr)] lg:items-center">
                      <div className="rounded-[28px] border border-[#eadfd2] bg-[linear-gradient(180deg,#fff7f1_0%,#fff_100%)] p-6">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Your pick
                        </p>
                        <div className="mt-6 flex items-center gap-5">
                          <div
                            className={`flex h-24 w-24 items-center justify-center rounded-[28px] border text-3xl font-black ${valueTokenClass(activeSlide.kind, activeSlide.isMatch)}`}
                          >
                            {activeSlide.pickedShort}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                              Selected value
                            </p>
                            <p className="mt-2 text-xl font-semibold leading-8 text-slate-950">
                              {activeSlide.pickedLabel}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-center">
                        <div className={`flex h-16 w-16 items-center justify-center rounded-full border-2 ${activeSlide.isPending
                          ? "border-amber-300 bg-amber-100 text-amber-700"
                          : activeSlide.isMatch
                            ? "border-emerald-300 bg-emerald-100 text-emerald-700"
                            : "border-rose-300 bg-rose-100 text-rose-700"}`}>
                          {activeSlide.isPending ? (
                            <CircleOff className="h-6 w-6" />
                          ) : activeSlide.isMatch ? (
                            <Check className="h-6 w-6" />
                          ) : (
                            <X className="h-6 w-6" />
                          )}
                        </div>
                      </div>

                      <div className="rounded-[28px] border border-[#eadfd2] bg-[linear-gradient(180deg,#f2f8ff_0%,#fff_100%)] p-6">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Actual result
                        </p>
                        <div className="mt-6 flex items-center gap-5">
                          <div
                            className={`flex h-24 w-24 items-center justify-center rounded-[28px] border text-3xl font-black ${valueTokenClass(activeSlide.kind, activeSlide.isPending ? false : true)}`}
                          >
                            {activeSlide.actualShort}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                              Classified value
                            </p>
                            <p className="mt-2 text-xl font-semibold leading-8 text-slate-950">
                              {activeSlide.actualLabel}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex flex-wrap gap-2">
                        {reviewSlides.map((slide, index) => (
                          <button
                            key={slide.slot}
                            type="button"
                            aria-label={`Open question ${index + 1}`}
                            onClick={() => setActiveIndex(index)}
                            className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold transition ${
                              index === activeIndex
                                ? "border-black bg-black text-white"
                                : slide.isPending
                                  ? "border-amber-300 bg-amber-100 text-amber-700"
                                  : slide.isMatch
                                    ? "border-emerald-300 bg-emerald-100 text-emerald-700"
                                    : "border-rose-300 bg-rose-100 text-rose-700"
                            }`}
                          >
                            {index + 1}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          className="rounded-full"
                          onClick={() => setActiveIndex((index) => Math.max(0, index - 1))}
                          disabled={activeIndex === 0}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <Button
                          className="rounded-full"
                          onClick={() =>
                            setActiveIndex((index) => Math.min(reviewSlides.length - 1, index + 1))
                          }
                          disabled={activeIndex === reviewSlides.length - 1}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-500">
                    No prediction details available for this round.
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="rounded-[32px] border-[#ddd6cc] bg-white">
                <CardContent className="space-y-4 px-6 py-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white">
                      <Trophy className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-['Orbitron'] text-xl font-black uppercase text-black">
                        Round summary
                      </p>
                      <p className="text-sm text-slate-500">
                        Quick read on how the card performed.
                      </p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Correct calls
                    </p>
                    <p className="mt-2 font-['Orbitron'] text-3xl font-black text-black">
                      {hits}/{reviewSlides.length}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Missed calls
                    </p>
                    <p className="mt-2 font-['Orbitron'] text-3xl font-black text-black">
                      {misses}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Result status
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {data?.actual?.available
                        ? "Race result data loaded"
                        : "Awaiting result data"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[32px] border-[#ddd6cc] bg-white">
                <CardContent className="space-y-4 px-6 py-6">
                  <p className="font-['Orbitron'] text-xl font-black uppercase text-black">
                    Score breakdown
                  </p>
                  {reviewBreakdownEntries.length > 0 ? (
                    <div className="space-y-2">
                      {reviewBreakdownEntries.map(([key, value]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm"
                        >
                          <span className="text-slate-600">
                            {key.replace(/_/g, " ")}
                          </span>
                          <span className="font-semibold text-slate-950">+{value}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">
                      No scoring breakdown is available yet.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-[32px] border-[#ddd6cc] bg-white">
                <CardContent className="space-y-3 px-6 py-6">
                  <p className="font-['Orbitron'] text-xl font-black uppercase text-black">
                    Navigation
                  </p>
                  <Button asChild variant="outline" className="w-full rounded-full">
                    <Link to={`/league/${leagueId}`}>Back to league</Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full rounded-full">
                    <Link to={`/league/${leagueId}/races/${raceId}/leaderboard`}>
                      Open race leaderboard
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
