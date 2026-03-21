import { useMemo } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
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
import { getDebugUserId } from "@/api/apiClient";

function initials(name?: string | null): string {
  if (!name) return "FF";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "FF";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function AppShell() {
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const debugUserId = getDebugUserId();
  const hasDebugAuth =
    import.meta.env.DEV &&
    import.meta.env.VITE_ALLOW_DEBUG_AUTH === "true" &&
    debugUserId.length > 0;
  const isImpersonating = Boolean((session?.session as { impersonatedBy?: string } | undefined)?.impersonatedBy);

  const displayName = useMemo(
    () => user?.name ?? user?.email ?? (hasDebugAuth ? "Debug Admin" : "Manager"),
    [hasDebugAuth, user],
  );
  const currentYear = new Date().getFullYear();

  const navLinkClass = (isActive: boolean) => {
    if (isActive) {
      return "relative ff-display text-xs tracking-[0.16em] text-white after:absolute after:-bottom-[1.2rem] after:left-0 after:h-[2px] after:w-full after:bg-[#cc0000]";
    }
    return "relative ff-display text-xs tracking-[0.16em] text-[#7f828b] transition-colors hover:text-white";
  };

  const mobileNavLinkClass = (isActive: boolean) => {
    if (isActive) {
      return "ff-display border-b-2 border-[#cc0000] px-1 pb-2 text-[11px] tracking-[0.16em] text-white";
    }
    return "ff-display border-b-2 border-transparent px-1 pb-2 text-[11px] tracking-[0.16em] text-[#7f828b] transition-colors hover:text-white";
  };

  const stopImpersonating = () => {
    void apiClient
      .post("/admin/session/stop-impersonation")
      .then(() => {
        window.location.assign("/admin/users");
      });
  };

  return (
    <div className="min-h-screen bg-[#0d0d11] text-[#f5f7fa]">
      <header className="sticky top-0 z-50 w-full border-b border-white/6 bg-[rgba(19,19,23,0.92)] backdrop-blur-md">
        <div className="mx-auto flex min-h-[4.5rem] w-full max-w-7xl items-center justify-between px-6">
          <div className="flex flex-1 items-center">
            <Link
              to="/"
              className="ff-display flex items-center text-2xl text-[#f20b0b] md:text-3xl"
            >
              Formula Fantasy
            </Link>
          </div>

          <nav
            className="hidden flex-1 items-center justify-center gap-8 md:flex"
            aria-label="Primary"
          >
            <NavLink
              to="/"
              end
              className={({ isActive }) => navLinkClass(isActive)}
            >
              Home
            </NavLink>
            {user && !isPending ? (
              <>
                <NavLink
                  to="/results"
                  className={({ isActive }) => navLinkClass(isActive)}
                >
                  My Results
                </NavLink>
                <NavLink
                  to="/leagues"
                  className={({ isActive }) => navLinkClass(isActive)}
                >
                  Leagues
                </NavLink>
              </>
            ) : hasDebugAuth ? (
              <NavLink
                to="/admin"
                className={({ isActive }) => navLinkClass(isActive)}
              >
                Admin
              </NavLink>
            ) : null}
          </nav>

          <div className="flex flex-1 items-center justify-end gap-2">
            {user && !isPending ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-10 w-10 border border-white/10 bg-white/4 p-0 text-white hover:bg-white/10"
                    aria-label="Open user menu"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage
                        src={user?.image ?? undefined}
                        alt={displayName}
                      />
                      <AvatarFallback>{initials(displayName)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
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
                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault();
                      void authClient.signOut();
                    }}
                  >
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : hasDebugAuth ? (
              <div className="flex items-center gap-2">
                <span className="ff-kicker border border-[#5a1010] bg-[#2a0c0c] px-3 py-2 text-[#ff7373]">
                  Debug Admin
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.localStorage.removeItem("ff_debug_user_id");
                      window.location.assign("/");
                    }
                  }}
                >
                  Exit Debug
                </Button>
              </div>
            ) : (
              <>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="hidden md:inline-flex"
                >
                  <Link to="/sign-in">Sign in</Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                >
                  <Link to="/sign-up">Sign up</Link>
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="border-t border-white/6 md:hidden">
          <nav
            className="mx-auto flex w-full max-w-7xl items-center gap-5 overflow-x-auto px-6 pt-3"
            aria-label="Mobile primary"
          >
            <NavLink to="/" end className={({ isActive }) => mobileNavLinkClass(isActive)}>
              Home
            </NavLink>
            {user && !isPending ? (
              <>
                <NavLink
                  to="/results"
                  className={({ isActive }) => mobileNavLinkClass(isActive)}
                >
                  Results
                </NavLink>
                <NavLink
                  to="/leagues"
                  className={({ isActive }) => mobileNavLinkClass(isActive)}
                >
                  Leagues
                </NavLink>
                <NavLink
                  to="/profile"
                  className={({ isActive }) => mobileNavLinkClass(isActive)}
                >
                  Profile
                </NavLink>
              </>
            ) : hasDebugAuth ? (
              <>
                <NavLink
                  to="/admin"
                  className={({ isActive }) => mobileNavLinkClass(isActive)}
                >
                  Admin
                </NavLink>
                <button
                  type="button"
                  className="ff-display border-b-2 border-transparent px-1 pb-2 text-[11px] tracking-[0.16em] text-[#7f828b] transition-colors hover:text-white"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.localStorage.removeItem("ff_debug_user_id");
                      window.location.assign("/");
                    }
                  }}
                >
                  Exit Debug
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/sign-in"
                  className={({ isActive }) => mobileNavLinkClass(isActive)}
                >
                  Sign in
                </NavLink>
                <NavLink
                  to="/sign-up"
                  className={({ isActive }) => mobileNavLinkClass(isActive)}
                >
                  Sign up
                </NavLink>
              </>
            )}
          </nav>
        </div>
      </header>

      {isImpersonating ? (
        <div className="border-b border-[#594b11] bg-[#2b2508]">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-2 text-sm text-[#f3db53]">
            <span>You are impersonating another user.</span>
            <Button
              size="sm"
              variant="outline"
              className="border-[#79661a] bg-transparent text-[#f3db53] hover:bg-[#3a310b]"
              onClick={stopImpersonating}
            >
              Stop impersonating
            </Button>
          </div>
        </div>
      ) : null}

      <main
        className="w-full min-h-[calc(100svh-141px)]"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(255,255,255,0.015), transparent 22%), repeating-linear-gradient(45deg, rgba(255,255,255,0.015) 0, rgba(255,255,255,0.015) 1px, transparent 0, transparent 18px)",
          backgroundSize: "auto, 18px 18px",
        }}
      >
        <Outlet />
      </main>

      <footer className="w-full border-t border-white/6 bg-[#0b0b0e]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-6 py-8 text-sm text-[#6f727b] md:flex-row md:items-center md:justify-between">
          <span className="ff-display text-base text-[#45474e]">Formula Fantasy</span>
          <span>© {currentYear} Formula Fantasy. Kinetic precision engineered.</span>
        </div>
      </footer>
    </div>
  );
}
