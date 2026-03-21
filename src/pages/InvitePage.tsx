import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { authClient } from "@/auth/authClient";
import { ApiError, apiClient } from "@/api/apiClient";
import { Button } from "@/components/ui/Button";
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
      return "success";
    case "accepted":
      return "neutral";
    case "expired":
    case "revoked":
      return "danger";
    default:
      return "neutral";
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
    <section className="px-6 py-14 md:py-20">
      <div className="mx-auto max-w-7xl space-y-10">
        <div className="space-y-4 text-center">
          <p className="ff-kicker">Incoming Transmission</p>
          <h1 className="ff-display mx-auto max-w-4xl text-5xl text-white md:text-7xl">
            Enter The Paddock
          </h1>
          <p className="mx-auto max-w-3xl text-base leading-8 text-[#b8bac2] md:text-2xl md:leading-10">
            You&apos;ve been drafted to compete in a high-velocity fantasy championship.
            Secure your seat on the grid before the next qualifying session begins.
          </p>
        </div>

        <div className="mx-auto max-w-5xl">
          <Card className="border-white/8 bg-[#15161b]">
            <CardHeader className="space-y-3 pb-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="ff-kicker bg-white/6 px-3 py-2 text-[#d0d3d9]">
                  Private League Invite
                </span>
                <span
                  className={`ff-kicker px-3 py-2 ${
                    isLoading
                      ? "bg-white/6 text-[#d0d3d9]"
                      : previewErrorMessage || joinErrorMessage
                        ? "bg-[#350909] text-[#ff8e8e]"
                        : result
                          ? "bg-[#102317] text-[#6ee7a8]"
                          : getInviteBadgeTone(inviteStatus) === "success"
                            ? "bg-[#102317] text-[#6ee7a8]"
                            : getInviteBadgeTone(inviteStatus) === "danger"
                              ? "bg-[#350909] text-[#ff8e8e]"
                              : "bg-white/6 text-[#d0d3d9]"
                  }`}
                >
                  {isLoading
                    ? "Loading Invite"
                    : previewErrorMessage || joinErrorMessage
                      ? "Invite Failed"
                      : result
                        ? "Grid Access Confirmed"
                        : getInviteBadgeLabel(inviteStatus)}
                </span>
              </div>
              <CardTitle className="text-4xl md:text-5xl">
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
            <CardContent className="space-y-6">
              {isLoading ? (
                <div className="space-y-3">
                  <p className="ff-kicker">Syncing Invite Details</p>
                  <div className="h-2 overflow-hidden bg-white/8">
                    <div className="h-full w-2/3 animate-pulse bg-[#cc0000]" />
                  </div>
                  <p className="text-[#989aa2]">
                    Pulling the league details and invite status.
                  </p>
                </div>
              ) : null}

              {previewErrorMessage || joinErrorMessage ? (
                <>
                  <p className="border border-[#7a0d0d] bg-[#350909] px-4 py-3 text-sm text-[#ff8e8e]">
                    {previewErrorMessage ?? joinErrorMessage}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button asChild>
                      <Link to="/">Back To Home</Link>
                    </Button>
                  </div>
                </>
              ) : null}

              {!isLoading && !previewErrorMessage && preview ? (
                <>
                  <div className="grid gap-4 md:grid-cols-[minmax(0,1.45fr)_200px_200px]">
                    <div className="border-l-2 border-[#cc0000] bg-white/3 p-5">
                      <p className="ff-kicker">League</p>
                      <p className="ff-display mt-3 text-3xl text-white">
                        {leagueName}
                      </p>
                      <p className="mt-3 text-sm text-[#989aa2]">
                        {(preview.leagueVisibility ?? "private").toUpperCase()} league
                      </p>
                    </div>
                    <div className="border-l-2 border-white/10 bg-white/3 p-5">
                      <p className="ff-kicker">Members</p>
                      <p className="mt-3 text-4xl font-black text-white">
                        {memberCount}
                      </p>
                      <p className="text-sm text-[#7f828b]">
                        manager{memberCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="border-l-2 border-[#e9c400] bg-white/3 p-5">
                      <p className="ff-kicker">Invite Expiry</p>
                      <p className="mt-3 text-2xl font-black text-white">
                        {formatDateLabel(preview.expiresAt)}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="border border-white/6 bg-white/2 p-5">
                      <p className="ff-kicker">Invite Status</p>
                      <p className="mt-3 text-lg font-semibold text-white">
                        {inviteStatus === "pending"
                          ? "Ready to join now"
                          : inviteStatus === "accepted"
                            ? "Invite has already been used"
                            : inviteStatus === "expired"
                              ? "Invite window has closed"
                              : "Invite is no longer active"}
                      </p>
                    </div>
                    <div className="border border-white/6 bg-white/2 p-5">
                      <p className="ff-kicker">What Happens Next</p>
                      <p className="mt-3 text-lg font-semibold text-white">
                        Join the league, open the hub, then submit your race card
                        before predictions lock.
                      </p>
                    </div>
                  </div>

                  {result ? (
                    <div className="border border-[#205038] bg-[#102317] p-5">
                      <p className="ff-kicker text-[#6ee7a8]">Status</p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        {joinedExisting
                          ? "You were already in this league."
                          : "You are now in the league."}
                      </p>
                      <p className="mt-2 text-sm text-[#a7cbb5]">
                        Head to the league page to check the next race, lock a
                        card, and track the leaderboard.
                      </p>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      size="lg"
                      disabled={isJoining}
                      onClick={handlePrimaryAction}
                    >
                      {primaryButtonLabel}
                    </Button>
                    {leagueId ? (
                      <Button asChild variant="outline" size="lg">
                        <Link to={`/league/${leagueId}`}>Open League</Link>
                      </Button>
                    ) : (
                      <Button asChild variant="outline" size="lg">
                        <Link to="/leagues">View My Leagues</Link>
                      </Button>
                    )}
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-white/8 bg-[#15161b]">
            <CardContent className="space-y-2 py-6">
              <p className="ff-kicker">Secure Entry</p>
              <p className="text-sm leading-6 text-[#989aa2]">
                One clean invite link now shows the league first so people know
                exactly what they are joining.
              </p>
            </CardContent>
          </Card>
          <Card className="border-white/8 bg-[#15161b]">
            <CardContent className="space-y-2 py-6">
              <p className="ff-kicker">Real-Time Telemetry</p>
              <p className="text-sm leading-6 text-[#989aa2]">
                One card per race. Save early, edit until lock, then let the
                scoring engine take over.
              </p>
            </CardContent>
          </Card>
          <Card className="border-white/8 bg-[#15161b]">
            <CardContent className="space-y-2 py-6">
              <p className="ff-kicker">Verified Drivers</p>
              <p className="text-sm leading-6 text-[#989aa2]">
                Score points from live race outcomes and climb the standings
                against your group every weekend.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
