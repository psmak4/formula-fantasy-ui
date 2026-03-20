import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiClient, ApiError } from "@/api/apiClient";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";

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

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="font-['Orbitron'] text-3xl font-bold uppercase tracking-tight text-black">
          League Administration
        </h2>
        <p className="max-w-3xl text-slate-600">
          Monitor leagues, inspect member and invite state, and perform audited operational changes when ownership or membership needs correction.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>League Directory</CardTitle>
        </CardHeader>
        <CardContent>
          {leaguesQuery.isLoading ? <p className="text-slate-600">Loading leagues...</p> : null}
          {leaguesQuery.isError ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {getErrorMessage(leaguesQuery.error)}
            </p>
          ) : null}
          {!leaguesQuery.isLoading && !leaguesQuery.isError ? (
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
                          <Link className="font-medium text-red-700 hover:text-red-800" to={`/admin/leagues/${league.leagueId}`}>
                            {league.name}
                          </Link>
                          <div className="font-mono text-[11px] text-slate-500">{league.leagueId}</div>
                        </div>
                      </TableCell>
                      <TableCell>{league.owner.displayName}</TableCell>
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
                    <TableCell colSpan={7} className="text-slate-600">
                      No leagues found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
