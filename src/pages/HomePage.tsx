import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, apiClient } from '../api/apiClient'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { PageShell } from '../components/ui/PageShell'

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
  entryOpensAt?: string
  predictionOpensAt?: string
  openAt?: string
  entryClosesAt?: string
  predictionClosesAt?: string
  lockAt?: string
  predictionLocked?: boolean
  entriesLocked?: boolean
  lockStatus?: 'open' | 'locked'
}

type PredictionStatus = 'open' | 'opens_soon' | 'locked'
type LeagueVisibility = 'private' | 'public'

function assertLeagueVisibility(value: string): asserts value is LeagueVisibility {
  if (value !== 'private' && value !== 'public') {
    throw new Error(`Invalid league visibility: ${value}`)
  }
}

export function HomePage() {
  const navigate = useNavigate()
  const [reloadTick, setReloadTick] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nextRace, setNextRace] = useState<NextRaceResponse | null>(null)
  const [countdown, setCountdown] = useState('')
  const [leagueName, setLeagueName] = useState('')
  const [leagueVisibility, setLeagueVisibility] = useState<LeagueVisibility>('private')
  const [inviteInput, setInviteInput] = useState('')
  const [createState, setCreateState] = useState<'idle' | 'creating' | 'created' | string>('idle')
  const [joinState, setJoinState] = useState<'idle' | 'joining' | 'joined' | string>('idle')

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
  }, [reloadTick])

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

  const entryOpensAt = useMemo(
    () => nextRace?.entryOpensAt ?? nextRace?.predictionOpensAt ?? nextRace?.openAt,
    [nextRace]
  )

  const entryClosesAt = useMemo(
    () => nextRace?.entryClosesAt ?? nextRace?.predictionClosesAt ?? nextRace?.lockAt,
    [nextRace]
  )

  const predictionStatus = useMemo<PredictionStatus>(() => {
    const openTs = entryOpensAt ? new Date(entryOpensAt).getTime() : NaN
    const closeTs = entryClosesAt ? new Date(entryClosesAt).getTime() : NaN
    const now = Date.now()

    const lockedByApi =
      nextRace?.predictionLocked === true ||
      nextRace?.entriesLocked === true ||
      nextRace?.lockStatus === 'locked'

    if (lockedByApi || (!Number.isNaN(closeTs) && now >= closeTs)) return 'locked'
    if (!Number.isNaN(openTs) && now < openTs) return 'opens_soon'
    return 'open'
  }, [entryClosesAt, entryOpensAt, nextRace?.entriesLocked, nextRace?.lockStatus, nextRace?.predictionLocked])

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
        setCountdown('Race weekend live')
        return
      }

      const totalMinutes = Math.floor(deltaMs / 60000)
      const days = Math.floor(totalMinutes / (24 * 60))
      const hours = Math.floor((totalMinutes % (24 * 60)) / 60)
      const minutes = totalMinutes % 60
      setCountdown(`${days}d ${hours}h ${minutes}m`)
    }

    tick()
    const interval = window.setInterval(tick, 30000)
    return () => window.clearInterval(interval)
  }, [startsAt])

  const localRaceTime = useMemo(() => {
    if (!startsAt) return 'Time TBD'
    const date = new Date(startsAt)
    if (Number.isNaN(date.getTime())) return 'Time TBD'
    return date.toLocaleString()
  }, [startsAt])

  const utcRaceTime = useMemo(() => {
    if (!startsAt) return 'UTC TBD'
    const date = new Date(startsAt)
    if (Number.isNaN(date.getTime())) return 'UTC TBD'
    return date.toUTCString()
  }, [startsAt])

  function parseInviteTokenOrLeagueId(raw: string): { token?: string; leagueId?: string } {
    const input = raw.trim()
    if (!input) return {}

    const readFromPath = (value: string) => {
      const leagueFromPath = value.match(/\/league\/([^/?#]+)/)?.[1]
      const inviteFromPath = value.match(/\/invite\/([^/?#]+)/)?.[1]
      if (leagueFromPath) return { leagueId: leagueFromPath }
      if (inviteFromPath) return { token: inviteFromPath }
      return null
    }

    if (!input.includes('://')) {
      const fromPath = readFromPath(input)
      return fromPath ?? { token: input }
    }

    try {
      const url = new URL(input)
      const fromPath = readFromPath(url.pathname)
      if (fromPath) return fromPath

      const inviteFromQuery = url.searchParams.get('invite') ?? url.searchParams.get('token')
      if (inviteFromQuery) return { token: inviteFromQuery }
    } catch {
      return { token: input }
    }

    return { token: input }
  }

  function formatApiError(err: unknown, fallback: string): string {
    if (err instanceof ApiError) {
      if (err.code) return `${err.message} (${err.code})`
      return err.message
    }
    return err instanceof Error ? err.message : fallback
  }

  async function handleCreateLeague() {
    setCreateState('creating')

    try {
      assertLeagueVisibility(leagueVisibility)
      const payload = { name: leagueName.trim() || 'My League', visibility: leagueVisibility }
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
      setCreateState(formatApiError(err, 'Failed to create league'))
    }
  }

  async function handleJoinLeague() {
    const parsed = parseInviteTokenOrLeagueId(inviteInput)

    if (!parsed.token && !parsed.leagueId) {
      setJoinState('Paste an invite token or league link')
      return
    }

    if (parsed.leagueId) {
      setJoinState('joined')
      navigate(`/league/${parsed.leagueId}`)
      return
    }

    setJoinState('joining')
    try {
      const result = await apiClient.post<{ leagueId?: string; league?: { id?: string } }>('/leagues/join', {
        inviteToken: parsed.token
      })
      const joinedLeagueId = result.leagueId ?? result.league?.id
      setJoinState('joined')
      navigate(`/league/${joinedLeagueId ?? 'demo-league'}`)
    } catch (err: unknown) {
      setJoinState(formatApiError(err, 'Failed to join league'))
    }
  }

  return (
    <PageShell title="Home" subtitle="Predict race results with your friends and climb the leaderboard.">
      {loading ? <p>Loading next race...</p> : null}
      {loading ? (
        <Card className="next-race-hero">
          <div className="skeleton-line skeleton-lg" />
          <div className="skeleton-line skeleton-md" />
          <div className="skeleton-line skeleton-sm" />
        </Card>
      ) : null}
      {error ? (
        <Card>
          <h3>Couldn&apos;t load next race</h3>
          <p>{error}</p>
          <Button variant="secondary" onClick={() => setReloadTick((v) => v + 1)}>
            Retry
          </Button>
        </Card>
      ) : null}

      {!loading && !error ? (
        <Card className="next-race-hero">
          <div className="hero-headline">
            <p className="hero-kicker">Next Race</p>
            <h3>{raceName}</h3>
          </div>

          <p>
            <strong title={utcRaceTime}>{localRaceTime}</strong>
          </p>

          <div className="hero-metrics">
            <div>
              <span className="hero-metric-label">Countdown</span>
              <strong>{countdown}</strong>
            </div>
          </div>

          <div className="hero-chips">
            {predictionStatus === 'open' ? <Badge tone="success">Predictions Open</Badge> : null}
            {predictionStatus === 'opens_soon' ? <Badge tone="info">Predictions Open Soon</Badge> : null}
            {predictionStatus === 'locked' ? <Badge tone="danger">Predictions Locked</Badge> : null}
            {entryClosesAt ? <Badge tone="neutral">Locks at {new Date(entryClosesAt).toLocaleString()}</Badge> : null}
          </div>
        </Card>
      ) : null}

      {!loading && !error ? <div className="home-cta-grid">
        <Card>
          <h3>Create League</h3>
          <p>Start a private league and invite your friends.</p>
          <input
            placeholder="League name"
            value={leagueName}
            onChange={(event) => setLeagueName(event.target.value)}
          />
          <label className="stack">
            Visibility
            <select
              value={leagueVisibility}
              onChange={(event) => setLeagueVisibility(event.target.value as LeagueVisibility)}
            >
              <option value="private">Private</option>
              <option value="public">Public</option>
            </select>
          </label>
          <Button onClick={handleCreateLeague} disabled={createState === 'creating'}>
            {createState === 'creating' ? 'Creating...' : 'Create League'}
          </Button>
          {createState !== 'idle' && createState !== 'creating' && createState !== 'created' ? (
            <p>{createState}</p>
          ) : null}
        </Card>

        <Card>
          <h3>Join League</h3>
          <p>Paste an invite token or full invite link to join instantly.</p>
          <input
            placeholder="Invite token or link"
            value={inviteInput}
            onChange={(event) => setInviteInput(event.target.value)}
          />
          <Button variant="secondary" onClick={handleJoinLeague} disabled={joinState === 'joining'}>
            {joinState === 'joining' ? 'Joining...' : 'Join League'}
          </Button>
          {joinState !== 'idle' && joinState !== 'joining' && joinState !== 'joined' ? (
            <p>{joinState}</p>
          ) : null}
        </Card>
      </div> : null}
    </PageShell>
  )
}
