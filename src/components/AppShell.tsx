import { useMemo } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { SignedIn, SignedOut, useClerk, useUser } from '@clerk/clerk-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/Button'

function initials(name?: string | null): string {
  if (!name) return 'FF'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'FF'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
}

export function AppShell() {
  const { user } = useUser()
  const { signOut } = useClerk()

  const displayName = useMemo(
    () => user?.fullName ?? user?.firstName ?? user?.primaryEmailAddress?.emailAddress ?? 'Manager',
    [user]
  )

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4 md:px-6 lg:px-8">
          <div className="flex flex-1 items-center">
            <Link to="/" className="text-xl font-bold tracking-tight text-slate-900">
              Formula Fantasy
            </Link>
          </div>

          <nav className="hidden flex-1 items-center justify-center gap-8 md:flex" aria-label="Primary">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                isActive
                  ? 'border-b-2 border-red-600 pb-1 font-semibold text-slate-900'
                  : 'border-b-2 border-transparent pb-1 font-medium text-slate-600 hover:text-slate-900'
              }
            >
              Home
            </NavLink>
            <NavLink
              to="/my-leagues"
              className={({ isActive }) =>
                isActive
                  ? 'border-b-2 border-red-600 pb-1 font-semibold text-slate-900'
                  : 'border-b-2 border-transparent pb-1 font-medium text-slate-600 hover:text-slate-900'
              }
            >
              My Leagues
            </NavLink>
          </nav>

          <div className="flex flex-1 items-center justify-end gap-2">
            <SignedIn>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-10 w-10 rounded-full p-0" aria-label="Open user menu">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user?.imageUrl} alt={displayName} />
                      <AvatarFallback>{initials(displayName)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled>Profile (coming soon)</DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault()
                      void signOut()
                    }}
                  >
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SignedIn>
            <SignedOut>
              <Button asChild variant="ghost" size="sm">
                <Link to="/sign-in">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/sign-up">Sign up</Link>
              </Button>
            </SignedOut>
          </div>
        </div>

        <nav className="mx-auto flex max-w-6xl items-center gap-6 px-4 pb-3 md:hidden" aria-label="Primary mobile">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              isActive
                ? 'border-b-2 border-red-600 pb-1 font-semibold text-slate-900'
                : 'border-b-2 border-transparent pb-1 font-medium text-slate-600 hover:text-slate-900'
            }
          >
            Home
          </NavLink>
          <NavLink
            to="/my-leagues"
            className={({ isActive }) =>
              isActive
                ? 'border-b-2 border-red-600 pb-1 font-semibold text-slate-900'
                : 'border-b-2 border-transparent pb-1 font-medium text-slate-600 hover:text-slate-900'
            }
          >
            My Leagues
          </NavLink>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8 lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}
