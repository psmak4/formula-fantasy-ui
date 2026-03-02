import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { LeaguePage } from './pages/LeaguePage'
import { LeaguePredictPage } from './pages/LeaguePredictPage'
import './styles.css'

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <header>
          <h1>Formula Fantasy UI</h1>
          <nav>
            <Link to="/">Home</Link>
            <Link to="/league/demo-league">League</Link>
            <Link to="/league/demo-league/predict">Predict</Link>
          </nav>
        </header>

        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/league/:leagueId" element={<LeaguePage />} />
            <Route path="/league/:leagueId/predict" element={<LeaguePredictPage />} />
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
