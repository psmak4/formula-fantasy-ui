import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { authClient } from "@/auth/authClient";
import { apiClient, ApiError } from "@/api/apiClient";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type SessionType = "fp1" | "fp2" | "fp3" | "qualifying" | "sprint_shootout" | "sprint" | "race";
type SessionStatus = "scheduled" | "completed" | "cancelled";

type RaceDetailsResponse = {
  race: {
    id: string;
    externalId: string;
    seasonId: string;
    seasonYear: number;
    round: number;
    name: string;
    status: string;
    raceStartAt: string;
    circuitId: string;
    circuitName: string;
    circuitCity?: string | null;
    countryId?: string | null;
    countryName?: string | null;
    predictionCount: number;
    sessions: Array<{
      id: string;
      sessionType: SessionType;
      startsAt?: string | null;
      status: SessionStatus;
    }>;
    history: Array<{
      id: string;
      seasonId: string;
      seasonYear: number;
      round: number;
      status: string;
      raceStartAt: string;
    }>;
  };
};

const sessionTypeOptions: Array<{ value: SessionType; label: string }> = [
  { value: "fp1", label: "Practice 1" },
  { value: "fp2", label: "Practice 2" },
  { value: "fp3", label: "Practice 3" },
  { value: "qualifying", label: "Qualifying" },
  { value: "race", label: "Race" },
  { value: "sprint_shootout", label: "Sprint Qualifying" },
  { value: "sprint", label: "Sprint Race" },
];

function sessionTypeLabel(type: SessionType): string {
  return sessionTypeOptions.find((option) => option.value === type)?.label ?? type;
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Failed to load race details.";
}

