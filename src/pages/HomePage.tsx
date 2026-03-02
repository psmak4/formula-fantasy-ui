import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { API_BASE_URL, apiClient } from '../api/apiClient'

type NextRaceResponse = {
  id?: string
  raceId?: string
  name?: string
  raceName?: string
  grandPrixName?: string
  startsAt?: string
  startTime?: string
  raceAt?: string
  raceStartAt?: string
  scheduledAt?: string
  date?: string
}

export function HomePage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nextRace, setNextRace] = useState<NextRaceResponse | null>(null)
  const [countdown, setCountdown] = useState('')
  const [leagueName, setLeagueName] = useState('')
  const [leagueIdInput, setLeagueIdInput] = useState('')
  const [createState, setCreateState] = useState('idle')

  useEffect(() => {
    let cancelled = false

    apiClient
      .get<NextRaceResponse>('/f1/next-race')
      .then((data) => {
        if (!cancelled) setNextRace(data)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load next race'
          setError(message)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const raceName = useMemo(
    () => nextRace?.name ?? nextRace?.raceName ?? nextRace?.grandPrixName ?? 'TBD',
    [nextRace]
  )

  const startsAt = useMemo(
    () =>
      nextRace?.startsAt ??
      nextRace?.startTime ??
      nextRace?.raceAt ??
      nextRace?.raceStartAt ??
      nextRace?.scheduledAt ??
      nextRace?.date,
    [nextRace]
  )

  useEffect(() => {
    if (!startsAt) {
      setCountdown('Start time not available')
      return
    }

    const raceStartMs = new Date(startsAt).getTime()
    if (Number.isNaN(raceStartMs)) {
      setCountdown('Start time not available')
      return
    }

    const tick = () => {
      const deltaMs = raceStartMs - Date.now()
      if (deltaMs <= 0) {
        setCountdown('Race started')
        return
      }

      const totalSeconds = Math.floor(deltaMs / 1000)
      const days = Math.floor(totalSeconds / 86400)
      const hours = Math.floor((totalSeconds % 86400) / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60
      setCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s`)
    }

    tick()
    const interval = window.setInterval(tick, 1000)
    return () => window.clearInterval(interval)
  }, [startsAt])

  async function handleCreateLeague() {
    setCreateState('creating')

    try {
      const payload = { name: leagueName.trim() || 'My League' }
      const result = await apiClient.post<{ id?: string; leagueId?: string; league?: { id?: string } }>(
        '/leagues',
        payload
      )

      const createdLeagueId = result.id ?? result.leagueId ?? result.league?.id
      if (!createdLeagueId) {
        throw new Error('Create league succeeded but no league id returned')
      }

      setCreateState('created')
      navigate(`/league/${createdLeagueId}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create league'
      setCreateState(message)
    }
  }

  return (
    <section>
      <h2>Home</h2>
      <p>
        API base URL: <code>{API_BASE_URL}</code>
      </p>

      {loading ? <p>Loading next race...</p> : null}
      {error ? <p>{error}</p> : null}
      {!loading && !error ? (
        <div>
          <p>
            Next race: <strong>{raceName}</strong>
          </p>
          <p>
            Countdown: <strong>{countdown}</strong>
          </p>
        </div>
      ) : null}

      <div className="card">
        <h3>Create League</h3>
        <input
          placeholder="League name"
          value={leagueName}
          onChange={(event) => setLeagueName(event.target.value)}
        />
        <button type="button" onClick={handleCreateLeague} disabled={createState === 'creating'}>
          {createState === 'creating' ? 'Creating...' : 'Create League'}
        </button>
        {createState !== 'idle' && createState !== 'creating' && createState !== 'created' ? (
          <p>{createState}</p>
        ) : null}
      </div>

      <div className="card">
        <h3>Open League</h3>
        <input
          placeholder="League ID"
          value={leagueIdInput}
          onChange={(event) => setLeagueIdInput(event.target.value)}
        />
        <p>
          <Link to={leagueIdInput.trim() ? `/league/${leagueIdInput.trim()}` : '/league/demo-league'}>
            Go to league
          </Link>
        </p>
      </div>

      <p>
        <Link to="/league/demo-league">Demo league</Link>
      </p>
    </section>
  )
}
