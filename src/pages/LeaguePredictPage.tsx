import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, apiClient } from '../api/apiClient'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { PageShell } from '../components/ui/PageShell'

type Driver = {
  id?: string
  driverId?: string
  code?: string
  shortName?: string
  displayName?: string
  name?: string
}

type DriversResponse = {
  drivers?: Driver[]
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
  entryOpensAt?: string
  predictionOpensAt?: string
  openAt?: string
  entryClosesAt?: string
  predictionClosesAt?: string
  lockAt?: string
}

type PredictionWindowStatus = 'opening_soon' | 'open' | 'locked'

function driverId(driver: Driver): string {
  return driver.id ?? driver.driverId ?? ''
}

function driverLabel(driver: Driver): string {
  return driver.displayName ?? driver.name ?? driver.shortName ?? driver.code ?? driverId(driver)
}

export function LeaguePredictPage() {
  const { leagueId } = useParams<{ leagueId: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [selection, setSelection] = useState<string[]>(['', '', ''])
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | string>('idle')
  const [windowStatus, setWindowStatus] = useState<PredictionWindowStatus>('opening_soon')
  const [windowMessage, setWindowMessage] = useState('Checking prediction window...')
  const [opensAt, setOpensAt] = useState<number | null>(null)
  const [closesAt, setClosesAt] = useState<number | null>(null)
  const [countdownLabel, setCountdownLabel] = useState('')

  function formatServerError(err: unknown, fallback: string): string {
    if (err instanceof ApiError) {
      if (err.code) return `${err.message} (${err.code})`
      return err.message
    }
    return err instanceof Error ? err.message : fallback
  }

  useEffect(() => {
    if (!leagueId) {
      setLoading(false)
      setError('Missing league ID')
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([
      apiClient.get<DriversResponse>('/f1/next-race/drivers'),
      apiClient
        .get<EntryResponse>(`/leagues/${leagueId}/races/next/entry/me`)
        .catch(() => ({} as EntryResponse)),
      apiClient.get<NextRaceResponse>('/f1/next-race')
    ])
      .then(([driversData, entryData, nextRaceData]) => {
        if (cancelled) return

        const loadedDrivers = driversData.drivers ?? []
        setDrivers(loadedDrivers)

        const existing =
          (entryData.driverIds && entryData.driverIds.length > 0
            ? entryData.driverIds
            : entryData.predictions) ?? []

        setSelection([
          existing[0] ?? '',
          existing[1] ?? '',
          existing[2] ?? ''
        ])

        const raceOpenAt =
          nextRaceData.entryOpensAt ?? nextRaceData.predictionOpensAt ?? nextRaceData.openAt
        const raceCloseAt =
          nextRaceData.entryClosesAt ?? nextRaceData.predictionClosesAt ?? nextRaceData.lockAt
        const raceOpenTime = raceOpenAt ? new Date(raceOpenAt).getTime() : null
        const raceCloseTime = raceCloseAt ? new Date(raceCloseAt).getTime() : null

        const now = Date.now()
        const lockedByTime = raceCloseTime !== null && !Number.isNaN(raceCloseTime) && now >= raceCloseTime
        const opensInFuture = raceOpenTime !== null && !Number.isNaN(raceOpenTime) && now < raceOpenTime
        const lockedByApi =
          entryData.locked === true ||
          entryData.isLocked === true ||
          entryData.lockStatus === 'locked' ||
          nextRaceData.predictionLocked === true ||
          nextRaceData.entriesLocked === true ||
          nextRaceData.lockStatus === 'locked'

        setOpensAt(raceOpenTime !== null && !Number.isNaN(raceOpenTime) ? raceOpenTime : null)
        setClosesAt(raceCloseTime !== null && !Number.isNaN(raceCloseTime) ? raceCloseTime : null)

        if (lockedByApi || lockedByTime) {
          setWindowStatus('locked')
          setWindowMessage('Predictions are locked')
        } else if (opensInFuture) {
          setWindowStatus('opening_soon')
          setWindowMessage(`Predictions open at ${new Date(raceOpenTime as number).toLocaleString()}`)
        } else {
          setWindowStatus('open')
          if (raceCloseTime) {
            setWindowMessage(`Predictions close at ${new Date(raceCloseTime).toLocaleString()}`)
          } else {
            setWindowMessage('Predictions are open')
          }
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = formatServerError(err, 'Failed to load prediction page')
          setError(message)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [leagueId])

  const missingRequiredPick = useMemo(() => selection.some((value) => !value), [selection])
  const duplicatePick = useMemo(
    () => new Set(selection.filter(Boolean)).size !== selection.filter(Boolean).length,
    [selection]
  )
  const isOpen = windowStatus === 'open'

  useEffect(() => {
    if (!opensAt && !closesAt) {
      setCountdownLabel('')
      return
    }

    const formatDuration = (targetTs: number): string => {
      const totalSeconds = Math.max(0, Math.floor((targetTs - Date.now()) / 1000))
      const days = Math.floor(totalSeconds / 86400)
      const hours = Math.floor((totalSeconds % 86400) / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60
      return `${days}d ${hours}h ${minutes}m ${seconds}s`
    }

    const tick = () => {
      if (windowStatus === 'opening_soon' && opensAt) {
        setCountdownLabel(`Opens in ${formatDuration(opensAt)}`)
        return
      }
      if (windowStatus === 'open' && closesAt) {
        setCountdownLabel(`Closes in ${formatDuration(closesAt)}`)
        return
      }
      setCountdownLabel(windowStatus === 'locked' ? 'Locked' : '')
    }

    tick()
    const interval = window.setInterval(tick, 1000)
    return () => window.clearInterval(interval)
  }, [opensAt, closesAt, windowStatus])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!leagueId || !isOpen || missingRequiredPick || duplicatePick) return

    setSaveState('saving')
    const driverIds = selection
    try {
      await apiClient.put(`/leagues/${leagueId}/races/next/entry/me`, {
        driverIds,
        predictions: driverIds
      })
      setSaveState('saved')
    } catch (err: unknown) {
      const message = formatServerError(err, 'Failed to submit prediction')
      setSaveState(message)
    }
  }

  return (
    <PageShell title="League Predict">
      <p>
        League ID: <code>{leagueId}</code>
      </p>
      <div className={`window-banner ${windowStatus}`}>
        <strong>
          {windowStatus === 'open'
            ? 'Predictions Open'
            : windowStatus === 'opening_soon'
              ? 'Predictions Not Open Yet'
              : 'Predictions Locked'}
        </strong>
        <span>{countdownLabel || windowMessage}</span>
      </div>

      {loading ? <p>Loading prediction data...</p> : null}
      {error ? <p>{error}</p> : null}

      {!loading && !error ? (
        <Card>
          <form onSubmit={handleSubmit} className="stack">
          <h3>Predict Top 3</h3>

          {['P1', 'P2', 'P3'].map((slot, index) => (
            <label key={slot} className="stack">
              {slot}
              <select
                value={selection[index]}
                disabled={!isOpen || saveState === 'saving'}
                onChange={(event) => {
                  const next = [...selection]
                  next[index] = event.target.value
                  setSelection(next)
                }}
              >
                <option value="">Select driver</option>
                {drivers.map((driver) => {
                  const id = driverId(driver)
                  return (
                    <option key={id} value={id}>
                      {driverLabel(driver)}
                    </option>
                  )
                })}
              </select>
            </label>
          ))}

          {missingRequiredPick ? <p>Please select all three drivers.</p> : null}
          {duplicatePick ? <p>Each pick must be a different driver.</p> : null}

          <Button
            type="submit"
            disabled={!isOpen || missingRequiredPick || duplicatePick || saveState === 'saving'}
          >
            {saveState === 'saving' ? 'Submitting...' : 'Submit prediction'}
          </Button>
          {saveState === 'saved' ? <Badge tone="success">Prediction saved.</Badge> : null}
          {saveState !== 'idle' && saveState !== 'saving' && saveState !== 'saved' ? (
            <Badge tone="danger">{saveState}</Badge>
          ) : null}
          </form>
        </Card>
      ) : null}

      <p>
        <Link to={`/league/${leagueId}`}>Back to league page</Link>
      </p>
    </PageShell>
  )
}
