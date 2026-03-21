import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { authClient } from "@/auth/authClient";
import { getDebugUserId } from "@/api/apiClient";

type RequireAuthProps = {
  children: ReactNode;
};

export function RequireAuth({ children }: RequireAuthProps) {
  const location = useLocation();
  const { data: session, isPending } = authClient.useSession();
  const debugUserId = getDebugUserId();
  const hasDebugAuth = import.meta.env.DEV && import.meta.env.VITE_ALLOW_DEBUG_AUTH === "true" && debugUserId.length > 0;

  if (isPending) {
    return (
      <div
        className="mx-auto flex min-h-[calc(100svh-133px)] w-full max-w-7xl items-center justify-center px-6 py-10"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <p className="text-sm text-[#989aa2]">Checking session…</p>
      </div>
    );
  }

  if (!session?.user && !hasDebugAuth) {
    const redirect = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/sign-in?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  return <>{children}</>;
}
