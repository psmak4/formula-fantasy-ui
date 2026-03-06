import { useMemo, useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Table } from "../components/ui/Table";

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
  displayName: string;
  points: number;
  rankChange?: number;
  movement?: number;
  delta?: number;
};

type ApiLeaderboardRow = {
  rank?: number;
  user?: {
    displayName?: string;
  };
  displayName?: string;
  pointsTotal?: number;
  points?: number;
  rankChange?: number;
  movement?: number;
  delta?: number;
};

type LeaderboardResponse = {
  scoring?: { available?: boolean };
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
  };
  window?: {
    isLocked?: boolean;
  };
  lockedAt?: string;
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

function formatApiError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.code) return `${err.message} (${err.code})`;
    return err.message;
  }
  return err instanceof Error ? err.message : fallback;
}

function resolveInviteLink(data: InviteResponse): string | null {
  const link = data.inviteUrl ?? data.inviteLink ?? data.url ?? data.link;
  if (link) return link;

  const token = data.token;
  if (!token || typeof window === "undefined") return null;
  return `${window.location.origin}/invite/${token}`;
}

function rankDelta(entry: LeaderboardEntry): number | null {
  const value = entry.rankChange ?? entry.movement ?? entry.delta;
  return typeof value === "number" ? value : null;
}

function normalizeLeaderboardRows(
  data: LeaderboardResponse | null,
): LeaderboardEntry[] {
  if (!data) return [];
  return (data.rows ?? []).map((row, index) => ({
    rank: typeof row.rank === "number" ? row.rank : index + 1,
    displayName: row.user?.displayName ?? row.displayName ?? "Unknown manager",
    points: row.pointsTotal ?? row.points ?? 0,
    rankChange: row.rankChange,
    movement: row.movement,
    delta: row.delta,
  }));
}

export function LeaguePage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const queryClient = useQueryClient();

  const [joinState, setJoinState] = useState<
    "idle" | "joining" | "joined" | string
  >("idle");
  const [inviteLink, setInviteLink] = useState("");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

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
            .get<LeaderboardResponse>(
              `/leagues/${leagueId}/races/next/leaderboard`,
            )
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
        Boolean(entryData.lockedAt) ||
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
        entryLocked,
        entrySubmitted,
      };
    },
  });

  const currentUserId = data?.currentUserId ?? null;
  const leagueName = data?.leagueName ?? "League";
  const members = data?.members ?? [];
  const leaderboard = data?.leaderboard ?? null;
  const entrySubmitted = data?.entrySubmitted ?? false;
  const entryLocked = data?.entryLocked ?? false;

  const leaderboardRows = useMemo(
    () => normalizeLeaderboardRows(leaderboard).slice(0, 10),
    [leaderboard],
  );
  const topScorer = leaderboardRows[0];
  const scoringAvailable = leaderboard?.scoring?.available !== false;

  const isMember = useMemo(() => {
    if (!currentUserId) return false;
    return members.some(
      (m) => m.userId === currentUserId || m.id === currentUserId,
    );
  }, [members, currentUserId]);

  const joinLeagueMutation = useMutation({
    mutationFn: async () => {
      if (!leagueId) {
        throw new Error("Missing league ID");
      }
      await apiClient.post(`/leagues/${leagueId}/join`);
    },
    onMutate: () => setJoinState("joining"),
    onSuccess: async () => {
      setJoinState("joined");
      await queryClient.invalidateQueries({
        queryKey: ["league-page", leagueId],
      });
      await queryClient.invalidateQueries({ queryKey: ["leagues-page"] });
    },
    onError: (err: unknown) => {
      setJoinState(formatApiError(err, "Failed to join league"));
    },
  });

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
      setIsInviteModalOpen(true);
    },
  });

  function handleJoinLeague() {
    void joinLeagueMutation.mutateAsync();
  }

  function handleCreateInvite() {
    void createInviteMutation.mutateAsync();
  }

  async function handleCopyInvite() {
    if (!inviteLink) return;

    await navigator.clipboard.writeText(inviteLink);
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
        {/* Header */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-['Orbitron'] text-3xl font-bold uppercase tracking-tight text-black">
              {leagueName}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {!isMember && (
                <Button
                  onClick={handleJoinLeague}
                  disabled={
                    joinState === "joining" || joinLeagueMutation.isPending
                  }
                  className="w-full sm:w-auto"
                >
                  {joinState === "joining" || joinLeagueMutation.isPending
                    ? "Joining..."
                    : "Join League"}
                </Button>
              )}
              {isMember && (
                <Button
                  variant="default"
                  onClick={handleCreateInvite}
                  className="w-full sm:w-auto"
                >
                  Share
                </Button>
              )}
            </div>
          </div>
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
          <div className="grid gap-6 md:grid-cols-3">
            {/* Leaderboard */}
            <Card className="md:col-span-3">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Leaderboard</CardTitle>
                  {leaderboard?.scoring?.available === false && (
                    <Badge tone="warning">Scoring pending</Badge>
                  )}
                  {scoringAvailable && topScorer && (
                    <Badge tone="success">Top: {topScorer.displayName}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Table ariaLabel="League leaderboard top 10">
                  <thead>
                    <tr>
                      <th className="w-16">Rank</th>
                      <th>Manager</th>
                      <th className="text-right">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboardRows.map((entry) => (
                      <tr key={`${entry.rank}-${entry.displayName}`}>
                        <td>
                          <span className="rank-cell">
                            <span>{entry.rank}</span>
                            {rankDelta(entry) !== null && (
                              <span
                                className={`rank-delta ${
                                  (rankDelta(entry) as number) > 0
                                    ? "up"
                                    : (rankDelta(entry) as number) < 0
                                      ? "down"
                                      : "flat"
                                }`}
                              >
                                {(rankDelta(entry) as number) > 0
                                  ? `+${rankDelta(entry)}`
                                  : `${rankDelta(entry)}`}
                              </span>
                            )}
                          </span>
                        </td>
                        <td>{entry.displayName}</td>
                        <td className="text-right font-semibold">
                          {entry.points}
                        </td>
                      </tr>
                    ))}
                    {leaderboardRows.length === 0 && (
                      <tr>
                        <td
                          colSpan={3}
                          className="text-center text-slate-500 py-4"
                        >
                          No leaderboard data yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </CardContent>
            </Card>

            {/* Your Entry */}
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle>Your Entry</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    {entrySubmitted ? (
                      <Badge tone="success">Submitted</Badge>
                    ) : (
                      <Badge tone="warning">Not submitted</Badge>
                    )}
                    {entryLocked ? (
                      <Badge tone="danger">Locked</Badge>
                    ) : (
                      <Badge tone="info">Open</Badge>
                    )}
                  </div>
                  <p className="text-slate-600">
                    {entrySubmitted
                      ? "Your prediction is in for the next race."
                      : "You haven't submitted—make your picks"}
                  </p>
                  <Button asChild variant="secondary">
                    <Link to={`/league/${leagueId}/predict`}>
                      {entryLocked ? "View Entry" : "Edit Entry"}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>

      <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Link</DialogTitle>
            <DialogDescription>
              Share this URL to let someone join your league.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 flex gap-2">
            <Input
              value={inviteLink}
              readOnly
              aria-label="Invite link"
              className="text-sm"
            />
            <Button onClick={handleCopyInvite}>Copy</Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
