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

type Country = {
  id: string;
  name: string;
  isoCode: string;
  nationality?: string | null;
};

type CountriesResponse = { countries: Country[] };

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

export function AdminCountriesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session, isPending } = authClient.useSession();
  const [editing, setEditing] = useState<Country | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createName, setCreateName] = useState("");
  const [createIsoCode, setCreateIsoCode] = useState("");
  const [createNationality, setCreateNationality] = useState("");

  const countriesQuery = useQuery({
    queryKey: ["admin-f1-countries"],
    enabled: Boolean(session?.user),
    queryFn: () => apiClient.get<CountriesResponse>("/admin/f1/countries"),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { countryId: string; name: string; isoCode: string; nationality: string }) =>
      apiClient.put(`/admin/f1/countries/${payload.countryId}`, {
        name: payload.name,
        isoCode: payload.isoCode,
        nationality: payload.nationality.trim() ? payload.nationality.trim() : null,
      }),
    onSuccess: async () => {
      setEditing(null);
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-f1-countries"] });
    },
    onError: (error) => setFormError(errorMessage(error, "Failed to update country.")),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiClient.post("/admin/f1/countries", {
        name: createName.trim(),
        isoCode: createIsoCode.trim().toUpperCase(),
        nationality: createNationality.trim() ? createNationality.trim() : null,
      }),
    onSuccess: async () => {
      setCreateName("");
      setCreateIsoCode("");
      setCreateNationality("");
      setIsCreateOpen(false);
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-f1-countries"] });
    },
    onError: (error) => setFormError(errorMessage(error, "Failed to create country.")),
  });

  useEffect(() => {
    if (!isPending && !session?.user) {
      const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
      navigate(`/sign-in?redirect=${redirect}`, { replace: true });
    }
  }, [isPending, location.pathname, location.search, navigate, session?.user]);

  if (!isPending && !session?.user) return null;

  const countries = countriesQuery.data?.countries ?? [];

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h2 className="font-['Orbitron'] text-3xl font-bold uppercase tracking-tight text-black">Countries</h2>
          <p className="text-slate-600">Manage country records used by drivers, constructors, and circuits.</p>
        </div>
        <Button
          onClick={() => {
            setFormError(null);
            setIsCreateOpen(true);
          }}
        >
          Create Country
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Countries</CardTitle>
        </CardHeader>
        <CardContent>
          {countriesQuery.isLoading || isPending ? <p className="text-slate-600">Loading countries...</p> : null}
          {countriesQuery.error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage(countriesQuery.error, "Failed to load countries")}
            </p>
          ) : null}
          {!countriesQuery.isLoading && !countriesQuery.error ? (
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Name</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">ISO</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Nationality</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {countries.map((country) => (
                  <tr key={country.id} className="border-b border-neutral-200 last:border-0">
                    <td className="px-3 py-3 align-top whitespace-normal break-words">{country.name}</td>
                    <td className="px-3 py-3 align-top whitespace-normal break-words">{country.isoCode}</td>
                    <td className="px-3 py-3 align-top whitespace-normal break-words">{country.nationality ?? "-"}</td>
                    <td className="px-3 py-3 align-top">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" onClick={() => navigate(`/admin/countries/${country.id}`)}>View</Button>
                        <Button size="sm" variant="secondary" onClick={() => setEditing(country)}>Edit</Button>
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
            <DialogTitle>Edit Country</DialogTitle>
            <DialogDescription>Update country metadata.</DialogDescription>
          </DialogHeader>
          {editing ? (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                const name = String(formData.get("name") ?? "").trim();
                const isoCode = String(formData.get("isoCode") ?? "").trim().toUpperCase();
                const nationality = String(formData.get("nationality") ?? "");
                if (!name || isoCode.length !== 2) {
                  setFormError("Name and 2-letter ISO code are required.");
                  return;
                }
                void updateMutation.mutateAsync({ countryId: editing.id, name, isoCode, nationality });
              }}
            >
              <div className="space-y-1">
                <Label htmlFor="countryName">Name</Label>
                <Input id="countryName" name="name" defaultValue={editing.name} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="countryIso">ISO Code</Label>
                <Input id="countryIso" name="isoCode" defaultValue={editing.isoCode} maxLength={2} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="countryNationality">Nationality</Label>
                <Input id="countryNationality" name="nationality" defaultValue={editing.nationality ?? ""} />
              </div>
              {formError ? <p className="text-sm text-red-700">{formError}</p> : null}
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="secondary" disabled={updateMutation.isPending}>Cancel</Button>
                </DialogClose>
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
            <DialogTitle>Create Country</DialogTitle>
            <DialogDescription>Create a country record for driver, constructor, and circuit metadata.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!createName.trim() || createIsoCode.trim().length !== 2) {
                setFormError("Country name and 2-letter ISO code are required.");
                return;
              }
              void createMutation.mutateAsync();
            }}
          >
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="countryCreateName">Name</Label>
                <Input id="countryCreateName" value={createName} onChange={(e) => setCreateName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="countryCreateIso">ISO Code</Label>
                <Input id="countryCreateIso" value={createIsoCode} maxLength={2} onChange={(e) => setCreateIsoCode(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="countryCreateNationality">Nationality</Label>
                <Input id="countryCreateNationality" value={createNationality} onChange={(e) => setCreateNationality(e.target.value)} />
              </div>
            </div>
            {formError ? <p className="text-sm text-red-700">{formError}</p> : null}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary" disabled={createMutation.isPending}>Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Country"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
