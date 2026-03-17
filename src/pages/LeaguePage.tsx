import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowDownRight, ArrowUpRight, Minus, Trophy } from "lucide-react";
import { apiClient } from "../api/apiClient";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";

type Member = {
  id?: string;
  userId?: string;
  displayName?: string;
  name?: string;
  handle?: string;
  role?: string;
};

type LeagueResponse = {
  id?: string;
  name?: string;
  members?: Member[];
  league?: {
    id?: string;
    name?: string;
    members?: Member[];
  };
};

type LeaderboardEntry = {
  rank: number;
  previousRank?: number;
  rankDelta: number;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  points: number;
  racesScored: number;
  lastRacePoints: number;
  gapToLeader: number;
  gapToNext?: number;
  isCurrentUser: boolean;
};

type ApiLeaderboardRow = {
  rank?: number;
  previousRank?: number;
  rankDelta?: number;
  user?: {
    id?: string;
    displayName?: string;
    avatarUrl?: string;
  };
  displayName?: string;
  pointsTotal?: number;
  points?: number;
  racesScored?: number;
  lastRacePoints?: number;
  gapToLeader?: number;
  gapToNext?: number;
  isCurrentUser?: boolean;
  rankChange?: number;
  movement?: number;
  delta?: number;
};

type LeaderboardResponse = {
  scoring?: { available?: boolean };
  scoringAvailable?: boolean;
  seasonYear?: number;
  latestCompletedRace?: {
    raceId?: string;
    raceName?: string;
    round?: number;
    computedAt?: string;
  };
  rows?: ApiLeaderboardRow[];
};

type EntryResponse = {
  picks?: {
    P1?: string;
    P2?: string;
    P3?: string;
    FASTEST_LAP?: string;
    BIGGEST_GAINER?: string;
    SAFETY_CAR?: boolean;
    CLASSIFIED_FINISHERS?: string;
  };
  window?: {
    isLocked?: boolean;
  };
  lockedAt?: string;
};

type Driver = {
  id?: string;
  driverId?: string;
  code?: string;
  givenName?: string;
  familyName?: string;
  displayName?: string;
  name?: string;
};

type NextRaceResponse = {
  predictionLocked?: boolean;
  entriesLocked?: boolean;
  lockStatus?: "open" | "locked";
  entryClosesAt?: string;
  predictionClosesAt?: string;
  lockAt?: string;
};

type InviteResponse = {
  inviteUrl?: string;
  inviteLink?: string;
  url?: string;
  link?: string;
  token?: string;
};

type EntrySummaryRow = {
  label: string;
  value: string;
};

function resolveInviteLink(data: InviteResponse): string | null {
  const link = data.inviteUrl ?? data.inviteLink ?? data.url ?? data.link;
  if (link) return link;

  const token = data.token;
  if (!token || typeof window === "undefined") return null;
  return `${window.location.origin}/invite/${token}`;
}

function driverId(driver: Driver): string {
  return driver.id ?? driver.driverId ?? "";
}

function driverName(driver: Driver): string {
  if (driver.givenName || driver.familyName) {
    return `${driver.givenName ?? ""} ${driver.familyName ?? ""}`.trim();
  }
  return driver.displayName ?? driver.name ?? driver.code ?? driverId(driver);
}

function driverLabel(driver: Driver): string {
  const code = driver.code ? ` (${driver.code})` : "";
  return `${driverName(driver)}${code}`;
}

function formatPickValue(
  value: string | boolean | undefined,
  driversById: Map<string, string>,
): string {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (!value) {
    return "Pending";
  }
  if (value === "0_TO_9") return "0 to 9 finishers";
  if (value === "10_TO_12") return "10 to 12 finishers";
  if (value === "13_TO_15") return "13 to 15 finishers";
  if (value === "16_TO_20") return "16 to 20 finishers";
  return driversById.get(value) ?? value;
}

