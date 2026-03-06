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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Circuit = {
  id: string;
  circuitRef: string;
  name: string;
  fullName?: string | null;
  city?: string | null;
  lengthKm?: number | null;
  countryId?: string | null;
  countryName?: string | null;
};

type CircuitsResponse = { circuits: Circuit[] };
type CountriesResponse = { countries: Array<{ id: string; name: string; isoCode: string }> };

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

export function AdminCircuitsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session, isPending } = authClient.useSession();
  const [editing, setEditing] = useState<Circuit | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [countryId, setCountryId] = useState<string>("none");
  const [formError, setFormError] = useState<string | null>(null);
  const [createCircuitRef, setCreateCircuitRef] = useState("");
  const [createName, setCreateName] = useState("");
  const [createFullName, setCreateFullName] = useState("");
  const [createCity, setCreateCity] = useState("");
  const [createLengthKm, setCreateLengthKm] = useState("");
  const [createCountryId, setCreateCountryId] = useState<string>("none");

  const circuitsQuery = useQuery({
    queryKey: ["admin-f1-circuits"],
    enabled: Boolean(session?.user),
    queryFn: () => apiClient.get<CircuitsResponse>("/admin/f1/circuits"),
  });

  const countriesQuery = useQuery({
    queryKey: ["admin-f1-countries-options"],
    enabled: Boolean(session?.user),
    queryFn: async () => {
      const data = await apiClient.get<CountriesResponse>("/admin/f1/countries");
      return data.countries.map((row) => ({ id: row.id, name: row.name }));
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { circuitId: string; name: string; fullName: string; city: string; lengthKm: string; countryId: string }) =>
      apiClient.put(`/admin/f1/circuits/${payload.circuitId}`, {
        name: payload.name,
        fullName: payload.fullName.trim() ? payload.fullName.trim() : null,
        city: payload.city.trim() ? payload.city.trim() : null,
        lengthKm: payload.lengthKm.trim() ? Number(payload.lengthKm) : null,
        countryId: payload.countryId === "none" ? null : payload.countryId,
      }),
    onSuccess: async () => {
      setEditing(null);
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-f1-circuits"] });
    },
    onError: (error) => setFormError(errorMessage(error, "Failed to update circuit.")),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiClient.post("/admin/f1/circuits", {
        circuitRef: createCircuitRef.trim(),
        name: createName.trim(),
        fullName: createFullName.trim() ? createFullName.trim() : null,
        city: createCity.trim() ? createCity.trim() : null,
        lengthKm: createLengthKm.trim() ? Number(createLengthKm) : null,
        countryId: createCountryId === "none" ? null : createCountryId,
      }),
    onSuccess: async () => {
      setCreateCircuitRef("");
      setCreateName("");
      setCreateFullName("");
      setCreateCity("");
      setCreateLengthKm("");
      setCreateCountryId("none");
      setIsCreateOpen(false);
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-f1-circuits"] });
    },
    onError: (error) => setFormError(errorMessage(error, "Failed to create circuit.")),
  });

  useEffect(() => {
    if (!isPending && !session?.user) {
      const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
      navigate(`/sign-in?redirect=${redirect}`, { replace: true });
    }
  }, [isPending, location.pathname, location.search, navigate, session?.user]);

  useEffect(() => {
    if (editing) {
      setCountryId(editing.countryId ?? "none");
    }
  }, [editing]);

  if (!isPending && !session?.user) return null;

  const circuits = circuitsQuery.data?.circuits ?? [];
  const countries = countriesQuery.data ?? [];

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h2 className="font-['Orbitron'] text-3xl font-bold uppercase tracking-tight text-black">Circuits</h2>
          <p className="text-slate-600">Manage race circuit metadata.</p>
        </div>
        <Button
          onClick={() => {
            setFormError(null);
            setIsCreateOpen(true);
          }}
        >
          Create Circuit
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Circuits</CardTitle>
        </CardHeader>
        <CardContent>
          {circuitsQuery.isLoading || isPending ? <p className="text-slate-600">Loading circuits...</p> : null}
          {circuitsQuery.error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage(circuitsQuery.error, "Failed to load circuits")}</p>
          ) : null}
          {!circuitsQuery.isLoading && !circuitsQuery.error ? (
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Name</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Country</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">City</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Length</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {circuits.map((circuit) => (
                  <tr key={circuit.id} className="border-b border-neutral-200 last:border-0">
                    <td className="px-3 py-3 align-top whitespace-normal break-words">{circuit.name}</td>
                    <td className="px-3 py-3 align-top whitespace-normal break-words">{circuit.countryName ?? "-"}</td>
                    <td className="px-3 py-3 align-top whitespace-normal break-words">{circuit.city ?? "-"}</td>
                    <td className="px-3 py-3 align-top whitespace-normal break-words">{circuit.lengthKm ?? "-"}</td>
                    <td className="px-3 py-3 align-top">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" onClick={() => navigate(`/admin/circuits/${circuit.id}`)}>View</Button>
                        <Button size="sm" variant="secondary" onClick={() => setEditing(circuit)}>Edit</Button>
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
            <DialogTitle>Edit Circuit</DialogTitle>
            <DialogDescription>Update circuit details.</DialogDescription>
          </DialogHeader>
          {editing ? (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                const name = String(formData.get("name") ?? "").trim();
                if (!name) {
                  setFormError("Name is required.");
                  return;
                }
                void updateMutation.mutateAsync({
                  circuitId: editing.id,
                  name,
                  fullName: String(formData.get("fullName") ?? ""),
                  city: String(formData.get("city") ?? ""),
                  lengthKm: String(formData.get("lengthKm") ?? ""),
                  countryId,
                });
              }}
            >
              <div className="space-y-1"><Label htmlFor="circuitName">Name</Label><Input id="circuitName" name="name" defaultValue={editing.name} required /></div>
              <div className="space-y-1"><Label htmlFor="circuitFullName">Full Name</Label><Input id="circuitFullName" name="fullName" defaultValue={editing.fullName ?? ""} /></div>
              <div className="space-y-1"><Label htmlFor="circuitCity">City</Label><Input id="circuitCity" name="city" defaultValue={editing.city ?? ""} /></div>
              <div className="space-y-1"><Label htmlFor="circuitLength">Length (km)</Label><Input id="circuitLength" name="lengthKm" defaultValue={editing.lengthKm ?? ""} /></div>
              <div className="space-y-1">
                <Label>Country</Label>
                <Select value={countryId} onValueChange={setCountryId}>
                  <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {countries.map((country) => <SelectItem key={country.id} value={country.id}>{country.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
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
            <DialogTitle>Create Circuit</DialogTitle>
            <DialogDescription>Create a race circuit record for schedule and race metadata.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!createCircuitRef.trim() || !createName.trim()) {
                setFormError("Circuit reference and name are required.");
                return;
              }
              void createMutation.mutateAsync();
            }}
          >
            <div className="space-y-3">
              <div className="space-y-1"><Label htmlFor="createCircuitRef">Reference</Label><Input id="createCircuitRef" value={createCircuitRef} onChange={(e) => setCreateCircuitRef(e.target.value)} /></div>
              <div className="space-y-1"><Label htmlFor="createCircuitName">Name</Label><Input id="createCircuitName" value={createName} onChange={(e) => setCreateName(e.target.value)} /></div>
              <div className="space-y-1"><Label htmlFor="createCircuitFullName">Full Name</Label><Input id="createCircuitFullName" value={createFullName} onChange={(e) => setCreateFullName(e.target.value)} /></div>
              <div className="space-y-1"><Label htmlFor="createCircuitCity">City</Label><Input id="createCircuitCity" value={createCity} onChange={(e) => setCreateCity(e.target.value)} /></div>
              <div className="space-y-1"><Label htmlFor="createCircuitLength">Length (km)</Label><Input id="createCircuitLength" value={createLengthKm} onChange={(e) => setCreateLengthKm(e.target.value)} /></div>
              <div className="space-y-1">
                <Label>Country</Label>
                <Select value={createCountryId} onValueChange={setCreateCountryId}>
                  <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {countries.map((country) => <SelectItem key={country.id} value={country.id}>{country.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {formError ? <p className="text-sm text-red-700">{formError}</p> : null}
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="secondary" disabled={createMutation.isPending}>Cancel</Button></DialogClose>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Circuit"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
