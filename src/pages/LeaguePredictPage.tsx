import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiClient } from '../api/apiClient'

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
  entryClosesAt?: string
  predictionClosesAt?: string
  lockAt?: string
}

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
  const [isLocked, setIsLocked] = useState(false)
  const [lockMessage, setLockMessage] = useState('Entry is open')

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

        const raceLockAt =
          nextRaceData.entryClosesAt ?? nextRaceData.predictionClosesAt ?? nextRaceData.lockAt
        const raceLockTime = raceLockAt ? new Date(raceLockAt).getTime() : null
        const lockedByTime = raceLockTime !== null && !Number.isNaN(raceLockTime) && Date.now() >= raceLockTime
        const locked =
          entryData.locked === true ||
          entryData.isLocked === true ||
          entryData.lockStatus === 'locked' ||
          nextRaceData.predictionLocked === true ||
          nextRaceData.entriesLocked === true ||
          nextRaceData.lockStatus === 'locked' ||
          lockedByTime

        setIsLocked(locked)
        if (locked) {
          setLockMessage('Predictions are locked for the next race')
        } else if (raceLockAt) {
          setLockMessage(`Predictions are open until ${new Date(raceLockAt).toLocaleString()}`)
        } else {
          setLockMessage('Predictions are open')
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load prediction page'
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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!leagueId || isLocked || missingRequiredPick || duplicatePick) return

    setSaveState('saving')
    const driverIds = selection
    try {
      await apiClient.put(`/leagues/${leagueId}/races/next/entry/me`, {
        driverIds,
        predictions: driverIds
      })
      setSaveState('saved')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit prediction'
      setSaveState(message)
    }
  }

  return (
    <section>
      <h2>League Predict</h2>
      <p>
        League ID: <code>{leagueId}</code>
      </p>
      <p className={isLocked ? 'status-lock' : 'status-open'}>{lockMessage}</p>

      {loading ? <p>Loading prediction data...</p> : null}
      {error ? <p>{error}</p> : null}

      {!loading && !error ? (
        <form onSubmit={handleSubmit} className="card">
          <h3>Predict Top 3</h3>

          {['P1', 'P2', 'P3'].map((slot, index) => (
            <label key={slot} className="stack">
              {slot}
              <select
                value={selection[index]}
                disabled={isLocked || saveState === 'saving'}
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

          <button
            type="submit"
            disabled={isLocked || missingRequiredPick || duplicatePick || saveState === 'saving'}
          >
            {saveState === 'saving' ? 'Submitting...' : 'Submit prediction'}
          </button>
          {saveState === 'saved' ? <p>Prediction saved.</p> : null}
          {saveState !== 'idle' && saveState !== 'saving' && saveState !== 'saved' ? (
            <p>{saveState}</p>
          ) : null}
        </form>
      ) : null}

      <p>
        <Link to={`/league/${leagueId}`}>Back to league page</Link>
      </p>
    </section>
  )
}
