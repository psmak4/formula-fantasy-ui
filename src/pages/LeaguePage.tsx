import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, apiClient } from '../api/apiClient'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { PageShell } from '../components/ui/PageShell'
import { Table } from '../components/ui/Table'

type Member = {
  id?: string
  userId?: string
  displayName?: string
  name?: string
  handle?: string
}

type LeagueResponse = {
  id?: string
  name?: string
  members?: Member[]
  league?: {
    id?: string
    name?: string
    members?: Member[]
  }
}

type LeaderboardEntry = {
  rank: number
  displayName: string
  points: number
  rankChange?: number
  movement?: number
  delta?: number
}

type LeaderboardResponse = {
  scoring?: { available?: boolean }
  entries?: LeaderboardEntry[]
  leaderboard?: LeaderboardEntry[]
}

type EntryResponse = {
  driverIds?: string[]
  predictions?: string[]
  locked?: boolean
  isLocked?: boolean
  lockStatus?: 'open' | 'locked'
}

type NextRaceResponse = {
  predictionLocked?: boolean
  entriesLocked?: boolean
  lockStatus?: 'open' | 'locked'
  entryClosesAt?: string
  predictionClosesAt?: string
  lockAt?: string
}

type InviteResponse = {
  inviteUrl?: string
  inviteLink?: string
  url?: string
  link?: string
  token?: string
  inviteToken?: string
}

function formatApiError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.code) return `${err.message} (${err.code})`
    return err.message
  }
  return err instanceof Error ? err.message : fallback
}

function resolveInviteLink(data: InviteResponse): string | null {
  const link = data.inviteUrl ?? data.inviteLink ?? data.url ?? data.link
  if (link) return link

  const token = data.token ?? data.inviteToken
  if (!token || typeof window === 'undefined') return null
  return `${window.location.origin}/invite/${token}`
}

function rankDelta(entry: LeaderboardEntry): number | null {
  const value = entry.rankChange ?? entry.movement ?? entry.delta
  return typeof value === 'number' ? value : null
}

