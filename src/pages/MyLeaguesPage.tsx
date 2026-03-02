import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { PageShell } from '../components/ui/PageShell'

export function MyLeaguesPage() {
  return (
    <PageShell title="My Leagues" subtitle="Open an existing league or jump into the demo league.">
      <Card>
        <p>No saved leagues yet.</p>
        <p>
          <Link to="/league/demo-league">Open demo league</Link>
        </p>
      </Card>
    </PageShell>
  )
}
