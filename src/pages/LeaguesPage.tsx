import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiClient } from "../api/apiClient";
import { AppPageHeader } from "../components/layout/AppPageHeader";
import { Button } from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";

type League = {
  id: string;
  name: string;
  memberCount?: number;
  visibility?: "public" | "private";
  rank?: number | null;
};

type LeaguesResponse = {
  leagues?: League[];
};

type NextRaceResponse = {
  round?: number;
  name?: string;
  raceName?: string;
  grandPrixName?: string;
  startsAt?: string;
  startTime?: string;
  raceAt?: string;
  raceStartAt?: string;
  scheduledAt?: string;
  date?: string;
};

const leagueIconBackgrounds = [
  "bg-red-600",
  "bg-black",
  "bg-blue-600",
  "bg-emerald-600",
  "bg-amber-500",
];

function formatRank(value?: number | null): string {
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
    return "-";
  }

  if (value >= 1000) {
    const compact = value >= 10000
      ? Math.round(value / 1000)
      : Math.round((value / 1000) * 10) / 10;
    return `${compact}K+`;
  }

  return value.toLocaleString();
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
          className={`flex h-12 w-12 shrink-0 items-center justify-center border border-white/10 text-base font-black text-white ${leagueIconBackgrounds[index % leagueIconBackgrounds.length]}`}
        >
          {String(index + 1).padStart(2, "0")}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xl font-semibold uppercase tracking-[0.04em] text-[#111318] md:text-2xl">
            {league.name}
          </p>
          <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7f828b]">
            <span>{league.visibility ?? "private"}</span>
            <span>{league.memberCount ?? 0} members</span>
          </div>
        </div>
      </div>

      <div className="text-left md:text-center">
        <p className="ff-kicker">Members</p>
        <p className="mt-2 text-3xl font-black text-[#111318]">
          {league.memberCount ?? 0}
        </p>
      </div>

      <div className="text-left md:text-right">
        <p className="ff-kicker">My Rank</p>
        <p className="mt-2 text-3xl font-black text-[#e9c400]">
          {formatRank(league.rank)}
        </p>
      </div>
    </Link>
  );
}

function LeaguesPageSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="ff-table-card border-[#d9dee5]">
        <CardContent className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="skeleton-line h-4 w-40" />
            <div className="skeleton-line h-4 w-80" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[520px]">
            {[1, 2, 3].map((value) => (
              <div key={value} className="border border-[#e1e6ec] bg-[#f8f9fb] px-4 py-4">
                <div className="skeleton-line h-4 w-20" />
                <div className="mt-3 skeleton-line h-8 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="ff-table-card border-[#d9dee5]">
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
                className="grid gap-4 border border-[#e1e6ec] bg-[#f8f9fb] p-5 md:grid-cols-[56px_minmax(0,1fr)_120px_120px]"
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
  );
}

export function LeaguesPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["leagues-page"],
    queryFn: async () => {
      const [myLeaguesData, nextRaceData] = await Promise.all([
        apiClient.getMyLeagues<LeaguesResponse>(),
        apiClient.get<NextRaceResponse>("/f1/next-race").catch(() => ({} as NextRaceResponse)),
      ]);
      return {
        myLeagues: myLeaguesData.leagues ?? [],
        nextRace: nextRaceData,
      };
    },
  });

  const myLeagues = useMemo(() => data?.myLeagues ?? [], [data]);
  const nextRace = data?.nextRace;
  const errorMessage = error instanceof Error ? error.message : null;
  const bestRank = myLeagues
    .map((league) => league.rank)
    .filter((rank): rank is number => typeof rank === "number" && rank > 0)
    .sort((left, right) => left - right)[0];
  const nextRaceName =
    nextRace?.name ?? nextRace?.raceName ?? nextRace?.grandPrixName ?? "Next Grand Prix";
  const nextRaceTimeRaw =
    nextRace?.startsAt ??
    nextRace?.startTime ??
    nextRace?.raceAt ??
    nextRace?.raceStartAt ??
    nextRace?.scheduledAt ??
    nextRace?.date;
  const nextRaceTime = nextRaceTimeRaw
    ? new Date(nextRaceTimeRaw).toLocaleString()
    : "Schedule pending";
  const isInitialLoading = isLoading && !data;

  return (
    <section className="ff-page">
      <div className="ff-shell space-y-6">
        {isInitialLoading ? (
          <LeaguesPageSkeleton />
        ) : (
          <div className="space-y-6">
            <AppPageHeader
              eyebrow="Paddock Management"
              title="Leagues"
              description="Manage your current competitions, jump into each league table, and keep track of the next race window."
              utility={
                <>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#989aa2]">
                    <span>
                      <span className="ff-kicker mr-2 text-[#7b8592]">Active</span>
                      {myLeagues.length}
                    </span>
                    <span>
                      <span className="ff-kicker mr-2 text-[#7b8592]">Best rank</span>
                      {typeof bestRank === "number" ? `P${bestRank}` : "—"}
                    </span>
                    <span>
                      <span className="ff-kicker mr-2 text-[#7b8592]">Next race</span>
                      {nextRace?.round ? `Round ${nextRace.round} · ` : ""}
                      {nextRaceName}
                      {nextRaceTime ? ` · ${nextRaceTime}` : ""}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button asChild variant="secondary" size="lg">
                      <Link to="/join">Join</Link>
                    </Button>
                    <Button asChild size="lg">
                      <Link to="/leagues/create">Create</Link>
                    </Button>
                  </div>
                </>
              }
            />

            <Card className="ff-table-card border-[#d9dee5]">
              <CardContent className="px-0 py-0">
                <div className="ff-panel-strip">
                  <div>
                    <p className="text-2xl font-semibold uppercase tracking-[0.04em] text-[#111318]">My Leagues</p>
                    <p className="mt-2 text-sm text-[#989aa2]">
                      Jump straight into your current competitions.
                    </p>
                  </div>
                </div>

                {isLoading ? (
                  <div className="space-y-4 px-6 py-6">
                    {[1, 2, 3].map((value) => (
                      <div
                        key={value}
                        className="h-24 animate-pulse border border-[#e1e6ec] bg-[#f8f9fb]"
                      />
                    ))}
                  </div>
                ) : null}

                {errorMessage ? (
                  <div className="px-6 py-6">
                    <div className="border border-[#7a0d0d] bg-[#350909] px-4 py-3 text-sm text-[#ff8e8e]">
                      {errorMessage}
                    </div>
                    <Button variant="secondary" size="sm" className="mt-3" onClick={() => void refetch()}>
                      Retry
                    </Button>
                  </div>
                ) : null}

                {!isLoading && !errorMessage ? (
                  myLeagues.length === 0 ? (
                    <div className="px-6 py-10 text-center">
                      <p className="text-xl font-semibold uppercase tracking-[0.04em] text-[#111318]">No Leagues Yet</p>
                      <p className="mx-auto mt-3 max-w-2xl text-sm text-[#989aa2]">
                        Create your own league or join one with an invite link to start competing.
                      </p>
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
          </div>
        )}
      </div>
    </section>
  );
}