export function LeaguePage() {
  const { leagueId } = useParams<{ leagueId: string }>()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [leagueName, setLeagueName] = useState('League')
  const [members, setMembers] = useState<Member[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null)

  const [entrySubmitted, setEntrySubmitted] = useState(false)
  const [entryLocked, setEntryLocked] = useState(false)

  const [joinState, setJoinState] = useState<'idle' | 'joining' | 'joined' | string>('idle')
  const [inviteState, setInviteState] = useState<'idle' | 'creating' | 'copied' | string>('idle')
  const [inviteLink, setInviteLink] = useState('')

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
        .catch(() => ({} as LeaderboardResponse)),
      apiClient
        .get<EntryResponse>(`/leagues/${leagueId}/races/next/entry/me`)
        .catch(() => ({} as EntryResponse)),
      apiClient.get<NextRaceResponse>('/f1/next-race').catch(() => ({} as NextRaceResponse))
    ])
      .then(([leagueData, leaderboardData, entryData, nextRaceData]) => {
        if (cancelled) return

        const name = leagueData.name ?? leagueData.league?.name ?? 'League'
        const list = leagueData.members ?? leagueData.league?.members ?? []
        setLeagueName(name)
        setMembers(list)
        setLeaderboard(leaderboardData)

        const picks = (entryData.driverIds?.length ? entryData.driverIds : entryData.predictions) ?? []
        setEntrySubmitted(picks.length > 0)

        const closeAt = nextRaceData.entryClosesAt ?? nextRaceData.predictionClosesAt ?? nextRaceData.lockAt
        const closeTs = closeAt ? new Date(closeAt).getTime() : NaN
        const lockedByTime = !Number.isNaN(closeTs) && Date.now() >= closeTs
        const locked =
          entryData.locked === true ||
          entryData.isLocked === true ||
          entryData.lockStatus === 'locked' ||
          nextRaceData.predictionLocked === true ||
          nextRaceData.entriesLocked === true ||
          nextRaceData.lockStatus === 'locked' ||
          lockedByTime

        setEntryLocked(locked)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(formatApiError(err, 'Failed to load league'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [leagueId, joinState])

  const leaderboardRows = useMemo(
    () => (leaderboard?.entries ?? leaderboard?.leaderboard ?? []).slice(0, 10),
    [leaderboard]
  )
  const topScorer = leaderboardRows[0]
  const scoringAvailable = leaderboard?.scoring?.available !== false

  async function handleJoinLeague() {
    if (!leagueId) return

    setJoinState('joining')
    try {
      await apiClient.post(`/leagues/${leagueId}/join`)
      setJoinState('joined')
    } catch (err: unknown) {
      setJoinState(formatApiError(err, 'Failed to join league'))
    }
  }

  async function handleCreateInvite() {
    if (!leagueId) return

    setInviteState('creating')
    try {
      const data = await apiClient.post<InviteResponse>(`/leagues/${leagueId}/invite`)
      const link = resolveInviteLink(data)
      if (!link) throw new Error('Invite created but no link returned')
      setInviteLink(link)
      setInviteState('idle')
    } catch (err: unknown) {
      setInviteState(formatApiError(err, 'Failed to create invite'))
    }
  }

  async function handleCopyInvite() {
    if (!inviteLink) return

    try {
      await navigator.clipboard.writeText(inviteLink)
      setInviteState('copied')
    } catch {
      setInviteState('Could not copy. Please copy manually.')
    }
  }

  return (
    <PageShell title="League" subtitle="Track members, race standings, and your prediction status in one place.">
      {loading ? <p>Loading league...</p> : null}
      {error ? <p>{error}</p> : null}

      {!loading && !error ? (
        <div className="league-grid">
          <Card>
            <h3>{leagueName}</h3>
            <p>
              League ID: <code>{leagueId}</code>
            </p>

            <div className="stack">
              <Button variant="secondary" onClick={handleJoinLeague} disabled={joinState === 'joining'}>
                {joinState === 'joining' ? 'Joining...' : 'Join League'}
              </Button>
              {joinState !== 'idle' && joinState !== 'joining' && joinState !== 'joined' ? (
                <p>{joinState}</p>
              ) : null}
            </div>

            <div className="stack">
              <Button onClick={handleCreateInvite} disabled={inviteState === 'creating'}>
                {inviteState === 'creating' ? 'Creating Invite...' : 'Invite'}
              </Button>

              {inviteLink ? (
                <div className="invite-row">
                  <input value={inviteLink} readOnly aria-label="Invite link" />
                  <Button variant="ghost" onClick={handleCopyInvite}>Copy</Button>
                </div>
              ) : null}

              {inviteState !== 'idle' && inviteState !== 'creating' ? <p>{inviteState}</p> : null}
            </div>

            <div>
              <h4>Members</h4>
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
          </Card>

          <Card>
            <h3>Leaderboard</h3>
            {leaderboard?.scoring?.available === false ? <Badge tone="warning">Scoring pending</Badge> : null}
            {scoringAvailable && topScorer ? (
              <Badge tone="success">Manager of the race: {topScorer.displayName}</Badge>
            ) : null}
            <Table ariaLabel="League leaderboard top 10">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Manager</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>
                {leaderboardRows.map((entry) => (
                  <tr key={`${entry.rank}-${entry.displayName}`}>
                    <td>
                      <span className="rank-cell">
                        <span>{entry.rank}</span>
                        {rankDelta(entry) !== null ? (
                          <span
                            className={`rank-delta ${
                              (rankDelta(entry) as number) > 0
                                ? 'up'
                                : (rankDelta(entry) as number) < 0
                                  ? 'down'
                                  : 'flat'
                            }`}
                            aria-label={`Rank change ${rankDelta(entry)}`}
                            title={`Rank change ${rankDelta(entry)}`}
                          >
                            {(rankDelta(entry) as number) > 0
                              ? `+${rankDelta(entry)}`
                              : `${rankDelta(entry)}`}
                          </span>
                        ) : null}
                      </span>
                    </td>
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
            </Table>
          </Card>

          <Card>
            <h3>Your Entry</h3>
            <div className="stack">
              {entrySubmitted ? <Badge tone="success">Submitted</Badge> : <Badge tone="warning">Not submitted</Badge>}
              {entryLocked ? <Badge tone="danger">Locked</Badge> : <Badge tone="info">Open</Badge>}
            </div>
            <p>
              {entrySubmitted
                ? 'Your prediction is in for the next race.'
                : 'You have not submitted a prediction for the next race.'}
            </p>
            <p>
              <Link className="ui-button ui-button-secondary" to={`/league/${leagueId}/predict`}>
                {entryLocked ? 'View Entry' : 'Edit Entry'}
              </Link>
            </p>
          </Card>
        </div>
      ) : null}
    </PageShell>
  )
}
