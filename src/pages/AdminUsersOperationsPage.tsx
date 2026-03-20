import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiClient, ApiError } from "@/api/apiClient";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";

type UsersResponse = {
  users: Array<{
    userId: string;
    displayName: string;
    email: string;
    emailVerified: boolean;
    avatarUrl: string | null;
    role: string;
    banned: boolean;
    banReason: string | null;
    banExpires: string | null;
    createdAt: string;
    updatedAt: string;
    counts: {
      activeSessions: number;
      leagues: number;
      ownedLeagues: number;
    };
  }>;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Unable to load users.";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function AdminUsersOperationsPage() {
  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => apiClient.get<UsersResponse>("/admin/users"),
  });

  const users = usersQuery.data?.users ?? [];

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="font-['Orbitron'] text-3xl font-bold uppercase tracking-tight text-black">
          User Management
        </h2>
        <p className="max-w-3xl text-slate-600">
          Operational view of user accounts, verification state, active sessions, league footprint, and enforcement status. Ban and impersonation actions are handled from the user detail page.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Directory</CardTitle>
        </CardHeader>
        <CardContent>
          {usersQuery.isLoading ? <p className="text-slate-600">Loading users...</p> : null}
          {usersQuery.isError ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {getErrorMessage(usersQuery.error)}
            </p>
          ) : null}
          {!usersQuery.isLoading && !usersQuery.isError ? (
            <Table ariaLabel="User directory">
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead>Sessions</TableHead>
                  <TableHead>Leagues</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length > 0 ? (
                  users.map((user) => (
                    <TableRow key={user.userId}>
                      <TableCell>
                        <div className="space-y-1">
                          <Link className="font-medium text-red-700 hover:text-red-800" to={`/admin/users/${user.userId}`}>
                            {user.displayName}
                          </Link>
                          <div className="font-mono text-[11px] text-slate-500">{user.userId}</div>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Badge tone={user.banned ? "danger" : "neutral"}>
                            {user.banned ? "banned" : "active"}
                          </Badge>
                          <Badge tone={user.role === "admin" ? "warning" : "neutral"}>
                            {user.role}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge tone={user.emailVerified ? "success" : "warning"}>
                          {user.emailVerified ? "verified" : "unverified"}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.counts.activeSessions}</TableCell>
                      <TableCell>{user.counts.leagues}</TableCell>
                      <TableCell>{formatDate(user.createdAt)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-slate-600">
                      No users found.
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
