import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
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

type AdminSession = {
  id: string;
  raceId: string;
  sessionType: SessionType;
  scheduledAt?: string | null;
  status: SessionStatus;
  seasonId: string;
  seasonYear: number;
  round: number;
  raceName: string;
  circuitName?: string | null;
};

type AdminSessionsResponse = { sessions: AdminSession[] };

type AdminRaceOption = {
  id: string;
  seasonYear: number;
  round: number;
  name: string;
};

type AdminRacesResponse = { races: AdminRaceOption[] };

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

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

function toLocalInputValue(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function AdminSessionsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session, isPending } = authClient.useSession();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AdminSession | null>(null);
  const [createRaceId, setCreateRaceId] = useState("");
  const [createSessionType, setCreateSessionType] = useState<SessionType>("sprint_shootout");
  const [createScheduledAt, setCreateScheduledAt] = useState("");
  const [createStatus, setCreateStatus] = useState<SessionStatus>("scheduled");
  const [editScheduledAt, setEditScheduledAt] = useState("");
  const [editStatus, setEditStatus] = useState<SessionStatus>("scheduled");
  const [formError, setFormError] = useState<string | null>(null);

  const sessionsQuery = useQuery({
    queryKey: ["admin-f1-sessions"],
    enabled: Boolean(session?.user),
    queryFn: () => apiClient.get<AdminSessionsResponse>("/admin/f1/sessions"),
  });

  const racesQuery = useQuery({
    queryKey: ["admin-f1-races-options"],
    enabled: Boolean(session?.user),
    queryFn: async () => {
      const data = await apiClient.get<AdminRacesResponse>("/admin/f1/races");
      return data.races;
    },
  });

  const createMutation = useMutation({
    mutationFn: () => apiClient.post(`/admin/f1/races/${createRaceId}/sessions`, {
      sessionType: createSessionType,
      startsAt: new Date(createScheduledAt).toISOString(),
      status: createStatus,
    }),
    onSuccess: async () => {
      setIsCreateOpen(false);
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-f1-sessions"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-f1-race-details"] });
    },
    onError: (error) => setFormError(errorMessage(error, "Failed to create session.")),
  });

  const updateMutation = useMutation({
    mutationFn: () => apiClient.put(`/admin/f1/sessions/${editing?.id}`, {
      startsAt: new Date(editScheduledAt).toISOString(),
      status: editStatus,
    }),
    onSuccess: async () => {
      setEditing(null);
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-f1-sessions"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-f1-race-details"] });
    },
    onError: (error) => setFormError(errorMessage(error, "Failed to update session.")),
  });

  const deleteMutation = useMutation({
    mutationFn: (sessionId: string) => apiClient.delete(`/admin/f1/sessions/${sessionId}`),
    onSuccess: async () => {
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-f1-sessions"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-f1-race-details"] });
    },
    onError: (error) => setFormError(errorMessage(error, "Failed to delete session.")),
  });

  useEffect(() => {
    if (!isPending && !session?.user) {
      const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
      navigate(`/sign-in?redirect=${redirect}`, { replace: true });
    }
  }, [isPending, location.pathname, location.search, navigate, session?.user]);

  useEffect(() => {
    if (!createRaceId && racesQuery.data?.[0]) {
      setCreateRaceId(racesQuery.data[0].id);
    }
  }, [createRaceId, racesQuery.data]);

  useEffect(() => {
    if (!editing) return;
    setEditScheduledAt(toLocalInputValue(editing.scheduledAt));
    setEditStatus(editing.status);
  }, [editing]);

  const sessions = sessionsQuery.data?.sessions ?? [];
  const races = racesQuery.data ?? [];

  const existingTypesForSelectedRace = useMemo(() => {
    if (!createRaceId) return new Set<SessionType>();
    return new Set(sessions.filter((row) => row.raceId === createRaceId).map((row) => row.sessionType));
  }, [createRaceId, sessions]);

  if (!isPending && !session?.user) return null;

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h2 className="font-['Orbitron'] text-3xl font-bold uppercase tracking-tight text-black">Sessions</h2>
          <p className="text-slate-600">Manage race weekend sessions across all race weekends.</p>
        </div>
        <Button onClick={() => { setFormError(null); setIsCreateOpen(true); }}>Create Session</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Weekend Sessions</CardTitle></CardHeader>
        <CardContent>
          {sessionsQuery.isLoading || isPending ? <p className="text-slate-600">Loading sessions...</p> : null}
          {sessionsQuery.error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage(sessionsQuery.error, "Failed to load sessions")}</p> : null}
          {formError ? <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p> : null}
          {!sessionsQuery.isLoading && !sessionsQuery.error ? (
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Season / Round</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Race</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Session</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Scheduled</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Status</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((row) => (
                  <tr key={row.id} className="border-b border-neutral-200 last:border-0">
                    <td className="px-3 py-3 align-top whitespace-normal break-words">
                      <Link className="font-medium text-red-700 hover:text-red-800" to={`/admin/seasons/${row.seasonId}`}>
                        {row.seasonYear} / {row.round}
                      </Link>
                    </td>
                    <td className="px-3 py-3 align-top whitespace-normal break-words">
                      <Link className="font-medium text-red-700 hover:text-red-800" to={`/admin/races/${row.raceId}`}>
                        {row.raceName}
                      </Link>
                      {row.circuitName ? <p className="text-xs text-slate-500">{row.circuitName}</p> : null}
                    </td>
                    <td className="px-3 py-3 align-top whitespace-normal break-words">{sessionTypeLabel(row.sessionType)}</td>
                    <td className="px-3 py-3 align-top whitespace-normal break-words">{row.scheduledAt ? new Date(row.scheduledAt).toLocaleString() : "-"}</td>
                    <td className="px-3 py-3 align-top whitespace-normal break-words">{row.status}</td>
                    <td className="px-3 py-3 align-top">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" onClick={() => setEditing(row)}>Edit</Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (!window.confirm(`Delete ${sessionTypeLabel(row.sessionType)} for ${row.raceName}?`)) return;
                            void deleteMutation.mutateAsync(row.id);
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

      <Dialog open={isCreateOpen} onOpenChange={(open) => { if (!open) setFormError(null); setIsCreateOpen(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Session</DialogTitle>
            <DialogDescription>Add a weekend session to a specific race weekend.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!createRaceId || !createScheduledAt) {
                setFormError("Race and scheduled time are required.");
                return;
              }
              void createMutation.mutateAsync();
            }}
          >
            <div className="space-y-1">
              <Label>Race</Label>
              <Select value={createRaceId} onValueChange={setCreateRaceId}>
                <SelectTrigger><SelectValue placeholder="Select race" /></SelectTrigger>
                <SelectContent>
                  {races.map((race) => (
                    <SelectItem key={race.id} value={race.id}>{race.seasonYear} / {race.round} - {race.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Session Type</Label>
              <Select value={createSessionType} onValueChange={(value) => setCreateSessionType(value as SessionType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {sessionTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} disabled={existingTypesForSelectedRace.has(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="sessionScheduledAt">Scheduled (local)</Label>
              <Input id="sessionScheduledAt" type="datetime-local" value={createScheduledAt} onChange={(e) => setCreateScheduledAt(e.target.value)} required />
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
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="secondary" disabled={createMutation.isPending}>Cancel</Button></DialogClose>
              <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Creating..." : "Create Session"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Session</DialogTitle>
            <DialogDescription>Update scheduling and status.</DialogDescription>
          </DialogHeader>
          {editing ? (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (!editScheduledAt) {
                  setFormError("Scheduled time is required.");
                  return;
                }
                void updateMutation.mutateAsync();
              }}
            >
              <div className="space-y-1"><Label>Race</Label><Input value={`${editing.seasonYear} / ${editing.round} - ${editing.raceName}`} disabled /></div>
              <div className="space-y-1"><Label>Session Type</Label><Input value={sessionTypeLabel(editing.sessionType)} disabled /></div>
              <div className="space-y-1"><Label htmlFor="editSessionScheduledAt">Scheduled (local)</Label><Input id="editSessionScheduledAt" type="datetime-local" value={editScheduledAt} onChange={(e) => setEditScheduledAt(e.target.value)} required /></div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={editStatus} onValueChange={(value) => setEditStatus(value as SessionStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">scheduled</SelectItem>
                    <SelectItem value="completed">completed</SelectItem>
                    <SelectItem value="cancelled">cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="secondary" disabled={updateMutation.isPending}>Cancel</Button></DialogClose>
                <Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? "Saving..." : "Save"}</Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
