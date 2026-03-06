import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { authClient } from "@/auth/authClient";
import { apiClient, ApiError } from "@/api/apiClient";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Entry = {
  id: string;
  seasonId: string;
  seasonYear: number;
  driverId: string;
  driverName: string;
  constructorId: string;
  constructorName: string;
  carNumber: number;
  role: "race_driver" | "reserve" | "test";
};

type EntriesResponse = { entries: Entry[] };
type Season = { id: string; year: number; rounds: number; raceCount: number };
type Driver = { id: string; givenName: string; familyName: string };
type Constructor = { id: string; name: string };

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

export function AdminEntriesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session, isPending } = authClient.useSession();

  const [editing, setEditing] = useState<Entry | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createSeasonId, setCreateSeasonId] = useState<string>("");
  const [createDriverId, setCreateDriverId] = useState<string>("");
  const [createConstructorId, setCreateConstructorId] = useState<string>("");
  const [createRole, setCreateRole] = useState<"race_driver" | "reserve" | "test">("race_driver");
  const [createCarNumber, setCreateCarNumber] = useState<string>("0");
  const [editConstructorId, setEditConstructorId] = useState<string>("");
  const [editRole, setEditRole] = useState<"race_driver" | "reserve" | "test">("race_driver");
  const [editCarNumber, setEditCarNumber] = useState<string>("0");
  const [error, setError] = useState<string | null>(null);

  const entriesQuery = useQuery({
    queryKey: ["admin-f1-entries"],
    enabled: Boolean(session?.user),
    queryFn: () => apiClient.get<EntriesResponse>("/admin/f1/entries"),
  });

  const seasonsQuery = useQuery({
    queryKey: ["admin-f1-seasons-options"],
    enabled: Boolean(session?.user),
    queryFn: async () => {
      const data = await apiClient.get<{ seasons: Season[] }>("/admin/f1/seasons");
      return data.seasons;
    },
  });

  const driversQuery = useQuery({
    queryKey: ["admin-f1-drivers-options"],
    enabled: Boolean(session?.user),
    queryFn: async () => {
      const data = await apiClient.get<{ drivers: Driver[] }>("/admin/f1/drivers");
      return data.drivers;
    },
  });

  const constructorsQuery = useQuery({
    queryKey: ["admin-f1-constructors-options"],
    enabled: Boolean(session?.user),
    queryFn: async () => {
      const data = await apiClient.get<{ constructors: Constructor[] }>("/admin/f1/constructors");
      return data.constructors;
    },
  });

  const createMutation = useMutation({
    mutationFn: () => apiClient.post("/admin/f1/entries", {
      seasonId: createSeasonId,
      driverId: createDriverId,
      constructorId: createConstructorId,
      role: createRole,
      carNumber: Number.parseInt(createCarNumber, 10),
    }),
    onSuccess: async () => {
      setError(null);
      setIsCreateOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-f1-entries"] });
    },
    onError: (err) => setError(errorMessage(err, "Failed to create entry.")),
  });

  const updateMutation = useMutation({
    mutationFn: () => apiClient.put(`/admin/f1/entries/${editing?.id}`, {
      constructorId: editConstructorId,
      role: editRole,
      carNumber: Number.parseInt(editCarNumber, 10),
    }),
    onSuccess: async () => {
      setEditing(null);
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-f1-entries"] });
    },
    onError: (err) => setError(errorMessage(err, "Failed to update entry.")),
  });

  const deleteMutation = useMutation({
    mutationFn: (entryId: string) => apiClient.delete(`/admin/f1/entries/${entryId}`),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-f1-entries"] });
    },
    onError: (err) => setError(errorMessage(err, "Failed to delete entry.")),
  });

  useEffect(() => {
    if (!isPending && !session?.user) {
      const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
      navigate(`/sign-in?redirect=${redirect}`, { replace: true });
    }
  }, [isPending, location.pathname, location.search, navigate, session?.user]);

  useEffect(() => {
    if (editing) {
      setEditConstructorId(editing.constructorId);
      setEditRole(editing.role);
      setEditCarNumber(String(editing.carNumber));
    }
  }, [editing]);

  const seasons = seasonsQuery.data ?? [];
  const drivers = driversQuery.data ?? [];
  const constructors = constructorsQuery.data ?? [];
  const entries = entriesQuery.data?.entries ?? [];

  useEffect(() => {
    if (!createSeasonId && seasons[0]) setCreateSeasonId(seasons[0].id);
    if (!createDriverId && drivers[0]) setCreateDriverId(drivers[0].id);
    if (!createConstructorId && constructors[0]) setCreateConstructorId(constructors[0].id);
  }, [seasons, drivers, constructors, createSeasonId, createDriverId, createConstructorId]);

  const driverLabel = useMemo(() => new Map(drivers.map((d) => [d.id, `${d.givenName} ${d.familyName}`])), [drivers]);

  if (!isPending && !session?.user) return null;

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h2 className="font-['Orbitron'] text-3xl font-bold uppercase tracking-tight text-black">Season Entries</h2>
          <p className="text-slate-600">Manage driver-to-constructor assignments per season.</p>
        </div>
        <Button
          onClick={() => {
            setError(null);
            setIsCreateOpen(true);
          }}
        >
          Create Entry
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Entries</CardTitle></CardHeader>
        <CardContent>
          {entriesQuery.isLoading || isPending ? <p className="text-slate-600">Loading entries...</p> : null}
          {entriesQuery.error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage(entriesQuery.error, "Failed to load entries")}</p> : null}
          {!entriesQuery.isLoading && !entriesQuery.error ? (
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Season</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Driver</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Constructor</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Car #</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Role</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-neutral-200 last:border-0">
                    <td className="px-3 py-3">{entry.seasonYear}</td>
                    <td className="px-3 py-3 whitespace-normal break-words">{entry.driverName}</td>
                    <td className="px-3 py-3 whitespace-normal break-words">{entry.constructorName}</td>
                    <td className="px-3 py-3">{entry.carNumber}</td>
                    <td className="px-3 py-3">{entry.role}</td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => setEditing(entry)}>Edit</Button>
                        <Button size="sm" variant="destructive" onClick={() => void deleteMutation.mutateAsync(entry.id)} disabled={deleteMutation.isPending}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Entry</DialogTitle>
            <DialogDescription>Update constructor, car number, or role for this season entry.</DialogDescription>
          </DialogHeader>
          {editing ? (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                const car = Number.parseInt(editCarNumber, 10);
                if (!editConstructorId || !Number.isInteger(car) || car < 0) {
                  setError("Provide a valid constructor and car number.");
                  return;
                }
                void updateMutation.mutateAsync();
              }}
            >
              <div className="space-y-1"><Label>Season</Label><Input value={String(editing.seasonYear)} disabled /></div>
              <div className="space-y-1"><Label>Driver</Label><Input value={driverLabel.get(editing.driverId) ?? editing.driverName} disabled /></div>
              <div className="space-y-1">
                <Label>Constructor</Label>
                <Select value={editConstructorId} onValueChange={setEditConstructorId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{constructors.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Car Number</Label><Input value={editCarNumber} onChange={(e) => setEditCarNumber(e.target.value)} /></div>
              <div className="space-y-1">
                <Label>Role</Label>
                <Select value={editRole} onValueChange={(value) => setEditRole(value as "race_driver" | "reserve" | "test")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="race_driver">race_driver</SelectItem>
                    <SelectItem value="reserve">reserve</SelectItem>
                    <SelectItem value="test">test</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {error ? <p className="text-sm text-red-700">{error}</p> : null}
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="secondary" disabled={updateMutation.isPending}>Cancel</Button></DialogClose>
                <Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? "Saving..." : "Save"}</Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          if (!open) setError(null);
          setIsCreateOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Entry</DialogTitle>
            <DialogDescription>Create a season entry that assigns a driver to a constructor.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const car = Number.parseInt(createCarNumber, 10);
              if (!createSeasonId || !createDriverId || !createConstructorId || !Number.isInteger(car) || car < 0) {
                setError("Please provide valid season, driver, constructor, and car number.");
                return;
              }
              void createMutation.mutateAsync();
            }}
          >
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Season</Label>
                <Select value={createSeasonId} onValueChange={setCreateSeasonId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{seasons.map((s) => <SelectItem key={s.id} value={s.id}>{s.year}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Driver</Label>
                <Select value={createDriverId} onValueChange={setCreateDriverId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{drivers.map((d) => <SelectItem key={d.id} value={d.id}>{d.givenName} {d.familyName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Constructor</Label>
                <Select value={createConstructorId} onValueChange={setCreateConstructorId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{constructors.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Car Number</Label>
                <Input value={createCarNumber} onChange={(e) => setCreateCarNumber(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Role</Label>
                <Select value={createRole} onValueChange={(value) => setCreateRole(value as "race_driver" | "reserve" | "test")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="race_driver">race_driver</SelectItem>
                    <SelectItem value="reserve">reserve</SelectItem>
                    <SelectItem value="test">test</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {error ? <p className="text-sm text-red-700">{error}</p> : null}
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="secondary" disabled={createMutation.isPending}>Cancel</Button></DialogClose>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Entry"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
