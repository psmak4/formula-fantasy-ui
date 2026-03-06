import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { authClient } from "@/auth/authClient";
import { apiClient, ApiError } from "@/api/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

type ConstructorDetailsResponse = {
  constructor: {
    id: string;
    externalId: string;
    name: string;
    fullName?: string | null;
    country?: string | null;
    createdAt: string;
    activeSeasonYears: number[];
    entries: Array<{
      id: string;
      seasonId: string;
      seasonYear: number;
      driverId: string;
      driverName: string;
      carNumber: number;
      role: string;
    }>;
  };
};

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Failed to load constructor details.";
}

export function AdminConstructorDetailsPage() {
  const { constructorId } = useParams<{ constructorId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();

  const detailsQuery = useQuery({
    queryKey: ["admin-f1-constructor-details", constructorId],
    enabled: Boolean(session?.user && constructorId),
    queryFn: () => apiClient.get<ConstructorDetailsResponse>(`/admin/f1/constructors/${constructorId}`),
  });

  useEffect(() => {
    if (!isPending && !session?.user) {
      const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
      navigate(`/sign-in?redirect=${redirect}`, { replace: true });
    }
  }, [isPending, location.pathname, location.search, navigate, session?.user]);

  if (!isPending && !session?.user) return null;

  const constructorData = detailsQuery.data?.constructor;

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <Link to="/admin/constructors" className="text-sm font-medium text-red-700 hover:text-red-800">← Back to Constructors</Link>
        <h2 className="font-['Orbitron'] text-3xl font-bold uppercase tracking-tight text-black">Constructor Details</h2>
      </div>

      {detailsQuery.isLoading || isPending ? <p className="text-slate-600">Loading constructor details...</p> : null}
      {detailsQuery.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage(detailsQuery.error)}</p>
      ) : null}

      {constructorData ? (
        <>
          <Card>
            <CardHeader><CardTitle>{constructorData.name}</CardTitle></CardHeader>
            <CardContent className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
              <p><strong>Reference:</strong> {constructorData.externalId}</p>
              <p><strong>Country:</strong> {constructorData.country ?? "-"}</p>
              <p><strong>Full Name:</strong> {constructorData.fullName ?? "-"}</p>
              <p><strong>Season Years:</strong> {constructorData.activeSeasonYears.length > 0 ? constructorData.activeSeasonYears.join(", ") : "-"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Season / Driver History</CardTitle></CardHeader>
            <CardContent>
              {constructorData.entries.length === 0 ? <p className="text-sm text-slate-600">No season entries.</p> : null}
              {constructorData.entries.length > 0 ? (
                <table className="w-full table-fixed text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200">
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Season</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Driver</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Car #</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {constructorData.entries.map((entry) => (
                      <tr key={entry.id} className="border-b border-neutral-200 last:border-0">
                        <td className="px-3 py-3 align-top whitespace-normal break-words">
                          <Link className="font-medium text-red-700 hover:text-red-800" to={`/admin/seasons/${entry.seasonId}`}>
                            {entry.seasonYear}
                          </Link>
                        </td>
                        <td className="px-3 py-3 align-top whitespace-normal break-words">
                          <Link className="font-medium text-red-700 hover:text-red-800" to={`/admin/drivers/${entry.driverId}`}>
                            {entry.driverName}
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
