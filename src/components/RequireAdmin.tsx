import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/auth/authClient";
import { apiClient, getDebugUserId } from "@/api/apiClient";

type RequireAdminProps = {
  children: ReactNode;
};

type AdminMeResponse = {
  user: {
    id: string;
    email: string | null;
    displayName: string;
    avatarUrl: string | null;
  };
};

export function RequireAdmin({ children }: RequireAdminProps) {
  const location = useLocation();
  const { data: session, isPending } = authClient.useSession();
  const debugUserId = getDebugUserId();
  const hasDebugAuth = import.meta.env.DEV && import.meta.env.VITE_ALLOW_DEBUG_AUTH === "true" && debugUserId.length > 0;

  const adminQuery = useQuery({
    queryKey: ["admin-me"],
    enabled: Boolean(session?.user) || hasDebugAuth,
    retry: false,
    queryFn: () => apiClient.get<AdminMeResponse>("/admin/me"),
  });

  if (isPending || ((session?.user || hasDebugAuth) && adminQuery.isLoading)) {
    return (
      <div
        className="mx-auto flex min-h-[calc(100svh-133px)] w-full max-w-7xl items-center justify-center px-6 py-10"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <p className="text-sm text-[#989aa2]">Checking admin access…</p>
      </div>
    );
  }

  if (!session?.user && !hasDebugAuth) {
    const redirect = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/sign-in?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  if (adminQuery.isError) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
