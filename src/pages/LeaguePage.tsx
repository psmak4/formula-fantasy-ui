import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { apiClient } from "../api/apiClient";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { AppPageHeader } from "../components/layout/AppPageHeader";
import { Card, CardContent, CardTitle } from "../components/ui/Card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { initialsFromName } from "../lib/nameUtils";

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
  visibility?: "public" | "private";
  members?: Member[];
  gameMode?: string;
  ownerUserId?: string;
  createdAt?: string;
  league?: {
    id?: string;
    name?: string;
    visibility?: "public" | "private";
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

const LEADERBOARD_PAGE_SIZE = 25;

function normalizeLeaderboardRows(
  data: LeaderboardResponse | null,
  currentUserId: string | null,
): LeaderboardEntry[] {
  if (!data) return [];
  return (data.rows ?? []).map((row, index) => {
    const userId = row.user?.id ?? "";
    const rank = typeof row.rank === "number" ? row.rank : index + 1;
    const previousRank =
      typeof row.previousRank === "number" ? row.previousRank : undefined;
    const fallbackDelta = row.rankChange ?? row.movement ?? row.delta;

    return {
      rank,
      previousRank,
      rankDelta:
        typeof row.rankDelta === "number"
          ? row.rankDelta
          : typeof fallbackDelta === "number"
            ? fallbackDelta
            : typeof previousRank === "number"
              ? previousRank - rank
              : 0,
      userId,
      displayName:
        row.user?.displayName ?? row.displayName ?? "Unknown manager",
      avatarUrl: row.user?.avatarUrl,
      points: row.pointsTotal ?? row.points ?? 0,
      racesScored: row.racesScored ?? 0,
      lastRacePoints: row.lastRacePoints ?? 0,
      gapToLeader: row.gapToLeader ?? 0,
      gapToNext: row.gapToNext,
      isCurrentUser:
        row.isCurrentUser ??
        Boolean(currentUserId && userId && userId === currentUserId),
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
  const openAt =
    nextRace?.entryOpensAt ?? nextRace?.predictionOpensAt ?? nextRace?.openAt;
  const lockAt =
    nextRace?.entryClosesAt ?? nextRace?.predictionClosesAt ?? nextRace?.lockAt;
  const openTs = openAt ? new Date(openAt).getTime() : NaN;
  const lockTs = lockAt ? new Date(lockAt).getTime() : NaN;

  const status =
    nextRace?.windowStatus ??
    nextRace?.lockStatus ??
    (nextRace?.predictionLocked || nextRace?.entriesLocked
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
      timestampLabel: lockAt
        ? `Locked ${formatDateTimeLabel(lockAt)}`
        : "Locked",
    };
  }

  if (status === "upcoming") {
    const timeToOpen = !Number.isNaN(openTs)
      ? Math.max(openTs - nowMs, 0)
      : nextRace?.timeUntilOpenMs;
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
      timestampLabel:
        timeToOpen && timeToOpen > 0
          ? `Opens in ${formatDuration(timeToOpen)}`
          : openAt
            ? `Opens ${formatDateTimeLabel(openAt)}`
            : "Opens soon",
    };
  }

  const timeToLock = !Number.isNaN(lockTs)
    ? Math.max(lockTs - nowMs, 0)
    : nextRace?.timeUntilLockMs;
  return {
    status: "open",
    tone: "success",
    badgeLabel: "Open now",
    headline: lockAt
      ? `Predictions lock ${formatDateTimeLabel(lockAt)}`
      : "Prediction window is open",
    detail:
      timeToLock && timeToLock > 0
        ? `You still have ${formatDuration(timeToLock)} to save or edit your card.`
        : "Save your card before the race locks.",
    timestampLabel:
      timeToLock && timeToLock > 0
        ? `${formatDuration(timeToLock)} left`
        : lockAt
          ? `Locks ${formatDateTimeLabel(lockAt)}`
          : "Open now",
  };
}

function LeaguePageSkeleton() {
  return (
    <>
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="skeleton-line h-9 w-32" />
            <div className="skeleton-line h-9 w-28" />
            <div className="skeleton-line h-9 w-32" />
          </div>
          <div className="space-y-4">
            <div className="skeleton-line h-16 w-2/3" />
            <div className="skeleton-line h-5 w-full max-w-3xl" />
            <div className="skeleton-line h-5 w-5/6 max-w-2xl" />
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="skeleton-line h-10 w-36" />
            <div className="skeleton-line h-10 w-40" />
            <div className="skeleton-line h-10 w-40" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="skeleton-line h-9 w-28" />
          <div className="skeleton-line h-9 w-24" />
          <div className="skeleton-line h-9 w-24" />
        </div>
      </div>

      <Card className="ff-table-card overflow-hidden border-[#d9dee5]">
        <CardContent className="space-y-5 px-6 py-6">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="skeleton-line h-8 w-40" />
                <div className="skeleton-line h-4 w-64" />
              </div>
              <div className="flex gap-2">
                <div className="skeleton-line h-8 w-28" />
                <div className="skeleton-line h-8 w-32" />
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="skeleton-line h-10 w-36" />
              <div className="skeleton-line h-10 w-40" />
              <div className="skeleton-line h-10 w-40" />
            </div>
          </div>
        </CardContent>
        <CardContent className="space-y-0 px-0 py-0">
          <div className="space-y-px bg-[#e7ebf0]">
            {[1, 2, 3, 4].map((value) => (
              <div
                key={value}
                className="grid gap-4 bg-white px-6 py-5 md:grid-cols-[80px_minmax(0,1fr)_120px_130px]"
              >
                <div className="skeleton-line h-10 w-16" />
                <div className="space-y-2">
                  <div className="skeleton-line h-5 w-44" />
                  <div className="skeleton-line h-4 w-64" />
                </div>
                <div className="space-y-2">
                  <div className="skeleton-line h-4 w-16" />
                  <div className="skeleton-line h-5 w-14" />
                </div>
                <div className="skeleton-line h-10 w-20 md:justify-self-end" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export function LeaguePage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
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

      const [userData, leagueData, leaderboardData, entryData, nextRaceData] =
        await Promise.all([
          apiClient.get<{ userId: string }>("/me"),
          apiClient.get<LeagueResponse>(`/leagues/${leagueId}`),
          apiClient
            .get<LeaderboardResponse>(`/leagues/${leagueId}/standings`)
            .catch(() => ({}) as LeaderboardResponse),
          apiClient
            .get<EntryResponse>(`/leagues/${leagueId}/races/next/entry/me`)
            .catch(() => ({}) as EntryResponse),
          apiClient
            .get<NextRaceResponse>("/f1/next-race")
            .catch(() => ({}) as NextRaceResponse),
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
        leagueVisibility:
          leagueData.visibility ?? leagueData.league?.visibility ?? "private",
        members: leagueData.members ?? leagueData.league?.members ?? [],
        leaderboard: leaderboardData,
        nextRace: nextRaceData,
        entryLocked,
        entrySubmitted,
      };
    },
  });

  const currentUserId = data?.currentUserId ?? null;
  const leagueName = data?.leagueName ?? "League";
  const members = data?.members ?? [];
  const leaderboard = data?.leaderboard ?? null;
  const nextRace = data?.nextRace ?? null;
  const entryLocked = data?.entryLocked ?? false;
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
  const scoringAvailable =
    leaderboard?.scoringAvailable ?? leaderboard?.scoring?.available ?? false;
  const leagueHasScoredRounds = leaderboardRows.some(
    (entry) =>
      entry.racesScored > 0 || entry.points > 0 || entry.lastRacePoints > 0,
  );
  const latestLeagueRace = leagueHasScoredRounds
    ? leaderboard?.latestCompletedRace
    : null;
  const isMember = useMemo(() => {
    if (!currentUserId) return false;
    return members.some(
      (m) => m.userId === currentUserId || m.id === currentUserId,
    );
  }, [members, currentUserId]);

  const currentMember = useMemo(
    () =>
      members.find(
        (member) =>
          member.userId === currentUserId || member.id === currentUserId,
      ) ?? null,
    [currentUserId, members],
  );

  const isOwner = currentMember?.role === "owner";

  const nextRaceWindow = useMemo(
    () => buildNextRaceWindowSummary(nextRace, nowMs),
    [nextRace, nowMs],
  );
  const canEditPredictions = nextRaceWindow.status === "open";
  const canOpenPredictionRoute = entryLocked || canEditPredictions;
  const heroPredictionLabel = entryLocked ? "Review Entry" : "Edit Predictions";
  const totalPages = Math.max(
    1,
    Math.ceil(leaderboardRows.length / LEADERBOARD_PAGE_SIZE),
  );
  const pagedLeaderboardRows = useMemo(() => {
    const start = (currentPage - 1) * LEADERBOARD_PAGE_SIZE;
    return leaderboardRows.slice(start, start + LEADERBOARD_PAGE_SIZE);
  }, [currentPage, leaderboardRows]);

  useEffect(() => {
    setCurrentPage(1);
  }, [leagueId]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const copyInviteLinkMutation = useMutation({
    mutationFn: async () => {
      if (!leagueId) throw new Error("Missing league ID");
      return apiClient.get<{ token: string; inviteLink: string }>(`/leagues/${leagueId}/invite-link`);
    },
    onSuccess: async (data) => {
      const link = data.inviteLink ?? `${window.location.origin}/invite/${data.token}`;
      try {
        await navigator.clipboard.writeText(link);
        setCopyState("copied");
        setTimeout(() => setCopyState("idle"), 2500);
      } catch {
        setCopyState("error");
        setTimeout(() => setCopyState("idle"), 2500);
      }
    },
    onError: () => {
      setCopyState("error");
      setTimeout(() => setCopyState("idle"), 2500);
    }
  });

  const resetInviteLinkMutation = useMutation({
    mutationFn: async () => {
      if (!leagueId) throw new Error("Missing league ID");
      return apiClient.post<{ token: string; inviteLink: string }>(`/leagues/${leagueId}/invite-link/reset`);
    },
    onSuccess: async (data) => {
      setResetConfirmOpen(false);
      const link = data.inviteLink ?? `${window.location.origin}/invite/${data.token}`;
      try {
        await navigator.clipboard.writeText(link);
        setCopyState("copied");
        setTimeout(() => setCopyState("idle"), 2500);
      } catch {
        setCopyState("error");
        setTimeout(() => setCopyState("idle"), 2500);
      }
    },
    onError: () => {
      setResetConfirmOpen(false);
      // Optionally surface an error — for now just close the dialog silently
    }
  });
  const isInitialLoading = loading && !data;

  return (
    <section className="ff-page">
      <div className="ff-shell space-y-6">
        {isInitialLoading ? (
          <LeaguePageSkeleton />
        ) : (
          <div className="space-y-6">
            <AppPageHeader
              eyebrow="League Overview"
              title={leagueName}
              description="Championship standings for the full league. Track position, movement, total points, and jump into the next race card from one place."
              meta={
                <>
                  <Badge variant="secondary">
                    {data?.leagueVisibility ?? "private"}
                  </Badge>
                  <Badge tone="neutral">
                    {members.length} members
                  </Badge>
                  {leaderboard?.seasonYear ? (
                    <Badge tone="neutral">
                      Season {leaderboard.seasonYear}
                    </Badge>
                  ) : null}
                </>
              }
              utility={
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={nextRaceWindow.tone}>{nextRaceWindow.badgeLabel}</Badge>
                    <span className="text-sm text-[#989aa2]">{nextRaceWindow.timestampLabel}</span>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {canOpenPredictionRoute ? (
                      <Button asChild size="lg">
                        <Link to={`/league/${leagueId}/predict`}>
                          {heroPredictionLabel}
                        </Link>
                      </Button>
                    ) : (
                      <Button size="lg" disabled>
                        {heroPredictionLabel}
                      </Button>
                    )}
                    {isOwner && data?.leagueVisibility !== "public" ? (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => copyInviteLinkMutation.mutate()}
                          disabled={!isMember || copyInviteLinkMutation.isPending}
                          size="lg"
                        >
                          {copyInviteLinkMutation.isPending
                            ? "Fetching link..."
                            : copyState === "copied"
                              ? "Link Copied!"
                              : copyState === "error"
                                ? "Copy Failed"
                                : "Copy Invite Link"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setResetConfirmOpen(true)}
                          disabled={!isMember || copyInviteLinkMutation.isPending}
                          size="lg"
                        >
                          Reset Link
                        </Button>
                      </>
                    ) : null}
                    {latestLeagueRace?.raceId ? (
                      <Button asChild variant="secondary" size="lg">
                        <Link
                          to={`/league/${leagueId}/races/${latestLeagueRace.raceId}/review`}
                        >
                          Last Race Review
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </>
              }
            />

            {error ? (
              <Card className="border-[#7a0d0d] bg-[#350909]">
                <CardContent className="py-4">
                  <p className="text-[#ff8e8e]">
                    {error instanceof Error
                      ? error.message
                      : "Failed to load league"}
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
              <Card className="ff-table-card overflow-hidden border-[#d9dee5]">
                <CardContent className="space-y-5 px-6 py-6">
                  <div className="flex flex-col gap-4 border-b border-[#e4e8ee] pb-5">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="space-y-1">
                        <CardTitle className="text-2xl text-[#111318]">Leaderboard</CardTitle>
                        <p className="text-sm text-[#989aa2]">
                          Championship standings for the full league.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={scoringAvailable ? "success" : "warning"}>
                          {scoringAvailable
                            ? "Season Live"
                            : "Awaiting Scoring"}
                        </Badge>
                        {latestLeagueRace ? (
                          <Badge tone="neutral">
                            Latest: {latestLeagueRace.raceName}
                          </Badge>
                        ) : null}
                      </div>
                    </div>

                    <div className="text-sm leading-6 text-[#989aa2]">
                      <span className="font-semibold text-[#111318]">
                        {nextRaceWindow.headline}
                      </span>{" "}
                      {nextRaceWindow.detail}
                    </div>
                  </div>
                </CardContent>
                <CardContent className="space-y-0 px-0 py-0">
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
                        <Link
                          key={
                            entry.userId || `${entry.rank}-${entry.displayName}`
                          }
                          to={`/players/${entry.userId}`}
                          data-interactive="true"
                          className={`ff-data-row hover:no-underline border-b border-[#e4e8ee] px-6 py-5 md:grid-cols-[80px_minmax(0,1fr)_120px_130px] md:items-center ${
                            entry.isCurrentUser
                              ? "bg-[#fff0ee]"
                              : "bg-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`ff-display text-4xl ${isLeader ? "text-[#e9c400]" : "text-[#7f828b]"}`}
                            >
                              {String(entry.rank).padStart(2, "0")}
                            </span>
                            <div className="h-9 w-9 shrink-0 overflow-hidden border border-[#e4e8ee] bg-[#f0f2f5]">
                              {entry.avatarUrl ? (
                                <img
                                  src={entry.avatarUrl}
                                  alt={entry.displayName}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span className="flex h-full w-full items-center justify-center text-xs font-black text-[#45515f]">
                                  {initialsFromName(entry.displayName)}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-lg font-semibold uppercase tracking-[0.06em] text-[#111318]">
                                {entry.displayName}
                              </p>
                              {entry.isCurrentUser ? (
                                <Badge tone="info">You</Badge>
                              ) : null}
                              {isLeader ? (
                                <Badge tone="warning">Leader</Badge>
                              ) : null}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs uppercase tracking-[0.16em] text-[#7f828b]">
                              <span>{entry.racesScored} rounds</span>
                              <span>Last race {entry.lastRacePoints} pts</span>
                              <span>
                                {entry.rank === 1
                                  ? "Front row"
                                  : `Leader ${gapLabel(entry.gapToLeader)}`}
                              </span>
                              {entry.rank > 1 ? (
                                <span>Next {gapLabel(entry.gapToNext)}</span>
                              ) : null}
                            </div>
                          </div>

                          <div className="text-left md:text-center">
                            <p className="ff-kicker">Trend</p>
                            <div
                              className={`mt-2 flex items-center gap-2 text-sm font-semibold ${movementClass}`}
                            >
                              {movement > 0 ? (
                                <ArrowUpRight className="h-4 w-4" />
                              ) : movement < 0 ? (
                                <ArrowDownRight className="h-4 w-4" />
                              ) : (
                                <Minus className="h-4 w-4" />
                              )}
                              <span>
                                {movement > 0
                                  ? `+${movement}`
                                  : movement < 0
                                    ? `${movement}`
                                    : "Flat"}
                              </span>
                            </div>
                          </div>

                          <div className="text-left md:text-right">
                            <p className="text-3xl font-black text-[#111318]">
                              {entry.points}
                            </p>
                            <p className="ff-kicker mt-1">Total Pts</p>
                          </div>
                        </Link>
                      );
                    })}

                    {pagedLeaderboardRows.length === 0 ? (
                      <div className="px-6 py-10 text-center text-sm text-[#989aa2]">
                        No cumulative standings yet. Score a round to light up
                        the championship table.
                      </div>
                    ) : null}
                  </div>

                  {leaderboardRows.length > LEADERBOARD_PAGE_SIZE ? (
                    <div className="flex flex-col gap-3 border-t border-[#e4e8ee] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-[#989aa2]">
                        Showing {(currentPage - 1) * LEADERBOARD_PAGE_SIZE + 1}{" "}
                        to{" "}
                        {Math.min(
                          currentPage * LEADERBOARD_PAGE_SIZE,
                          leaderboardRows.length,
                        )}{" "}
                        of {leaderboardRows.length} managers
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            setCurrentPage((page) => Math.max(1, page - 1))
                          }
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <span className="min-w-24 text-center text-sm font-semibold text-[#45515f]">
                          Page {currentPage} / {totalPages}
                        </span>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            setCurrentPage((page) =>
                              Math.min(totalPages, page + 1),
                            )
                          }
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}
          </div>
        )}
      </div>

      <Dialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-['Orbitron'] uppercase tracking-[0.16em]">
              Reset Invite Link?
            </DialogTitle>
            <DialogDescription>
              This will invalidate the current invite link. Anyone who has it will no
              longer be able to join {leagueName}.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              onClick={() => resetInviteLinkMutation.mutate()}
              disabled={resetInviteLinkMutation.isPending}
            >
              {resetInviteLinkMutation.isPending ? "Resetting..." : "Reset Link"}
            </Button>
            <Button variant="outline" onClick={() => setResetConfirmOpen(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
