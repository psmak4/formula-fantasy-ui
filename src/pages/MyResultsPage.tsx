import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { apiClient } from "../api/apiClient";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
} from "../components/ui/Card";

type LeagueOption = {
  id?: string;
  name?: string;
};

type LeaguesResponse = {
  leagues?: LeagueOption[];
};

type MyResultsRace = {
  raceId?: string;
  round?: number;
  raceName?: string;
  raceStartAt?: string;
  computedAt?: string;
  pointsTotal?: number;
  submitted?: boolean;
  breakdown?: Record<string, number>;
  rank?: number | null;
  deltaFromAverage?: number;
  isBestRound?: boolean;
  performanceLabel?: string;
};

type MyResultsResponse = {
  league?: {
    id?: string;
    name?: string;
  };
  user?: {
    id?: string;
    displayName?: string;
  };
  seasonYear?: number;
  availableSeasons?: number[];
  summary?: {
    totalPoints?: number;
    currentPosition?: number | null;
    roundsScored?: number;
    averagePoints?: number;
    bestRoundPoints?: number | null;
  };
  latestRound?: MyResultsRace | null;
  races?: MyResultsRace[];
};

function formatDate(value?: string): string {
  if (!value) return "Date pending";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Date pending";
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatSignedNumber(value?: number): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  if (value === 0) return "Even";
  return value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
}

function formatPosition(value?: number | null): string {
  return typeof value === "number" ? `P${value}` : "—";
}

function titleCaseBreakdownLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function breakdownEntries(breakdown?: Record<string, number>) {
  return Object.entries(breakdown ?? {})
    .filter(([, value]) => typeof value === "number")
    .sort((left, right) => Math.abs(right[1]) - Math.abs(left[1]));
}

function latestRoundHeadline(race?: MyResultsRace | null): string {
  if (!race) return "No scored round yet";
  if (!race.submitted) return "No card submitted for this round";
  return race.performanceLabel ?? "Scored round";
}

function roundToneClass(race: MyResultsRace, isFeatured = false): string {
  if (!race.submitted) {
    return isFeatured
      ? "bg-[linear-gradient(140deg,#57534e_0%,#3f3f46_100%)] text-white"
      : "bg-[#f5f1ea]";
  }
  if (race.isBestRound) {
    return isFeatured
      ? "bg-[linear-gradient(135deg,#ef4444_0%,#7c3aed_58%,#1d4ed8_100%)] text-white"
      : "bg-[linear-gradient(135deg,rgba(239,68,68,0.08),rgba(29,78,216,0.08))]";
  }
  return isFeatured
    ? "bg-[linear-gradient(135deg,#111827_0%,#1f2937_56%,#0f172a_100%)] text-white"
    : "bg-white";
}

