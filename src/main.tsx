import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import {
  AuthenticateWithRedirectCallback,
  ClerkProvider,
  useAuth
} from '@clerk/clerk-react'
import { setAuthTokenGetter } from './api/apiClient'
import { AppShell } from './components/AppShell'
import { HomePage } from './pages/HomePage'
import { LeaguePage } from './pages/LeaguePage'
import { LeaguePredictPage } from './pages/LeaguePredictPage'
import { LeagueLeaderboardPage } from './pages/LeagueLeaderboardPage'
import { MyLeaguesPage } from './pages/MyLeaguesPage'
import { SignInPage } from './pages/SignInPage'
import { SignUpPage } from './pages/SignUpPage'
import { Toaster } from './components/ui/sonner'
import './styles.css'

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

function AuthSync() {
  const { getToken } = useAuth()

  React.useEffect(() => {
    setAuthTokenGetter(() => getToken())
    return () => setAuthTokenGetter(null)
  }, [getToken])

  return null
}

function App() {
  return (
    <BrowserRouter>
      <AuthSync />
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/my-leagues" element={<MyLeaguesPage />} />
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/sign-up" element={<SignUpPage />} />
          <Route path="/sso-callback" element={<AuthenticateWithRedirectCallback />} />
          <Route path="/league/:leagueId" element={<LeaguePage />} />
          <Route path="/league/:leagueId/predict" element={<LeaguePredictPage />} />
          <Route
            path="/league/:leagueId/races/:raceId/leaderboard"
            element={<LeagueLeaderboardPage />}
          />
        </Route>
      </Routes>
      <Toaster />
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
