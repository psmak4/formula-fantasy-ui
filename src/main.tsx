import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { getDebugUserId, setDebugUserId } from './api/apiClient'
import { HomePage } from './pages/HomePage'
import { LeaguePage } from './pages/LeaguePage'
import { LeaguePredictPage } from './pages/LeaguePredictPage'
import { LeagueLeaderboardPage } from './pages/LeagueLeaderboardPage'
import './styles.css'

const DEV_USER_OPTIONS = ['dev-user-1', 'dev-user-2']

function DevUserSelector() {
  const [value, setValue] = React.useState(getDebugUserId())

  if (!import.meta.env.DEV) return null

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
      <div className="app-shell">
        <header>
          <h1>Formula Fantasy UI</h1>
          <DevUserSelector />
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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
