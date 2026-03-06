import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { apiClient } from '../api/apiClient'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/Card'
import { Table } from '../components/ui/Table'

type Scoring = {
  available: boolean
}

type LeaderboardRow = {
  rank: number
  displayName: string
  points: number
  breakdown?: unknown
  rankChange?: number
  movement?: number
  delta?: number
}

type ApiLeaderboardRow = {
  rank?: number
  user?: {
    displayName?: string
  }
  displayName?: string
  pointsTotal?: number
  points?: number
  breakdown?: unknown
  rankChange?: number
  movement?: number
  delta?: number
}

type LeaderboardResponse = {
  scoring?: Scoring
  rows?: ApiLeaderboardRow[]
}

function breakdownText(breakdown: unknown): string {
  if (breakdown == null) return 'No breakdown provided'
  if (typeof breakdown === 'string') return breakdown
  return JSON.stringify(breakdown, null, 2)
}

function rankDelta(row: LeaderboardRow): number | null {
  const value = row.rankChange ?? row.movement ?? row.delta
  return typeof value === 'number' ? value : null
}

function normalizeRows(data: LeaderboardResponse | null): LeaderboardRow[] {
  if (!data) return []
  return (data.rows ?? []).map((row, index) => ({
    rank: typeof row.rank === 'number' ? row.rank : index + 1,
    displayName: row.user?.displayName ?? row.displayName ?? 'Unknown manager',
    points: row.pointsTotal ?? row.points ?? 0,
    breakdown: row.breakdown,
    rankChange: row.rankChange,
    movement: row.movement,
    delta: row.delta
  }))
}

export function LeagueLeaderboardPage() {
  const { leagueId, raceId } = useParams<{ leagueId: string; raceId: string }>()
  const { data, isLoading: loading, error, refetch } = useQuery({
    queryKey: ['league-leaderboard', leagueId, raceId],
    enabled: Boolean(leagueId && raceId),
    queryFn: () => {
      if (!leagueId || !raceId) {
        throw new Error('Missing route parameters')
      }
      return apiClient.get<LeaderboardResponse>(`/leagues/${leagueId}/races/${raceId}/leaderboard`)
    },
  })

  const rows = useMemo(() => normalizeRows(data ?? null), [data])
  const scoringAvailable = data?.scoring?.available ?? true
  const topScorer = rows[0]

  return (
    <section className="relative w-full overflow-hidden bg-background bg-linear-to-b from-neutral-50 to-white pb-12 pt-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(0,0,0,0.015) 0px, rgba(0,0,0,0.015) 1px, rgba(0,0,0,0) 9px, rgba(0,0,0,0) 14px)",
          opacity: 0.02,
        }}
      />
      <div className="relative z-10 mx-auto max-w-7xl space-y-8 px-6">
        {/* Header */}
        <div className="space-y-2">
          <h2 className="font-['Orbitron'] text-3xl font-bold uppercase tracking-tight text-black">
            Leaderboard
          </h2>
          <p className="text-muted-foreground text-slate-600">
            League: <code className="text-sm">{leagueId}</code> | Race: <code className="text-sm">{raceId}</code>
          </p>
          <Link 
            to={`/league/${leagueId}`}
            className="text-sm text-red-600 hover:text-red-700"
          >
            ← Back to league
          </Link>
        </div>

        {/* Status Badges */}
        {!loading && !error && (
          <div className="flex flex-wrap gap-2">
            {!scoringAvailable && <Badge tone="warning">Scoring pending</Badge>}
            {scoringAvailable && topScorer && (
              <Badge tone="success">Manager of the race: {topScorer.displayName}</Badge>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <Card className="animate-pulse bg-background">
            <CardHeader>
              <div className="h-6 w-1/4 rounded bg-neutral-200" />
            </CardHeader>
            <CardContent>
              <div className="h-64 rounded bg-neutral-200" />
            </CardContent>
          </Card>
        ) : null}

        {/* Error State */}
        {error ? (
          <Card className="bg-red-50">
            <CardContent className="py-4 space-y-4">
              <p className="text-red-600">{error instanceof Error ? error.message : 'Failed to load leaderboard'}</p>
              <Button variant="secondary" onClick={() => void refetch()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {/* Leaderboard Table */}
        {!loading && !error && (
          <Card className="bg-background transition hover:border-neutral-400">
            <CardHeader>
              <CardTitle>Race Results</CardTitle>
            </CardHeader>
            <CardContent>
              <Table ariaLabel="Race leaderboard">
                <thead>
                  <tr>
                    <th className="w-20">Rank</th>
                    <th>Manager</th>
                    <th className="text-right">Points</th>
                    <th className="w-32">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={`${row.rank}-${row.displayName}`}>
                      <td>
                        <span className="rank-cell">
                          <span className="font-semibold">{row.rank}</span>
                          {rankDelta(row) !== null && (
                            <span
                              className={`rank-delta ${
                                (rankDelta(row) as number) > 0
                                  ? 'up'
                                  : (rankDelta(row) as number) < 0
                                  ? 'down'
                                  : 'flat'
                              }`}
                            >
                              {(rankDelta(row) as number) > 0
                                ? `+${rankDelta(row)}`
                                : `${rankDelta(row)}`}
                            </span>
                          )}
                        </span>
                      </td>
                      <td>{row.displayName}</td>
                      <td className="text-right font-semibold">{row.points}</td>
                      <td>
                        {row.breakdown ? (
                          <details className="text-sm">
                            <summary className="cursor-pointer text-slate-500 hover:text-slate-700">
                              Show
                            </summary>
                            <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-600">
                              {breakdownText(row.breakdown)}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center text-slate-500 py-8">
                        No leaderboard entries yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  )
}
