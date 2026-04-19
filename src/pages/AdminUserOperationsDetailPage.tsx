import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { apiClient } from "@/api/apiClient";
import { setAuthToken } from "@/auth/tokenStore";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { formatAdminDateTime, getAdminPageErrorMessage, invalidateQueryKeys } from "@/lib/adminPage";

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

const getErrorMessage = (error: unknown) => getAdminPageErrorMessage(error, "Unable to load user detail.");
const formatDateTime = (value: string | null) => formatAdminDateTime(value);

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
  const [profileForm, setProfileForm] = useState({
    displayName: "",
    avatarUrl: "",
    reason: "",
  });
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
      await invalidateQueryKeys(queryClient, [["admin-user-detail", userId], ["admin-users"]]);
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
      await invalidateQueryKeys(queryClient, [["admin-user-detail", userId], ["admin-users"]]);
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
      await invalidateQueryKeys(queryClient, [["admin-user-detail", userId], ["admin-users"]]);
    },
  });

  const unbanUserMutation = useMutation({
    mutationFn: async () =>
      apiClient.post(`/admin/users/${userId}/unban`, {
        reason: enforcementReason.trim(),
      }),
    onSuccess: async () => {
      setEnforcementReason("");
      await invalidateQueryKeys(queryClient, [["admin-user-detail", userId], ["admin-users"]]);
    },
  });

  const impersonateUserMutation = useMutation({
    mutationFn: async () => {
      return await apiClient.post<{ bearerToken?: string }>(`/admin/users/${userId}/impersonate`, {
        reason: enforcementReason.trim(),
      });
    },
    onSuccess: async (response) => {
      if (response?.bearerToken) {
        setAuthToken(response.bearerToken);
      }
      window.location.assign("/");
    },
  });

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Link to="/admin/users" className="ff-kicker text-primary hover:text-on-surface">
          Back To Users
        </Link>
        <div className="space-y-3">
          <p className="ff-kicker">User Detail</p>
          <h2 className="ff-display text-4xl text-on-surface md:text-5xl">Account Operations</h2>
          <p className="max-w-3xl text-sm leading-6 text-on-surface-variant md:text-base">
            Operational view of one user across sessions, linked accounts, league memberships, and enforcement state.
          </p>
        </div>
      </div>

      {detailQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((value) => (
            <div key={value} className="h-32 rounded-lg animate-pulse bg-surface-container-low" />
          ))}
        </div>
      ) : null}

      {detailQuery.isError ? (
        <div className="bg-error-container px-4 py-3 text-sm text-on-error-container">
          {getErrorMessage(detailQuery.error)}
        </div>
      ) : null}

      {detail ? (
        <>
          <section className="overflow-hidden bg-surface-container">
            <div className="grid gap-6 px-8 py-8 lg:grid-cols-[minmax(0,1.3fr)_320px]">
              <div className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  <Badge tone={detail.user.banned ? "danger" : "success"}>
                    {detail.user.banned ? "banned" : "active"}
                  </Badge>
                  <Badge tone={detail.user.role === "admin" ? "warning" : "neutral"}>
                    {detail.user.role}
                  </Badge>
                  <Badge tone={detail.user.emailVerified ? "success" : "warning"}>
                    {detail.user.emailVerified ? "verified" : "unverified"}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <h3 className="ff-display text-4xl text-on-surface">{detail.user.displayName}</h3>
                  <p className="text-sm leading-6 text-on-surface-variant">
                    {detail.user.email} · Created {formatDateTime(detail.user.createdAt)}
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-4">
                  <SummaryCell label="Sessions" value={detail.user.counts.activeSessions} />
                  <SummaryCell label="Leagues" value={detail.user.counts.leagues} />
                  <SummaryCell label="Owned" value={detail.user.counts.ownedLeagues} />
                  <SummaryCell label="Ban State" value={detail.user.banned ? "Live" : "None"} accent={detail.user.banned ? "danger" : undefined} />
                </div>
              </div>

              <div className="space-y-4 bg-surface-container-lowest p-5">
                <p className="ff-kicker">Account Telemetry</p>
                <div className="space-y-3">
                  <div className="bg-surface-container-lowest p-4">
                    <p className="ff-kicker">Updated</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-on-surface">
                      {formatDateTime(detail.user.updatedAt)}
                    </p>
                  </div>
                  <div className="bg-surface-container-lowest p-4">
                    <p className="ff-kicker">Ban Expires</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-on-surface">
                      {detail.user.banExpires ? formatDateTime(detail.user.banExpires) : "Never"}
                    </p>
                  </div>
                  <div className="bg-surface-container-lowest p-4">
                    <p className="ff-kicker">Ban Reason</p>
                    <p className="mt-2 text-sm leading-6 text-on-surface">
                      {detail.user.banReason ?? "None"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <Card className="bg-error-container">
            <CardContent className="space-y-5 px-6 py-6">
              <div>
                <p className="ff-display text-3xl text-on-surface">Enforcement</p>
                <p className="mt-2 text-sm text-on-error-container">
                  Ban, unban, and impersonation actions require reasons and should be treated as high-sensitivity operations.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Ban Reason</Label>
                  <Input
                    value={banReason}
                    onChange={(event) => setBanReason(event.target.value)}
                    placeholder="Reason for ban"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ban Length (days, optional)</Label>
                  <Input
                    value={banExpiresInDays}
                    onChange={(event) => setBanExpiresInDays(event.target.value)}
                    placeholder="Leave blank for permanent"
                    inputMode="numeric"
                  />
                </div>
              </div>
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
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
                    {banUserMutation.isPending ? "Banning…" : "Ban User"}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={
                      !detail.user.banned ||
                      unbanUserMutation.isPending ||
                      enforcementReason.trim().length < 8
                    }
                    onClick={() => void unbanUserMutation.mutateAsync()}
                  >
                    {unbanUserMutation.isPending ? "Unbanning…" : "Unban User"}
                  </Button>
                  <Button
                    disabled={
                      detail.user.banned ||
                      impersonateUserMutation.isPending ||
                      enforcementReason.trim().length < 8
                    }
                    onClick={() => void impersonateUserMutation.mutateAsync()}
                  >
                    {impersonateUserMutation.isPending ? "Starting…" : "Impersonate User"}
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>Unban / Impersonation Reason</Label>
                  <Input
                    value={enforcementReason}
                    onChange={(event) => setEnforcementReason(event.target.value)}
                    placeholder="Reason for unban or impersonation"
                  />
                </div>
              </div>
              {banUserMutation.isError ? (
                <div className="bg-error-container px-4 py-3 text-sm text-on-error-container">
                  {getErrorMessage(banUserMutation.error)}
                </div>
              ) : null}
              {unbanUserMutation.isError ? (
                <div className="bg-error-container px-4 py-3 text-sm text-on-error-container">
                  {getErrorMessage(unbanUserMutation.error)}
                </div>
              ) : null}
              {impersonateUserMutation.isError ? (
                <div className="bg-error-container px-4 py-3 text-sm text-on-error-container">
                  {getErrorMessage(impersonateUserMutation.error)}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="bg-surface-container-low">
              <CardContent className="space-y-5 px-6 py-6">
                <div>
                  <p className="ff-display text-3xl text-on-surface">Profile Corrections</p>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    Update display name or avatar URL with an audit reason.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Display Name</Label>
                    <Input
                      value={profileForm.displayName}
                      onChange={(event) =>
                        setProfileForm((current) => ({
                          ...current,
                          displayName: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Avatar URL</Label>
                    <Input
                      value={profileForm.avatarUrl}
                      onChange={(event) =>
                        setProfileForm((current) => ({
                          ...current,
                          avatarUrl: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Input
                    value={profileForm.reason}
                    onChange={(event) =>
                      setProfileForm((current) => ({ ...current, reason: event.target.value }))
                    }
                  />
                </div>
                <Button
                  disabled={
                    updateProfileMutation.isPending || profileForm.reason.trim().length < 8
                  }
                  onClick={() => void updateProfileMutation.mutateAsync()}
                >
                  {updateProfileMutation.isPending ? "Saving…" : "Save Profile"}
                </Button>
                {updateProfileMutation.isError ? (
                  <div className="bg-error-container px-4 py-3 text-sm text-on-error-container">
                    {getErrorMessage(updateProfileMutation.error)}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="bg-surface-container-low">
              <CardContent className="space-y-5 px-6 py-6">
                <div>
                  <p className="ff-display text-3xl text-on-surface">Email Verification</p>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    Adjust verification state with an explicit audit reason.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={emailVerification}
                      onValueChange={(value) =>
                        setEmailVerification(value as "verified" | "unverified")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="verified">verified</SelectItem>
                        <SelectItem value="unverified">unverified</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Reason</Label>
                    <Input
                      value={emailReason}
                      onChange={(event) => setEmailReason(event.target.value)}
                    />
                  </div>
                </div>
                <Button
                  disabled={
                    updateEmailVerificationMutation.isPending ||
                    emailReason.trim().length < 8 ||
                    (emailVerification === "verified") === detail.user.emailVerified
                  }
                  onClick={() => void updateEmailVerificationMutation.mutateAsync()}
                >
                  {updateEmailVerificationMutation.isPending
                    ? "Saving…"
                    : "Update Email Verification"}
                </Button>
                {updateEmailVerificationMutation.isError ? (
                  <div className="bg-error-container px-4 py-3 text-sm text-on-error-container">
                    {getErrorMessage(updateEmailVerificationMutation.error)}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <Card className="bg-surface-container-low">
            <CardContent className="px-0 py-0">
              <div className="px-6 py-5">
                <p className="ff-display text-3xl text-on-surface">Sessions</p>
              </div>
              <div className="px-6 pb-6 pt-4">
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
                          <TableCell className="max-w-[420px] truncate">
                            {item.userAgent ?? "Unknown"}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-on-surface-variant">No sessions found.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="bg-surface-container-low">
              <CardContent className="px-0 py-0">
                <div className="px-6 py-5">
                  <p className="ff-display text-3xl text-on-surface">Linked Accounts</p>
                </div>
                <div className="px-6 pb-6 pt-4">
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
                          <TableCell colSpan={3} className="text-on-surface-variant">
                            No linked accounts found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-surface-container-low">
              <CardContent className="px-0 py-0">
                <div className="px-6 py-5">
                  <p className="ff-display text-3xl text-on-surface">League Memberships</p>
                </div>
                <div className="px-6 pb-6 pt-4">
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
                              <Link
                                className="font-semibold text-on-surface hover:text-primary"
                                to={`/admin/leagues/${item.leagueId}`}
                              >
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
                          <TableCell colSpan={4} className="text-on-surface-variant">
                            No league memberships found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-surface-container-low">
            <CardContent className="px-0 py-0">
              <div className="px-6 py-5">
                <p className="ff-display text-3xl text-on-surface">Audit Log</p>
              </div>
              <div className="px-6 pb-6 pt-4">
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
                        <TableCell colSpan={4} className="text-on-surface-variant">
                          No audit entries recorded for this user yet.
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

function SummaryCell(props: {
  label: string;
  value: number | string;
  accent?: "danger";
}) {
  return (
    <div className="bg-surface-container-lowest px-4 py-4">
      <p className="ff-kicker">{props.label}</p>
      <p className={`mt-2 text-3xl font-black ${props.accent === "danger" ? "text-primary" : "text-on-surface"}`}>
        {props.value}
      </p>
    </div>
  );
}
