import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { authClient } from "@/auth/authClient";
import { ApiError, apiClient } from "@/api/apiClient";
import { Button } from "@/components/ui/Button";
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

  return (
    <section className="relative w-full pb-12 pt-20">
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
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>League Invite</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isPending || joinInviteMutation.isPending ? (
              <p className="text-slate-600">Joining league...</p>
            ) : null}

            {errorMessage ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorMessage}
              </p>
            ) : null}

            {result && leagueId ? (
              <>
                <p className="text-slate-700">
                  {result.joined === false
                    ? "You are already a member of this league."
                    : "You have joined the league successfully."}
                </p>
                <Button asChild>
                  <Link to={`/league/${leagueId}`}>Go to League</Link>
                </Button>
              </>
            ) : null}

            {errorMessage ? (
              <Button asChild variant="secondary">
                <Link to="/">Back to Home</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
