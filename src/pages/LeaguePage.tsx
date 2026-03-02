import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiClient } from '../api/apiClient'

type Member = {
  id?: string
  userId?: string
  displayName?: string
  name?: string
  handle?: string
}

type LeagueResponse = {
  id?: string
  members?: Member[]
  league?: {
    members?: Member[]
  }
}

type LeaderboardEntry = {
  rank: number
  displayName: string
  points: number
}

type LeaderboardResponse = {
  scoring?: { available?: boolean }
  entries?: LeaderboardEntry[]
  leaderboard?: LeaderboardEntry[]
}

export function LeaguePage() {
  const { leagueId } = useParams<{ leagueId: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null)
  const [joinState, setJoinState] = useState<'idle' | 'joining' | 'joined' | string>('idle')

  useEffect(() => {
    if (!leagueId) {
      setError('Missing league ID')
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([
      apiClient.get<LeagueResponse>(`/leagues/${leagueId}`),
      apiClient
        .get<LeaderboardResponse>(`/leagues/${leagueId}/races/next/leaderboard`)
        .catch(() => ({} as LeaderboardResponse))
    ])
      .then(([leagueData, leaderboardData]) => {
        if (cancelled) return
        setMembers(leagueData.members ?? leagueData.league?.members ?? [])
        setLeaderboard(leaderboardData)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load league'
          setError(message)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [leagueId, joinState])

  const leaderboardRows = useMemo(
    () => leaderboard?.entries ?? leaderboard?.leaderboard ?? [],
    [leaderboard]
  )

  async function handleJoinLeague() {
    if (!leagueId) return

    setJoinState('joining')
    try {
      await apiClient.post(`/leagues/${leagueId}/join`)
      setJoinState('joined')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to join league'
      setJoinState(message)
    }
  }

  return (
    <section>
      <h2>League</h2>
      <p>
        League ID: <code>{leagueId}</code>
      </p>

      <p>
        <button type="button" onClick={handleJoinLeague} disabled={joinState === 'joining'}>
          {joinState === 'joining' ? 'Joining...' : 'Join league'}
        </button>
      </p>
      {joinState !== 'idle' && joinState !== 'joining' && joinState !== 'joined' ? (
        <p>{joinState}</p>
      ) : null}

      {loading ? <p>Loading league...</p> : null}
      {error ? <p>{error}</p> : null}

      {!loading && !error ? (
        <div className="card">
          <h3>Members</h3>
          {members.length === 0 ? <p>No members yet</p> : null}
          {members.length > 0 ? (
            <ul>
              {members.map((member, index) => (
                <li key={member.id ?? member.userId ?? `${member.displayName}-${index}`}>
                  {member.displayName ?? member.name ?? member.handle ?? member.userId ?? member.id}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <p>
        <Link to={`/league/${leagueId}/predict`}>Make prediction for next race</Link>
      </p>

      {!loading && !error ? (
        <div className="card">
          <h3>Next race leaderboard</h3>
          {leaderboard?.scoring?.available === false ? <p>Scoring pending</p> : null}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Display Name</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>
                {leaderboardRows.map((entry) => (
                  <tr key={`${entry.rank}-${entry.displayName}`}>
                    <td>{entry.rank}</td>
                    <td>{entry.displayName}</td>
                    <td>{entry.points}</td>
                  </tr>
                ))}
                {leaderboardRows.length === 0 ? (
                  <tr>
                    <td colSpan={3}>No leaderboard data yet</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <p>
            <Link to={`/league/${leagueId}/races/next/leaderboard`}>Open full leaderboard</Link>
          </p>
        </div>
      ) : null}
    </section>
  )
}
