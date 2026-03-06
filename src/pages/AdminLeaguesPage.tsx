import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { authClient } from "@/auth/authClient";
import { apiClient, ApiError } from "@/api/apiClient";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

type AdminLeague = {
  id: string;
  name: string;
  visibility: "public" | "private";
  createdAt: string;
  memberCount: number;
};

type AdminLeaguesResponse = {
  leagues: AdminLeague[];
};

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unable to load leagues.";
}

export function AdminLeaguesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session?.user) {
      const redirect = encodeURIComponent(
        `${location.pathname}${location.search}`,
      );
      navigate(`/sign-in?redirect=${redirect}`, { replace: true });
    }
  }, [isPending, location.pathname, location.search, navigate, session?.user]);

  const leaguesQuery = useQuery({
    queryKey: ["admin-leagues"],
    enabled: Boolean(session?.user),
    queryFn: () => apiClient.get<AdminLeaguesResponse>("/admin/leagues"),
  });

  if (!isPending && !session?.user) {
    return null;
  }

  const leagues = leaguesQuery.data?.leagues ?? [];
  const loading = isPending || leaguesQuery.isLoading;
  const errorMessage = leaguesQuery.error
    ? getErrorMessage(leaguesQuery.error)
    : null;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="font-['Orbitron'] text-3xl font-bold uppercase tracking-tight text-black">
          Leagues
        </h2>
        <p className="text-slate-600">View all public and private leagues.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <CardTitle>League Directory</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-slate-600">Loading leagues...</p>
          ) : null}

          {!loading && errorMessage ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          {!loading && !errorMessage ? (
            <div>
              <table className="w-full table-fixed text-sm">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className="px-3 py-2 text-left font-medium text-slate-500 whitespace-normal wrap-break-word">
                      League
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-slate-500 whitespace-normal wrap-break-word">
                      Visibility
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-slate-500 whitespace-normal wrap-break-word">
                      Members
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-slate-500 whitespace-normal wrap-break-word">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leagues.map((league) => (
                    <tr
                      key={league.id}
                      className="border-b border-neutral-200 last:border-0"
                    >
                      <td className="px-3 py-3 whitespace-normal wrap-break-word align-top">
                        <div className="space-y-0.5">
                          <p className="font-medium text-slate-900">
                            {league.name}
                          </p>
                          <p className="text-xs text-slate-500 break-all">
                            {league.id}
                          </p>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-normal wrap-break-word align-top">
                        <Badge
                          tone={
                            league.visibility === "public" ? "info" : "warning"
                          }
                        >
                          {league.visibility}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 whitespace-normal wrap-break-word align-top">
                        {league.memberCount}
                      </td>
                      <td className="px-3 py-3 whitespace-normal wrap-break-word align-top">
                        {new Date(league.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {leagues.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-8 text-center text-slate-500"
                      >
                        No leagues found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
