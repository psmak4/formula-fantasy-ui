import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { apiClient, ApiError } from "@/api/apiClient";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";

type UserDetailResponse = {
  user: {
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
  };
  sessions: Array<{
    sessionId: string;
    expiresAt: string;
    createdAt: string;
    updatedAt: string;
    ipAddress: string | null;
    userAgent: string | null;
  }>;
  accounts: Array<{
    accountId: string;
    providerId: string;
    providerAccountId: string;
    createdAt: string;
    updatedAt: string;
  }>;
  leagues: Array<{
    leagueId: string;
    leagueName: string;
    role: string;
    visibility: "public" | "private";
    isOwner: boolean;
    joinedAt: string;
  }>;
  auditLog: Array<{
    id: string;
    action: string;
    summary: string;
    payload: unknown;
    createdAt: string;
    actorUserId: string;
    actorDisplayName: string;
  }>;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Unable to load user detail.";
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function AdminUserOperationsDetailPage() {
  const params = useParams<{ userId: string }>();
  const userId = params.userId ?? "";
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ["admin-user-detail", userId],
    enabled: Boolean(userId),
    queryFn: () => apiClient.get<UserDetailResponse>(`/admin/users/${userId}`),
  });

  const detail = detailQuery.data;
  const [profileForm, setProfileForm] = useState({ displayName: "", avatarUrl: "", reason: "" });
  const [emailVerification, setEmailVerification] = useState<"verified" | "unverified">("unverified");
  const [emailReason, setEmailReason] = useState("");
  const [banReason, setBanReason] = useState("");
  const [banExpiresInDays, setBanExpiresInDays] = useState("");
  const [enforcementReason, setEnforcementReason] = useState("");

  useEffect(() => {
    if (!detail) return;
    setProfileForm({
      displayName: detail.user.displayName,
      avatarUrl: detail.user.avatarUrl ?? "",
      reason: "",
    });
    setEmailVerification(detail.user.emailVerified ? "verified" : "unverified");
  }, [detail]);

  const updateProfileMutation = useMutation({
    mutationFn: async () =>
      apiClient.put(`/admin/users/${userId}/profile`, {
        displayName: profileForm.displayName,
        avatarUrl: profileForm.avatarUrl.trim().length > 0 ? profileForm.avatarUrl.trim() : null,
        reason: profileForm.reason.trim(),
      }),
    onSuccess: async () => {
      setProfileForm((current) => ({ ...current, reason: "" }));
      await queryClient.invalidateQueries({ queryKey: ["admin-user-detail", userId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const updateEmailVerificationMutation = useMutation({
    mutationFn: async () =>
      apiClient.post(`/admin/users/${userId}/email-verification`, {
        emailVerified: emailVerification === "verified",
        reason: emailReason.trim(),
      }),
    onSuccess: async () => {
      setEmailReason("");
      await queryClient.invalidateQueries({ queryKey: ["admin-user-detail", userId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const banUserMutation = useMutation({
    mutationFn: async () =>
      apiClient.post(`/admin/users/${userId}/ban`, {
        reason: banReason.trim(),
        banExpiresInSeconds:
          banExpiresInDays.trim().length > 0
            ? Number.parseInt(banExpiresInDays, 10) * 24 * 60 * 60
            : undefined,
      }),
    onSuccess: async () => {
      setBanReason("");
      setBanExpiresInDays("");
      await queryClient.invalidateQueries({ queryKey: ["admin-user-detail", userId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const unbanUserMutation = useMutation({
    mutationFn: async () =>
      apiClient.post(`/admin/users/${userId}/unban`, {
        reason: enforcementReason.trim(),
      }),
    onSuccess: async () => {
      setEnforcementReason("");
      await queryClient.invalidateQueries({ queryKey: ["admin-user-detail", userId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const impersonateUserMutation = useMutation({
    mutationFn: async () => {
      return await apiClient.post(`/admin/users/${userId}/impersonate`, {
        reason: enforcementReason.trim(),
      });
    },
    onSuccess: async () => {
      window.location.assign("/");
    },
  });

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Link to="/admin/users" className="text-sm font-medium text-red-700 hover:text-red-800">
          ← Back to Users
        </Link>
        <div className="space-y-2">
          <h2 className="font-['Orbitron'] text-3xl font-bold uppercase tracking-tight text-black">
            User Detail
          </h2>
          <p className="text-slate-600">
            Operational view of one user across sessions, linked auth accounts, and league memberships.
          </p>
        </div>
      </div>

      {detailQuery.isLoading ? <p className="text-slate-600">Loading user detail...</p> : null}
      {detailQuery.isError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {getErrorMessage(detailQuery.error)}
        </p>
      ) : null}

      {detail ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{detail.user.displayName}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 text-sm text-slate-700">
              <p><strong>Email:</strong> {detail.user.email}</p>
              <p><strong>Verified:</strong> {detail.user.emailVerified ? "Yes" : "No"}</p>
              <p>
                <strong>Status:</strong>{" "}
                <span className="inline-flex gap-2">
                  <Badge tone={detail.user.banned ? "danger" : "success"}>
                    {detail.user.banned ? "banned" : "active"}
                  </Badge>
                  <Badge tone={detail.user.role === "admin" ? "warning" : "neutral"}>
                    {detail.user.role}
                  </Badge>
                </span>
              </p>
              <p><strong>Active sessions:</strong> {detail.user.counts.activeSessions}</p>
              <p><strong>Leagues:</strong> {detail.user.counts.leagues}</p>
              <p><strong>Owned leagues:</strong> {detail.user.counts.ownedLeagues}</p>
              <p><strong>Ban reason:</strong> {detail.user.banReason ?? "None"}</p>
              <p><strong>Ban expires:</strong> {detail.user.banExpires ? formatDateTime(detail.user.banExpires) : "Never"}</p>
              <p><strong>Created:</strong> {formatDateTime(detail.user.createdAt)}</p>
              <p><strong>Updated:</strong> {formatDateTime(detail.user.updatedAt)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Enforcement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Ban reason</Label>
                  <Input
                    value={banReason}
                    onChange={(event) => setBanReason(event.target.value)}
                    placeholder="Reason for ban"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Ban length (days, optional)</Label>
                  <Input
                    value={banExpiresInDays}
                    onChange={(event) => setBanExpiresInDays(event.target.value)}
                    placeholder="Leave blank for permanent"
                    inputMode="numeric"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="destructive"
                  disabled={
                    detail.user.banned ||
                    banUserMutation.isPending ||
                    banReason.trim().length < 8
                  }
                  onClick={() => void banUserMutation.mutateAsync()}
                >
                  {banUserMutation.isPending ? "Banning..." : "Ban User"}
                </Button>
                <Input
                  className="max-w-md"
                  value={enforcementReason}
                  onChange={(event) => setEnforcementReason(event.target.value)}
                  placeholder="Reason for unban or impersonation"
                />
                <Button
                  variant="outline"
                  disabled={
                    !detail.user.banned ||
                    unbanUserMutation.isPending ||
                    enforcementReason.trim().length < 8
                  }
                  onClick={() => void unbanUserMutation.mutateAsync()}
                >
                  {unbanUserMutation.isPending ? "Unbanning..." : "Unban User"}
                </Button>
                <Button
                  disabled={
                    detail.user.banned ||
                    impersonateUserMutation.isPending ||
                    enforcementReason.trim().length < 8
                  }
                  onClick={() => void impersonateUserMutation.mutateAsync()}
                >
                  {impersonateUserMutation.isPending ? "Starting..." : "Impersonate User"}
                </Button>
              </div>
              {banUserMutation.isError ? (
                <p className="text-sm text-red-700">{getErrorMessage(banUserMutation.error)}</p>
              ) : null}
              {unbanUserMutation.isError ? (
                <p className="text-sm text-red-700">{getErrorMessage(unbanUserMutation.error)}</p>
              ) : null}
              {impersonateUserMutation.isError ? (
                <p className="text-sm text-red-700">{getErrorMessage(impersonateUserMutation.error)}</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Profile Corrections</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Display Name</Label>
                  <Input value={profileForm.displayName} onChange={(event) => setProfileForm((current) => ({ ...current, displayName: event.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Avatar URL</Label>
                  <Input value={profileForm.avatarUrl} onChange={(event) => setProfileForm((current) => ({ ...current, avatarUrl: event.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Reason</Label>
                <Input value={profileForm.reason} onChange={(event) => setProfileForm((current) => ({ ...current, reason: event.target.value }))} />
              </div>
              <Button disabled={updateProfileMutation.isPending || profileForm.reason.trim().length < 8} onClick={() => void updateProfileMutation.mutateAsync()}>
                {updateProfileMutation.isPending ? "Saving..." : "Save Profile"}
              </Button>
              {updateProfileMutation.isError ? (
                <p className="text-sm text-red-700">{getErrorMessage(updateProfileMutation.error)}</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Email Verification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select value={emailVerification} onValueChange={(value) => setEmailVerification(value as "verified" | "unverified")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="verified">verified</SelectItem>
                      <SelectItem value="unverified">unverified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Reason</Label>
                  <Input value={emailReason} onChange={(event) => setEmailReason(event.target.value)} />
                </div>
              </div>
              <Button disabled={updateEmailVerificationMutation.isPending || emailReason.trim().length < 8 || (emailVerification === "verified") === detail.user.emailVerified} onClick={() => void updateEmailVerificationMutation.mutateAsync()}>
                {updateEmailVerificationMutation.isPending ? "Saving..." : "Update Email Verification"}
              </Button>
              {updateEmailVerificationMutation.isError ? (
                <p className="text-sm text-red-700">{getErrorMessage(updateEmailVerificationMutation.error)}</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table ariaLabel="User sessions">
                <TableHeader>
                  <TableRow>
                    <TableHead>Updated</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>User Agent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.sessions.length > 0 ? (
                    detail.sessions.map((item) => (
                      <TableRow key={item.sessionId}>
                        <TableCell>{formatDateTime(item.updatedAt)}</TableCell>
                        <TableCell>{formatDateTime(item.expiresAt)}</TableCell>
                        <TableCell>{item.ipAddress ?? "Unknown"}</TableCell>
                        <TableCell className="max-w-[420px] truncate">{item.userAgent ?? "Unknown"}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-slate-600">No sessions found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Linked Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <Table ariaLabel="Linked accounts">
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Provider Account</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.accounts.length > 0 ? (
                    detail.accounts.map((item) => (
                      <TableRow key={item.accountId}>
                        <TableCell>{item.providerId}</TableCell>
                        <TableCell className="font-mono text-xs">{item.providerAccountId}</TableCell>
                        <TableCell>{formatDateTime(item.createdAt)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-slate-600">No linked accounts found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>League Memberships</CardTitle>
            </CardHeader>
            <CardContent>
              <Table ariaLabel="User leagues">
                <TableHeader>
                  <TableRow>
                    <TableHead>League</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.leagues.length > 0 ? (
                    detail.leagues.map((item) => (
                      <TableRow key={item.leagueId}>
                        <TableCell>
                          <Link className="font-medium text-red-700 hover:text-red-800" to={`/admin/leagues/${item.leagueId}`}>
                            {item.leagueName}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge tone={item.isOwner ? "info" : "neutral"}>{item.role}</Badge>
                        </TableCell>
                        <TableCell>{item.visibility}</TableCell>
                        <TableCell>{formatDateTime(item.joinedAt)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-slate-600">No league memberships found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Audit Log</CardTitle>
            </CardHeader>
            <CardContent>
              <Table ariaLabel="User audit log">
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Summary</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.auditLog.length > 0 ? (
                    detail.auditLog.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{formatDateTime(item.createdAt)}</TableCell>
                        <TableCell>{item.actorDisplayName}</TableCell>
                        <TableCell>{item.action}</TableCell>
                        <TableCell>{item.summary}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-slate-600">No audit entries recorded for this user yet.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