export function MyResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedLeagueId, setSelectedLeagueId] = useState(
    searchParams.get("leagueId") ?? "",
  );
  const [hideMissedRounds, setHideMissedRounds] = useState(false);

  const leaguesQuery = useQuery({
    queryKey: ["my-leagues-for-results"],
    queryFn: () => apiClient.get<LeaguesResponse>("/me/leagues"),
  });

  const leagues = leaguesQuery.data?.leagues ?? [];

  useEffect(() => {
    if (!selectedLeagueId && leagues.length > 0) {
      const firstLeagueId = leagues[0]?.id ?? "";
      if (firstLeagueId) {
        setSelectedLeagueId(firstLeagueId);
      }
    }
  }, [leagues, selectedLeagueId]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (selectedLeagueId) {
      next.set("leagueId", selectedLeagueId);
    }
    setSearchParams(next, { replace: true });
  }, [selectedLeagueId, setSearchParams]);

  const resultsQuery = useQuery({
    queryKey: ["my-results", selectedLeagueId],
    enabled: Boolean(selectedLeagueId),
    queryFn: async () => {
      const params = new URLSearchParams({ leagueId: selectedLeagueId });
      return apiClient.get<MyResultsResponse>(
        `/me/results?${params.toString()}`,
      );
    },
  });

  const races = useMemo(
    () => resultsQuery.data?.races ?? [],
    [resultsQuery.data?.races],
  );
  const summary = resultsQuery.data?.summary;
  const latestRound = resultsQuery.data?.latestRound ?? races[0] ?? null;
  const visibleRounds = useMemo(
    () =>
      hideMissedRounds ? races.filter((race) => race.submitted !== false) : races,
    [hideMissedRounds, races],
  );
  const selectedLeagueName = resultsQuery.data?.league?.name ?? "League";
  const availableSeasons = resultsQuery.data?.availableSeasons ?? [];
  const displayedSeason = resultsQuery.data?.seasonYear;

  // TODO: Replace placeholder accuracy values with live API-backed calculations.
  const summaryAccuracy = 25;
  const latestRoundAccuracy = latestRound?.submitted ? 20 : null;
  const averageAccuracy = latestRound?.submitted ? 31 : null;

  return (
    <section className="bg-[linear-gradient(180deg,#f6f3ee_0%,#f2ede6_100%)] pb-14 pt-14">
      <div className="mx-auto max-w-6xl space-y-8 px-6">
        <div className="rounded-full border border-[#ddd6cc] bg-[#ebe6de] px-5 py-3 text-sm font-semibold text-slate-700">
          <span className="mr-3 rounded-full bg-white px-3 py-1 text-xs uppercase tracking-[0.14em] text-slate-500">
            Current
          </span>
          {selectedLeagueName}
        </div>

        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <h1 className="font-['Orbitron'] text-4xl font-black uppercase tracking-tight text-black md:text-5xl">
              My Results
            </h1>
            <div className="rounded-full border-2 border-black bg-white px-4 py-2 text-sm font-semibold text-black">
              {displayedSeason ?? availableSeasons[0] ?? "Season"}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:min-w-[380px]">
            <div className="rounded-[24px] border border-[#ddd6cc] bg-white px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Total points
              </p>
              <p className="mt-2 font-['Orbitron'] text-4xl font-black text-black">
                {summary?.totalPoints ?? 0}
              </p>
            </div>
            <div className="rounded-[24px] border border-[#ddd6cc] bg-white px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Avg. accuracy
              </p>
              <p className="mt-2 font-['Orbitron'] text-4xl font-black text-black">
                {summaryAccuracy}%
              </p>
            </div>
          </div>
        </div>

        <Card className={`overflow-hidden border-0 shadow-[0_18px_48px_rgba(15,23,42,0.08)] ${roundToneClass(latestRound ?? {}, true)}`}>
          <CardContent className="px-8 py-7">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 text-sm font-semibold uppercase tracking-[0.14em] text-white/80">
                  <span>Round {latestRound?.round ?? "—"}</span>
                  <span>{latestRound?.raceName ?? "Latest round"}</span>
                </div>

                <div>
                  <h2 className="font-['Orbitron'] text-4xl font-black tracking-tight text-white md:text-5xl">
                    {latestRound?.submitted
                      ? latestRoundHeadline(latestRound)
                      : "Round pending"}
                  </h2>
                  <p className="mt-2 max-w-2xl text-base text-white/82">
                    {latestRound?.submitted
                      ? "Your most recent scored weekend is featured here first, with a quick read on score and accuracy."
                      : "This round is included in your timeline, but no submitted prediction card was available."}
                  </p>
                </div>
              </div>

              <div className="min-w-[280px] space-y-3 rounded-[24px] border border-white/12 bg-white/10 p-5 backdrop-blur-sm">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
                      Round score
                    </p>
                    <p className="mt-1 font-['Orbitron'] text-5xl font-black text-white">
                      {latestRound?.pointsTotal ?? 0}
                    </p>
                  </div>
                  <div className="text-right text-white/80">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                      League finish
                    </p>
                    <p className="mt-1 font-['Orbitron'] text-2xl font-black text-white">
                      {formatPosition(latestRound?.rank)}
                    </p>
                  </div>
                </div>
                <div className="grid gap-3">
                  <div className="rounded-2xl bg-white/12 px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm font-semibold text-white/82">
                        Accuracy
                      </span>
                      <span className="font-['Orbitron'] text-xl font-black text-white">
                        {latestRoundAccuracy !== null ? `${latestRoundAccuracy}%` : "—"}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/12 px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm font-semibold text-white/82">
                        Avg. benchmark
                      </span>
                      <span className="font-['Orbitron'] text-xl font-black text-white">
                        {averageAccuracy !== null ? `${averageAccuracy}%` : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Badge className="bg-white/12 text-white" tone="info">
                {latestRound?.submitted ? "Card submitted" : "No card submitted"}
              </Badge>
              {latestRound?.isBestRound ? (
                <Badge className="bg-white/12 text-white" tone="success">
                  Best round
                </Badge>
              ) : null}
              {latestRound?.computedAt ? (
                <Badge className="bg-white/12 text-white" tone="neutral">
                  Scored
                </Badge>
              ) : null}
              {latestRound?.raceId ? (
                <Button
                  asChild
                  variant="outline"
                  className="ml-auto rounded-full border-white/24 bg-white/8 text-white hover:bg-white/12 hover:text-white"
                >
                  <Link
                    to={`/league/${selectedLeagueId}/races/${latestRound.raceId}/review`}
                  >
                    View predictions
                  </Link>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Season timeline
            </p>
            <h2 className="font-['Orbitron'] text-3xl font-black uppercase tracking-tight text-black">
              Round history
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-slate-600">
              League
            </label>
            <select
              className="h-11 rounded-full border border-neutral-300 bg-white px-4 text-sm"
              value={selectedLeagueId}
              onChange={(event) => setSelectedLeagueId(event.target.value)}
            >
              {leagues.map((league) => (
                <option key={league.id} value={league.id}>
                  {league.name ?? "League"}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${hideMissedRounds
                ? "bg-black text-white"
                : "border border-neutral-300 bg-white text-slate-700"}`}
              onClick={() => setHideMissedRounds((value) => !value)}
            >
              {hideMissedRounds ? "Showing submitted only" : "Hide missed rounds"}
            </button>
          </div>
        </div>

        {resultsQuery.isLoading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((value) => (
              <div
                key={value}
                className="h-52 animate-pulse rounded-[28px] border border-[#ddd6cc] bg-white"
              />
            ))}
          </div>
        ) : null}

        {resultsQuery.error ? (
          <Card className="rounded-[28px] border-red-200 bg-red-50">
            <CardContent className="py-5">
              <p className="text-red-700">
                {resultsQuery.error instanceof Error
                  ? resultsQuery.error.message
                  : "Failed to load results"}
              </p>
            </CardContent>
          </Card>
        ) : null}

        {!resultsQuery.isLoading && !resultsQuery.error ? (
          visibleRounds.length === 0 ? (
            <Card className="rounded-[28px] border-[#ddd6cc]">
              <CardContent className="py-10 text-center text-slate-500">
                No completed and scored rounds yet for this league.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {visibleRounds.map((race) => {
                const topBreakdown = breakdownEntries(race.breakdown).slice(0, 2);
                const isMissed = race.submitted === false;
                const placeholderAccuracy = race.submitted ? 30 : null;

                return (
                  <Card
                    key={`${race.raceId}-${race.round}`}
                    className={`rounded-[28px] border-[#ddd6cc] shadow-[0_14px_32px_rgba(15,23,42,0.04)] ${roundToneClass(race)}`}
                  >
                    <CardContent className="space-y-5 px-5 py-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Round {race.round ?? "—"}
                          </p>
                          <h3 className="mt-2 font-['Orbitron'] text-3xl font-black tracking-tight text-black">
                            {race.raceName ?? "Race"}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">
                            {formatDate(race.raceStartAt)}
                          </p>
                        </div>
                        <div className="shrink-0 border-l border-neutral-200 pl-4 text-right">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Score
                          </p>
                          <p className="mt-1 font-['Orbitron'] text-4xl font-black text-black">
                            {race.pointsTotal ?? 0}
                          </p>
                          <p className="text-sm font-medium text-slate-500">
                            {formatPosition(race.rank)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {race.isBestRound ? <Badge tone="success">Best round</Badge> : null}
                        <Badge tone={isMissed ? "warning" : "info"}>
                          {isMissed ? "Missed round" : "Scored"}
                        </Badge>
                      </div>

                      <div className="rounded-2xl bg-[#f7f3ec] px-4 py-3">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-sm font-semibold text-slate-600">
                            Accuracy
                          </span>
                          <span className="font-['Orbitron'] text-xl font-black text-black">
                            {placeholderAccuracy !== null ? `${placeholderAccuracy}%` : "—"}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm text-slate-600">
                          {race.performanceLabel ?? "Scored round"}
                        </p>
                        <p className="text-sm text-slate-500">
                          {formatSignedNumber(race.deltaFromAverage)} vs average
                        </p>
                      </div>

                      {topBreakdown.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {topBreakdown.map(([label, value]) => (
                            <span
                              key={label}
                              className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"
                            >
                              {titleCaseBreakdownLabel(label)} {value} pts
                            </span>
                          ))}
                        </div>
                      ) : null}

                      <Button asChild variant="outline" className="w-full rounded-full">
                        <Link
                          to={`/league/${selectedLeagueId}/races/${race.raceId}/review`}
                        >
                          View predictions
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )
        ) : null}
      </div>
    </section>
  );
}
