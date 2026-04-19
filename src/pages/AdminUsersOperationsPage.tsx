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
  const totals = useMemo(() => {
    return users.reduce(
      (acc, user) => {
        if (user.banned) acc.banned += 1;
        if (!user.emailVerified) acc.unverified += 1;
        if (user.role === "admin") acc.admins += 1;
        acc.sessions += user.counts.activeSessions;
        return acc;
      },
      { banned: 0, unverified: 0, admins: 0, sessions: 0 },
    );
  }, [users]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-4">
          <p className="ff-kicker">Identity Control</p>
          <h2 className="ff-display text-4xl text-on-surface md:text-5xl">User Management</h2>
          <p className="max-w-3xl text-sm leading-6 text-on-surface-variant md:text-base">
            Operational view of account status, verification, active sessions, and league footprint. Enforcement and impersonation remain on the user detail page.
          </p>
        </div>

        <div className="bg-surface-container-low px-5 py-4 text-sm text-on-surface-variant xl:max-w-sm">
          <p className="ff-kicker">Directory Scope</p>
          <p className="mt-2 leading-6">
            This list is optimized for scanning status and opening a detail view. Mutations stay on per-user control pages.
          </p>
        </div>
      </div>

      {usersQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((value) => (
            <div
              key={value}
              className="h-32 rounded-lg animate-pulse bg-surface-container-low"
            />
          ))}
        </div>
      ) : null}

      {usersQuery.isError ? (
        <div className="bg-error-container px-4 py-3 text-sm text-on-error-container">
          {getErrorMessage(usersQuery.error)}
        </div>
      ) : null}

      {!usersQuery.isLoading && !usersQuery.isError ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Total Users" value={users.length} subtitle="Accounts in directory" />
            <MetricCard title="Admins" value={totals.admins} subtitle="Admin-role accounts" />
            <MetricCard
              title="Unverified"
              value={totals.unverified}
              subtitle="Email verification pending"
              accent="warning"
            />
            <MetricCard
              title="Banned"
              value={totals.banned}
              subtitle="Accounts under enforcement"
              accent="danger"
            />
          </div>

          <Card className="bg-surface-container-low">
            <CardContent className="px-0 py-0">
              <div className="flex flex-col gap-3 px-6 py-5 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="ff-display text-3xl text-on-surface">User Directory</p>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    Account state, verification, active sessions, and league footprint across all users.
                  </p>
                </div>
                <span className="ff-kicker bg-surface-container-high px-3 py-2 text-on-surface-variant">
                  Active sessions {totals.sessions}
                </span>
              </div>

              <div className="px-6 pb-6 pt-4">
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
                              <Link
                                className="font-semibold text-on-surface hover:text-primary"
                                to={`/admin/users/${user.userId}`}
                              >
                                {user.displayName}
                              </Link>
                              <div className="font-mono text-[11px] text-on-surface-variant">
                                {user.userId}
                              </div>
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
                          <TableCell>
                            <div className="space-y-1">
                              <div>{user.counts.leagues}</div>
                              <div className="text-xs text-on-surface-variant">
                                Owns {user.counts.ownedLeagues}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(user.createdAt)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-on-surface-variant">
                          No users found.
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

function MetricCard(props: {
  title: string;
  value: number;
  subtitle: string;
  accent?: "neutral" | "warning" | "danger";
}) {
  const accentClass =
    props.accent === "danger"
      ? "text-primary"
      : props.accent === "warning"
        ? "text-warning"
        : "text-on-surface";

  return (
    <Card className="bg-surface-container-low">
      <CardContent className="space-y-2 px-6 py-6">
        <p className="ff-kicker">{props.title}</p>
        <p className={`text-5xl font-black ${accentClass}`}>{props.value}</p>
        <p className="text-sm leading-6 text-on-surface-variant">{props.subtitle}</p>
      </CardContent>
    </Card>
  );
}
