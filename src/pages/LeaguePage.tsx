import { Link, useParams } from 'react-router-dom'

export function LeaguePage() {
  const { leagueId } = useParams<{ leagueId: string }>()

  return (
    <section>
      <h2>League</h2>
      <p>Placeholder league page for league ID: <code>{leagueId}</code></p>
      <p>
        <Link to={`/league/${leagueId}/predict`}>Go to prediction page</Link>
      </p>
    </section>
  )
}
