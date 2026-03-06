import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { authClient } from "@/auth/authClient";
import { apiClient, ApiError } from "@/api/apiClient";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Season = { id: string; year: number; rounds: number; raceCount: number };
type SeasonsResponse = { seasons: Season[] };

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

export function AdminSeasonsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session, isPending } = authClient.useSession();
  const [editing, setEditing] = useState<Season | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createYear, setCreateYear] = useState("");
  const [createRounds, setCreateRounds] = useState("");

  const seasonsQuery = useQuery({
    queryKey: ["admin-f1-seasons"],
    enabled: Boolean(session?.user),
    queryFn: () => apiClient.get<SeasonsResponse>("/admin/f1/seasons"),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { seasonId: string; rounds: number }) =>
      apiClient.put(`/admin/f1/seasons/${payload.seasonId}`, { rounds: payload.rounds }),
    onSuccess: async () => {
      setEditing(null);
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-f1-seasons"] });
    },
    onError: (error) => setFormError(errorMessage(error, "Failed to update season.")),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiClient.post("/admin/f1/seasons", {
        year: Number.parseInt(createYear, 10),
        rounds: Number.parseInt(createRounds, 10),
      }),
    onSuccess: async () => {
      setCreateYear("");
      setCreateRounds("");
      setIsCreateOpen(false);
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-f1-seasons"] });
    },
    onError: (error) => setFormError(errorMessage(error, "Failed to create season.")),
  });

  useEffect(() => {
    if (!isPending && !session?.user) {
      const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
      navigate(`/sign-in?redirect=${redirect}`, { replace: true });
    }
  }, [isPending, location.pathname, location.search, navigate, session?.user]);

  if (!isPending && !session?.user) return null;

  const seasons = seasonsQuery.data?.seasons ?? [];

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h2 className="font-['Orbitron'] text-3xl font-bold uppercase tracking-tight text-black">Seasons</h2>
          <p className="text-slate-600">Manage season configuration.</p>
        </div>
        <Button
          onClick={() => {
            setFormError(null);
            setIsCreateOpen(true);
          }}
        >
          Create Season
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Seasons</CardTitle></CardHeader>
        <CardContent>
          {seasonsQuery.isLoading || isPending ? <p className="text-slate-600">Loading seasons...</p> : null}
          {seasonsQuery.error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage(seasonsQuery.error, "Failed to load seasons")}</p> : null}
          {!seasonsQuery.isLoading && !seasonsQuery.error ? (
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Year</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Configured Rounds</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Imported Races</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {seasons.map((season) => (
                  <tr key={season.id} className="border-b border-neutral-200 last:border-0">
                    <td className="px-3 py-3">{season.year}</td>
                    <td className="px-3 py-3">{season.rounds}</td>
                    <td className="px-3 py-3">{season.raceCount}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" onClick={() => navigate(`/admin/seasons/${season.id}`)}>View</Button>
                        <Button size="sm" variant="secondary" onClick={() => setEditing(season)}>Edit</Button>
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
            <DialogTitle>Edit Season</DialogTitle>
            <DialogDescription>Update number of rounds for this season.</DialogDescription>
          </DialogHeader>
          {editing ? (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                const rounds = Number.parseInt(String(formData.get("rounds") ?? ""), 10);
                if (!Number.isInteger(rounds) || rounds <= 0) {
                  setFormError("Rounds must be a positive integer.");
                  return;
                }
                void updateMutation.mutateAsync({ seasonId: editing.id, rounds });
              }}
            >
              <div className="space-y-1"><Label>Year</Label><Input value={String(editing.year)} disabled /></div>
              <div className="space-y-1"><Label htmlFor="seasonRounds">Rounds</Label><Input id="seasonRounds" name="rounds" defaultValue={String(editing.rounds)} required /></div>
              {formError ? <p className="text-sm text-red-700">{formError}</p> : null}
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
          if (!open) setFormError(null);
          setIsCreateOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Season</DialogTitle>
            <DialogDescription>Create a new F1 season and configure its number of rounds.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const year = Number.parseInt(createYear, 10);
              const rounds = Number.parseInt(createRounds, 10);
              if (!Number.isInteger(year) || !Number.isInteger(rounds) || rounds <= 0) {
                setFormError("Valid year and rounds are required.");
                return;
              }
              void createMutation.mutateAsync();
            }}
          >
            <div className="space-y-3">
              <div className="space-y-1"><Label htmlFor="createSeasonYear">Year</Label><Input id="createSeasonYear" value={createYear} onChange={(e) => setCreateYear(e.target.value)} /></div>
              <div className="space-y-1"><Label htmlFor="createSeasonRounds">Rounds</Label><Input id="createSeasonRounds" value={createRounds} onChange={(e) => setCreateRounds(e.target.value)} /></div>
            </div>
            {formError ? <p className="text-sm text-red-700">{formError}</p> : null}
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="secondary" disabled={createMutation.isPending}>Cancel</Button></DialogClose>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Season"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
