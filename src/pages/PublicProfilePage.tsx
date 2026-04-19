import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { authClient } from "../auth/authClient";
import { apiClient } from "../api/apiClient";
import { AppPageHeader } from "../components/layout/AppPageHeader";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";
import { initialsFromName } from "../lib/nameUtils";

type SharedLeague = {
  leagueId: string;
  leagueName: string;
  totalPoints: number;
};

type PublicProfileResponse = {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: string;
  sharedLeagues: SharedLeague[];
};

function formatMemberSince(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function PublicProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { data: session } = authClient.useSession();

  const profileQuery = useQuery({
    queryKey: ["public-profile", userId],
    enabled: Boolean(userId),
    queryFn: () => apiClient.get<PublicProfileResponse>(`/players/${userId}`)
  });

  const profile = profileQuery.data;
  const isOwnProfile = session?.user?.id === userId;

  const avatarNode = profile ? (
    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-surface-container-high">
      {profile.avatarUrl ? (
        <img src={profile.avatarUrl} alt={profile.displayName} className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-sm font-black text-on-surface-variant">
          {initialsFromName(profile.displayName)}
        </span>
      )}
    </div>
  ) : null;

  return (
    <section className="ff-page">
      <div className="ff-shell space-y-6">
        {profileQuery.isLoading ? (
          <Card>
            <CardContent className="space-y-4 py-6">
              <div className="skeleton-line h-8 w-48" />
              <div className="skeleton-line h-16 w-72" />
            </CardContent>
          </Card>
        ) : profileQuery.error ? (
          <Card className="bg-error-container">
            <CardContent className="py-4">
              <p className="text-on-error-container">Failed to load profile.</p>
            </CardContent>
          </Card>
        ) : profile ? (
          <>
            <AppPageHeader
              eyebrow="Driver Profile"
              title={profile.displayName}
              description={profile.createdAt ? `Member since ${formatMemberSince(profile.createdAt)}` : ""}
              meta={
                <div className="flex items-center gap-3">
                  {avatarNode}
                  {isOwnProfile ? <Badge tone="info">You</Badge> : null}
                </div>
              }
              utility={
                isOwnProfile ? (
                  <Button asChild variant="outline" size="sm">
                    <Link to="/profile">Edit Profile →</Link>
                  </Button>
                ) : undefined
              }
            />

            <Card className="ff-table-card ">
              <CardContent className="px-0 py-0">
                <div className="ff-panel-strip">
                  <div>
                    <p className="text-2xl font-semibold uppercase tracking-[0.04em] text-on-surface">
                      Shared Leagues
                    </p>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      Leagues in common.
                    </p>
                  </div>
                </div>

                {profile.sharedLeagues.length === 0 ? (
                  <div className="px-6 py-10 text-center text-sm text-on-surface-variant">
                    You don't share any leagues with this driver yet.
                  </div>
                ) : (
                  <div>
                    {profile.sharedLeagues.map((sharedLeague) => (
                      <Link
                        key={sharedLeague.leagueId}
                        to={`/league/${sharedLeague.leagueId}`}
                        className="ff-data-row hover:no-underline md:grid-cols-[minmax(0,1fr)_120px]"
                        data-interactive="true"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-lg font-semibold uppercase tracking-[0.04em] text-on-surface">
                            {sharedLeague.leagueName}
                          </p>
                        </div>
                        <div className="text-left md:text-right">
                          <p className="ff-kicker">Total Pts</p>
                          <p className="mt-1 text-2xl font-black text-on-surface">
                            {sharedLeague.totalPoints}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </section>
  );
}
