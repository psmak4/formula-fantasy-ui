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
  constructorName?: string
  constructor?: string
  teamName?: string
  team?: string
}

type DriversResponse = {
  drivers?: Driver[]
}

type EntryResponse = {
  driverIds?: string[]
  predictions?: string[]
  podium?: { p1?: string; p2?: string; p3?: string }
  fastestLapDriverId?: string
  fastestLap?: { driverId?: string } | string
  biggestGainerDriverId?: string
  biggestGainer?: { driverId?: string } | string
  safetyCarDeployed?: boolean
  safetyCar?: boolean
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

type DriverPickerProps = {
  label: string
  value: string
  drivers: Driver[]
  disabled: boolean
  onChange: (nextValue: string) => void
}

function driverId(driver: Driver): string {
  return driver.id ?? driver.driverId ?? ''
}

function constructorLabel(driver: Driver): string {
  return driver.constructorName ?? driver.constructor ?? driver.teamName ?? driver.team ?? 'Unknown Team'
}

function driverName(driver: Driver): string {
  return driver.displayName ?? driver.name ?? driver.shortName ?? driver.code ?? driverId(driver)
}

function driverDisplayLabel(driver: Driver): string {
  const code = driver.code ? ` (${driver.code})` : ''
  return `${driverName(driver)}${code} - ${constructorLabel(driver)}`
}

function toDriverId(value: EntryResponse['fastestLap'] | EntryResponse['biggestGainer']): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value.driverId ?? ''
}

