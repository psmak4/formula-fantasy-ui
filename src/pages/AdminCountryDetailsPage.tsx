import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { authClient } from "@/auth/authClient";
import { apiClient, ApiError } from "@/api/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

type CountryDetailsResponse = {
  country: {
    id: string;
    name: string;
    isoCode: string;
    nationality?: string | null;
    circuits: Array<{ id: string; name: string; city?: string | null }>;
    constructors: Array<{ id: string; name: string }>;
    drivers: Array<{ id: string; name: string }>;
  };
};

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Failed to load country details.";
}

export function AdminCountryDetailsPage() {
  const { countryId } = useParams<{ countryId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();

  const detailsQuery = useQuery({
    queryKey: ["admin-f1-country-details", countryId],
    enabled: Boolean(session?.user && countryId),
    queryFn: () => apiClient.get<CountryDetailsResponse>(`/admin/f1/countries/${countryId}`),
  });

  useEffect(() => {
    if (!isPending && !session?.user) {
      const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
      navigate(`/sign-in?redirect=${redirect}`, { replace: true });
    }
  }, [isPending, location.pathname, location.search, navigate, session?.user]);

  if (!isPending && !session?.user) return null;

  const country = detailsQuery.data?.country;

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <Link to="/admin/countries" className="text-sm font-medium text-red-700 hover:text-red-800">← Back to Countries</Link>
        <h2 className="font-['Orbitron'] text-3xl font-bold uppercase tracking-tight text-black">Country Details</h2>
      </div>

      {detailsQuery.isLoading || isPending ? <p className="text-slate-600">Loading country details...</p> : null}
      {detailsQuery.error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage(detailsQuery.error)}</p> : null}

      {country ? (
        <>
          <Card>
            <CardHeader><CardTitle>{country.name}</CardTitle></CardHeader>
            <CardContent className="grid gap-2 text-sm text-slate-700 md:grid-cols-3">
              <p><strong>ISO Code:</strong> {country.isoCode}</p>
              <p><strong>Nationality:</strong> {country.nationality ?? "-"}</p>
              <p><strong>Linked Records:</strong> {country.circuits.length + country.constructors.length + country.drivers.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Circuits</CardTitle></CardHeader>
            <CardContent>
              {country.circuits.length === 0 ? <p className="text-sm text-slate-600">No circuits.</p> : null}
              {country.circuits.length > 0 ? (
                <ul className="space-y-2 text-sm text-slate-700">
                  {country.circuits.map((circuit) => (
                    <li key={circuit.id}>
                      <Link className="font-medium text-red-700 hover:text-red-800" to={`/admin/circuits/${circuit.id}`}>
                        {circuit.name}
                      </Link>
                      {circuit.city ? ` (${circuit.city})` : ""}
                    </li>
                  ))}
                </ul>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Constructors</CardTitle></CardHeader>
            <CardContent>
              {country.constructors.length === 0 ? <p className="text-sm text-slate-600">No constructors.</p> : null}
              {country.constructors.length > 0 ? (
                <ul className="space-y-2 text-sm text-slate-700">
                  {country.constructors.map((constructorItem) => (
                    <li key={constructorItem.id}>
                      <Link className="font-medium text-red-700 hover:text-red-800" to={`/admin/constructors/${constructorItem.id}`}>
                        {constructorItem.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Drivers</CardTitle></CardHeader>
            <CardContent>
              {country.drivers.length === 0 ? <p className="text-sm text-slate-600">No drivers.</p> : null}
              {country.drivers.length > 0 ? (
                <ul className="space-y-2 text-sm text-slate-700">
                  {country.drivers.map((driver) => (
                    <li key={driver.id}>
                      <Link className="font-medium text-red-700 hover:text-red-800" to={`/admin/drivers/${driver.id}`}>
                        {driver.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </CardContent>
          </Card>
        </>
      ) : null}
    </section>
  );
}
