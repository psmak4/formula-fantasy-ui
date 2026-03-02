import { Link, useParams } from 'react-router-dom'

export function LeaguePredictPage() {
  const { leagueId } = useParams<{ leagueId: string }>()

  return (
    <section>
      <h2>League Predict</h2>
      <p>Placeholder prediction page for league ID: <code>{leagueId}</code></p>
      <p>
        <Link to={`/league/${leagueId}`}>Back to league page</Link>
      </p>
    </section>
  )
}
