import { useMemo } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { SignedIn, SignedOut, useClerk, useUser } from "@clerk/clerk-react";
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

function initials(name?: string | null): string {
  if (!name) return "FF";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "FF";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function AppShell() {
  const location = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const isHome = location.pathname === "/";

  const displayName = useMemo(
    () =>
      user?.fullName ??
      user?.firstName ??
      user?.primaryEmailAddress?.emailAddress ??
      "Manager",
    [user],
  );
  const currentYear = new Date().getFullYear();

  const navLinkClass = (isActive: boolean) => {
    if (isActive) {
      return "relative text-white after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-red-600";
    }
    return "relative text-neutral-300 hover:text-white";
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
            <NavLink
              to="/my-leagues"
              className={({ isActive }) => navLinkClass(isActive)}
            >
              My Leagues
            </NavLink>
          </nav>

          <div className="flex flex-1 items-center justify-end gap-2">
            <SignedIn>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-10 w-10 rounded-full p-0 text-white hover:bg-white/10"
                    aria-label="Open user menu"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user?.imageUrl} alt={displayName} />
                      <AvatarFallback>{initials(displayName)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled>
                    Profile (coming soon)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault();
                      void signOut();
                    }}
                  >
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SignedIn>
            <SignedOut>
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
            </SignedOut>
          </div>
        </div>
      </header>

      <main className={isHome ? "w-full" : "w-full py-2"}>
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
