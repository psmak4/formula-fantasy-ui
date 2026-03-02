import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import {
  ClerkProvider,
  SignIn,
  SignUp,
  SignedIn,
  SignedOut,
  UserButton,
  useAuth
} from '@clerk/clerk-react'
import { getDebugUserId, setAuthTokenGetter, setDebugUserId } from './api/apiClient'
import { HomePage } from './pages/HomePage'
import { LeaguePage } from './pages/LeaguePage'
import { LeaguePredictPage } from './pages/LeaguePredictPage'
import { LeagueLeaderboardPage } from './pages/LeagueLeaderboardPage'
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

function App() {
  return (
    <BrowserRouter>
      <AuthSync />
      <div className="app-shell">
        <header>
          <h1>Formula Fantasy UI</h1>
          <DevUserSelector />
          <SignedIn>
            <div className="auth-row">
              <UserButton />
            </div>
          </SignedIn>
          <SignedOut>
            <div className="auth-row">
              <Link to="/sign-in">Sign in</Link>
              <Link to="/sign-up">Sign up</Link>
            </div>
          </SignedOut>
          <nav>
            <Link to="/">Home</Link>
            <Link to="/league/demo-league">League</Link>
            <Link to="/league/demo-league/predict">Predict</Link>
            <Link to="/league/demo-league/races/next/leaderboard">Leaderboard</Link>
          </nav>
        </header>

        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/sign-in/*" element={<SignIn routing="path" path="/sign-in" />} />
            <Route path="/sign-up/*" element={<SignUp routing="path" path="/sign-up" />} />
            <Route path="/league/:leagueId" element={<LeaguePage />} />
            <Route path="/league/:leagueId/predict" element={<LeaguePredictPage />} />
            <Route
              path="/league/:leagueId/races/:raceId/leaderboard"
              element={<LeagueLeaderboardPage />}
            />
          </Routes>
        </main>
      </div>
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
