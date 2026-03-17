import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { authClient } from "@/auth/authClient";
import { ApiError, apiClient } from "@/api/apiClient";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { HeroBackdrop } from "@/components/HeroBackdrop";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

type InvitePreviewResponse = {
  inviteId?: string;
  token?: string;
  leagueId?: string;
  leagueName?: string;
  leagueVisibility?: "private" | "public";
  memberCount?: number;
  status?: "pending" | "accepted" | "revoked" | "expired";
  expiresAt?: string;
  createdAt?: string;
};

type JoinInviteResponse = {
  leagueId?: string;
  status?: "accepted";
  joined?: boolean;
};

function getInvitePreviewError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "invite_not_found") {
      return "This invite link is invalid.";
    }
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unable to load this invite link.";
}

function getJoinInviteError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "invite_not_found") {
      return "This invite link is invalid.";
    }
    if (error.code === "invite_expired") {
      return "This invite link has expired.";
    }
    if (error.code === "invite_not_pending") {
      return "This invite link is no longer available.";
    }
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unable to join league from this invite link.";
}

function formatDateLabel(value?: string): string {
  if (!value) return "Not set";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";

  return date.toLocaleString();
}

function getInviteBadgeTone(status: InvitePreviewResponse["status"]) {
  switch (status) {
    case "pending":
      return "border-emerald-300 bg-emerald-50 text-emerald-700";
    case "accepted":
      return "border-sky-300 bg-sky-50 text-sky-700";
    case "expired":
    case "revoked":
      return "border-red-300 bg-red-50 text-red-700";
    default:
      return "border-neutral-300 bg-neutral-50 text-neutral-700";
  }
}

function getInviteBadgeLabel(status: InvitePreviewResponse["status"]) {
  switch (status) {
    case "pending":
      return "Ready To Join";
    case "accepted":
      return "Invite Used";
    case "expired":
      return "Invite Expired";
    case "revoked":
      return "Invite Revoked";
    default:
      return "League Invite";
  }
}

function getInviteTitle(status: InvitePreviewResponse["status"]) {
  switch (status) {
    case "pending":
      return "Your Seat Is Waiting";
    case "accepted":
      return "Invite Already Used";
    case "expired":
      return "Invite Expired";
    case "revoked":
      return "Invite Revoked";
    default:
      return "League Invite";
  }
}

