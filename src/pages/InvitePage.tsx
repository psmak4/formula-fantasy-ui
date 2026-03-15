import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { authClient } from "@/auth/authClient";
import { ApiError, apiClient } from "@/api/apiClient";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { HeroBackdrop } from "@/components/HeroBackdrop";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

type JoinInviteResponse = {
  leagueId?: string;
  status?: "accepted";
  joined?: boolean;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "invite_not_found") {
      return "This invite link is invalid.";
    }
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unable to join league from this invite link.";
}

export function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session, isPending } = authClient.useSession();

  const [result, setResult] = useState<JoinInviteResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const invitePath = useMemo(
    () => `${location.pathname}${location.search}`,
    [location.pathname, location.search],
  );

  const joinInviteMutation = useMutation({
    mutationFn: async (inviteToken: string) => {
      return apiClient.post<JoinInviteResponse>(
        `/invites/${encodeURIComponent(inviteToken)}/join`,
      );
    },
    onSuccess: async (data) => {
      setResult(data);
      setErrorMessage(null);
      await queryClient.invalidateQueries({ queryKey: ["leagues-page"] });
    },
    onError: (err: unknown) => {
      setErrorMessage(getErrorMessage(err));
    },
  });

  useEffect(() => {
    if (isPending) {
      return;
    }

    if (!session?.user) {
      navigate(`/sign-in?redirect=${encodeURIComponent(invitePath)}`, {
        replace: true,
      });
      return;
    }

    if (!token) {
      setErrorMessage("Invite token is missing.");
      return;
    }

    if (joinInviteMutation.isPending || result || errorMessage) {
      return;
    }

    void joinInviteMutation.mutateAsync(token);
  }, [
    errorMessage,
    invitePath,
    isPending,
    joinInviteMutation,
    navigate,
    result,
    session,
    token,
  ]);

  const leagueId = result?.leagueId;
  const isJoining = isPending || joinInviteMutation.isPending;
  const joinedExisting = result?.joined === false;

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
                  This invite drops you straight into a private league. Once you
                  are in, the next job is simple: lock your card before the race
                  goes live.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-3xl border border-white/15 bg-white/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                    Step 1
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    Join League
                  </p>
                </div>
                <div className="rounded-3xl border border-white/15 bg-white/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                    Step 2
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    Build Your Card
                  </p>
                </div>
                <div className="rounded-3xl border border-white/15 bg-white/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                    Step 3
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    Beat Your League
                  </p>
                </div>
              </div>
            </div>

            <Card className="border-white/10 bg-white/95 text-black shadow-2xl">
              <CardHeader className="space-y-3">
                <Badge
                  variant="outline"
                  className={`w-fit rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] ${
                    isJoining
                      ? "border-sky-300 bg-sky-50 text-sky-700"
                      : errorMessage
                        ? "border-red-300 bg-red-50 text-red-700"
                        : result
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                          : "border-neutral-300 bg-neutral-50 text-neutral-700"
                  }`}
                >
                  {isJoining
                    ? "Processing"
                    : errorMessage
                      ? "Invite Failed"
                      : result
                        ? "Grid Access Confirmed"
                        : "Stand By"}
                </Badge>
                <CardTitle className="font-['Orbitron'] text-3xl font-black uppercase tracking-tight">
                  {isJoining
                    ? "Joining League"
                    : errorMessage
                      ? "Invite Unavailable"
                      : joinedExisting
                        ? "Already On The Grid"
                        : result
                          ? "Seat Secured"
                          : "League Invite"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {isJoining ? (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Syncing account and league access
                    </p>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full w-2/3 animate-pulse rounded-full bg-red-600" />
                    </div>
                    <p className="text-slate-600">
                      Finalizing your place in the league.
                    </p>
                  </div>
                ) : null}

                {errorMessage ? (
                  <>
                    <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {errorMessage}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Button asChild className="bg-black text-white hover:bg-neutral-800">
                        <Link to="/">Back to Home</Link>
                      </Button>
                    </div>
                  </>
                ) : null}

                {result && leagueId ? (
                  <>
                    <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
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

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-3xl border border-neutral-200 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Next Move
                        </p>
                        <p className="mt-2 text-base font-semibold text-black">
                          Open the league hub
                        </p>
                      </div>
                      <div className="rounded-3xl border border-neutral-200 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Goal
                        </p>
                        <p className="mt-2 text-base font-semibold text-black">
                          Submit your prediction card before lock
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button asChild className="bg-red-600 text-white hover:bg-red-700">
                        <Link to={`/league/${leagueId}`}>Open League</Link>
                      </Button>
                      <Button asChild variant="secondary">
                        <Link to="/leagues">View My Leagues</Link>
                      </Button>
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
                  Private Leagues
                </p>
                <p className="text-sm text-slate-600">
                  Every league is invite-only for MVP, which keeps groups small
                  and competitive.
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
                  Race Result
                </p>
                <p className="text-sm text-slate-600">
                  Leaderboards update from the race data once the weekend can be
                  finalized.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </section>
  );
}