function normalizeLeaderboardRows(
  data: LeaderboardResponse | null,
  currentUserId: string | null,
): LeaderboardEntry[] {
  if (!data) return [];
  return (data.rows ?? []).map((row, index) => {
    const userId = row.user?.id ?? "";
    const rank = typeof row.rank === "number" ? row.rank : index + 1;
    const previousRank = typeof row.previousRank === "number" ? row.previousRank : undefined;
    const fallbackDelta = row.rankChange ?? row.movement ?? row.delta;

    return {
      rank,
      previousRank,
      rankDelta: typeof row.rankDelta === "number"
        ? row.rankDelta
        : typeof fallbackDelta === "number"
          ? fallbackDelta
          : typeof previousRank === "number"
            ? previousRank - rank
            : 0,
      userId,
      displayName: row.user?.displayName ?? row.displayName ?? "Unknown manager",
      avatarUrl: row.user?.avatarUrl,
      points: row.pointsTotal ?? row.points ?? 0,
      racesScored: row.racesScored ?? 0,
      lastRacePoints: row.lastRacePoints ?? 0,
      gapToLeader: row.gapToLeader ?? 0,
      gapToNext: row.gapToNext,
      isCurrentUser: row.isCurrentUser ?? Boolean(currentUserId && userId && userId === currentUserId),
    };
  });
}

function rankChipClass(rank: number): string {
  if (rank === 1) return "border-amber-300 bg-amber-100 text-amber-900";
  if (rank === 2) return "border-slate-300 bg-slate-100 text-slate-800";
  if (rank === 3) return "border-orange-300 bg-orange-100 text-orange-900";
  return "border-neutral-200 bg-neutral-100 text-slate-700";
}

function gapLabel(value?: number): string {
  if (typeof value !== "number") return "—";
  if (value <= 0) return "Level";
  return `+${value} pts`;
}

