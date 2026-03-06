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

type AdminConstructor = {
  id: string;
  externalId: string;
  name: string;
  country?: string | null;
  createdAt: string;
  activeSeasonYears?: number[];
};

type AdminConstructorsResponse = { constructors: AdminConstructor[] };
type AdminCountriesResponse = { countries: Array<{ id: string; name: string; isoCode: string }> };

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

export function AdminConstructorsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session, isPending } = authClient.useSession();
  const [editing, setEditing] = useState<AdminConstructor | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>("none");
  const [formError, setFormError] = useState<string | null>(null);

  const constructorsQuery = useQuery({
    queryKey: ["admin-f1-constructors"],
    enabled: Boolean(session?.user),
    queryFn: () => apiClient.get<AdminConstructorsResponse>("/admin/f1/constructors"),
  });

  const countriesQuery = useQuery({
    queryKey: ["admin-f1-countries-options"],
    enabled: Boolean(session?.user),
    queryFn: async () => {
      const data = await apiClient.get<AdminCountriesResponse>("/admin/f1/countries");
      return data.countries;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: { constructorId: string; name: string; country: string }) =>
      apiClient.put(`/admin/f1/constructors/${payload.constructorId}`, {
        name: payload.name,
        country: payload.country.trim() ? payload.country.trim() : null,
      }),
    onSuccess: async () => {
      setEditing(null);
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-f1-constructors"] });
    },
    onError: (error: unknown) => {
      setFormError(getErrorMessage(error, "Failed to update constructor."));
    },
  });

  useEffect(() => {
    if (!isPending && !session?.user) {
      const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
      navigate(`/sign-in?redirect=${redirect}`, { replace: true });
    }
  }, [isPending, location.pathname, location.search, navigate, session?.user]);

  useEffect(() => {
    if (!editing) {
      setSelectedCountry("none");
      return;
    }
    const countries = countriesQuery.data ?? [];
    const matched = countries.find((country) => country.name === (editing.country ?? ""));
    setSelectedCountry(matched?.name ?? "none");
  }, [editing, countriesQuery.data]);

  if (!isPending && !session?.user) return null;

  const constructors = constructorsQuery.data?.constructors ?? [];
  const countries = countriesQuery.data ?? [];

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h2 className="font-['Orbitron'] text-3xl font-bold uppercase tracking-tight text-black">Constructors</h2>
        <p className="text-slate-600">Core constructor data. Season participation is managed on the Entries page.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Constructors</CardTitle></CardHeader>
        <CardContent>
          {constructorsQuery.isLoading || isPending ? <p className="text-slate-600">Loading constructors...</p> : null}
          {constructorsQuery.error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {getErrorMessage(constructorsQuery.error, "Failed to load constructors")}
            </p>
          ) : null}
          {!constructorsQuery.isLoading && !constructorsQuery.error ? (
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Name</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Ref</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Country</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Seasons</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {constructors.map((item) => (
                  <tr key={item.id} className="border-b border-neutral-200 last:border-0">
                    <td className="px-3 py-3 font-medium text-slate-900 align-top whitespace-normal break-words">{item.name}</td>
                    <td className="px-3 py-3 text-slate-600 align-top whitespace-normal break-all">{item.externalId}</td>
                    <td className="px-3 py-3 align-top whitespace-normal break-words">{item.country ?? "-"}</td>
                    <td className="px-3 py-3 align-top whitespace-normal break-words">
                      {(item.activeSeasonYears ?? []).length > 0 ? (item.activeSeasonYears ?? []).join(", ") : "-"}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" onClick={() => navigate(`/admin/constructors/${item.id}`)}>View</Button>
                        <Button size="sm" variant="secondary" onClick={() => { setFormError(null); setEditing(item); }}>Edit</Button>
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
            <DialogTitle>Edit Constructor</DialogTitle>
            <DialogDescription>Update constructor metadata.</DialogDescription>
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
                  constructorId: editing.id,
                  name,
                  country: selectedCountry === "none" ? "" : selectedCountry,
                });
              }}
            >
              <div className="space-y-1"><Label htmlFor="constructorName">Name</Label><Input id="constructorName" name="name" defaultValue={editing.name} required /></div>
              <div className="space-y-1">
                <Label>Country</Label>
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {countries.map((country) => (
                      <SelectItem key={country.id} value={country.name}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {formError ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p> : null}
              <DialogFooter>
                <DialogClose asChild><Button variant="secondary" disabled={updateMutation.isPending}>Cancel</Button></DialogClose>
                <Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? "Saving..." : "Save"}</Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
