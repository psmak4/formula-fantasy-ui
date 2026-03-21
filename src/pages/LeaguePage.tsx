import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
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
  entriesOpen?: boolean;
  lockStatus?: "upcoming" | "open" | "locked";
  windowStatus?: "upcoming" | "open" | "locked";
  entryOpensAt?: string;
  entryClosesAt?: string;
  predictionOpensAt?: string;
  predictionClosesAt?: string;
  openAt?: string;
  lockAt?: string;
  raceStartAt?: string;
  timeUntilOpenMs?: number;
  timeUntilLockMs?: number;
};

type NextRaceWindowSummary = {
  status: "upcoming" | "open" | "locked";
  tone: "info" | "warning" | "danger" | "success" | "neutral";
  badgeLabel: string;
  headline: string;
  detail: string;
  timestampLabel: string;
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

const LEADERBOARD_PAGE_SIZE = 25;

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

function gapLabel(value?: number): string {
  if (typeof value !== "number") return "—";
  if (value <= 0) return "Level";
  return `+${value} pts`;
}

function formatDateTimeLabel(value?: string): string {
  if (!value) return "TBD";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "TBD";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

function formatDuration(ms?: number): string {
  if (typeof ms !== "number" || !Number.isFinite(ms) || ms <= 0) {
    return "0m";
  }

  const totalMinutes = Math.max(1, Math.floor(ms / 60000));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];

  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 && days === 0) parts.push(`${minutes}m`);

  return parts.join(" ") || "0m";
}

function buildNextRaceWindowSummary(
  nextRace: NextRaceResponse | null,
  nowMs: number,
): NextRaceWindowSummary {
  const openAt = nextRace?.entryOpensAt ?? nextRace?.predictionOpensAt ?? nextRace?.openAt;
  const lockAt = nextRace?.entryClosesAt ?? nextRace?.predictionClosesAt ?? nextRace?.lockAt;
  const openTs = openAt ? new Date(openAt).getTime() : NaN;
  const lockTs = lockAt ? new Date(lockAt).getTime() : NaN;

  const status = nextRace?.windowStatus
    ?? nextRace?.lockStatus
    ?? (nextRace?.predictionLocked || nextRace?.entriesLocked
      ? "locked"
      : !Number.isNaN(lockTs) && nowMs >= lockTs
        ? "locked"
        : !Number.isNaN(openTs) && nowMs < openTs
          ? "upcoming"
          : "open");

  if (status === "locked") {
    return {
      status,
      tone: "danger",
      badgeLabel: "Locked",
      headline: "Predictions are locked",
      detail: lockAt
        ? `This race locked at ${formatDateTimeLabel(lockAt)}.`
        : "This race is no longer editable.",
      timestampLabel: lockAt ? `Locked ${formatDateTimeLabel(lockAt)}` : "Locked",
    };
  }

  if (status === "upcoming") {
    const timeToOpen = !Number.isNaN(openTs) ? Math.max(openTs - nowMs, 0) : nextRace?.timeUntilOpenMs;
    return {
      status,
      tone: "warning",
      badgeLabel: "Opens soon",
      headline: openAt
        ? `Prediction window opens ${formatDateTimeLabel(openAt)}`
        : "Prediction window opens soon",
      detail: lockAt
        ? `Cards will lock ${formatDateTimeLabel(lockAt)}.`
        : "Cards will become editable before race start.",
      timestampLabel: timeToOpen && timeToOpen > 0
        ? `Opens in ${formatDuration(timeToOpen)}`
        : (openAt ? `Opens ${formatDateTimeLabel(openAt)}` : "Opens soon"),
    };
  }

  const timeToLock = !Number.isNaN(lockTs) ? Math.max(lockTs - nowMs, 0) : nextRace?.timeUntilLockMs;
  return {
    status: "open",
    tone: "success",
    badgeLabel: "Open now",
    headline: lockAt
      ? `Predictions lock ${formatDateTimeLabel(lockAt)}`
      : "Prediction window is open",
    detail: timeToLock && timeToLock > 0
      ? `You still have ${formatDuration(timeToLock)} to save or edit your card.`
      : "Save your card before the race locks.",
    timestampLabel: timeToLock && timeToLock > 0
      ? `${formatDuration(timeToLock)} left`
      : (lockAt ? `Locks ${formatDateTimeLabel(lockAt)}` : "Open now"),
  };
}