function toLocalInputValue(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function AdminRaceDetailsPage() {
  const { raceId } = useParams<{ raceId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session, isPending } = authClient.useSession();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<RaceDetailsResponse["race"]["sessions"][number] | null>(null);
  const [createSessionType, setCreateSessionType] = useState<SessionType>("sprint_shootout");
  const [createStartsAt, setCreateStartsAt] = useState("");
  const [createStatus, setCreateStatus] = useState<SessionStatus>("scheduled");
  const [editStartsAt, setEditStartsAt] = useState("");
  const [editStatus, setEditStatus] = useState<SessionStatus>("scheduled");
  const [formError, setFormError] = useState<string | null>(null);

  const detailsQuery = useQuery({
    queryKey: ["admin-f1-race-details", raceId],
    enabled: Boolean(session?.user && raceId),
    queryFn: () => apiClient.get<RaceDetailsResponse>(`/admin/f1/races/${raceId}`),
  });

  const existingSessionTypes = useMemo(() => new Set((detailsQuery.data?.race.sessions ?? []).map((s) => s.sessionType)), [detailsQuery.data?.race.sessions]);

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      if (!raceId) throw new Error("Race ID is required");
      return apiClient.post(`/admin/f1/races/${raceId}/sessions`, {
        sessionType: createSessionType,
        startsAt: new Date(createStartsAt).toISOString(),
        status: createStatus,
      });
    },
    onSuccess: async () => {
      setIsCreateOpen(false);
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-f1-race-details", raceId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-f1-races"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-f1-sessions"] });
    },
    onError: (error) => setFormError(errorMessage(error)),
  });

  const updateSessionMutation = useMutation({
    mutationFn: async (payload: { raceSessionId: string; startsAt: string; status: SessionStatus }) =>
      apiClient.put(`/admin/f1/sessions/${payload.raceSessionId}`, {
        startsAt: new Date(payload.startsAt).toISOString(),
        status: payload.status,
      }),
    onSuccess: async () => {
      setEditingSession(null);
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-f1-race-details", raceId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-f1-races"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-f1-sessions"] });
    },
    onError: (error) => setFormError(errorMessage(error)),
  });

  const deleteSessionMutation = useMutation({
    mutationFn: (raceSessionId: string) => apiClient.delete(`/admin/f1/sessions/${raceSessionId}`),
    onSuccess: async () => {
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-f1-race-details", raceId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-f1-races"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-f1-sessions"] });
    },
    onError: (error) => setFormError(errorMessage(error)),
  });

  useEffect(() => {
    if (!isPending && !session?.user) {
      const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
      navigate(`/sign-in?redirect=${redirect}`, { replace: true });
    }
  }, [isPending, location.pathname, location.search, navigate, session?.user]);

  useEffect(() => {
    const race = detailsQuery.data?.race;
    if (!race || createStartsAt) return;
    setCreateStartsAt(toLocalInputValue(race.raceStartAt));
  }, [createStartsAt, detailsQuery.data?.race]);

  useEffect(() => {
    if (!editingSession) return;
    setEditStartsAt(toLocalInputValue(editingSession.startsAt));
    setEditStatus(editingSession.status);
  }, [editingSession]);

  if (!isPending && !session?.user) return null;

  const race = detailsQuery.data?.race;

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <Link to="/admin/races" className="text-sm font-medium text-red-700 hover:text-red-800">← Back to Races</Link>
        <h2 className="font-['Orbitron'] text-3xl font-bold uppercase tracking-tight text-black">Race Details</h2>
      </div>

      {detailsQuery.isLoading || isPending ? <p className="text-slate-600">Loading race details...</p> : null}
      {detailsQuery.error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage(detailsQuery.error)}</p> : null}

      {race ? (
        <>
          <Card>
            <CardHeader><CardTitle>{race.name}</CardTitle></CardHeader>
            <CardContent className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
              <p><strong>Reference:</strong> {race.externalId}</p>
              <p><strong>Status:</strong> {race.status}</p>
              <p><strong>Start:</strong> {new Date(race.raceStartAt).toLocaleString()}</p>
              <p><strong>Predictions:</strong> {race.predictionCount}</p>
              <p>
                <strong>Season:</strong>{" "}
                <Link className="font-medium text-red-700 hover:text-red-800" to={`/admin/seasons/${race.seasonId}`}>
                  {race.seasonYear}
                </Link>
              </p>
              <p>
                <strong>Circuit:</strong>{" "}
                <Link className="font-medium text-red-700 hover:text-red-800" to={`/admin/circuits/${race.circuitId}`}>
                  {race.circuitName}
                </Link>
                {race.circuitCity ? `, ${race.circuitCity}` : ""}
                {race.countryName ? ` (${race.countryName})` : ""}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Weekend Sessions</CardTitle>
                <Button
                  size="sm"
                  onClick={() => {
                    setFormError(null);
                    setIsCreateOpen(true);
                  }}
                >
                  Add Session
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {formError ? <p className="mb-3 text-sm text-red-700">{formError}</p> : null}
              {race.sessions.length === 0 ? <p className="text-sm text-slate-600">No sessions configured.</p> : null}
              {race.sessions.length > 0 ? (
                <table className="w-full table-fixed text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200">
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Session</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Scheduled</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Status</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {race.sessions.map((weekendSession) => (
                      <tr key={weekendSession.id} className="border-b border-neutral-200 last:border-0">
                        <td className="px-3 py-3 align-top whitespace-normal break-words">{sessionTypeLabel(weekendSession.sessionType)}</td>
                        <td className="px-3 py-3 align-top whitespace-normal break-words">{weekendSession.startsAt ? new Date(weekendSession.startsAt).toLocaleString() : "-"}</td>
                        <td className="px-3 py-3 align-top whitespace-normal break-words">{weekendSession.status}</td>
                        <td className="px-3 py-3 align-top">
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="secondary" onClick={() => setEditingSession(weekendSession)}>Edit</Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={deleteSessionMutation.isPending}
                              onClick={() => {
                                if (!window.confirm(`Delete ${sessionTypeLabel(weekendSession.sessionType)}?`)) return;
                                void deleteSessionMutation.mutateAsync(weekendSession.id);
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Race History</CardTitle></CardHeader>
            <CardContent>
              {race.history.length === 0 ? <p className="text-sm text-slate-600">No history found.</p> : null}
              {race.history.length > 0 ? (
                <table className="w-full table-fixed text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200">
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Season</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Round</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Race</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {race.history.map((entry) => (
                      <tr key={entry.id} className={`border-b border-neutral-200 last:border-0 ${entry.id === race.id ? "bg-red-50/40" : ""}`}>
                        <td className="px-3 py-3 align-top whitespace-normal break-words">
                          <Link className="font-medium text-red-700 hover:text-red-800" to={`/admin/seasons/${entry.seasonId}`}>
                            {entry.seasonYear}
                          </Link>
                        </td>
                        <td className="px-3 py-3 align-top">{entry.round}</td>
                        <td className="px-3 py-3 align-top whitespace-normal break-words">
                          <Link className="font-medium text-red-700 hover:text-red-800" to={`/admin/races/${entry.id}`}>
                            {race.name}
                          </Link>
                        </td>
                        <td className="px-3 py-3 align-top whitespace-normal break-words">{entry.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </CardContent>
          </Card>
        </>
      ) : null}

      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          if (!open) setFormError(null);
          setIsCreateOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Weekend Session</DialogTitle>
            <DialogDescription>Create or overwrite a session type for this race weekend.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!createStartsAt) {
                setFormError("Scheduled time is required.");
                return;
              }
              void createSessionMutation.mutateAsync();
            }}
          >
            <div className="space-y-1">
              <Label>Session Type</Label>
              <Select value={createSessionType} onValueChange={(value) => setCreateSessionType(value as SessionType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {sessionTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} disabled={existingSessionTypes.has(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="createSessionStartsAt">Scheduled (local)</Label>
              <Input id="createSessionStartsAt" type="datetime-local" value={createStartsAt} onChange={(e) => setCreateStartsAt(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={createStatus} onValueChange={(value) => setCreateStatus(value as SessionStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">scheduled</SelectItem>
                  <SelectItem value="completed">completed</SelectItem>
                  <SelectItem value="cancelled">cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formError ? <p className="text-sm text-red-700">{formError}</p> : null}
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="secondary" disabled={createSessionMutation.isPending}>Cancel</Button></DialogClose>
              <Button type="submit" disabled={createSessionMutation.isPending}>{createSessionMutation.isPending ? "Saving..." : "Save Session"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingSession)} onOpenChange={(open) => !open && setEditingSession(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Session</DialogTitle>
            <DialogDescription>Update session schedule and status.</DialogDescription>
          </DialogHeader>
          {editingSession ? (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (!editStartsAt) {
                  setFormError("Scheduled time is required.");
                  return;
                }
                void updateSessionMutation.mutateAsync({
                  raceSessionId: editingSession.id,
                  startsAt: editStartsAt,
                  status: editStatus,
                });
              }}
            >
              <div className="space-y-1"><Label>Session Type</Label><Input value={sessionTypeLabel(editingSession.sessionType)} disabled /></div>
              <div className="space-y-1"><Label htmlFor="editSessionStartsAt">Scheduled (local)</Label><Input id="editSessionStartsAt" type="datetime-local" value={editStartsAt} onChange={(e) => setEditStartsAt(e.target.value)} required /></div>
              <div className="space-y-1">
                <Label htmlFor="editSessionStatus">Status</Label>
                <Select value={editStatus} onValueChange={(value) => setEditStatus(value as SessionStatus)}>
                  <SelectTrigger id="editSessionStatus"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">scheduled</SelectItem>
                    <SelectItem value="completed">completed</SelectItem>
                    <SelectItem value="cancelled">cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formError ? <p className="text-sm text-red-700">{formError}</p> : null}
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="secondary" disabled={updateSessionMutation.isPending}>Cancel</Button></DialogClose>
                <Button type="submit" disabled={updateSessionMutation.isPending}>{updateSessionMutation.isPending ? "Saving..." : "Save"}</Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
