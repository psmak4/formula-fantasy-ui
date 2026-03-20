import { useEffect, useMemo, useState } from "react";
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

type LeagueDetailResponse = {
  league: {
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
  };
  members: Array<{
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    role: string;
    joinedAt: string;
    entryCount: number;
    isOwner: boolean;
  }>;
  invites: Array<{
    inviteId: string;
    token: string;
    status: "pending" | "accepted" | "revoked" | "expired";
    createdAt: string;
    expiresAt: string | null;
    invitedByUserId: string;
    invitedByDisplayName: string;
  }>;
  scoring: {
    totalRuns: number;
    currentSuccessRuns: number;
    failedRuns: number;
    latestRunAt: string | null;
  };
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
  return "Unable to load league operations.";
}

function formatDateTime(value: string | null): string {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function AdminLeagueOperationsDetailPage() {
  const params = useParams<{ leagueId: string }>();
  const leagueId = params.leagueId ?? "";
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ["admin-league-detail", leagueId],
    enabled: Boolean(leagueId),
    queryFn: () => apiClient.get<LeagueDetailResponse>(`/admin/leagues/${leagueId}`),
  });

  const detail = detailQuery.data;
  const [leagueForm, setLeagueForm] = useState({ name: "", visibility: "private" as "public" | "private", reason: "" });
  const [transferReason, setTransferReason] = useState("");
  const [newOwnerUserId, setNewOwnerUserId] = useState("");
  const [memberReasons, setMemberReasons] = useState<Record<string, string>>({});
  const [inviteReasons, setInviteReasons] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!detail) return;
    setLeagueForm({
      name: detail.league.name,
      visibility: detail.league.visibility,
      reason: "",
    });
    setNewOwnerUserId(detail.league.owner.userId);
  }, [detail]);

  const updateLeagueMutation = useMutation({
    mutationFn: async () =>
      apiClient.put(`/admin/leagues/${leagueId}`, {
        name: leagueForm.name,
        visibility: leagueForm.visibility,
        reason: leagueForm.reason.trim(),
      }),
    onSuccess: async () => {
      setLeagueForm((current) => ({ ...current, reason: "" }));
      await queryClient.invalidateQueries({ queryKey: ["admin-league-detail", leagueId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-leagues"] });
    },
  });

  const transferMutation = useMutation({
    mutationFn: async () =>
      apiClient.post(`/admin/leagues/${leagueId}/transfer-ownership`, {
        newOwnerUserId,
        reason: transferReason.trim(),
      }),
    onSuccess: async () => {
      setTransferReason("");
      await queryClient.invalidateQueries({ queryKey: ["admin-league-detail", leagueId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-leagues"] });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (input: { userId: string; reason: string }) =>
      apiClient.post(`/admin/leagues/${leagueId}/members/${input.userId}/remove`, {
        reason: input.reason,
      }),
    onSuccess: async (_data, variables) => {
      setMemberReasons((current) => ({ ...current, [variables.userId]: "" }));
      await queryClient.invalidateQueries({ queryKey: ["admin-league-detail", leagueId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-leagues"] });
    },
  });

  const revokeInviteMutation = useMutation({
    mutationFn: async (input: { inviteId: string; reason: string }) =>
      apiClient.post(`/admin/leagues/${leagueId}/invites/${input.inviteId}/revoke`, {
        reason: input.reason,
      }),
    onSuccess: async (_data, variables) => {
      setInviteReasons((current) => ({ ...current, [variables.inviteId]: "" }));
      await queryClient.invalidateQueries({ queryKey: ["admin-league-detail", leagueId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-leagues"] });
    },
  });

  const ownerOptions = useMemo(
    () => detail?.members.filter((member) => !member.isOwner) ?? [],
    [detail?.members]
  );

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Link to="/admin/leagues" className="text-sm font-medium text-red-700 hover:text-red-800">
          ← Back to Leagues
        </Link>
        <div className="space-y-2">
          <h2 className="font-['Orbitron'] text-3xl font-bold uppercase tracking-tight text-black">
            League Detail
          </h2>
          <p className="text-slate-600">
            Operational view of membership, invites, ownership, and scoring coverage for a single league.
          </p>
        </div>
      </div>

      {detailQuery.isLoading ? <p className="text-slate-600">Loading league detail...</p> : null}
      {detailQuery.isError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {getErrorMessage(detailQuery.error)}
        </p>
      ) : null}

      {detail ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{detail.league.name}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 text-sm text-slate-700">
              <p><strong>Owner:</strong> {detail.league.owner.displayName}</p>
              <p><strong>Visibility:</strong> {detail.league.visibility}</p>
              <p><strong>Members:</strong> {detail.league.counts.members}</p>
              <p><strong>Pending invites:</strong> {detail.league.counts.pendingInvites}</p>
              <p><strong>Entries:</strong> {detail.league.counts.entries}</p>
              <p><strong>Current success runs:</strong> {detail.scoring.currentSuccessRuns}</p>
              <p><strong>Failed runs:</strong> {detail.scoring.failedRuns}</p>
              <p><strong>Latest run:</strong> {formatDateTime(detail.scoring.latestRunAt)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>League Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input value={leagueForm.name} onChange={(event) => setLeagueForm((current) => ({ ...current, name: event.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Visibility</Label>
                  <Select value={leagueForm.visibility} onValueChange={(value) => setLeagueForm((current) => ({ ...current, visibility: value as "public" | "private" }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">private</SelectItem>
                      <SelectItem value="public">public</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Reason</Label>
                <Input value={leagueForm.reason} onChange={(event) => setLeagueForm((current) => ({ ...current, reason: event.target.value }))} />
              </div>
              <Button disabled={updateLeagueMutation.isPending || leagueForm.reason.trim().length < 8} onClick={() => void updateLeagueMutation.mutateAsync()}>
                {updateLeagueMutation.isPending ? "Saving..." : "Save League Settings"}
              </Button>
              {updateLeagueMutation.isError ? (
                <p className="text-sm text-red-700">{getErrorMessage(updateLeagueMutation.error)}</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transfer Ownership</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>New Owner</Label>
                  <Select value={newOwnerUserId} onValueChange={setNewOwnerUserId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ownerOptions.map((member) => (
                        <SelectItem key={member.userId} value={member.userId}>
                          {member.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Reason</Label>
                  <Input value={transferReason} onChange={(event) => setTransferReason(event.target.value)} />
                </div>
              </div>
              <Button disabled={transferMutation.isPending || transferReason.trim().length < 8 || newOwnerUserId === detail.league.owner.userId} onClick={() => void transferMutation.mutateAsync()}>
                {transferMutation.isPending ? "Transferring..." : "Transfer Ownership"}
              </Button>
              {transferMutation.isError ? (
                <p className="text-sm text-red-700">{getErrorMessage(transferMutation.error)}</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
            </CardHeader>
            <CardContent>
              <Table ariaLabel="League members">
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Entries</TableHead>
                    <TableHead>Removal Reason</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.members.map((member) => (
                    <TableRow key={member.userId}>
                      <TableCell>{member.displayName}</TableCell>
                      <TableCell>
                        <Badge tone={member.isOwner ? "info" : "neutral"}>{member.role}</Badge>
                      </TableCell>
                      <TableCell>{formatDateTime(member.joinedAt)}</TableCell>
                      <TableCell>{member.entryCount}</TableCell>
                      <TableCell>
                        {!member.isOwner ? (
                          <Input
                            value={memberReasons[member.userId] ?? ""}
                            onChange={(event) => setMemberReasons((current) => ({ ...current, [member.userId]: event.target.value }))}
                            placeholder="Reason required"
                          />
                        ) : (
                          <span className="text-xs text-slate-500">Transfer ownership first</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!member.isOwner ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={removeMemberMutation.isPending || (memberReasons[member.userId] ?? "").trim().length < 8}
                            onClick={() => void removeMemberMutation.mutateAsync({ userId: member.userId, reason: (memberReasons[member.userId] ?? "").trim() })}
                          >
                            Remove
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {removeMemberMutation.isError ? (
                <p className="mt-3 text-sm text-red-700">{getErrorMessage(removeMemberMutation.error)}</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invites</CardTitle>
            </CardHeader>
            <CardContent>
              <Table ariaLabel="League invites">
                <TableHeader>
                  <TableRow>
                    <TableHead>Token</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.invites.length > 0 ? (
                    detail.invites.map((invite) => (
                      <TableRow key={invite.inviteId}>
                        <TableCell className="font-mono text-xs">{invite.token.slice(0, 12)}…</TableCell>
                        <TableCell>
                          <Badge tone={invite.status === "pending" ? "warning" : invite.status === "accepted" ? "success" : "neutral"}>
                            {invite.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDateTime(invite.createdAt)}</TableCell>
                        <TableCell>{formatDateTime(invite.expiresAt)}</TableCell>
                        <TableCell>
                          {invite.status === "pending" ? (
                            <Input
                              value={inviteReasons[invite.inviteId] ?? ""}
                              onChange={(event) => setInviteReasons((current) => ({ ...current, [invite.inviteId]: event.target.value }))}
                              placeholder="Reason required"
                            />
                          ) : (
                            <span className="text-xs text-slate-500">Only pending invites are revocable</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {invite.status === "pending" ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={revokeInviteMutation.isPending || (inviteReasons[invite.inviteId] ?? "").trim().length < 8}
                              onClick={() => void revokeInviteMutation.mutateAsync({ inviteId: invite.inviteId, reason: (inviteReasons[invite.inviteId] ?? "").trim() })}
                            >
                              Revoke
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-slate-600">No invites found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {revokeInviteMutation.isError ? (
                <p className="mt-3 text-sm text-red-700">{getErrorMessage(revokeInviteMutation.error)}</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Audit Log</CardTitle>
            </CardHeader>
            <CardContent>
              <Table ariaLabel="League audit log">
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
                      <TableCell colSpan={4} className="text-slate-600">No audit entries recorded for this league yet.</TableCell>
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