export function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session, isPending: sessionPending } = authClient.useSession();

  const [result, setResult] = useState<JoinInviteResponse | null>(null);
  const [joinErrorMessage, setJoinErrorMessage] = useState<string | null>(null);

  const invitePath = useMemo(
    () => `${location.pathname}${location.search}`,
    [location.pathname, location.search],
  );

  const invitePreviewQuery = useQuery({
    queryKey: ["invite-preview", token],
    enabled: Boolean(token),
    queryFn: async () => {
      return apiClient.get<InvitePreviewResponse>(
        `/invites/${encodeURIComponent(token ?? "")}`,
      );
    },
  });

  const joinInviteMutation = useMutation({
    mutationFn: async (inviteToken: string) => {
      return apiClient.post<JoinInviteResponse>(
        `/invites/${encodeURIComponent(inviteToken)}/join`,
      );
    },
    onSuccess: async (data) => {
      setResult(data);
      setJoinErrorMessage(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["leagues-page"] }),
        queryClient.invalidateQueries({ queryKey: ["home-my-leagues"] }),
        queryClient.invalidateQueries({ queryKey: ["invite-preview", token] }),
      ]);
    },
    onError: (err: unknown) => {
      setJoinErrorMessage(getJoinInviteError(err));
    },
  });

  const preview = invitePreviewQuery.data ?? null;
  const previewErrorMessage = invitePreviewQuery.error
    ? getInvitePreviewError(invitePreviewQuery.error)
    : null;

  const leagueId = result?.leagueId ?? preview?.leagueId;
  const leagueName = preview?.leagueName ?? "Private League";
  const memberCount = preview?.memberCount ?? 0;
  const inviteStatus = preview?.status;
  const isLoading = sessionPending || invitePreviewQuery.isLoading;
  const isJoining = joinInviteMutation.isPending;
  const joinedExisting = result?.joined === false;
  const isInviteJoinable = inviteStatus === "pending";

  const primaryButtonLabel = !session?.user
    ? "Sign In To Join"
    : isJoining
      ? "Joining League..."
      : isInviteJoinable
        ? "Join League"
        : "Open My Leagues";

  function handlePrimaryAction() {
    if (!token) {
      setJoinErrorMessage("Invite token is missing.");
      return;
    }

    if (!session?.user) {
      navigate(`/sign-in?redirect=${encodeURIComponent(invitePath)}`);
      return;
    }

    if (!isInviteJoinable) {
      navigate(leagueId ? `/league/${leagueId}` : "/leagues");
      return;
    }

    void joinInviteMutation.mutateAsync(token);
  }

  return (
    <section className="w-full">
      <section className="relative w-full overflow-hidden bg-linear-to-br from-neutral-950 via-neutral-900 to-black py-20 text-white">
        <HeroBackdrop />
        <div className="relative z-10 mx-auto max-w-7xl px-6">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <Badge
                variant="outline"
                className="rounded-full border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white"
              >
                League Invite
              </Badge>
              <div className="space-y-3">
                <h1 className="font-['Orbitron'] text-4xl font-black uppercase tracking-tight md:text-6xl">
                  Join The Grid
                </h1>
                <p className="max-w-2xl text-base text-slate-300 md:text-lg">
                  See the league first, then jump straight into the competition.
                  One good invite should get you from link to leaderboard with as
                  little friction as possible.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-3xl border border-white/15 bg-white/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                    Step 1
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    Check The League
                  </p>
                </div>
                <div className="rounded-3xl border border-white/15 bg-white/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                    Step 2
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    Join In One Click
                  </p>
                </div>
                <div className="rounded-3xl border border-white/15 bg-white/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                    Step 3
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    Lock Your Card
                  </p>
                </div>
              </div>
            </div>

            <Card className="border-white/10 bg-white/95 text-black shadow-2xl">
              <CardHeader className="space-y-3">
                <Badge
                  variant="outline"
                  className={`w-fit rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] ${
                    isLoading
                      ? "border-sky-300 bg-sky-50 text-sky-700"
                      : previewErrorMessage || joinErrorMessage
                        ? "border-red-300 bg-red-50 text-red-700"
                        : result
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                          : getInviteBadgeTone(inviteStatus)
                  }`}
                >
                  {isLoading
                    ? "Loading Invite"
                    : previewErrorMessage || joinErrorMessage
                      ? "Invite Failed"
                      : result
                        ? "Grid Access Confirmed"
                        : getInviteBadgeLabel(inviteStatus)}
                </Badge>
                <CardTitle className="font-['Orbitron'] text-3xl font-black uppercase tracking-tight">
                  {isLoading
                    ? "Reading Invite"
                    : previewErrorMessage || joinErrorMessage
                      ? "Invite Unavailable"
                      : result
                        ? joinedExisting
                          ? "Already On The Grid"
                          : "Seat Secured"
                        : getInviteTitle(inviteStatus)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {isLoading ? (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Syncing invite details
                    </p>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full w-2/3 animate-pulse rounded-full bg-red-600" />
                    </div>
                    <p className="text-slate-600">
                      Pulling the league details and invite status.
                    </p>
                  </div>
                ) : null}

                {previewErrorMessage || joinErrorMessage ? (
                  <>
                    <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {previewErrorMessage ?? joinErrorMessage}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Button asChild className="bg-black text-white hover:bg-neutral-800">
                        <Link to="/">Back to Home</Link>
                      </Button>
                    </div>
                  </>
                ) : null}

                {!isLoading && !previewErrorMessage && preview ? (
                  <>
                    <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        League
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-black">
                        {leagueName}
                      </p>
                      <p className="mt-2 text-sm text-slate-600">
                        {(preview.leagueVisibility ?? "private").toUpperCase()} league • {memberCount} manager{memberCount === 1 ? "" : "s"}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-3xl border border-neutral-200 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Invite Status
                        </p>
                        <p className="mt-2 text-base font-semibold text-black">
                          {inviteStatus === "pending"
                            ? "Ready to join now"
                            : inviteStatus === "accepted"
                              ? "Invite has already been used"
                              : inviteStatus === "expired"
                                ? "Invite window has closed"
                                : "Invite is no longer active"}
                        </p>
                      </div>
                      <div className="rounded-3xl border border-neutral-200 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Expires
                        </p>
                        <p className="mt-2 text-base font-semibold text-black">
                          {formatDateLabel(preview.expiresAt)}
                        </p>
                      </div>
                    </div>

                    {result ? (
                      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                          Status
                        </p>
                        <p className="mt-2 text-lg font-semibold text-black">
                          {joinedExisting
                            ? "You were already in this league."
                            : "You are now in the league."}
                        </p>
                        <p className="mt-2 text-sm text-slate-600">
                          Head to the league page to check the next race, lock a
                          card, and track the leaderboard.
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-3xl border border-neutral-200 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          What happens next
                        </p>
                        <p className="mt-2 text-base font-semibold text-black">
                          Join the league, open the hub, then submit your race
                          card before predictions lock.
                        </p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3">
                      <Button
                        type="button"
                        className="bg-red-600 text-white hover:bg-red-700"
                        disabled={isJoining}
                        onClick={handlePrimaryAction}
                      >
                        {primaryButtonLabel}
                      </Button>
                      {leagueId ? (
                        <Button asChild variant="secondary">
                          <Link to={`/league/${leagueId}`}>Open League</Link>
                        </Button>
                      ) : (
                        <Button asChild variant="secondary">
                          <Link to="/leagues">View My Leagues</Link>
                        </Button>
                      )}
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="relative w-full pb-12 pt-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, rgba(0,0,0,0.015) 0px, rgba(0,0,0,0.015) 1px, rgba(0,0,0,0) 9px, rgba(0,0,0,0) 14px)",
            opacity: 0.02,
          }}
        />
        <div className="relative z-10 mx-auto max-w-7xl px-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="rounded-4xl">
              <CardContent className="space-y-2 py-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Fast Join
                </p>
                <p className="text-sm text-slate-600">
                  One clean invite link now shows the league first so people know
                  exactly what they are joining.
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-4xl">
              <CardContent className="space-y-2 py-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Single Card
                </p>
                <p className="text-sm text-slate-600">
                  One card per race. Save early, edit until lock, then let the
                  scoring engine take over.
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-4xl">
              <CardContent className="space-y-2 py-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Beat Your League
                </p>
                <p className="text-sm text-slate-600">
                  Score points from live race outcomes and climb the standings
                  against your group every weekend.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </section>
  );
}
