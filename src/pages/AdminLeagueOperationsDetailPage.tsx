import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { apiClient, ApiError } from "@/api/apiClient";
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
  const [leagueForm, setLeagueForm] = useState({
    name: "",
    visibility: "private" as "public" | "private",
    reason: "",
  });
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
    [detail?.members],
  );

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Link to="/admin/leagues" className="ff-kicker text-[#ff7373] hover:text-white">
          Back To Leagues
        </Link>
        <div className="space-y-3">
          <p className="ff-kicker">League Detail</p>
          <h2 className="ff-display text-4xl text-white md:text-5xl">League Operations</h2>
          <p className="max-w-3xl text-sm leading-6 text-[#989aa2] md:text-base">
            Operational view of membership, invites, ownership, and scoring coverage for a single league.
          </p>
        </div>
      </div>

      {detailQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((value) => (
            <div key={value} className="h-32 animate-pulse border border-white/8 bg-[#15161b]" />
          ))}
        </div>
      ) : null}

      {detailQuery.isError ? (
        <div className="border border-[#7a0d0d] bg-[#350909] px-4 py-3 text-sm text-[#ff8e8e]">
          {getErrorMessage(detailQuery.error)}
        </div>
      ) : null}

      {detail ? (
        <>
          <section className="overflow-hidden border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(204,0,0,0.18),transparent_24%),linear-gradient(135deg,#0d0e12_0%,#15171c_52%,#20232b_100%)]">
            <div className="grid gap-6 px-8 py-8 lg:grid-cols-[minmax(0,1.3fr)_320px]">
              <div className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  <Badge tone={detail.league.visibility === "public" ? "info" : "warning"}>
                    {detail.league.visibility}
                  </Badge>
                  <Badge tone="neutral">{detail.league.gameMode}</Badge>
                </div>
                <div className="space-y-2">
                  <h3 className="ff-display text-4xl text-white">{detail.league.name}</h3>
                  <p className="text-sm leading-6 text-[#c2c4cb]">
                    Owner {detail.league.owner.displayName} · Created {formatDateTime(detail.league.createdAt)}
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-4">
                  <SummaryCell label="Members" value={detail.league.counts.members} />
                  <SummaryCell label="Pending Invites" value={detail.league.counts.pendingInvites} />
                  <SummaryCell label="Entries" value={detail.league.counts.entries} />
                  <SummaryCell label="Failed Runs" value={detail.scoring.failedRuns} accent="danger" />
                </div>
              </div>

              <div className="space-y-4 border border-white/8 bg-black/20 p-5">
                <p className="ff-kicker">Scoring Telemetry</p>
                <div className="space-y-3">
                  <div className="border border-white/8 bg-white/4 p-4">
                    <p className="ff-kicker">Total Runs</p>
                    <p className="mt-2 text-3xl font-black text-white">{detail.scoring.totalRuns}</p>
                  </div>
                  <div className="border border-white/8 bg-white/4 p-4">
                    <p className="ff-kicker">Current Success</p>
                    <p className="mt-2 text-3xl font-black text-[#6ee7a8]">
                      {detail.scoring.currentSuccessRuns}
                    </p>
                  </div>
                  <div className="border border-white/8 bg-white/4 p-4">
                    <p className="ff-kicker">Latest Run</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-white">
                      {formatDateTime(detail.scoring.latestRunAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="border-white/8 bg-[#15161b]">
              <CardContent className="space-y-5 px-6 py-6">
                <div>
                  <p className="ff-display text-3xl text-white">League Settings</p>
                  <p className="mt-2 text-sm text-[#989aa2]">
                    Update name or visibility with an audit reason.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={leagueForm.name}
                      onChange={(event) =>
                        setLeagueForm((current) => ({ ...current, name: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Visibility</Label>
                    <Select
                      value={leagueForm.visibility}
                      onValueChange={(value) =>
                        setLeagueForm((current) => ({
                          ...current,
                          visibility: value as "public" | "private",
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="private">private</SelectItem>
                        <SelectItem value="public">public</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Input
                    value={leagueForm.reason}
                    onChange={(event) =>
                      setLeagueForm((current) => ({ ...current, reason: event.target.value }))
                    }
                  />
                </div>
                <Button
                  disabled={updateLeagueMutation.isPending || leagueForm.reason.trim().length < 8}
                  onClick={() => void updateLeagueMutation.mutateAsync()}
                >
                  {updateLeagueMutation.isPending ? "Saving..." : "Save League Settings"}
                </Button>
                {updateLeagueMutation.isError ? (
                  <div className="border border-[#7a0d0d] bg-[#350909] px-4 py-3 text-sm text-[#ff8e8e]">
                    {getErrorMessage(updateLeagueMutation.error)}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="border-[#5a1010] bg-[#2a0c0c]">
              <CardContent className="space-y-5 px-6 py-6">
                <div>
                  <p className="ff-display text-3xl text-white">Transfer Ownership</p>
                  <p className="mt-2 text-sm text-[#ffb1b1]">
                    Ownership changes require a new owner and an audit reason.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>New Owner</Label>
                    <Select value={newOwnerUserId} onValueChange={setNewOwnerUserId}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ownerOptions.map((member) => (
                          <SelectItem key={member.userId} value={member.userId}>
                            {member.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Reason</Label>
                    <Input
                      value={transferReason}
                      onChange={(event) => setTransferReason(event.target.value)}
                    />
                  </div>
                </div>
                <Button
                  disabled={
                    transferMutation.isPending ||
                    transferReason.trim().length < 8 ||
                    newOwnerUserId === detail.league.owner.userId
                  }
                  onClick={() => void transferMutation.mutateAsync()}
                >
                  {transferMutation.isPending ? "Transferring..." : "Transfer Ownership"}
                </Button>
                {transferMutation.isError ? (
                  <div className="border border-[#7a0d0d] bg-[#350909] px-4 py-3 text-sm text-[#ff8e8e]">
                    {getErrorMessage(transferMutation.error)}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <Card className="border-white/8 bg-[#15161b]">
            <CardContent className="px-0 py-0">
              <div className="border-b border-white/6 px-6 py-5">
                <p className="ff-display text-3xl text-white">Members</p>
              </div>
              <div className="px-6 pb-6 pt-4">
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
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-semibold text-white">{member.displayName}</div>
                            <div className="font-mono text-[11px] text-[#7f828b]">{member.userId}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge tone={member.isOwner ? "info" : "neutral"}>{member.role}</Badge>
                        </TableCell>
                        <TableCell>{formatDateTime(member.joinedAt)}</TableCell>
                        <TableCell>{member.entryCount}</TableCell>
                        <TableCell>
                          {!member.isOwner ? (
                            <Input
                              value={memberReasons[member.userId] ?? ""}
                              onChange={(event) =>
                                setMemberReasons((current) => ({
                                  ...current,
                                  [member.userId]: event.target.value,
                                }))
                              }
                              placeholder="Reason required"
                            />
                          ) : (
                            <span className="text-xs text-[#7f828b]">Transfer ownership first</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {!member.isOwner ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={
                                removeMemberMutation.isPending ||
                                (memberReasons[member.userId] ?? "").trim().length < 8
                              }
                              onClick={() =>
                                void removeMemberMutation.mutateAsync({
                                  userId: member.userId,
                                  reason: (memberReasons[member.userId] ?? "").trim(),
                                })
                              }
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
                  <div className="mt-4 border border-[#7a0d0d] bg-[#350909] px-4 py-3 text-sm text-[#ff8e8e]">
                    {getErrorMessage(removeMemberMutation.error)}
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/8 bg-[#15161b]">
            <CardContent className="px-0 py-0">
              <div className="border-b border-white/6 px-6 py-5">
                <p className="ff-display text-3xl text-white">Invites</p>
              </div>
              <div className="px-6 pb-6 pt-4">
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
                            <Badge
                              tone={
                                invite.status === "pending"
                                  ? "warning"
                                  : invite.status === "accepted"
                                    ? "success"
                                    : "neutral"
                              }
                            >
                              {invite.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDateTime(invite.createdAt)}</TableCell>
                          <TableCell>{formatDateTime(invite.expiresAt)}</TableCell>
                          <TableCell>
                            {invite.status === "pending" ? (
                              <Input
                                value={inviteReasons[invite.inviteId] ?? ""}
                                onChange={(event) =>
                                  setInviteReasons((current) => ({
                                    ...current,
                                    [invite.inviteId]: event.target.value,
                                  }))
                                }
                                placeholder="Reason required"
                              />
                            ) : (
                              <span className="text-xs text-[#7f828b]">Only pending invites are revocable</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {invite.status === "pending" ? (
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={
                                  revokeInviteMutation.isPending ||
                                  (inviteReasons[invite.inviteId] ?? "").trim().length < 8
                                }
                                onClick={() =>
                                  void revokeInviteMutation.mutateAsync({
                                    inviteId: invite.inviteId,
                                    reason: (inviteReasons[invite.inviteId] ?? "").trim(),
                                  })
                                }
                              >
                                Revoke
                              </Button>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-[#989aa2]">No invites found.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                {revokeInviteMutation.isError ? (
                  <div className="mt-4 border border-[#7a0d0d] bg-[#350909] px-4 py-3 text-sm text-[#ff8e8e]">
                    {getErrorMessage(revokeInviteMutation.error)}
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/8 bg-[#15161b]">
            <CardContent className="px-0 py-0">
              <div className="border-b border-white/6 px-6 py-5">
                <p className="ff-display text-3xl text-white">Audit Log</p>
              </div>
              <div className="px-6 pb-6 pt-4">
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
                        <TableCell colSpan={4} className="text-[#989aa2]">
                          No audit entries recorded for this league yet.
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

function SummaryCell(props: { label: string; value: number; accent?: "danger" }) {
  return (
    <div className="border border-white/8 bg-black/20 px-4 py-4">
      <p className="ff-kicker">{props.label}</p>
      <p className={`mt-2 text-3xl font-black ${props.accent === "danger" ? "text-[#ff7373]" : "text-white"}`}>
        {props.value}
      </p>
    </div>
  );
}
