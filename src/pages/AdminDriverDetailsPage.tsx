import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { authClient } from "@/auth/authClient";
import { apiClient, ApiError } from "@/api/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

type DriverDetailsResponse = {
  driver: {
    id: string;
    externalId: string;
    givenName: string;
    familyName: string;
    code?: string | null;
    number?: number | null;
    country?: string | null;
    createdAt: string;
    seasonAssignments: Array<{
      entryId: string;
      seasonId: string;
      seasonYear: number;
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
  return "Failed to load driver details.";
}

export function AdminDriverDetailsPage() {
  const { driverId } = useParams<{ driverId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();

  const detailsQuery = useQuery({
    queryKey: ["admin-f1-driver-details", driverId],
    enabled: Boolean(session?.user && driverId),
    queryFn: () => apiClient.get<DriverDetailsResponse>(`/admin/f1/drivers/${driverId}`),
  });

  useEffect(() => {
    if (!isPending && !session?.user) {
      const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
      navigate(`/sign-in?redirect=${redirect}`, { replace: true });
    }
  }, [isPending, location.pathname, location.search, navigate, session?.user]);

  if (!isPending && !session?.user) return null;

  const driver = detailsQuery.data?.driver;

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <Link to="/admin/drivers" className="text-sm font-medium text-red-700 hover:text-red-800">← Back to Drivers</Link>
        <h2 className="font-['Orbitron'] text-3xl font-bold uppercase tracking-tight text-black">Driver Details</h2>
      </div>

      {detailsQuery.isLoading || isPending ? <p className="text-slate-600">Loading driver details...</p> : null}
      {detailsQuery.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage(detailsQuery.error)}</p>
      ) : null}

      {driver ? (
        <>
          <Card>
            <CardHeader><CardTitle>{driver.givenName} {driver.familyName}</CardTitle></CardHeader>
            <CardContent className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
              <p><strong>Reference:</strong> {driver.externalId}</p>
              <p><strong>Abbreviation:</strong> {driver.code ?? "-"}</p>
              <p><strong>Permanent Number:</strong> {driver.number ?? "-"}</p>
              <p><strong>Country:</strong> {driver.country ?? "-"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Constructor / Season History</CardTitle></CardHeader>
            <CardContent>
              {driver.seasonAssignments.length === 0 ? <p className="text-sm text-slate-600">No season assignments.</p> : null}
              {driver.seasonAssignments.length > 0 ? (
                <table className="w-full table-fixed text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200">
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Season</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Constructor</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Car #</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {driver.seasonAssignments.map((assignment) => (
                      <tr key={assignment.entryId} className="border-b border-neutral-200 last:border-0">
                        <td className="px-3 py-3 align-top whitespace-normal break-words">
                          <Link className="font-medium text-red-700 hover:text-red-800" to={`/admin/seasons/${assignment.seasonId}`}>
                            {assignment.seasonYear}
                          </Link>
                        </td>
                        <td className="px-3 py-3 align-top whitespace-normal break-words">
                          <Link className="font-medium text-red-700 hover:text-red-800" to={`/admin/constructors/${assignment.constructorId}`}>
                            {assignment.constructorName}
                          </Link>
                        </td>
                        <td className="px-3 py-3 align-top">{assignment.carNumber}</td>
                        <td className="px-3 py-3 align-top whitespace-normal break-words">{assignment.role}</td>
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
