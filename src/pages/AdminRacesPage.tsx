import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { authClient } from "@/auth/authClient";
import { apiClient, ApiError } from "@/api/apiClient";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type AdminRace = {
  id: string;
  externalId: string;
  seasonYear: number;
  round: number;
  name: string;
  circuitName?: string | null;
  country?: string | null;
  city?: string | null;
  raceStartAt: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
};

type AdminRacesResponse = { races: AdminRace[] };

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

function toLocalInputValue(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function AdminRacesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session, isPending } = authClient.useSession();
  const [editingRace, setEditingRace] = useState<AdminRace | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const racesQuery = useQuery({
    queryKey: ["admin-f1-races"],
    enabled: Boolean(session?.user),
    queryFn: () => apiClient.get<AdminRacesResponse>("/admin/f1/races"),
  });

  const updateRaceMutation = useMutation({
    mutationFn: async (payload: {
      raceId: string;
      name: string;
      raceStartAt: string;
      status: AdminRace["status"];
    }) =>
      apiClient.put(`/admin/f1/races/${payload.raceId}`, {
        name: payload.name,
        raceStartAt: new Date(payload.raceStartAt).toISOString(),
        status: payload.status,
      }),
    onSuccess: async () => {
      setEditingRace(null);
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-f1-races"] });
    },
    onError: (error: unknown) => {
      setFormError(getErrorMessage(error, "Failed to update race."));
    },
  });

  useEffect(() => {
    if (!isPending && !session?.user) {
      const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
      navigate(`/sign-in?redirect=${redirect}`, { replace: true });
    }
  }, [isPending, location.pathname, location.search, navigate, session?.user]);

  if (!isPending && !session?.user) return null;

  const races = racesQuery.data?.races ?? [];

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h2 className="font-['Orbitron'] text-3xl font-bold uppercase tracking-tight text-black">Races</h2>
        <p className="text-slate-600">Race schedule data. Circuit metadata is managed on the Circuits page.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Races</CardTitle></CardHeader>
        <CardContent>
          {racesQuery.isLoading || isPending ? <p className="text-slate-600">Loading races...</p> : null}
          {racesQuery.error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{getErrorMessage(racesQuery.error, "Failed to load races")}</p>
          ) : null}
          {!racesQuery.isLoading && !racesQuery.error ? (
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Race</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Season/Round</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Circuit</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Start</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Status</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {races.map((race) => (
                  <tr key={race.id} className="border-b border-neutral-200 last:border-0">
                    <td className="px-3 py-3 align-top whitespace-normal break-words">
                      <p className="font-medium text-slate-900">{race.name}</p>
                      <p className="text-xs text-slate-500 break-all">{race.externalId}</p>
                    </td>
                    <td className="px-3 py-3 align-top">{race.seasonYear} / {race.round}</td>
                    <td className="px-3 py-3 align-top whitespace-normal break-words">{race.circuitName ?? "Unknown"}{race.city ? `, ${race.city}` : ""}{race.country ? ` (${race.country})` : ""}</td>
                    <td className="px-3 py-3 align-top">{new Date(race.raceStartAt).toLocaleString()}</td>
                    <td className="px-3 py-3 align-top"><Badge tone="info">{race.status}</Badge></td>
                    <td className="px-3 py-3 align-top">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" onClick={() => navigate(`/admin/races/${race.id}`)}>View</Button>
                        <Button size="sm" variant="secondary" onClick={() => { setFormError(null); setEditingRace(race); }}>Edit</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={Boolean(editingRace)} onOpenChange={(open) => !open && setEditingRace(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Race</DialogTitle>
            <DialogDescription>Update race timing and status.</DialogDescription>
          </DialogHeader>
          {editingRace ? (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                const raceStartAt = String(formData.get("raceStartAt") ?? "");
                if (!raceStartAt) {
                  setFormError("Race start time is required.");
                  return;
                }
                void updateRaceMutation.mutateAsync({
                  raceId: editingRace.id,
                  name: String(formData.get("name") ?? "").trim(),
                  raceStartAt,
                  status: String(formData.get("status") ?? "scheduled") as AdminRace["status"],
                });
              }}
            >
              <div className="space-y-1"><Label htmlFor="raceName">Race Name</Label><Input id="raceName" name="name" defaultValue={editingRace.name} required /></div>
              <div className="space-y-1"><Label>Circuit</Label><Input value={`${editingRace.circuitName ?? "Unknown"}${editingRace.city ? `, ${editingRace.city}` : ""}${editingRace.country ? ` (${editingRace.country})` : ""}`} disabled /></div>
              <div className="space-y-1"><Label htmlFor="raceStartAt">Start Time (UTC)</Label><Input id="raceStartAt" type="datetime-local" name="raceStartAt" defaultValue={toLocalInputValue(editingRace.raceStartAt)} required /></div>
              <div className="space-y-1">
                <Label htmlFor="raceStatus">Status</Label>
                <Select name="status" defaultValue={editingRace.status}>
                  <SelectTrigger id="raceStatus"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">scheduled</SelectItem>
                    <SelectItem value="in_progress">in_progress</SelectItem>
                    <SelectItem value="completed">completed</SelectItem>
                    <SelectItem value="cancelled">cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formError ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p> : null}
              <DialogFooter>
                <DialogClose asChild><Button variant="secondary" disabled={updateRaceMutation.isPending}>Cancel</Button></DialogClose>
                <Button type="submit" disabled={updateRaceMutation.isPending}>{updateRaceMutation.isPending ? "Saving..." : "Save"}</Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