export function LeaguePage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [inviteLink, setInviteLink] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  const [currentPage, setCurrentPage] = useState(1);

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
        nextRace: nextRaceData,
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
  const nextRace = data?.nextRace ?? null;
  const entrySubmitted = data?.entrySubmitted ?? false;
  const entryLocked = data?.entryLocked ?? false;
  const entryPicks = data?.entryPicks ?? null;
  const drivers = data?.drivers ?? [];
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const handle = window.setInterval(() => {
      setNowMs(Date.now());
    }, 30000);

    return () => window.clearInterval(handle);
  }, []);

  const leaderboardRows = useMemo(
    () => normalizeLeaderboardRows(leaderboard, currentUserId),
    [currentUserId, leaderboard],
  );
  const topScorer = leaderboardRows[0];
  const scoringAvailable = leaderboard?.scoringAvailable ?? leaderboard?.scoring?.available ?? false;
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

  const nextRaceWindow = useMemo(
    () => buildNextRaceWindowSummary(nextRace, nowMs),
    [nextRace, nowMs],
  );
  const totalPages = Math.max(
    1,
    Math.ceil(leaderboardRows.length / LEADERBOARD_PAGE_SIZE),
  );
  const pagedLeaderboardRows = useMemo(() => {
    const start = (currentPage - 1) * LEADERBOARD_PAGE_SIZE;
    return leaderboardRows.slice(start, start + LEADERBOARD_PAGE_SIZE);
  }, [currentPage, leaderboardRows]);

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

  useEffect(() => {
    setCurrentPage(1);
  }, [leagueId]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

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
    <section className="px-6 py-14 md:py-20">
      <div className="mx-auto max-w-7xl space-y-8">
        <Card className="overflow-hidden border-white/8 bg-[#121318]">
          <CardContent className="grid gap-8 px-6 py-8 lg:grid-cols-[minmax(0,1.35fr)_300px] lg:px-8">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="ff-kicker bg-white/6 px-3 py-2 text-[#d0d3d9]">
                  Private League
                </span>
                <span className="ff-kicker bg-white/6 px-3 py-2 text-[#d0d3d9]">
                  {members.length} Members
                </span>
                {leaderboard?.seasonYear ? (
                  <span className="ff-kicker bg-white/6 px-3 py-2 text-[#d0d3d9]">
                    Season {leaderboard.seasonYear}
                  </span>
                ) : null}
              </div>

              <div className="space-y-4">
                <h1 className="ff-display text-5xl text-white md:text-7xl">
                  {leagueName}
                </h1>
                <p className="max-w-3xl text-base leading-7 text-[#a3a6af] md:text-lg">
                  Championship standings for the full league. Track position, movement,
                  total points, and jump directly into your next race card.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {isOwner ? (
                  <Button
                    onClick={handleCreateInvite}
                    disabled={!isMember || createInviteMutation.isPending}
                    size="lg"
                  >
                    {createInviteMutation.isPending ? "Generating Invite..." : "Invite Driver"}
                  </Button>
                ) : null}
                <Button asChild variant="outline" size="lg">
                  <Link to={`/league/${leagueId}/predict`}>
                    {entryLocked ? "Review Entry" : "Edit Predictions"}
                  </Link>
                </Button>
                {leaderboard?.latestCompletedRace?.raceId ? (
                  <Button asChild variant="secondary" size="lg">
                    <Link
                      to={`/league/${leagueId}/races/${leaderboard.latestCompletedRace.raceId}/review`}
                    >
                      Last Race Review
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="border-l-2 border-[#cc0000] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] p-6">
              <p className="ff-kicker">Your Standing</p>
              <div className="mt-5 flex items-end gap-3">
                <p className="ff-display text-6xl text-white">
                  {currentUserRow ? `P${currentUserRow.rank}` : "P—"}
                </p>
              </div>
              <div className="mt-6 grid gap-3">
                <div className="border border-white/8 bg-white/3 p-4">
                  <p className="ff-kicker">Global Rank</p>
                  <p className="mt-2 text-3xl font-black text-white">
                    {currentUserRow ? `#${currentUserRow.rank}` : "—"}
                  </p>
                </div>
                <div className="border border-white/8 bg-white/3 p-4">
                  <p className="ff-kicker">Total Points</p>
                  <p className="mt-2 text-3xl font-black text-[#e9c400]">
                    {currentUserRow?.points ?? 0}
                  </p>
                </div>
                <div className="border border-white/8 bg-white/3 p-4">
                  <p className="ff-kicker">Last Race Gain</p>
                  <p className="mt-2 text-2xl font-black text-[#6ee7a8]">
                    {currentUserRow ? `${currentUserRow.lastRacePoints} pts` : "—"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse border-white/8 bg-[#15161b]">
                <CardHeader>
                  <div className="h-6 w-3/4 rounded bg-white/8" />
                </CardHeader>
                <CardContent>
                  <div className="h-4 w-1/2 rounded bg-white/8" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}

        {error ? (
          <Card className="border-[#7a0d0d] bg-[#350909]">
            <CardContent className="py-4">
              <p className="text-[#ff8e8e]">
                {error instanceof Error ? error.message : "Failed to load league"}
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => void refetch()}
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {!loading && !error ? (
          <>
            <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
              <div className="space-y-6">
                <Card className="border-white/8 bg-[#15161b]">
                  <CardHeader>
                    <CardTitle className="text-2xl">Next Event</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="border-l-2 border-[#cc0000] bg-white/3 p-4">
                      <p className="ff-kicker">Window Status</p>
                      <p className="ff-display mt-3 text-3xl text-white">
                        {nextRaceWindow.badgeLabel}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[#989aa2]">
                        {nextRaceWindow.headline}
                      </p>
                    </div>
                    <div className="border border-white/8 bg-white/2 p-4">
                      <p className="ff-kicker">Timer</p>
                      <p className="mt-2 text-3xl font-black text-[#e9c400]">
                        {nextRaceWindow.timestampLabel}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[#989aa2]">
                        {nextRaceWindow.detail}
                      </p>
                    </div>
                    <Button asChild className="w-full" size="lg">
                      <Link to={`/league/${leagueId}/predict`}>
                        {entryLocked
                          ? "Review Entry"
                          : entrySubmitted
                            ? "Edit Predictions"
                            : "Open Prediction Card"}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-white/8 bg-[#15161b]">
                  <CardHeader>
                    <CardTitle className="text-2xl">League Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="border border-white/8 bg-white/3 p-4">
                      <p className="ff-kicker">Status</p>
                      <p className="mt-2 text-sm font-semibold uppercase tracking-[0.12em] text-white">
                        {isOwner ? "You own this league" : "You are a league member"}
                      </p>
                    </div>
                    <div className="border border-white/8 bg-white/3 p-4">
                      <p className="ff-kicker">Latest Scored Round</p>
                      <p className="mt-2 text-sm font-semibold uppercase tracking-[0.12em] text-white">
                        {leaderboard?.latestCompletedRace?.raceName ?? "No scored rounds yet"}
                      </p>
                      <p className="mt-1 text-sm text-[#7f828b]">
                        {leaderboard?.latestCompletedRace?.round
                          ? `Round ${leaderboard.latestCompletedRace.round}`
                          : "Waiting for completed scoring"}
                      </p>
                    </div>
                    <div className="border border-white/8 bg-white/3 p-4">
                      <p className="ff-kicker">Invite Grid</p>
                      <p className="mt-2 text-sm leading-6 text-[#989aa2]">
                        League membership is private for MVP. Share an invite link to bring in rivals.
                      </p>
                      {isOwner ? (
                        <Button
                          onClick={handleCreateInvite}
                          disabled={!isMember || createInviteMutation.isPending}
                          className="mt-4 w-full"
                        >
                          {createInviteMutation.isPending ? "Generating Invite..." : "Create Invite Link"}
                        </Button>
                      ) : (
                        <p className="mt-4 text-xs uppercase tracking-[0.18em] text-[#7f828b]">
                          Only the league owner can generate invites.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-white/8 bg-[#15161b]">
                  <CardHeader>
                    <CardTitle className="text-2xl">Top Of The Grid</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {orderedMembers.length > 0 ? (
                      orderedMembers.slice(0, 8).map((member, index) => (
                        <div
                          key={member.id ?? member.userId ?? `${member.displayName}-${index}`}
                          className="flex items-center justify-between border border-white/8 bg-white/3 px-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-white">
                              {member.displayName ?? member.name ?? member.handle ?? "Unknown manager"}
                            </p>
                            <p className="ff-kicker mt-1">{member.role ?? "member"}</p>
                          </div>
                          <span className="ff-display text-2xl text-[#7f828b]">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-[#989aa2]">No members loaded.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="overflow-hidden border-white/8 bg-[#15161b]">
                  <CardHeader className="border-b border-white/6 bg-white/3">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-3xl">Leaderboard</CardTitle>
                        <p className="mt-2 text-sm text-[#989aa2]">
                          Full championship order for this league, paged for larger grids.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={scoringAvailable ? "success" : "warning"}>
                          {scoringAvailable ? "Season Live" : "Awaiting Scoring"}
                        </Badge>
                        {leaderboard?.latestCompletedRace ? (
                          <Badge tone="neutral">
                            Latest: {leaderboard.latestCompletedRace.raceName}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5 px-0 py-0">
                    <div className="grid gap-4 border-b border-white/6 px-6 py-5 md:grid-cols-3">
                      <div className="border-l-2 border-[#e9c400] bg-white/2 p-4">
                        <p className="ff-kicker">League Leader</p>
                        <p className="mt-3 text-xl font-black uppercase tracking-[0.08em] text-white">
                          {topScorer?.displayName ?? "Waiting"}
                        </p>
                        <p className="mt-1 text-sm text-[#7f828b]">
                          {topScorer ? `${topScorer.points} pts` : "No leader yet"}
                        </p>
                      </div>
                      <div className="border-l-2 border-white/10 bg-white/2 p-4">
                        <p className="ff-kicker">Managers</p>
                        <p className="mt-3 text-3xl font-black text-white">
                          {members.length}
                        </p>
                      </div>
                      <div className="border-l-2 border-[#cc0000] bg-white/2 p-4">
                        <p className="ff-kicker">Your Rank</p>
                        <p className="mt-3 text-3xl font-black text-white">
                          {currentUserRow ? `P${currentUserRow.rank}` : "P—"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-0">
                      {pagedLeaderboardRows.map((entry) => {
                        const isLeader = entry.rank === 1;
                        const movement = entry.rankDelta;
                        const movementClass =
                          movement > 0
                            ? "text-[#6ee7a8]"
                            : movement < 0
                              ? "text-[#ff7373]"
                              : "text-[#7f828b]";

                        return (
                          <div
                            key={entry.userId || `${entry.rank}-${entry.displayName}`}
                            className={`grid gap-4 border-b border-white/6 px-6 py-5 md:grid-cols-[80px_minmax(0,1fr)_120px_130px] md:items-center ${
                              entry.isCurrentUser ? "bg-[#2a1414]" : "bg-transparent"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className={`ff-display text-4xl ${isLeader ? "text-[#e9c400]" : "text-[#7f828b]"}`}>
                                {String(entry.rank).padStart(2, "0")}
                              </span>
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-lg font-semibold uppercase tracking-[0.06em] text-white">
                                  {entry.displayName}
                                </p>
                                {entry.isCurrentUser ? <Badge tone="info">You</Badge> : null}
                                {isLeader ? <Badge tone="warning">Leader</Badge> : null}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs uppercase tracking-[0.16em] text-[#7f828b]">
                                <span>{entry.racesScored} rounds</span>
                                <span>Last race {entry.lastRacePoints} pts</span>
                                <span>{entry.rank === 1 ? "Front row" : `Leader ${gapLabel(entry.gapToLeader)}`}</span>
                                {entry.rank > 1 ? <span>Next {gapLabel(entry.gapToNext)}</span> : null}
                              </div>
                            </div>

                            <div className="text-left md:text-center">
                              <p className="ff-kicker">Trend</p>
                              <div className={`mt-2 flex items-center gap-2 text-sm font-semibold ${movementClass}`}>
                                {movement > 0 ? <ArrowUpRight className="h-4 w-4" /> : movement < 0 ? <ArrowDownRight className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                                <span>{movement > 0 ? `+${movement}` : movement < 0 ? `${movement}` : "Flat"}</span>
                              </div>
                            </div>

                            <div className="text-left md:text-right">
                              <p className="text-3xl font-black text-white">{entry.points}</p>
                              <p className="ff-kicker mt-1">Total Pts</p>
                            </div>
                          </div>
                        );
                      })}

                      {pagedLeaderboardRows.length === 0 ? (
                        <div className="px-6 py-10 text-center text-sm text-[#989aa2]">
                          No cumulative standings yet. Score a round to light up the championship table.
                        </div>
                      ) : null}
                    </div>

                    {leaderboardRows.length > LEADERBOARD_PAGE_SIZE ? (
                      <div className="flex flex-col gap-3 border-t border-white/6 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-[#989aa2]">
                          Showing {(currentPage - 1) * LEADERBOARD_PAGE_SIZE + 1} to{" "}
                          {Math.min(currentPage * LEADERBOARD_PAGE_SIZE, leaderboardRows.length)} of{" "}
                          {leaderboardRows.length} managers
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                            disabled={currentPage === 1}
                          >
                            Previous
                          </Button>
                          <span className="min-w-24 text-center text-sm font-semibold text-[#d0d3d9]">
                            Page {currentPage} / {totalPages}
                          </span>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                            disabled={currentPage === totalPages}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
                  <Card className="border-white/8 bg-[#15161b]">
                    <CardHeader>
                      <CardTitle className="text-2xl">Your Next Card</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {entrySubmitted ? <Badge tone="success">Submitted</Badge> : <Badge tone="warning">Not Submitted</Badge>}
                        {entryLocked ? <Badge tone="danger">Locked</Badge> : <Badge tone="info">Editable</Badge>}
                        <Badge tone={nextRaceWindow.tone}>{nextRaceWindow.badgeLabel}</Badge>
                      </div>
                      <div className="border border-white/8 bg-white/3 p-4">
                        <p className="ff-kicker">Race Window</p>
                        <p className="mt-2 text-lg font-semibold text-white">
                          {nextRaceWindow.headline}
                        </p>
                        <p className="mt-3 text-sm leading-6 text-[#989aa2]">
                          {entrySubmitted
                            ? entryLocked
                              ? "Your prediction card is locked in for this race."
                              : "Your prediction card is saved. You can still edit it before lock."
                            : nextRaceWindow.status === "upcoming"
                              ? "The next card is not open yet, but the lock time is already set."
                              : nextRaceWindow.status === "locked"
                                ? "This race is locked. You can review the card and get ready for the next round."
                                : "You have not submitted picks for the next race yet."}
                        </p>
                        <p className="mt-3 text-sm font-semibold uppercase tracking-[0.16em] text-[#e9c400]">
                          {nextRaceWindow.timestampLabel}
                        </p>
                      </div>
                      {entrySubmitted && entrySummary.length > 0 ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {entrySummary.map((row) => (
                            <div
                              key={row.label}
                              className="border border-white/8 bg-white/2 px-4 py-3"
                            >
                              <p className="ff-kicker">{row.label}</p>
                              <p className="mt-2 text-sm font-medium text-white">
                                {row.value}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      <Button asChild variant={entryLocked ? "outline" : "default"} className="w-full" size="lg">
                        <Link to={`/league/${leagueId}/predict`}>
                          {entryLocked
                            ? "Review Entry"
                            : entrySubmitted
                              ? "Edit Prediction Card"
                              : "Build Prediction Card"}
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-white/8 bg-[#15161b]">
                    <CardHeader>
                      <CardTitle className="text-2xl">Movement Tracker</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {biggestMovers.length > 0 ? (
                        biggestMovers.map((entry) => (
                          <div
                            key={`mover-${entry.userId || entry.displayName}`}
                            className="flex items-center justify-between border border-[#205038] bg-[#102317] px-3 py-3"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold uppercase tracking-[0.08em] text-white">
                                {entry.displayName}
                              </p>
                              <p className="ff-kicker mt-1">Now P{entry.rank}</p>
                            </div>
                            <div className="flex items-center gap-1 text-sm font-semibold text-[#6ee7a8]">
                              <ArrowUpRight className="h-4 w-4" />
                              +{entry.rankDelta}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-[#989aa2]">
                          Position changes appear once the league has multiple scored rounds.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </>
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
