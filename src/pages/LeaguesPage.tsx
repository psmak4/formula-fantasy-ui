import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { apiClient } from '../api/apiClient'
import { AppPageHeader } from '../components/layout/AppPageHeader'
import { LeagueIcon } from '../components/league/LeagueIcon'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import { leagueInitials } from '../lib/leagueJoin'

type League = {
	id: string
	name: string
	memberCount?: number
	visibility?: 'public' | 'private'
	rank?: number | null
	icon?: string
	color?: string
}

type LeaguesResponse = {
	leagues?: League[]
}

const leagueIconBackgrounds = ['bg-red-600', 'bg-black', 'bg-blue-600', 'bg-emerald-600', 'bg-amber-500']

function formatRank(value?: number | null): string {
	if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) {
		return '-'
	}

	if (value >= 1000) {
		const compact = value >= 10000 ? Math.round(value / 1000) : Math.round((value / 1000) * 10) / 10
		return `${compact}K+`
	}

	return value.toLocaleString()
}

function LeagueListRow({ league, index }: { league: League; index: number }) {
	return (
		<Link
			to={`/league/${league.id}`}
			data-interactive="true"
			className="ff-data-row hover:no-underline md:grid-cols-[minmax(0,1.5fr)_120px_120px]"
		>
			<div className="flex items-center gap-4">
				<div
					className={`flex h-12 w-12 shrink-0 items-center justify-center ${
						league.color ? '' : leagueIconBackgrounds[index % leagueIconBackgrounds.length]
					}`}
					style={league.color ? { backgroundColor: league.color } : undefined}
				>
					{league.icon ? (
						<LeagueIcon iconName={league.icon} />
					) : (
						<span className="text-base font-black text-white">{leagueInitials(league.name)}</span>
					)}
				</div>
				<div className="min-w-0">
					<p className="truncate text-xl font-semibold uppercase tracking-[0.04em] text-on-surface md:text-2xl">
						{league.name}
					</p>
					<div className="mt-2 flex flex-wrap gap-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
						<span>{league.visibility ?? 'private'}</span>
						<span>{league.memberCount ?? 0} members</span>
					</div>
				</div>
			</div>

			<div className="text-left md:text-center">
				<p className="ff-kicker">Members</p>
				<p className="mt-2 text-3xl font-black text-on-surface">{league.memberCount ?? 0}</p>
			</div>

			<div className="text-left md:text-right">
				<p className="ff-kicker">My Rank</p>
				<p className="mt-2 text-3xl font-black text-tertiary">{formatRank(league.rank)}</p>
			</div>
		</Link>
	)
}

