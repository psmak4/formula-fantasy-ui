import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiClient, ApiError } from "@/api/apiClient";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";

type LeagueDirectoryResponse = {
  leagues: Array<{
    leagueId: string;
    name: string;
    visibility: "public" | "private";
    gameMode: string;
    owner: {
      userId: string;
      displayName: string;
    };
    createdAt: string;
    counts: {
      members: number;
      pendingInvites: number;
      entries: number;
    };
  }>;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Unable to load leagues.";
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function AdminLeagueOperationsPage() {
  const leaguesQuery = useQuery({
    queryKey: ["admin-leagues"],
    queryFn: () => apiClient.get<LeagueDirectoryResponse>("/admin/leagues"),
  });

  const leagues = leaguesQuery.data?.leagues ?? [];
  const totals = useMemo(() => {
    return leagues.reduce(
      (acc, league) => {
        acc.members += league.counts.members;
        acc.invites += league.counts.pendingInvites;
        acc.entries += league.counts.entries;
        if (league.visibility === "public") {
          acc.publicCount += 1;
        } else {
          acc.privateCount += 1;
        }
        return acc;
      },
      { members: 0, invites: 0, entries: 0, publicCount: 0, privateCount: 0 },
    );
  }, [leagues]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-4">
          <p className="ff-kicker">League Control</p>
          <h2 className="ff-display text-4xl text-on-surface md:text-5xl">
            League Administration
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-on-surface-variant md:text-base">
            Monitor leagues, inspect owner and invite state, and open detailed operational pages when membership or ownership needs correction.
          </p>
        </div>

        <div className="bg-surface-container-low px-5 py-4 text-sm text-on-surface-variant xl:max-w-sm">
          <p className="ff-kicker">Directory Scope</p>
          <p className="mt-2 leading-6">
            This index is table-first by design. Detail pages remain the place for audited mutations and ownership changes.
          </p>
        </div>
      </div>

      {leaguesQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((value) => (
            <div
              key={value}
              className="h-32 rounded-lg animate-pulse bg-surface-container-low"
            />
          ))}
        </div>
      ) : null}

      {leaguesQuery.isError ? (
        <div className="bg-error-container px-4 py-3 text-sm text-on-error-container">
          {getErrorMessage(leaguesQuery.error)}
        </div>
      ) : null}

      {!leaguesQuery.isLoading && !leaguesQuery.isError ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Total Leagues" value={leagues.length} subtitle="Tracked leagues" />
            <MetricCard
              title="Public / Private"
              value={`${totals.publicCount}/${totals.privateCount}`}
              subtitle="Visibility split"
            />
            <MetricCard
              title="Pending Invites"
              value={totals.invites}
              subtitle="Outstanding invite count"
            />
            <MetricCard
              title="Member Seats"
              value={totals.members}
              subtitle="Combined memberships"
            />
          </div>

          <Card className="bg-surface-container-low">
            <CardContent className="px-0 py-0">
              <div className="flex flex-col gap-3 px-6 py-5 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="ff-display text-3xl text-on-surface">League Directory</p>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    Ownership, visibility, membership, and invite footprint across all leagues.
                  </p>
                </div>
                <span className="ff-kicker bg-surface-container-high px-3 py-2 text-on-surface-variant">
                  Total entries {totals.entries}
                </span>
              </div>

              <div className="px-6 pb-6 pt-4">
                <Table ariaLabel="League directory">
                  <TableHeader>
                    <TableRow>
                      <TableHead>League</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Visibility</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead>Invites</TableHead>
                      <TableHead>Entries</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leagues.length > 0 ? (
                      leagues.map((league) => (
                        <TableRow key={league.leagueId}>
                          <TableCell>
                            <div className="space-y-1">
                              <Link
                                className="font-semibold text-on-surface hover:text-primary"
                                to={`/admin/leagues/${league.leagueId}`}
                              >
                                {league.name}
                              </Link>
                              <div className="font-mono text-[11px] text-on-surface-variant">
                                {league.leagueId}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-on-surface">{league.owner.displayName}</div>
                              <div className="font-mono text-[11px] text-on-surface-variant">
                                {league.owner.userId}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge tone={league.visibility === "public" ? "info" : "warning"}>
                              {league.visibility}
                            </Badge>
                          </TableCell>
                          <TableCell>{league.counts.members}</TableCell>
                          <TableCell>{league.counts.pendingInvites}</TableCell>
                          <TableCell>{league.counts.entries}</TableCell>
                          <TableCell>{formatDateTime(league.createdAt)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-on-surface-variant">
                          No leagues found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function MetricCard(props: { title: string; value: number | string; subtitle: string }) {
  return (
    <Card className="bg-surface-container-low">
      <CardContent className="space-y-2 px-6 py-6">
        <p className="ff-kicker">{props.title}</p>
        <p className="text-5xl font-black text-on-surface">{props.value}</p>
        <p className="text-sm leading-6 text-on-surface-variant">{props.subtitle}</p>
      </CardContent>
    </Card>
  );
}
