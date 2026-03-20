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
import { Button } from "@/components/ui/Button";
import { authClient } from "@/auth/authClient";

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
  const isImpersonating = Boolean((session?.session as { impersonatedBy?: string } | undefined)?.impersonatedBy);

  const displayName = useMemo(
    () => user?.name ?? user?.email ?? "Manager",
    [user],
  );
  const currentYear = new Date().getFullYear();

  const navLinkClass = (isActive: boolean) => {
    if (isActive) {
      return "relative text-white after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-red-600";
    }
    return "relative text-neutral-300 hover:text-white";
  };

  const stopImpersonating = () => {
    void authClient
      .$fetch("/admin/stop-impersonating", { method: "POST" })
      .then(() => {
        window.location.assign("/admin/users");
      });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-50 h-16 w-full border-b border-neutral-800 bg-neutral-950">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6">
          <div className="flex flex-1 items-center">
            <Link
              to="/"
              className="flex items-center font-['Orbitron'] text-xl font-semibold tracking-tight text-white md:text-2xl hover:no-underline"
            >
              <span className="mr-2 h-2 w-2 bg-red-600" />
              Formula Fantasy
            </Link>
          </div>

          <nav
            className="flex flex-1 items-center justify-center gap-8"
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
            ) : null}
          </nav>

          <div className="flex flex-1 items-center justify-end gap-2">
            {user && !isPending ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-10 w-10 rounded-full p-0 text-white hover:bg-white/10"
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
            ) : (
              <>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/10"
                >
                  <Link to="/sign-in">Sign in</Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  <Link to="/sign-up">Sign up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {isImpersonating ? (
        <div className="border-b border-amber-200 bg-amber-50">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-2 text-sm text-amber-900">
            <span>You are impersonating another user.</span>
            <Button
              size="sm"
              variant="outline"
              className="border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
              onClick={stopImpersonating}
            >
              Stop impersonating
            </Button>
          </div>
        </div>
      ) : null}

      <main
        className="w-full min-h-[calc(100svh-133px)]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(0,0,0,0.01) 0, rgba(0,0,0,0.01) 2px, transparent 0, transparent 50%)",
          backgroundSize: "16px 16px",
        }}
      >
        <Outlet />
      </main>

      <footer className="w-full border-t border-neutral-200 bg-white">
        <div className="mx-auto w-full max-w-7xl px-6 py-6 text-sm text-neutral-600">
          © {currentYear} Formula Fantasy. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