function LeaguesPageSkeleton() {
	return (
		<div className="space-y-6">
			<Card className="ff-table-card">
				<CardContent className="px-0 py-0">
					<div className="ff-panel-strip">
						<div className="space-y-2">
							<div className="skeleton-line h-8 w-40" />
							<div className="skeleton-line h-4 w-72" />
						</div>
					</div>
					<div className="space-y-4 px-6 py-6">
						{[1, 2, 3].map((value) => (
							<div
								key={value}
								className="rounded-md grid gap-4 bg-surface-container-low p-5 md:grid-cols-[56px_minmax(0,1fr)_120px_120px]"
							>
								<div className="skeleton-line h-12 w-12" />
								<div className="space-y-2">
									<div className="skeleton-line h-6 w-52" />
									<div className="skeleton-line h-4 w-28" />
								</div>
								<div className="space-y-2">
									<div className="skeleton-line h-4 w-16" />
									<div className="skeleton-line h-8 w-16" />
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	)
}

export function LeaguesPage() {
	const { data, isLoading, error, refetch } = useQuery({
		queryKey: ['leagues-page'],
		queryFn: async () => {
			const myLeaguesData = await apiClient.getMyLeagues<LeaguesResponse>()
			return {
				myLeagues: myLeaguesData.leagues ?? [],
			}
		},
	})

	const myLeagues = useMemo(() => data?.myLeagues ?? [], [data])
	const errorMessage = error instanceof Error ? error.message : null
	const isInitialLoading = isLoading && !data

	return (
		<section className="ff-page">
			<div className="ff-shell space-y-8">
				{isInitialLoading ? (
					<LeaguesPageSkeleton />
				) : (
					<div className="space-y-8">
						<AppPageHeader
							eyebrow="Paddock Management"
							title="Leagues"
							description="Open a league table, join a new competition, or start one of your own."
						/>

						<Card className="ff-table-card">
							<CardContent className="px-0 py-0">
								<div className="ff-panel-strip">
									<div>
										<p className="text-2xl font-semibold uppercase tracking-[0.04em] text-on-surface">
											My Leagues
										</p>
										<p className="mt-2 text-sm text-on-surface-variant">
											Jump straight into your current competitions.
										</p>
									</div>
								</div>

								{isLoading ? (
									<div className="space-y-4 px-6 py-6">
										{[1, 2, 3].map((value) => (
											<div
												key={value}
												className="rounded-md h-24 animate-pulse bg-surface-container-low"
											/>
										))}
									</div>
								) : null}

								{errorMessage ? (
									<div className="px-6 py-6">
										<div className="bg-error-container px-4 py-3 text-sm text-on-error-container">
											{errorMessage}
										</div>
										<Button
											variant="secondary"
											size="sm"
											className="mt-3"
											onClick={() => void refetch()}
										>
											Retry
										</Button>
									</div>
								) : null}

								{!isLoading && !errorMessage ? (
									myLeagues.length === 0 ? (
										<div className="px-6 py-14 text-center">
											<div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-high text-3xl">
												🏁
											</div>
											<p className="text-xl font-semibold uppercase tracking-[0.04em] text-on-surface">
												No Leagues Yet
											</p>
											<p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-on-surface-variant">
												Create your own league or join one with an invite link to start
												competing.
											</p>
											<div className="mt-6 flex flex-wrap justify-center gap-4">
												<Button asChild size="lg">
													<Link to="/leagues/create">Create a league</Link>
												</Button>
												<Button asChild variant="outline" size="lg">
													<Link to="/join">Join with invite</Link>
												</Button>
											</div>
										</div>
									) : (
										<div>
											{myLeagues.map((league, index) => (
												<LeagueListRow key={league.id} league={league} index={index} />
											))}
										</div>
									)
								) : null}
							</CardContent>
						</Card>

						<div className="grid gap-6 md:grid-cols-2 pt-4">
							<div className="flex flex-col items-start justify-between gap-6 bg-inverse-surface p-8 md:p-10">
								<div>
									<h3 className="font-black text-3xl uppercase tracking-[0.04em] text-inverse-on-surface md:text-4xl">
										Start Your Own League
									</h3>
									<p className="mt-4 max-w-sm text-base font-semibold text-inverse-on-surface leading-relaxed md:text-lg">
										Challenge your friends or build a community. Prove your strategy works and take home the trophy!
									</p>
								</div>
								<Button asChild size="lg" className="bg-surface text-on-surface hover:bg-surface-container-high mt-4">
									<Link to="/leagues/create">+ Create a league</Link>
								</Button>
							</div>

							<div className="flex flex-col items-start justify-between gap-6 bg-tertiary p-8 md:p-10">
								<div>
									<h3 className="font-black text-3xl uppercase tracking-[0.04em] text-on-tertiary md:text-4xl">
										Discover New Leagues
									</h3>
									<p className="mt-4 max-w-sm text-base font-semibold text-on-tertiary leading-relaxed md:text-lg">
										Looking for more competition? Find public leagues or use an invite code to join the action.
									</p>
								</div>
								<Button asChild size="lg" className="bg-inverse-surface text-inverse-on-surface hover:bg-inverse-surface/90 hover:text-inverse-on-surface mt-4">
									<Link to="/join">Join a league</Link>
								</Button>
							</div>
						</div>
					</div>
				)}
			</div>
		</section>
	)
}
