import { useEffect, useState } from 'react'
import { API_BASE_URL, apiClient } from '../api/apiClient'

type HealthResponse = {
  ok?: boolean
}

export function HomePage() {
  const [status, setStatus] = useState('Checking API...')

  useEffect(() => {
    let cancelled = false

    apiClient
      .get<HealthResponse>('/health')
      .then(() => {
        if (!cancelled) setStatus('API reachable')
      })
      .catch(() => {
        if (!cancelled) setStatus('API not reachable (placeholder check)')
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section>
      <h2>Home</h2>
      <p>Placeholder home page.</p>
      <p>
        API base URL: <code>{API_BASE_URL}</code>
      </p>
      <p>{status}</p>
    </section>
  )
}
