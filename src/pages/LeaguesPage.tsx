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

function leagueInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

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
      className="group flex items-center gap-4 rounded-[28px] border border-[#dbd5cd] bg-white px-5 py-5 transition hover:-translate-y-0.5 hover:border-neutral-400 hover:no-underline md:px-6"
    >
      <div
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-black text-white ${leagueIconBackgrounds[index % leagueIconBackgrounds.length]}`}
      >
        {leagueInitials(league.name)}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-['Orbitron'] text-2xl font-black tracking-tight text-black md:text-3xl">
          {league.name}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          <span>{league.visibility ?? "private"}</span>
          <span>Total Players: {league.memberCount ?? 0}</span>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Rank
        </p>
        <p className="mt-1 font-['Orbitron'] text-2xl font-black text-black md:text-3xl">
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

  // TODO: Replace these placeholder summary metrics with live season calculations.
  const summaryPoints = 136;
  const summaryAccuracy = 25;

  return (
    <section className="bg-[linear-gradient(180deg,#f6f3ee_0%,#f2ede6_100%)] pb-14 pt-14">
      <div className="mx-auto max-w-6xl space-y-8 px-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="font-['Orbitron'] text-4xl font-black uppercase tracking-tight text-black md:text-5xl">
              Leagues
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              asChild
              variant="outline"
              className="h-12 rounded-full border-2 border-black bg-transparent px-6 text-sm font-semibold text-black hover:bg-black hover:text-white"
            >
              <Link to="/leagues/create">+ Create a league</Link>
            </Button>
            <Button
              asChild
              className="h-12 rounded-full bg-red-600 px-6 text-sm font-semibold text-white hover:bg-red-700"
            >
              <Link to="/join">Join a league</Link>
            </Button>
          </div>
        </div>

        <Card className="rounded-[32px] border-[#dbd5cd] shadow-none">
          <CardContent className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between md:px-8">
            <div className="text-sm text-slate-700">
              Hey <span className="font-bold text-black">{firstName}</span>. How's
              your season going? Check your stats
            </div>

            <div className="flex flex-wrap items-center gap-4 md:gap-6">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Pts.
                </span>
                <span className="font-['Orbitron'] text-3xl font-black text-black">
                  {summaryPoints}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Acc.
                </span>
                <span className="font-['Orbitron'] text-3xl font-black text-black">
                  {summaryAccuracy}%
                </span>
              </div>
              <Button
                asChild
                variant="outline"
                className="h-11 rounded-full border-2 border-black px-5 text-sm font-semibold text-black hover:bg-black hover:text-white"
              >
                <Link to="/results">My results</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <div>
            <h2 className="font-['Orbitron'] text-3xl font-black uppercase tracking-tight text-black md:text-4xl">
              My Leagues
            </h2>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((value) => (
                <div
                  key={value}
                  className="h-24 animate-pulse rounded-[28px] border border-[#dbd5cd] bg-white"
                />
              ))}
            </div>
          ) : null}

          {errorMessage ? (
            <Card className="rounded-[28px] border-red-200 bg-red-50">
              <CardContent className="py-5">
                <p className="text-sm text-red-700">{errorMessage}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => void refetch()}
                >
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {!isLoading && !errorMessage ? (
            myLeagues.length === 0 ? (
              <Card className="rounded-[28px] border-[#dbd5cd]">
                <CardContent className="py-10 text-center">
                  <p className="font-['Orbitron'] text-2xl font-black uppercase text-black">
                    No leagues yet
                  </p>
                  <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-600">
                    Create your own league or join one with an invite link to
                    start competing.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {myLeagues.map((league, index) => (
                  <LeagueListRow key={league.id} league={league} index={index} />
                ))}
              </div>
            )
          ) : null}
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="relative overflow-hidden rounded-[28px] border border-[#d5d0c7] bg-[linear-gradient(135deg,#101114_0%,#191b20_58%,#23262d_100%)] px-8 py-10 text-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-70"
              style={{
                background:
                  "radial-gradient(circle at top right, rgba(239,68,68,0.28), transparent 32%), linear-gradient(120deg, transparent 0%, transparent 55%, rgba(255,255,255,0.04) 55%, rgba(255,255,255,0.04) 58%, transparent 58%)",
              }}
            />
            <div className="relative z-10">
            <h3 className="font-['Orbitron'] text-4xl font-black tracking-tight md:text-5xl">
              Create and compete
            </h3>
            <p className="mt-4 max-w-md text-base text-white/72">
              Create your own league to compete with other Predict players.
            </p>
            <Button
              asChild
              className="mt-8 h-12 rounded-full bg-red-600 px-6 text-sm font-semibold text-white hover:bg-red-700"
            >
              <Link to="/leagues/create">+ Create a league</Link>
            </Button>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[28px] border border-[#d5d0c7] bg-[linear-gradient(140deg,#f7f4ec_0%,#ece7dc_100%)] px-8 py-10 text-black shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <div
              aria-hidden="true"
              className="absolute right-0 top-0 h-28 w-28 rounded-full bg-red-600/10 blur-2xl"
            />
            <div className="relative z-10">
            <h3 className="font-['Orbitron'] text-4xl font-black tracking-tight md:text-5xl">
              Join more leagues!
            </h3>
            <p className="mt-4 max-w-md text-base text-black/70">
              There&apos;s no limit to the number of leagues you can be a part
              of.
            </p>
            <Button
              asChild
              variant="outline"
              className="mt-8 h-12 rounded-full border-2 border-black bg-transparent px-6 text-sm font-semibold text-black hover:bg-black hover:text-white"
            >
              <Link to="/join">Join a league</Link>
            </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
