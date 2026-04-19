import { useMemo } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiClient } from "@/api/apiClient";
import { Button } from "@/components/ui/Button";
import { authClient } from "@/auth/authClient";
import { setAuthToken } from "@/auth/tokenStore";
import { getDebugUserId } from "@/api/apiClient";
import { cn } from "@/lib/utils";

function initials(name?: string | null): string {
  if (!name) return "FF";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "FF";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function AppShell() {
  const location = useLocation();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const debugUserId = getDebugUserId();
  const hasDebugAuth =
    import.meta.env.DEV &&
    import.meta.env.VITE_ALLOW_DEBUG_AUTH === "true" &&
    debugUserId.length > 0;
  const hasUserShell = (Boolean(user) && !isPending) || hasDebugAuth;
  const isImpersonating = Boolean((session?.session as { impersonatedBy?: string } | undefined)?.impersonatedBy);

  const displayName = useMemo(
    () => user?.name ?? user?.email ?? (hasDebugAuth ? "Debug Manager" : "Manager"),
    [hasDebugAuth, user],
  );
  const currentYear = new Date().getFullYear();
  const mainBackdropClass = useMemo(() => {
    if (location.pathname.startsWith("/admin")) return "";
    return "ff-page-backdrop";
  }, [location.pathname]);

  const navLinkClass = (isActive: boolean) =>
    cn(
      "font-headline text-sm font-bold uppercase tracking-[0.2em] transition-colors",
      isActive
        ? "relative text-primary after:absolute after:-bottom-[1.4rem] after:left-0 after:h-[2px] after:w-full after:bg-primary"
        : "text-on-surface-variant hover:text-on-surface",
    );

  const mobileNavLinkClass = (isActive: boolean) =>
    cn(
      "font-headline border-b-2 px-1 pb-2 text-xs font-bold uppercase tracking-[0.2em] transition-colors",
      isActive ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-on-surface",
    );

  const stopImpersonating = () => {
    void apiClient
      .post<{ bearerToken?: string }>("/admin/session/stop-impersonation")
      .then((response) => {
        if (response?.bearerToken) {
          setAuthToken(response.bearerToken);
        }
        window.location.assign("/admin/users");
      });
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <header className="sticky top-0 z-50 w-full bg-surface-container-low/95 backdrop-blur-md">
        <div className="mx-auto flex min-h-[4.5rem] w-full max-w-7xl items-center justify-between px-6">
          <div className="flex flex-1 items-center">
            <Link
              to="/"
              className="font-headline flex items-center text-2xl font-black italic uppercase tracking-tight text-primary md:text-3xl"
            >
              Formula Fantasy
            </Link>
          </div>

          <nav
            className="hidden flex-1 items-center justify-center gap-8 md:flex"
            aria-label="Primary"
          >
            <NavLink to="/" end className={({ isActive }) => navLinkClass(isActive)}>
              Home
            </NavLink>
            {hasUserShell ? (
              <>
                <NavLink to="/results" className={({ isActive }) => navLinkClass(isActive)}>
                  My Results
                </NavLink>
                <NavLink to="/leagues" className={({ isActive }) => navLinkClass(isActive)}>
                  Leagues
                </NavLink>
              </>
            ) : null}
          </nav>

          <div className="flex flex-1 items-center justify-end gap-2">
            {hasUserShell ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-10 w-10 rounded-full bg-surface-container-lowest p-0 text-on-surface"
                    aria-label="Open user menu"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user?.image ?? undefined} alt={displayName} />
                      <AvatarFallback>{initials(displayName)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
                  {hasDebugAuth ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-primary focus:text-primary">
                        Debug Auth Active
                      </DropdownMenuItem>
                    </>
                  ) : null}
                  {isImpersonating ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={(event) => {
                          event.preventDefault();
                          stopImpersonating();
                        }}
                      >
                        Stop impersonating
                      </DropdownMenuItem>
                    </>
                  ) : null}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile">Profile</Link>
                  </DropdownMenuItem>
                  {hasDebugAuth ? (
                    <DropdownMenuItem
                      onSelect={(event) => {
                        event.preventDefault();
                        if (typeof window !== "undefined") {
                          window.localStorage.removeItem("ff_debug_user_id");
                          window.location.assign("/");
                        }
                      }}
                    >
                      Exit Debug
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onSelect={(event) => {
                        event.preventDefault();
                        void authClient.signOut();
                      }}
                    >
                      Sign out
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
                  <Link to="/sign-in">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/sign-up">Sign up</Link>
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="md:hidden">
          <nav
            className="mx-auto flex w-full max-w-7xl items-center gap-5 overflow-x-auto px-6 pt-3"
            aria-label="Mobile primary"
          >
            <NavLink to="/" end className={({ isActive }) => mobileNavLinkClass(isActive)}>
              Home
            </NavLink>
            {hasUserShell ? (
              <>
                <NavLink to="/results" className={({ isActive }) => mobileNavLinkClass(isActive)}>
                  Results
                </NavLink>
                <NavLink to="/leagues" className={({ isActive }) => mobileNavLinkClass(isActive)}>
                  Leagues
                </NavLink>
                <NavLink to="/profile" className={({ isActive }) => mobileNavLinkClass(isActive)}>
                  Profile
                </NavLink>
                {hasDebugAuth ? (
                  <button
                    type="button"
                    className="font-headline border-b-2 border-transparent px-1 pb-2 text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant transition-colors hover:text-on-surface"
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        window.localStorage.removeItem("ff_debug_user_id");
                        window.location.assign("/");
                      }
                    }}
                  >
                    Exit Debug
                  </button>
                ) : null}
              </>
            ) : (
              <>
                <NavLink to="/sign-in" className={({ isActive }) => mobileNavLinkClass(isActive)}>
                  Sign in
                </NavLink>
                <NavLink to="/sign-up" className={({ isActive }) => mobileNavLinkClass(isActive)}>
                  Sign up
                </NavLink>
              </>
            )}
          </nav>
        </div>
      </header>

      {isImpersonating ? (
        <div className="bg-[color-mix(in_srgb,var(--color-warning)_16%,var(--color-inverse-surface))]">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-2 text-sm text-[color:var(--color-warning)]">
            <span className="font-headline uppercase tracking-[0.16em] text-xs font-bold">
              You are impersonating another user.
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={stopImpersonating}
            >
              Stop impersonating
            </Button>
          </div>
        </div>
      ) : null}

      <main className={cn("w-full min-h-[calc(100svh-141px)]", mainBackdropClass)}>
        <Outlet />
      </main>

      <footer className="w-full ff-dark-section">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-6 py-10 text-sm md:flex-row md:items-center md:justify-between">
          <div>
            <span className="font-headline text-lg font-black italic uppercase tracking-tight text-surface">
              Formula Fantasy
            </span>
            <p className="font-headline mt-1 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-inverse-on-surface">
              © {currentYear} Formula Fantasy · Kinetic Editorial System
            </p>
          </div>
          <div className="flex gap-8 font-headline text-xs font-bold uppercase tracking-[0.18em] text-inverse-on-surface">
            <Link to="/profile" className="transition-colors hover:text-primary">Profile</Link>
            <Link to="/leagues" className="transition-colors hover:text-primary">Leagues</Link>
            <Link to="/results" className="transition-colors hover:text-primary">Results</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
