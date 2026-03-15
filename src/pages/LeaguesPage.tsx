import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiClient } from "../api/apiClient";
import { Button } from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";
import { HeroBackdrop } from "../components/HeroBackdrop";

type League = {
  id: string;
  name: string;
  memberCount?: number;
  visibility?: "public" | "private";
};

type LeaguesResponse = {
  leagues?: League[];
};

const leagueIconBackgrounds = [
  "bg-red-600",
  "bg-black",
  "bg-blue-600",
  "bg-emerald-600",
  "bg-amber-500",
];

function leagueInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function LeagueListRow({ league, index }: { league: League; index: number }) {
  return (
    <Link
      to={`/league/${league.id}`}
      className="group flex items-center gap-4 rounded-4xl border border-neutral-300 bg-white px-4 py-4 transition hover:border-neutral-400"
    >
      <div
        className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-2xl font-semibold text-white ${leagueIconBackgrounds[index % leagueIconBackgrounds.length]}`}
      >
        {leagueInitials(league.name)}
      </div>

      <div className="min-w-0 flex-1 flex flex-col gap-0.5">
        <p className="truncate font-['Orbitron'] text-3xl font-semibold leading-tight text-black">
          {league.name}
        </p>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          <span>{(league.visibility ?? "private").toUpperCase()}</span>
          <span className="mx-3 text-slate-400">|</span>
          <span>Total Players: {league.memberCount ?? 0}</span>
        </p>
      </div>

      <div className="hidden items-center gap-3 pr-2 md:flex">
        <span className="text-lg font-semibold text-slate-500">Rank</span>
        <span className="font-['Orbitron'] text-lg font-bold text-black">
          -
        </span>
      </div>
    </Link>
  );
}

export function LeaguesPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["leagues-page"],
    queryFn: async () => {
      const myLeaguesData = await apiClient.getMyLeagues<LeaguesResponse>();
      return {
        myLeagues: myLeaguesData.leagues ?? [],
        publicLeagues: [] as League[],
      };
    },
  });

  const myLeagues = useMemo(() => data?.myLeagues ?? [], [data]);
  const publicLeagues = useMemo(() => data?.publicLeagues ?? [], [data]);
  const errorMessage = error instanceof Error ? error.message : null;
  const totalManagers = useMemo(
    () => myLeagues.reduce((sum, league) => sum + (league.memberCount ?? 0), 0),
    [myLeagues],
  );

  return (
    <section className="w-full">
      <section className="relative w-full overflow-hidden bg-linear-to-br from-neutral-950 via-neutral-900 to-black py-20 text-white">
        <HeroBackdrop />
        <div className="relative z-10 mx-auto max-w-7xl space-y-8 px-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="space-y-3">
              <p className="font-['Orbitron'] text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
                League Garage
              </p>
              <h1 className="font-['Orbitron'] text-4xl font-black uppercase tracking-tight md:text-6xl">
                My Leagues
              </h1>
              <p className="max-w-3xl text-base text-slate-300 md:text-lg">
                Every private league you are racing in, organized around the
                next card and the current rivalry board.
              </p>
            </div>
            <Button asChild className="bg-red-600 text-white hover:bg-red-700">
              <Link to="/leagues/create">Create League</Link>
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="rounded-4xl border-white/10 bg-white/10 text-white">
              <CardContent className="py-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                  Active Leagues
                </p>
                <p className="mt-2 font-['Orbitron'] text-4xl font-black">
                  {isLoading ? "-" : myLeagues.length}
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-4xl border-white/10 bg-white/10 text-white">
              <CardContent className="py-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                  Total Managers
                </p>
                <p className="mt-2 font-['Orbitron'] text-4xl font-black">
                  {isLoading ? "-" : totalManagers}
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-4xl border-white/10 bg-white/10 text-white">
              <CardContent className="py-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                  Format
                </p>
                <p className="mt-2 text-lg font-semibold">
                  Invite-only rivalry
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  Private leagues only for MVP.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="relative w-full overflow-hidden pb-12 pt-14">
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <p className="font-['Orbitron'] text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Current Grid
              </p>
              <h2 className="font-['Orbitron'] text-3xl font-bold uppercase tracking-tight text-black">
                League Lineup
              </h2>
            </div>
            <Button asChild variant="secondary">
              <Link to="/">Back Home</Link>
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-40 animate-pulse rounded-4xl border border-neutral-300 bg-neutral-100"
                />
              ))}
            </div>
          ) : errorMessage ? (
            <Card className="bg-red-50">
              <CardContent className="py-4">
                <p className="text-red-600">{errorMessage}</p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-2"
                  onClick={() => void refetch()}
                >
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="space-y-4">
                {myLeagues.length === 0 ? (
                  <Card className="rounded-4xl bg-background">
                    <CardContent className="space-y-4 py-10 text-center">
                      <p className="font-['Orbitron'] text-3xl font-black uppercase tracking-tight text-black">
                        No Leagues Yet
                      </p>
                      <p className="mx-auto max-w-2xl text-slate-500">
                        Start a private league for your group or use an invite
                        link from another league owner.
                      </p>
                      <div className="flex flex-wrap justify-center gap-3">
                        <Button asChild className="bg-red-600 text-white hover:bg-red-700">
                          <Link to="/leagues/create">Create League</Link>
                        </Button>
                        <Button asChild variant="secondary">
                          <Link to="/">Use Invite Link</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    {myLeagues.map((league, index) => (
                      <LeagueListRow
                        key={league.id}
                        league={league}
                        index={index}
                      />
                    ))}
                  </div>
                )}
              </div>

              {publicLeagues.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-['Orbitron'] text-3xl font-semibold uppercase tracking-tight text-black">
                    Public Leagues
                  </h3>
                  <div className="space-y-6">
                    {publicLeagues.map((league, index) => (
                      <LeagueListRow
                        key={league.id}
                        league={league}
                        index={myLeagues.length + index}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </section>
  );
}
