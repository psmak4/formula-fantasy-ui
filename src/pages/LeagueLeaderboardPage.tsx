import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiClient } from '../api/apiClient'

type Scoring = {
  available: boolean
}

type LeaderboardRow = {
  rank: number
  displayName: string
  points: number
  breakdown?: unknown
}

type LeaderboardResponse = {
  scoring?: Scoring
  entries?: LeaderboardRow[]
  leaderboard?: LeaderboardRow[]
}

function breakdownText(breakdown: unknown): string {
  if (breakdown == null) return 'No breakdown provided'
  if (typeof breakdown === 'string') return breakdown
  return JSON.stringify(breakdown, null, 2)
}

export function LeagueLeaderboardPage() {
  const { leagueId, raceId } = useParams<{ leagueId: string; raceId: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<LeaderboardResponse | null>(null)

  useEffect(() => {
    if (!leagueId || !raceId) {
      setError('Missing route parameters')
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    apiClient
      .get<LeaderboardResponse>(`/leagues/${leagueId}/races/${raceId}/leaderboard`)
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load leaderboard'
          setError(message)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [leagueId, raceId])

  const rows = useMemo(() => data?.entries ?? data?.leaderboard ?? [], [data])
  const scoringAvailable = data?.scoring?.available ?? true

  return (
    <section>
      <h2>Leaderboard</h2>
      <p>
        League: <code>{leagueId}</code> | Race: <code>{raceId}</code>
      </p>
      <p>
        <Link to={`/league/${leagueId}`}>Back to league</Link>
      </p>

      {loading ? <p>Loading leaderboard...</p> : null}
      {error ? <p>{error}</p> : null}
      {!loading && !error && !scoringAvailable ? <p>Scoring pending</p> : null}

      {!loading && !error && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Display Name</th>
                <th>Points</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.rank}-${row.displayName}`}>
                  <td>{row.rank}</td>
                  <td>{row.displayName}</td>
                  <td>{row.points}</td>
                  <td>
                    {row.breakdown ? (
                      <details>
                        <summary>Show</summary>
                        <pre>{breakdownText(row.breakdown)}</pre>
                      </details>
                    ) : (
                      'N/A'
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4}>No leaderboard entries yet</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
