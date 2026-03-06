import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { authClient } from "@/auth/authClient";
import { apiClient, ApiError } from "@/api/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

type AdminMetricsResponse = {
  metrics: {
    users: {
      total: number;
      admins: number;
      banned: number;
      active: number;
      newLast7Days: number;
    };
    leagues: {
      total: number;
      public: number;
      private: number;
      memberships: number;
      avgMembersPerLeague: number;
    };
    f1: {
      races: number;
      upcomingRaces: number;
      constructors: number;
      drivers: number;
    };
    predictions: {
      totalEntries: number;
      lockedEntries: number;
      lockRate: number;
    };
    sessions: {
      active: number;
    };
  } | null;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unable to load admin dashboard metrics.";
}

function formatPercent(decimalValue: number): string {
  return `${(decimalValue * 100).toFixed(0)}%`;
}

export function AdminDashboardPage() {
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

  const metricsQuery = useQuery({
    queryKey: ["admin-dashboard-metrics"],
    enabled: Boolean(session?.user),
    queryFn: () => apiClient.get<AdminMetricsResponse>("/admin/metrics"),
  });

  if (!isPending && !session?.user) {
    return null;
  }

  const metrics = metricsQuery.data?.metrics;
  const loading = isPending || metricsQuery.isLoading;
  const errorMessage = metricsQuery.error
    ? getErrorMessage(metricsQuery.error)
    : null;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="font-['Orbitron'] text-3xl font-bold uppercase tracking-tight text-black">
          Dashboard
        </h2>
        <p className="text-slate-600">
          Overview of platform health and growth.
        </p>
      </div>

      {loading ? (
        <p className="text-slate-600">Loading dashboard metrics...</p>
      ) : null}

      {!loading && errorMessage ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      {!loading && !errorMessage && metrics ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Total Users</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-3xl font-semibold text-slate-900">
                {metrics.users.total}
              </p>
              <p className="text-sm text-slate-600">
                {metrics.users.active} active, {metrics.users.banned} banned
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Leagues</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-3xl font-semibold text-slate-900">
                {metrics.leagues.total}
              </p>
              <p className="text-sm text-slate-600">
                {metrics.leagues.public} public, {metrics.leagues.private}{" "}
                private
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Predictions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-3xl font-semibold text-slate-900">
                {metrics.predictions.totalEntries}
              </p>
              <p className="text-sm text-slate-600">
                {metrics.predictions.lockedEntries} locked (
                {formatPercent(metrics.predictions.lockRate)})
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-3xl font-semibold text-slate-900">
                {metrics.sessions.active}
              </p>
              <p className="text-sm text-slate-600">
                Currently signed-in sessions
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {!loading && !errorMessage && metrics ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>User & League Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-700">
              <p>
                <strong>Admins:</strong> {metrics.users.admins}
              </p>
              <p>
                <strong>New Users (7 days):</strong>{" "}
                {metrics.users.newLast7Days}
              </p>
              <p>
                <strong>Total Memberships:</strong>{" "}
                {metrics.leagues.memberships}
              </p>
              <p>
                <strong>Avg Members per League:</strong>{" "}
                {metrics.leagues.avgMembersPerLeague}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>F1 Dataset Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-700">
              <p>
                <strong>Races:</strong> {metrics.f1.races}
              </p>
              <p>
                <strong>Upcoming Races:</strong> {metrics.f1.upcomingRaces}
              </p>
              <p>
                <strong>Constructors:</strong> {metrics.f1.constructors}
              </p>
              <p>
                <strong>Drivers:</strong> {metrics.f1.drivers}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
