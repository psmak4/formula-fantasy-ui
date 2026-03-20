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

function leagueInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
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
    <section className="bg-[linear-gradient(180deg,#f6f3ee_0%,#f3eee7_100%)] pb-12 pt-14">
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
        <Card className="overflow-hidden border-[#d7d0c7] bg-white shadow-[0_18px_44px_rgba(15,23,42,0.05)]">
          <CardContent className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.9fr)] lg:px-8">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1d4ed8] text-lg font-black text-white">
                  {leagueInitials(leagueName)}
                </div>
                <div className="min-w-0">
                  <p className="font-['Orbitron'] text-3xl font-black uppercase tracking-tight text-black md:text-4xl">
                    {leagueName}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge className="rounded-full" tone="info">
                      Private league
                    </Badge>
                    <Badge className="rounded-full" tone="neutral">
                      {members.length} managers
                    </Badge>
                    {leaderboard?.seasonYear ? (
                      <Badge className="rounded-full" tone="neutral">
                        {leaderboard.seasonYear} season
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </div>

              <p className="max-w-3xl text-sm leading-6 text-slate-600 md:text-base">
                Championship standings for the full league. Keep this page focused on
                rank, movement, and total points, then jump out to predictions or race
                reviews when needed.
              </p>

              <div className="flex flex-wrap gap-3">
                {isOwner ? (
                  <Button
                    onClick={handleCreateInvite}
                    disabled={!isMember || createInviteMutation.isPending}
                    className="rounded-full"
                  >
                    {createInviteMutation.isPending
                      ? "Generating invite..."
                      : "Share invite"}
                  </Button>
                ) : null}
                <Button asChild variant="outline" className="rounded-full border-2 border-black px-5">
                  <Link to={`/league/${leagueId}/predict`}>
                    {entryLocked ? "Review entry" : "Make predictions"}
                  </Link>
                </Button>
                {leaderboard?.latestCompletedRace?.raceId ? (
                  <Button asChild variant="outline" className="rounded-full px-5">
                    <Link
                      to={`/league/${leagueId}/races/${leaderboard.latestCompletedRace.raceId}/review`}
                    >
                      Last round details
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="rounded-[28px] border border-neutral-900 bg-[radial-gradient(circle_at_top_left,_rgba(239,68,68,0.18),_transparent_36%),linear-gradient(145deg,_#101114_0%,_#16181d_60%,_#20232b_100%)] p-6 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">
                Your position
              </p>
              <div className="mt-4 flex items-end gap-3">
                <p className="font-['Orbitron'] text-5xl font-black text-white">
                  {currentUserRow ? `P${currentUserRow.rank}` : "P—"}
                </p>
                {currentUserRow ? (
                  <Badge className="bg-white/12 text-white" tone="info">
                    {currentUserRow.displayName}
                  </Badge>
                ) : null}
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-white/6 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
                    Total points
                  </p>
                  <p className="mt-2 font-['Orbitron'] text-2xl font-bold text-white">
                    {currentUserRow?.points ?? 0}
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/6 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
                    Gap to lead
                  </p>
                  <p className="mt-2 font-['Orbitron'] text-2xl font-bold text-white">
                    {currentUserRow ? gapLabel(currentUserRow.gapToLeader) : "—"}
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/6 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
                    Last round
                  </p>
                  <p className="mt-2 font-['Orbitron'] text-2xl font-bold text-white">
                    {currentUserRow ? `${currentUserRow.lastRacePoints}` : "—"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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

        {!loading && !error ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_340px]">
            <Card className="overflow-hidden border-[#d7d0c7] bg-white">
              <CardHeader className="border-b border-[#ece5dc] bg-[#fbf9f5]">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <CardTitle className="font-['Orbitron'] text-2xl font-black uppercase tracking-tight text-black">
                      League standings
                    </CardTitle>
                    <p className="mt-1 text-sm text-slate-500">
                      Full championship order for this league, paged for larger grids.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="rounded-full" tone={scoringAvailable ? "success" : "warning"}>
                      {scoringAvailable ? "Season live" : "Awaiting scoring"}
                    </Badge>
                    {leaderboard?.latestCompletedRace ? (
                      <Badge className="rounded-full" tone="neutral">
                        Latest: {leaderboard.latestCompletedRace.raceName}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 px-4 py-4 md:px-6">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      League leader
                    </p>
                    <p className="mt-2 truncate font-['Orbitron'] text-2xl font-black text-black">
                      {topScorer?.displayName ?? "Waiting"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {topScorer ? `${topScorer.points} pts` : "No leader yet"}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Managers
                    </p>
                    <p className="mt-2 font-['Orbitron'] text-2xl font-black text-black">
                      {members.length}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Total league members
                    </p>
                  </div>
                  <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Your rank
                    </p>
                    <p className="mt-2 font-['Orbitron'] text-2xl font-black text-black">
                      {currentUserRow ? `P${currentUserRow.rank}` : "P—"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {currentUserRow ? `${currentUserRow.points} total pts` : "Not on the board yet"}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {pagedLeaderboardRows.map((entry) => {
                    const isLeader = entry.rank === 1;
                    const movement = entry.rankDelta;

                    return (
                      <div
                        key={entry.userId || `${entry.rank}-${entry.displayName}`}
                        className={`rounded-[24px] border px-4 py-4 transition-shadow md:px-5 ${entry.isCurrentUser
                          ? "border-rose-300 bg-rose-50/70 shadow-[0_18px_42px_rgba(244,63,94,0.08)]"
                          : "border-neutral-200 bg-white hover:shadow-[0_14px_32px_rgba(15,23,42,0.06)]"}`}
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

                  {pagedLeaderboardRows.length === 0 ? (
                    <div className="rounded-[26px] border border-dashed border-neutral-300 bg-neutral-50 px-6 py-10 text-center text-sm text-slate-500">
                      No cumulative standings yet. Score a round to light up the championship table.
                    </div>
                  ) : null}
                </div>

                {leaderboardRows.length > LEADERBOARD_PAGE_SIZE ? (
                  <div className="flex flex-col gap-3 border-t border-[#ece5dc] pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-500">
                      Showing {(currentPage - 1) * LEADERBOARD_PAGE_SIZE + 1}
                      {" "}to{" "}
                      {Math.min(currentPage * LEADERBOARD_PAGE_SIZE, leaderboardRows.length)}
                      {" "}of {leaderboardRows.length} managers
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <span className="min-w-20 text-center text-sm font-semibold text-slate-600">
                        Page {currentPage} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full"
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

            <div className="space-y-6">
              <Card className="border-[#d7d0c7] bg-white">
                <CardHeader>
                  <CardTitle className="font-['Orbitron'] text-xl uppercase tracking-[0.14em]">
                    League details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Status
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {isOwner ? "You own this league" : "You are a league member"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Latest scored round
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {leaderboard?.latestCompletedRace?.raceName ?? "No scored rounds yet"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {leaderboard?.latestCompletedRace?.round
                        ? `Round ${leaderboard.latestCompletedRace.round}`
                        : "Waiting for completed scoring"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Movement tracker
                    </p>
                    {biggestMovers.length > 0 ? (
                      <div className="mt-3 space-y-3">
                        {biggestMovers.map((entry) => (
                          <div
                            key={`mover-${entry.userId || entry.displayName}`}
                            className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-white px-3 py-3"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-900">
                                {entry.displayName}
                              </p>
                              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                                Now P{entry.rank}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 text-sm font-semibold text-emerald-700">
                              <ArrowUpRight className="h-4 w-4" />
                              +{entry.rankDelta}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">
                        Position changes appear once the league has multiple scored rounds.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-[#d7d0c7] bg-white">
                <CardHeader>
                  <CardTitle className="font-['Orbitron'] text-xl uppercase tracking-[0.14em]">
                    Your next card
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
                      <Badge tone={nextRaceWindow.tone}>{nextRaceWindow.badgeLabel}</Badge>
                    </div>
                    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Race window
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {nextRaceWindow.headline}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
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
                      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        {nextRaceWindow.timestampLabel}
                      </p>
                    </div>
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

              <Card className="border-[#d7d0c7] bg-white">
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

              <Card className="border-[#d7d0c7] bg-white">
                <CardHeader>
                  <CardTitle className="font-['Orbitron'] text-xl uppercase tracking-[0.14em]">
                    Top of the grid
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
