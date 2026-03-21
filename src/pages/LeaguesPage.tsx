import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { authClient } from "@/auth/authClient";
import { apiClient } from "../api/apiClient";
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
      className="grid gap-4 border-b border-white/6 bg-white/2 px-5 py-5 transition hover:bg-white/4 hover:no-underline md:grid-cols-[minmax(0,1.5fr)_120px_120px]"
    >
      <div className="flex items-center gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center border border-white/10 text-base font-black text-white ${leagueIconBackgrounds[index % leagueIconBackgrounds.length]}`}
        >
          {String(index + 1).padStart(2, "0")}
        </div>
        <div className="min-w-0">
          <p className="ff-display truncate text-2xl text-white md:text-3xl">
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
        <p className="mt-2 text-3xl font-black text-white">
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

export function LeaguesPage() {
  const { data: session } = authClient.useSession();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["leagues-page"],
    queryFn: async () => {
      const myLeaguesData = await apiClient.getMyLeagues<LeaguesResponse>();
      return {
        myLeagues: myLeaguesData.leagues ?? [],
      };
    },
  });

  const myLeagues = useMemo(() => data?.myLeagues ?? [], [data]);
  const errorMessage = error instanceof Error ? error.message : null;
  const displayName =
    session?.user?.name?.trim() || session?.user?.email?.trim() || "Manager";
  const firstName = displayName.split(/\s+/).filter(Boolean)[0] ?? "Manager";

  const summaryPoints = 136;
  const summaryAccuracy = 25;

  return (
    <section className="px-6 py-14 md:py-20">
      <div className="mx-auto max-w-7xl space-y-10">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="space-y-4">
            <p className="ff-kicker">Paddock Management</p>
            <h1 className="ff-display text-5xl text-white md:text-7xl">
              Leagues Hub
            </h1>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild variant="secondary" size="lg">
              <Link to="/join">Join</Link>
            </Button>
            <Button asChild size="lg">
              <Link to="/leagues/create">Create</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-8 xl:grid-cols-[300px_minmax(0,1fr)]">
          <div className="space-y-6">
            <Card className="border-white/8 bg-[#15161b]">
              <CardContent className="space-y-6 px-6 py-6">
                <div className="space-y-2">
                  <p className="ff-kicker">Season Summary</p>
                  <p className="text-sm text-[#989aa2]">
                    {firstName}, here&apos;s your current telemetry snapshot.
                  </p>
                </div>

                <div>
                  <p className="text-5xl font-black text-white">{summaryPoints}</p>
                  <p className="ff-kicker mt-2">Total performance points</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="border border-white/8 bg-white/3 p-4">
                    <p className="ff-kicker">Global Rank</p>
                    <p className="mt-2 text-3xl font-black text-[#e9c400]">#4,219</p>
                  </div>
                  <div className="border border-white/8 bg-white/3 p-4">
                    <p className="ff-kicker">Accuracy</p>
                    <p className="mt-2 text-3xl font-black text-white">{summaryAccuracy}%</p>
                  </div>
                </div>

                <div className="border-l-2 border-[#e9c400] bg-white/3 p-4">
                  <p className="ff-kicker">Next Race</p>
                  <p className="mt-2 text-lg font-semibold uppercase tracking-[0.08em] text-white">
                    Monaco
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#989aa2]">
                    Optimize your next card and keep pressure on the top of the board.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-white/8 bg-[linear-gradient(135deg,#111217_0%,#191b20_58%,#23262d_100%)]">
              <CardContent className="space-y-5 px-8 py-8 text-white">
                <span className="ff-kicker bg-[#cc0000] px-3 py-2 text-white">
                  Limited Time Event
                </span>
                <h3 className="ff-display text-4xl text-white">
                  The Constructor&apos;s Gauntlet
                </h3>
                <p className="text-sm leading-6 text-white/70">
                  Assemble a league, invite rivals, and turn every race weekend into a
                  pressure test.
                </p>
                <Button asChild variant="outline">
                  <Link to="/leagues/create">Enter Challenge</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-white/8 bg-[#15161b]">
              <CardContent className="px-0 py-0">
                <div className="flex items-center justify-between border-b border-white/6 px-6 py-5">
                  <div>
                    <p className="ff-display text-3xl text-white">My Leagues</p>
                    <p className="mt-2 text-sm text-[#989aa2]">
                      Jump straight into your current competitions.
                    </p>
                  </div>
                  <span className="ff-kicker text-[#7f828b]">Live updates</span>
                </div>

                {isLoading ? (
                  <div className="space-y-4 px-6 py-6">
                    {[1, 2, 3].map((value) => (
                      <div
                        key={value}
                        className="h-24 animate-pulse border border-white/6 bg-white/3"
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
                      <p className="ff-display text-2xl text-white">No Leagues Yet</p>
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

            <div className="grid gap-5 lg:grid-cols-2">
              <Card className="border-white/8 bg-[#15161b]">
                <CardContent className="space-y-4 px-6 py-6">
                  <p className="ff-display text-3xl text-white">Create And Compete</p>
                  <p className="text-sm leading-6 text-[#989aa2]">
                    Start a private grid for your group and compete all season.
                  </p>
                  <Button asChild>
                    <Link to="/leagues/create">Create A League</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-white/8 bg-[#15161b]">
                <CardContent className="space-y-4 px-6 py-6">
                  <p className="ff-display text-3xl text-white">Join More Leagues</p>
                  <p className="text-sm leading-6 text-[#989aa2]">
                    Stack multiple competitions and track all of them from one hub.
                  </p>
                  <Button asChild variant="outline">
                    <Link to="/join">Join A League</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
