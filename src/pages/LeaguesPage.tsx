import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiClient } from "../api/apiClient";
import { Button } from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";

type League = {
  id: string;
  name: string;
  memberCount?: number;
  visibility?: "public" | "private";
};

type LeaguesResponse = {
  leagues?: League[];
};

type PublicLeaguesResponse = {
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
      const [myLeaguesData, publicLeaguesData] = await Promise.all([
        apiClient.getMyLeagues<LeaguesResponse>(),
        apiClient.getPublicLeagues<PublicLeaguesResponse>(),
      ]);
      return {
        myLeagues: myLeaguesData.leagues ?? [],
        publicLeagues: publicLeaguesData.leagues ?? [],
      };
    },
  });

  const myLeagues = useMemo(() => data?.myLeagues ?? [], [data]);
  const publicLeagues = useMemo(() => data?.publicLeagues ?? [], [data]);
  const errorMessage = error instanceof Error ? error.message : null;

  return (
    <section className="relative w-full overflow-hidden pb-12 pt-20">
      <div className="relative z-10 mx-auto max-w-7xl space-y-8 px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-['Orbitron'] text-3xl font-bold uppercase tracking-tight text-black">
            My Leagues
          </h2>
          <Button asChild className="bg-red-600 text-white hover:bg-red-700">
            <Link to="/leagues/create">Create League</Link>
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
            {/* My Leagues Section */}
            <div className="space-y-4">
              {myLeagues.length === 0 ? (
                <Card className="bg-background">
                  <CardContent className="py-6">
                    <p className="text-center text-slate-500">
                      You haven't joined any leagues yet.
                    </p>
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

            {/* Public Leagues Section */}
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
  );
}