export function LeaguePage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [inviteLink, setInviteLink] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle",
  );

  const {
    data,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["league-page", leagueId],
    enabled: Boolean(leagueId),
    queryFn: async () => {
      if (!leagueId) {
        throw new Error("Missing league ID");
      }

      const [
        userData,
        leagueData,
        leaderboardData,
        entryData,
        nextRaceData,
        driversData,
      ] =
        await Promise.all([
          apiClient.get<{ userId: string }>("/me"),
          apiClient.get<LeagueResponse>(`/leagues/${leagueId}`),
          apiClient
            .get<LeaderboardResponse>(
              `/leagues/${leagueId}/standings`,
            )
            .catch(() => ({}) as LeaderboardResponse),
          apiClient
            .get<EntryResponse>(`/leagues/${leagueId}/races/next/entry/me`)
            .catch(() => ({}) as EntryResponse),
          apiClient
            .get<NextRaceResponse>("/f1/next-race")
            .catch(() => ({}) as NextRaceResponse),
          apiClient.get<Driver[]>("/f1/next-race/drivers").catch(() => [] as Driver[]),
        ]);

      const closeAt =
        nextRaceData.entryClosesAt ??
        nextRaceData.predictionClosesAt ??
        nextRaceData.lockAt;
      const closeTs = closeAt ? new Date(closeAt).getTime() : NaN;
      const lockedByTime = !Number.isNaN(closeTs) && Date.now() >= closeTs;
      const entryLocked =
        entryData.window?.isLocked === true ||
        nextRaceData.predictionLocked === true ||
        nextRaceData.entriesLocked === true ||
        nextRaceData.lockStatus === "locked" ||
        lockedByTime;

      const entrySubmitted = Boolean(
        entryData.picks &&
        Object.values(entryData.picks).some(
          (value) => value !== undefined && value !== null,
        ),
      );

      return {
        currentUserId: userData.userId ?? null,
        leagueName: leagueData.name ?? leagueData.league?.name ?? "League",
        members: leagueData.members ?? leagueData.league?.members ?? [],
        leaderboard: leaderboardData,
        drivers: driversData ?? [],
        entryLocked,
        entrySubmitted,
        entryPicks: entryData.picks ?? null,
      };
    },
  });

  const currentUserId = data?.currentUserId ?? null;
  const leagueName = data?.leagueName ?? "League";
  const members = data?.members ?? [];
  const leaderboard = data?.leaderboard ?? null;
  const entrySubmitted = data?.entrySubmitted ?? false;
  const entryLocked = data?.entryLocked ?? false;
  const entryPicks = data?.entryPicks ?? null;
  const drivers = data?.drivers ?? [];

  const leaderboardRows = useMemo(
    () => normalizeLeaderboardRows(leaderboard, currentUserId).slice(0, 10),
    [currentUserId, leaderboard],
  );
  const topScorer = leaderboardRows[0];
  const scoringAvailable = leaderboard?.scoringAvailable ?? leaderboard?.scoring?.available ?? false;
  const runnerUp = leaderboardRows[1];
  const currentUserRow = leaderboardRows.find((entry) => entry.isCurrentUser) ?? null;
  const biggestMovers = useMemo(
    () => leaderboardRows
      .filter((entry) => entry.rankDelta > 0)
      .sort((left, right) => {
        if (left.rankDelta !== right.rankDelta) return right.rankDelta - left.rankDelta;
        return left.rank - right.rank;
      })
      .slice(0, 3),
    [leaderboardRows],
  );

  const isMember = useMemo(() => {
    if (!currentUserId) return false;
    return members.some(
      (m) => m.userId === currentUserId || m.id === currentUserId,
    );
  }, [members, currentUserId]);

  const currentMember = useMemo(
    () =>
      members.find((member) => member.userId === currentUserId || member.id === currentUserId) ??
      null,
    [currentUserId, members],
  );

  const isOwner = currentMember?.role === "owner";

  const driversById = useMemo(
    () => new Map(drivers.map((driver) => [driverId(driver), driverLabel(driver)])),
    [drivers],
  );

  const entrySummary = useMemo<EntrySummaryRow[]>(() => {
    if (!entryPicks) return [];
    return [
      { label: "P1", value: formatPickValue(entryPicks.P1, driversById) },
      { label: "P2", value: formatPickValue(entryPicks.P2, driversById) },
      { label: "P3", value: formatPickValue(entryPicks.P3, driversById) },
      {
        label: "Fastest lap",
        value: formatPickValue(entryPicks.FASTEST_LAP, driversById),
      },
      {
        label: "Biggest gainer",
        value: formatPickValue(entryPicks.BIGGEST_GAINER, driversById),
      },
      {
        label: "Safety car",
        value: formatPickValue(entryPicks.SAFETY_CAR, driversById),
      },
      {
        label: "Classified finishers",
        value: formatPickValue(entryPicks.CLASSIFIED_FINISHERS, driversById),
      },
    ];
  }, [driversById, entryPicks]);

  const orderedMembers = useMemo(() => {
    return [...members].sort((left, right) => {
      const leftRank = left.role === "owner" ? 0 : 1;
      const rightRank = right.role === "owner" ? 0 : 1;
      if (leftRank !== rightRank) return leftRank - rightRank;

      const leftName = left.displayName ?? left.name ?? left.handle ?? "";
      const rightName = right.displayName ?? right.name ?? right.handle ?? "";
      return leftName.localeCompare(rightName);
    });
  }, [members]);

  const createInviteMutation = useMutation({
    mutationFn: async () => {
      if (!leagueId) {
        throw new Error("Missing league ID");
      }
      return apiClient.post<InviteResponse>(`/leagues/${leagueId}/invites`);
    },
    onSuccess: (data) => {
      const link = resolveInviteLink(data);
      if (!link) {
        return;
      }
      setInviteLink(link);
      setInviteToken(data.token ?? "");
      setCopyState("idle");
      setIsInviteModalOpen(true);
    },
  });

  function handleCreateInvite() {
    void createInviteMutation.mutateAsync();
  }

  async function handleCopyInvite() {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  return (
    <section className="pb-12 pt-20">
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
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]">
          <Card className="overflow-hidden border-neutral-900 bg-[radial-gradient(circle_at_top_left,_rgba(239,68,68,0.22),_transparent_35%),linear-gradient(140deg,_#121212_0%,_#0f172a_52%,_#18181b_100%)] text-white shadow-[0_24px_80px_rgba(15,23,42,0.26)]">
            <CardHeader className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-white/12 text-white" tone="info">
                  Private League
                </Badge>
                <Badge className="bg-white/12 text-white" tone="info">
                  {members.length} managers
                </Badge>
                {leaderboard?.latestCompletedRace ? (
                  <Badge className="bg-emerald-200 text-emerald-950" tone="success">
                    Last scored: {leaderboard.latestCompletedRace.raceName ?? "Latest round"}
                  </Badge>
                ) : (
                  <Badge className="bg-amber-200 text-amber-950" tone="warning">
                    No scored rounds yet
                  </Badge>
                )}
              </div>
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.36em] text-white/60">
                  Race Control
                </p>
                <h2 className="font-['Orbitron'] text-4xl font-bold uppercase tracking-tight text-white md:text-5xl">
                  {leagueName}
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-white/72 md:text-base">
                  Track the full championship table, review the latest scored round, and lock in your next card before the window closes.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {isMember ? (
                  <>
                    {isOwner ? (
                      <Button onClick={handleCreateInvite}>
                        {createInviteMutation.isPending
                          ? "Generating invite..."
                          : "Share Invite"}
                      </Button>
                    ) : null}
                    <Button asChild variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                      <Link to={`/league/${leagueId}/predict`}>
                        {entryLocked ? "Review Entry" : "Make Picks"}
                      </Link>
                    </Button>
                    {leaderboard?.latestCompletedRace?.raceId ? (
                      <Button asChild variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                        <Link to={`/league/${leagueId}/races/${leaderboard.latestCompletedRace.raceId}/leaderboard`}>
                          View Latest Results
                        </Link>
                      </Button>
                    ) : null}
                    {!isOwner ? (
                      <div className="rounded-2xl border border-white/15 bg-white/6 px-4 py-3 text-sm text-white/78">
                        Invite links are managed by the league owner.
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="rounded-2xl border border-white/15 bg-white/6 px-4 py-3 text-sm text-white/78">
                    Join from an invite link. Direct join from the league page is not supported in MVP.
                  </div>
                )}
              </div>
            </CardHeader>
          </Card>

          <Card className="border-neutral-300 bg-white/96">
            <CardHeader className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="font-['Orbitron'] text-xl uppercase tracking-[0.18em] text-slate-900">
                  Battle Snapshot
                </CardTitle>
                {topScorer ? (
                  <Badge tone="success">Season live</Badge>
                ) : (
                  <Badge tone="warning">Grid forming</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Championship leader
                  </p>
                  <p className="mt-2 font-['Orbitron'] text-2xl font-bold uppercase text-slate-950">
                    {topScorer?.displayName ?? "No leader yet"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {topScorer ? `${topScorer.points} pts` : "Standings will populate after the first scored round."}
                  </p>
                </div>
                <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Latest results
                  </p>
                  <p className="mt-2 font-['Orbitron'] text-2xl font-bold uppercase text-slate-950">
                    {leaderboard?.latestCompletedRace?.raceName ?? runnerUp?.displayName ?? "Waiting on the field"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {leaderboard?.latestCompletedRace ? `Round ${leaderboard.latestCompletedRace.round ?? "-"}` : runnerUp ? `${runnerUp.points} pts` : "Invite more rivals to turn this into a proper fight."}
                  </p>
                </div>
              </div>
              <div className="rounded-3xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-3 text-sm text-slate-600">
                {entrySubmitted
                  ? entryLocked
                    ? "Your card is locked for the next race."
                    : "Your next-race card is saved. You can still edit before lock."
                  : "No next-race card submitted yet. Lock it in before the window closes."}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse bg-background">
                <CardHeader>
                  <div className="h-6 w-3/4 rounded bg-neutral-200" />
                </CardHeader>
                <CardContent>
                  <div className="h-4 w-1/2 rounded bg-neutral-200" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}

        {/* Error State */}
        {error ? (
          <Card className="bg-red-50">
            <CardContent className="py-4">
              <p className="text-red-600">
                {error instanceof Error
                  ? error.message
                  : "Failed to load league"}
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-2"
                onClick={() => void refetch()}
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {/* Content */}
        {!loading && !error ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.95fr)]">
            <Card className="overflow-hidden border-neutral-300">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="font-['Orbitron'] text-2xl uppercase tracking-[0.18em]">
                      League Standings
                    </CardTitle>
                    <p className="text-sm text-slate-500">
                      Cumulative league standings across all scored rounds this season.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {leaderboard?.latestCompletedRace ? (
                      <Badge tone="info">Latest round: {leaderboard.latestCompletedRace.raceName}</Badge>
                    ) : null}
                    {scoringAvailable && topScorer ? (
                      <Badge tone="success">Top: {topScorer.displayName}</Badge>
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.95fr)]">
                  <div className="rounded-[28px] border border-slate-900 bg-[radial-gradient(circle_at_top_left,_rgba(239,68,68,0.18),_transparent_34%),linear-gradient(145deg,_#111827_0%,_#0f172a_52%,_#18181b_100%)] p-6 text-white shadow-[0_16px_48px_rgba(15,23,42,0.22)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">
                      Your championship spot
                    </p>
                    <div className="mt-4 flex flex-wrap items-end gap-3">
                      <p className="font-['Orbitron'] text-4xl font-bold uppercase tracking-tight text-white md:text-5xl">
                        {currentUserRow ? `P${currentUserRow.rank}` : "P—"}
                      </p>
                      {currentUserRow ? (
                        <Badge className="bg-white/12 text-white" tone="info">
                          {currentUserRow.displayName}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-3 max-w-xl text-sm leading-6 text-white/74">
                      {currentUserRow
                        ? `You have ${currentUserRow.points} total points after ${currentUserRow.racesScored} scored rounds in ${leagueName}.`
                        : "Join the fight and score a round to lock in your place on the grid."}
                    </p>
                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-3xl border border-white/10 bg-white/6 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Gap to leader</p>
                        <p className="mt-2 font-['Orbitron'] text-xl font-bold text-white">
                          {currentUserRow ? gapLabel(currentUserRow.gapToLeader) : "—"}
                        </p>
                      </div>
                      <div className="rounded-3xl border border-white/10 bg-white/6 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Gap to next</p>
                        <p className="mt-2 font-['Orbitron'] text-xl font-bold text-white">
                          {currentUserRow ? gapLabel(currentUserRow.gapToNext) : "—"}
                        </p>
                      </div>
                      <div className="rounded-3xl border border-white/10 bg-white/6 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Last race haul</p>
                        <p className="mt-2 font-['Orbitron'] text-xl font-bold text-white">
                          {currentUserRow ? `${currentUserRow.lastRacePoints} pts` : "—"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 rounded-[28px] border border-neutral-200 bg-neutral-50 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Race movement</p>
                        <p className="mt-1 text-sm text-slate-600">Changes since the previous scored race.</p>
                      </div>
                      <Badge tone={biggestMovers.length > 0 ? "success" : "neutral"}>
                        {biggestMovers.length > 0 ? "Momentum live" : "No movement yet"}
                      </Badge>
                    </div>
                    {biggestMovers.length > 0 ? (
                      <div className="space-y-3">
                        {biggestMovers.map((entry) => (
                          <div
                            key={`mover-${entry.userId || entry.displayName}`}
                            className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-900">{entry.displayName}</p>
                              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Now P{entry.rank}</p>
                            </div>
                            <div className="flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                              <ArrowUpRight className="h-4 w-4" />
                              +{entry.rankDelta}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-4 py-5 text-sm text-slate-500">
                        Position changes will appear after the second scored race of the season.
                      </div>
                    )}
                    <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Leader of the paddock</p>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-['Orbitron'] text-xl font-bold uppercase text-slate-950">
                            {topScorer?.displayName ?? "Waiting"}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {topScorer ? `${topScorer.points} pts · ${topScorer.racesScored} rounds scored` : "Standings will populate after the first scored round."}
                          </p>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-amber-300 bg-amber-100 text-amber-700">
                          <Trophy className="h-5 w-5" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {leaderboardRows.map((entry) => {
                    const isLeader = entry.rank === 1;
                    const movement = entry.rankDelta;

                    return (
                      <div
                        key={entry.userId || `${entry.rank}-${entry.displayName}`}
                        className={`rounded-[26px] border px-4 py-4 transition-shadow md:px-5 ${entry.isCurrentUser
                          ? "border-rose-300 bg-rose-50/70 shadow-[0_18px_42px_rgba(244,63,94,0.12)]"
                          : "border-neutral-200 bg-white hover:shadow-[0_14px_32px_rgba(15,23,42,0.08)]"}`}
                      >
                        <div className="flex flex-wrap items-center gap-4 md:flex-nowrap">
                          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-base font-['Orbitron'] font-bold ${rankChipClass(entry.rank)}`}>
                            {entry.rank}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-base font-semibold text-slate-950 md:text-lg">
                                {entry.displayName}
                              </p>
                              {entry.isCurrentUser ? <Badge tone="info">You</Badge> : null}
                              {isLeader ? <Badge tone="success">Leader</Badge> : null}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                              <span>{entry.racesScored} rounds</span>
                              <span>Last race {entry.lastRacePoints} pts</span>
                              <span>{entry.rank === 1 ? "Front row" : `Leader ${gapLabel(entry.gapToLeader)}`}</span>
                              {entry.rank > 1 ? <span>Next {gapLabel(entry.gapToNext)}</span> : null}
                            </div>
                          </div>

                          <div className="ml-auto flex items-center gap-3 md:justify-end">
                            <div
                              className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${movement > 0
                                ? "bg-emerald-100 text-emerald-700"
                                : movement < 0
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-neutral-100 text-slate-600"}`}
                            >
                              {movement > 0 ? (
                                <ArrowUpRight className="h-4 w-4" />
                              ) : movement < 0 ? (
                                <ArrowDownRight className="h-4 w-4" />
                              ) : (
                                <Minus className="h-4 w-4" />
                              )}
                              <span>
                                {movement > 0 ? `+${movement}` : movement < 0 ? `${movement}` : "Flat"}
                              </span>
                            </div>
                            <div className="text-right">
                              <p className="font-['Orbitron'] text-2xl font-bold text-slate-950">
                                {entry.points}
                              </p>
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                total pts
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {leaderboardRows.length === 0 ? (
                    <div className="rounded-[26px] border border-dashed border-neutral-300 bg-neutral-50 px-6 py-10 text-center text-sm text-slate-500">
                      No cumulative standings yet. Score a round to light up the championship table.
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-neutral-300">
                <CardHeader>
                  <CardTitle className="font-['Orbitron'] text-xl uppercase tracking-[0.14em]">
                    Your Next Card
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {entrySubmitted ? (
                        <Badge tone="success">Submitted</Badge>
                      ) : (
                        <Badge tone="warning">Not submitted</Badge>
                      )}
                      {entryLocked ? (
                        <Badge tone="danger">Locked</Badge>
                      ) : (
                        <Badge tone="info">Editable</Badge>
                      )}
                    </div>
                    <p className="text-sm leading-6 text-slate-600">
                      {entrySubmitted
                        ? "Your prediction card is live for the next race."
                        : "You have not submitted picks for the next race yet."}
                    </p>
                    {entrySubmitted && entrySummary.length > 0 ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {entrySummary.map((row) => (
                          <div
                            key={row.label}
                            className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3"
                          >
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                              {row.label}
                            </p>
                            <p className="mt-1 text-sm font-medium text-slate-900">
                              {row.value}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <Button asChild variant={entryLocked ? "outline" : "default"} className="w-full">
                      <Link to={`/league/${leagueId}/predict`}>
                        {entryLocked
                          ? "Review Entry"
                          : entrySubmitted
                            ? "Edit Prediction Card"
                            : "Build Prediction Card"}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-neutral-300">
                <CardHeader>
                  <CardTitle className="font-['Orbitron'] text-xl uppercase tracking-[0.14em]">
                    Invite Grid
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm leading-6 text-slate-600">
                    League membership is private for MVP. Share an invite link to bring in rivals.
                  </p>
                  {isOwner ? (
                    <Button
                      onClick={handleCreateInvite}
                      disabled={!isMember || createInviteMutation.isPending}
                      className="w-full"
                    >
                      {createInviteMutation.isPending
                        ? "Generating invite..."
                        : "Create Invite Link"}
                    </Button>
                  ) : null}
                  {!isOwner ? (
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Only the league owner can generate invites.
                    </p>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="border-neutral-300">
                <CardHeader>
                  <CardTitle className="font-['Orbitron'] text-xl uppercase tracking-[0.14em]">
                    Grid Order
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {orderedMembers.length > 0 ? (
                    orderedMembers.slice(0, 8).map((member, index) => (
                      <div
                        key={member.id ?? member.userId ?? `${member.displayName}-${index}`}
                        className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3"
                      >
                        <div>
                          <p className="font-medium text-slate-900">
                            {member.displayName ?? member.name ?? member.handle ?? "Unknown manager"}
                          </p>
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                            {member.role ?? "member"}
                          </p>
                        </div>
                        <span className="font-['Orbitron'] text-sm font-bold text-slate-500">
                          P{index + 1}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No members loaded.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null}
      </div>

      <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
        <DialogContent>
          <DialogHeader className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="info">Private league</Badge>
              <Badge tone="success">Invite ready</Badge>
            </div>
            <DialogTitle className="font-['Orbitron'] uppercase tracking-[0.16em]">
              Share League Invite
            </DialogTitle>
            <DialogDescription>
              Send this invite link to one rival. They will be taken straight into
              the join flow for {leagueName}.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Invite link
              </p>
              <Input
                value={inviteLink}
                readOnly
                aria-label="Invite link"
                className="mt-3 text-sm"
              />
            </div>
            {inviteToken ? (
              <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Invite token
                </p>
                <p className="mt-2 font-mono text-sm text-slate-700">
                  {inviteToken}
                </p>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleCopyInvite}>
                {copyState === "copied" ? "Copied" : "Copy Invite"}
              </Button>
              <Button asChild variant="outline">
                <a href={inviteLink} target="_blank" rel="noreferrer">
                  Open Invite
                </a>
              </Button>
            </div>
            {copyState === "error" ? (
              <p className="text-sm text-red-600">
                Copy failed. You can still open the invite link directly.
              </p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
