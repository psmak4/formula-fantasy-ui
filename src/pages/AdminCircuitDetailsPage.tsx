import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { authClient } from "@/auth/authClient";
import { apiClient, ApiError } from "@/api/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

type CircuitDetailsResponse = {
  circuit: {
    id: string;
    circuitRef: string;
    name: string;
    fullName?: string | null;
    city?: string | null;
    lengthKm?: number | null;
    countryId?: string | null;
    countryName?: string | null;
    races: Array<{
      id: string;
      seasonId: string;
      seasonYear: number;
      round: number;
      name: string;
      status: string;
      raceStartAt: string;
    }>;
  };
};

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Failed to load circuit details.";
}

export function AdminCircuitDetailsPage() {
  const { circuitId } = useParams<{ circuitId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();

  const detailsQuery = useQuery({
    queryKey: ["admin-f1-circuit-details", circuitId],
    enabled: Boolean(session?.user && circuitId),
    queryFn: () => apiClient.get<CircuitDetailsResponse>(`/admin/f1/circuits/${circuitId}`),
  });

  useEffect(() => {
    if (!isPending && !session?.user) {
      const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
      navigate(`/sign-in?redirect=${redirect}`, { replace: true });
    }
  }, [isPending, location.pathname, location.search, navigate, session?.user]);

  if (!isPending && !session?.user) return null;

  const circuit = detailsQuery.data?.circuit;

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <Link to="/admin/circuits" className="text-sm font-medium text-red-700 hover:text-red-800">← Back to Circuits</Link>
        <h2 className="font-['Orbitron'] text-3xl font-bold uppercase tracking-tight text-black">Circuit Details</h2>
      </div>

      {detailsQuery.isLoading || isPending ? <p className="text-slate-600">Loading circuit details...</p> : null}
      {detailsQuery.error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage(detailsQuery.error)}</p> : null}

      {circuit ? (
        <>
          <Card>
            <CardHeader><CardTitle>{circuit.name}</CardTitle></CardHeader>
            <CardContent className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
              <p><strong>Reference:</strong> {circuit.circuitRef}</p>
              <p><strong>Full Name:</strong> {circuit.fullName ?? "-"}</p>
              <p><strong>City:</strong> {circuit.city ?? "-"}</p>
              <p><strong>Length (km):</strong> {circuit.lengthKm ?? "-"}</p>
              <p>
                <strong>Country:</strong>{" "}
                {circuit.countryId ? (
                  <Link className="font-medium text-red-700 hover:text-red-800" to={`/admin/countries/${circuit.countryId}`}>
                    {circuit.countryName ?? "-"}
                  </Link>
                ) : (circuit.countryName ?? "-")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Race History</CardTitle></CardHeader>
            <CardContent>
              {circuit.races.length === 0 ? <p className="text-sm text-slate-600">No races found for this circuit.</p> : null}
              {circuit.races.length > 0 ? (
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
                    {circuit.races.map((race) => (
                      <tr key={race.id} className="border-b border-neutral-200 last:border-0">
                        <td className="px-3 py-3 align-top whitespace-normal break-words">
                          <Link className="font-medium text-red-700 hover:text-red-800" to={`/admin/seasons/${race.seasonId}`}>
                            {race.seasonYear}
                          </Link>
                        </td>
                        <td className="px-3 py-3 align-top">{race.round}</td>
                        <td className="px-3 py-3 align-top whitespace-normal break-words">
                          <Link className="font-medium text-red-700 hover:text-red-800" to={`/admin/races/${race.id}`}>
                            {race.name}
                          </Link>
                        </td>
                        <td className="px-3 py-3 align-top whitespace-normal break-words">{race.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </CardContent>
          </Card>
        </>
      ) : null}
    </section>
  );
}