function DriverPicker({ label, value, drivers, disabled, onChange }: DriverPickerProps) {
  const [query, setQuery] = useState('')

  useEffect(() => {
    const selected = drivers.find((driver) => driverId(driver) === value)
    if (selected) setQuery(driverName(selected))
    if (!value) setQuery('')
  }, [drivers, value])

  const filteredDrivers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return drivers
    return drivers.filter((driver) => {
      const haystack = `${driverDisplayLabel(driver)} ${driverId(driver)}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [drivers, query])

  return (
    <fieldset className="predict-fieldset" disabled={disabled}>
      <legend>{label}</legend>
      <input
        type="text"
        placeholder="Search driver"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label={`${label} search`}
      />
      <select
        className="driver-picker-select"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
      >
        <option value="">Select driver</option>
        {filteredDrivers.map((driver) => {
          const id = driverId(driver)
          return (
            <option key={id} value={id}>
              {driverDisplayLabel(driver)}
            </option>
          )
        })}
      </select>
    </fieldset>
  )
}

export function LeaguePredictPage() {
  const { leagueId } = useParams<{ leagueId: string }>()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [drivers, setDrivers] = useState<Driver[]>([])

  const [podium, setPodium] = useState<string[]>(['', '', ''])
  const [fastestLapDriverId, setFastestLapDriverId] = useState('')
  const [biggestGainerDriverId, setBiggestGainerDriverId] = useState('')
  const [safetyCarDeployed, setSafetyCarDeployed] = useState(false)

  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [submitError, setSubmitError] = useState<string | null>(null)

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

        const existingPodium =
          entryData.podium
            ? [entryData.podium.p1 ?? '', entryData.podium.p2 ?? '', entryData.podium.p3 ?? '']
            : (entryData.driverIds && entryData.driverIds.length > 0
              ? entryData.driverIds
              : entryData.predictions) ?? []

        setPodium([existingPodium[0] ?? '', existingPodium[1] ?? '', existingPodium[2] ?? ''])
        setFastestLapDriverId(entryData.fastestLapDriverId ?? toDriverId(entryData.fastestLap))
        setBiggestGainerDriverId(entryData.biggestGainerDriverId ?? toDriverId(entryData.biggestGainer))
        setSafetyCarDeployed(entryData.safetyCarDeployed ?? entryData.safetyCar ?? false)

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
          setWindowMessage('Locked')
        } else if (opensInFuture) {
          setWindowStatus('opening_soon')
          setWindowMessage(`Opens at ${new Date(raceOpenTime as number).toLocaleString()}`)
        } else {
          setWindowStatus('open')
          setWindowMessage(
            raceCloseTime ? `Locks at ${new Date(raceCloseTime).toLocaleString()}` : 'Open for entries'
          )
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(formatServerError(err, 'Failed to load prediction page'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [leagueId])

  const missingRequiredPick = useMemo(() => podium.some((value) => !value), [podium])
  const duplicatePick = useMemo(
    () => new Set(podium.filter(Boolean)).size !== podium.filter(Boolean).length,
    [podium]
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
      return `${days}d ${hours}h ${minutes}m`
    }

    const tick = () => {
      if (windowStatus === 'opening_soon' && opensAt) {
        setCountdownLabel(`Opens in ${formatDuration(opensAt)}`)
        return
      }
      if (windowStatus === 'open' && closesAt) {
        setCountdownLabel(`Locks in ${formatDuration(closesAt)}`)
        return
      }
      setCountdownLabel('Locked')
    }

    tick()
    const interval = window.setInterval(tick, 30000)
    return () => window.clearInterval(interval)
  }, [opensAt, closesAt, windowStatus])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!leagueId || !isOpen || missingRequiredPick || duplicatePick) return

    setSaveState('saving')
    setSubmitError(null)

    try {
      await apiClient.put(`/leagues/${leagueId}/races/next/entry/me`, {
        driverIds: podium,
        predictions: podium,
        podium: { p1: podium[0], p2: podium[1], p3: podium[2] },
        fastestLapDriverId,
        biggestGainerDriverId,
        safetyCarDeployed,
        fastestLap: fastestLapDriverId,
        biggestGainer: biggestGainerDriverId,
        safetyCar: safetyCarDeployed
      })
      setSaveState('saved')
    } catch (err: unknown) {
      setSubmitError(formatServerError(err, 'Failed to submit prediction'))
      setSaveState('idle')
    }
  }

  return (
    <PageShell title="League Predict" subtitle="Set your full race entry before lock time.">
      <p>
        League ID: <code>{leagueId}</code>
      </p>

      <div className={`window-banner ${windowStatus}`}>
        <strong>{windowStatus === 'locked' ? 'Locked' : countdownLabel || windowMessage}</strong>
        <span>{windowStatus === 'open' ? 'Entries are open.' : windowMessage}</span>
      </div>

      {loading ? <p>Loading prediction data...</p> : null}
      {error ? <Badge tone="danger">{error}</Badge> : null}

      {!loading && !error ? (
        <Card>
          <form onSubmit={handleSubmit} className="predict-form">
            <section className="predict-section" aria-labelledby="podium-title">
              <h3 id="podium-title">Podium picks</h3>
              <DriverPicker
                label="P1"
                value={podium[0]}
                drivers={drivers}
                disabled={!isOpen || saveState === 'saving'}
                onChange={(value) => setPodium((prev) => [value, prev[1], prev[2]])}
              />
              <DriverPicker
                label="P2"
                value={podium[1]}
                drivers={drivers}
                disabled={!isOpen || saveState === 'saving'}
                onChange={(value) => setPodium((prev) => [prev[0], value, prev[2]])}
              />
              <DriverPicker
                label="P3"
                value={podium[2]}
                drivers={drivers}
                disabled={!isOpen || saveState === 'saving'}
                onChange={(value) => setPodium((prev) => [prev[0], prev[1], value])}
              />
              {missingRequiredPick ? <p className="text-muted">Select all podium slots.</p> : null}
              {duplicatePick ? <p className="text-muted">Podium picks must be unique.</p> : null}
            </section>

            <section className="predict-section" aria-labelledby="props-title">
              <h3 id="props-title">Race props</h3>
              <DriverPicker
                label="Fastest lap"
                value={fastestLapDriverId}
                drivers={drivers}
                disabled={!isOpen || saveState === 'saving'}
                onChange={setFastestLapDriverId}
              />
              <DriverPicker
                label="Biggest gainer"
                value={biggestGainerDriverId}
                drivers={drivers}
                disabled={!isOpen || saveState === 'saving'}
                onChange={setBiggestGainerDriverId}
              />

              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={safetyCarDeployed}
                  disabled={!isOpen || saveState === 'saving'}
                  onChange={(event) => setSafetyCarDeployed(event.target.checked)}
                />
                <span>Safety car deployed</span>
              </label>
            </section>

            <div className="predict-actions">
              <Button
                type="submit"
                disabled={!isOpen || missingRequiredPick || duplicatePick || saveState === 'saving'}
              >
                {saveState === 'saving' ? 'Saving Entry...' : 'Save Entry'}
              </Button>
              {saveState === 'saved' ? <Badge tone="success">Entry saved</Badge> : null}
              {submitError ? <Badge tone="danger">{submitError}</Badge> : null}
            </div>
          </form>
        </Card>
      ) : null}

      <p>
        <Link to={`/league/${leagueId}`}>Back to league page</Link>
      </p>
    </PageShell>
  )
}
