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

type AdminDriver = {
  id: string;
  externalId: string;
  constructorName?: string | null;
  givenName: string;
  familyName: string;
  code?: string | null;
  number?: number | null;
  country?: string | null;
  seasonAssignments?: Array<{
    seasonYear: number;
    constructorName?: string | null;
  }>;
};

type AdminDriversResponse = { drivers: AdminDriver[] };
type AdminCountriesResponse = { countries: Array<{ id: string; name: string; isoCode: string }> };

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

export function AdminDriversPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session, isPending } = authClient.useSession();
  const [editing, setEditing] = useState<AdminDriver | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>("none");
  const [formError, setFormError] = useState<string | null>(null);

  const driversQuery = useQuery({
    queryKey: ["admin-f1-drivers"],
    enabled: Boolean(session?.user),
    queryFn: () => apiClient.get<AdminDriversResponse>("/admin/f1/drivers"),
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
    mutationFn: async (payload: {
      driverId: string;
      givenName: string;
      familyName: string;
      code: string;
      number: string;
      country: string;
    }) => {
      const parsedNumber = payload.number.trim() ? Number.parseInt(payload.number, 10) : null;
      return apiClient.put(`/admin/f1/drivers/${payload.driverId}`, {
        givenName: payload.givenName,
        familyName: payload.familyName,
        code: payload.code.trim() ? payload.code.trim() : null,
        number: Number.isFinite(parsedNumber) ? parsedNumber : null,
        country: payload.country.trim() ? payload.country.trim() : null,
      });
    },
    onSuccess: async () => {
      setEditing(null);
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-f1-drivers"] });
    },
    onError: (error: unknown) => {
      setFormError(getErrorMessage(error, "Failed to update driver."));
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

  const drivers = driversQuery.data?.drivers ?? [];
  const countries = countriesQuery.data ?? [];

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h2 className="font-['Orbitron'] text-3xl font-bold uppercase tracking-tight text-black">Drivers</h2>
        <p className="text-slate-600">Core driver data. Season assignments are managed on the Entries page.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Drivers</CardTitle></CardHeader>
        <CardContent>
          {driversQuery.isLoading || isPending ? <p className="text-slate-600">Loading drivers...</p> : null}
          {driversQuery.error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{getErrorMessage(driversQuery.error, "Failed to load drivers")}</p>
          ) : null}
          {!driversQuery.isLoading && !driversQuery.error ? (
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Driver</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Ref</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Season / Constructor</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Country</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((driver) => (
                  <tr key={driver.id} className="border-b border-neutral-200 last:border-0">
                    <td className="px-3 py-3 align-top whitespace-normal break-words">
                      <p className="font-medium text-slate-900">{driver.givenName} {driver.familyName}</p>
                      <p className="text-xs text-slate-600">{driver.code ?? "-"} / {driver.number ?? "-"}</p>
                    </td>
                    <td className="px-3 py-3 align-top whitespace-normal break-all">{driver.externalId}</td>
                    <td className="px-3 py-3 align-top whitespace-normal break-words">
                      {(driver.seasonAssignments ?? []).length > 0
                        ? (driver.seasonAssignments ?? []).map((entry) => `${entry.seasonYear} - ${entry.constructorName ?? "Unknown"}`).join(", ")
                        : "No assignments"}
                    </td>
                    <td className="px-3 py-3 align-top whitespace-normal break-words">{driver.country ?? "-"}</td>
                    <td className="px-3 py-3 align-top">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" onClick={() => navigate(`/admin/drivers/${driver.id}`)}>View</Button>
                        <Button size="sm" variant="secondary" onClick={() => { setFormError(null); setEditing(driver); }}>Edit</Button>
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
            <DialogTitle>Edit Driver</DialogTitle>
            <DialogDescription>Update permanent driver metadata.</DialogDescription>
          </DialogHeader>
          {editing ? (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                const givenName = String(formData.get("givenName") ?? "").trim();
                const familyName = String(formData.get("familyName") ?? "").trim();
                if (!givenName || !familyName) {
                  setFormError("First and last name are required.");
                  return;
                }
                void updateMutation.mutateAsync({
                  driverId: editing.id,
                  givenName,
                  familyName,
                  code: String(formData.get("code") ?? ""),
                  number: String(formData.get("number") ?? ""),
                  country: selectedCountry === "none" ? "" : selectedCountry,
                });
              }}
            >
              <div className="space-y-1"><Label htmlFor="driverGivenName">First Name</Label><Input id="driverGivenName" name="givenName" defaultValue={editing.givenName} required /></div>
              <div className="space-y-1"><Label htmlFor="driverFamilyName">Last Name</Label><Input id="driverFamilyName" name="familyName" defaultValue={editing.familyName} required /></div>
              <div className="space-y-1"><Label htmlFor="driverCode">Abbreviation</Label><Input id="driverCode" name="code" defaultValue={editing.code ?? ""} /></div>
              <div className="space-y-1"><Label htmlFor="driverNumber">Permanent Number</Label><Input id="driverNumber" name="number" defaultValue={editing.number ?? ""} /></div>
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
