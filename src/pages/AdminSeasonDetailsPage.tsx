import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { authClient } from "@/auth/authClient";
import { apiClient, ApiError } from "@/api/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

type SeasonDetailsResponse = {
  season: {
    id: string;
    year: number;
    rounds: number;
    raceCount: number;
    entryCount: number;
    races: Array<{
      id: string;
      round: number;
      name: string;
      status: string;
      raceStartAt: string;
      circuitId: string;
      circuitName: string;
      country?: string | null;
    }>;
    entries: Array<{
      id: string;
      driverId: string;
      driverName: string;
      constructorId: string;
      constructorName: string;
      carNumber: number;
      role: string;
    }>;
  };
};

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Failed to load season details.";
}

export function AdminSeasonDetailsPage() {
  const { seasonId } = useParams<{ seasonId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();

  const detailsQuery = useQuery({
    queryKey: ["admin-f1-season-details", seasonId],
    enabled: Boolean(session?.user && seasonId),
    queryFn: () => apiClient.get<SeasonDetailsResponse>(`/admin/f1/seasons/${seasonId}`),
  });

  useEffect(() => {
    if (!isPending && !session?.user) {
      const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
      navigate(`/sign-in?redirect=${redirect}`, { replace: true });
    }
  }, [isPending, location.pathname, location.search, navigate, session?.user]);

  if (!isPending && !session?.user) return null;

  const season = detailsQuery.data?.season;

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <Link to="/admin/seasons" className="text-sm font-medium text-red-700 hover:text-red-800">← Back to Seasons</Link>
        <h2 className="font-['Orbitron'] text-3xl font-bold uppercase tracking-tight text-black">Season Details</h2>
      </div>

      {detailsQuery.isLoading || isPending ? <p className="text-slate-600">Loading season details...</p> : null}
      {detailsQuery.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage(detailsQuery.error)}</p>
      ) : null}

      {season ? (
        <>
          <Card>
            <CardHeader><CardTitle>{season.year} Season</CardTitle></CardHeader>
            <CardContent className="grid gap-2 text-sm text-slate-700 md:grid-cols-3">
              <p><strong>Configured Rounds:</strong> {season.rounds}</p>
              <p><strong>Imported Races:</strong> {season.raceCount}</p>
              <p><strong>Season Entries:</strong> {season.entryCount}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Races</CardTitle></CardHeader>
            <CardContent>
              {season.races.length === 0 ? <p className="text-sm text-slate-600">No races in this season.</p> : null}
              {season.races.length > 0 ? (
                <table className="w-full table-fixed text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200">
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Round</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Race</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Circuit</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {season.races.map((race) => (
                      <tr key={race.id} className="border-b border-neutral-200 last:border-0">
                        <td className="px-3 py-3 align-top">{race.round}</td>
                        <td className="px-3 py-3 align-top whitespace-normal break-words">
                          <Link className="font-medium text-red-700 hover:text-red-800" to={`/admin/races/${race.id}`}>
                            {race.name}
                          </Link>
                        </td>
                        <td className="px-3 py-3 align-top whitespace-normal break-words">
                          <Link className="font-medium text-red-700 hover:text-red-800" to={`/admin/circuits/${race.circuitId}`}>
                            {race.circuitName}
                          </Link>
                          {race.country ? ` (${race.country})` : ""}
                        </td>
                        <td className="px-3 py-3 align-top whitespace-normal break-words">{race.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Driver / Constructor Entries</CardTitle></CardHeader>
            <CardContent>
              {season.entries.length === 0 ? <p className="text-sm text-slate-600">No entries in this season.</p> : null}
              {season.entries.length > 0 ? (
                <table className="w-full table-fixed text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200">
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Driver</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Constructor</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Car #</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {season.entries.map((entry) => (
                      <tr key={entry.id} className="border-b border-neutral-200 last:border-0">
                        <td className="px-3 py-3 align-top whitespace-normal break-words">
                          <Link className="font-medium text-red-700 hover:text-red-800" to={`/admin/drivers/${entry.driverId}`}>
                            {entry.driverName}
                          </Link>
                        </td>
                        <td className="px-3 py-3 align-top whitespace-normal break-words">
                          <Link className="font-medium text-red-700 hover:text-red-800" to={`/admin/constructors/${entry.constructorId}`}>
                            {entry.constructorName}
                          </Link>
                        </td>
                        <td className="px-3 py-3 align-top">{entry.carNumber}</td>
                        <td className="px-3 py-3 align-top whitespace-normal break-words">{entry.role}</td>
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
