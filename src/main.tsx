import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Link, NavLink, Outlet, Route, Routes } from 'react-router-dom'
import {
  ClerkProvider,
  SignIn,
  SignUp,
  SignOutButton,
  SignedIn,
  SignedOut,
  useAuth,
  useUser
} from '@clerk/clerk-react'
import { getDebugUserId, setAuthTokenGetter, setDebugUserId } from './api/apiClient'
import { HomePage } from './pages/HomePage'
import { LeaguePage } from './pages/LeaguePage'
import { LeaguePredictPage } from './pages/LeaguePredictPage'
import { LeagueLeaderboardPage } from './pages/LeagueLeaderboardPage'
import { MyLeaguesPage } from './pages/MyLeaguesPage'
import './styles.css'

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
const DEV_USER_OPTIONS = ['dev-user-1', 'dev-user-2']
const ALLOW_DEBUG_AUTH = import.meta.env.DEV && import.meta.env.VITE_ALLOW_DEBUG_AUTH === 'true'

function AuthSync() {
  const { getToken } = useAuth()

  React.useEffect(() => {
    setAuthTokenGetter(() => getToken())
    return () => setAuthTokenGetter(null)
  }, [getToken])

  return null
}

function DevUserSelector() {
  const [value, setValue] = React.useState(getDebugUserId())

  if (!ALLOW_DEBUG_AUTH) return null

  return (
    <div className="dev-user">
      <label htmlFor="debugUserId">
        Debug user
      </label>
      <input
        id="debugUserId"
        list="debugUserOptions"
        placeholder="dev-user-1"
        value={value}
        onChange={(event) => {
          const nextValue = event.target.value
          setValue(nextValue)
          setDebugUserId(nextValue)
        }}
      />
      <datalist id="debugUserOptions">
        {DEV_USER_OPTIONS.map((userId) => (
          <option key={userId} value={userId} />
        ))}
      </datalist>
    </div>
  )
}

function UserMenu() {
  const { user } = useUser()

  return (
    <div className="user-menu">
      <span className="user-name">{user?.fullName ?? user?.firstName ?? user?.primaryEmailAddress?.emailAddress ?? 'User'}</span>
      <SignOutButton>
        <button type="button" className="ui-button ui-button-ghost">Sign out</button>
      </SignOutButton>
    </div>
  )
}

function AppLayout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-brand">Formula Fantasy</div>

        <nav className="app-nav" aria-label="Primary">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : undefined)}>
            Home
          </NavLink>
          <NavLink to="/my-leagues" className={({ isActive }) => (isActive ? 'active' : undefined)}>
            My Leagues
          </NavLink>
        </nav>

        <div className="app-user-zone">
          <DevUserSelector />
          <SignedIn>
            <UserMenu />
          </SignedIn>
          <SignedOut>
            <div className="auth-row">
              <Link to="/sign-in">Sign in</Link>
              <Link to="/sign-up">Sign up</Link>
            </div>
          </SignedOut>
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthSync />
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/my-leagues" element={<MyLeaguesPage />} />
          <Route path="/sign-in/*" element={<SignIn routing="path" path="/sign-in" />} />
          <Route path="/sign-up/*" element={<SignUp routing="path" path="/sign-up" />} />
          <Route path="/league/:leagueId" element={<LeaguePage />} />
          <Route path="/league/:leagueId/predict" element={<LeaguePredictPage />} />
          <Route
            path="/league/:leagueId/races/:raceId/leaderboard"
            element={<LeagueLeaderboardPage />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

if (!clerkPublishableKey) {
  throw new Error('VITE_CLERK_PUBLISHABLE_KEY is not set')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <App />
    </ClerkProvider>
  </React.StrictMode>
)
