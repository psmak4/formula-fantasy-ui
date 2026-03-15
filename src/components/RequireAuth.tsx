import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { authClient } from "@/auth/authClient";

type RequireAuthProps = {
  children: ReactNode;
};

export function RequireAuth({ children }: RequireAuthProps) {
  const location = useLocation();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div
        className="mx-auto flex min-h-[calc(100svh-133px)] w-full max-w-7xl items-center justify-center px-6 py-10"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <p className="text-sm text-neutral-600">Checking session…</p>
      </div>
    );
  }

  if (!session?.user) {
    const redirect = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/sign-in?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  return <>{children}</>;
}
