import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../api/apiClient";
import { toastApiError } from "../lib/api-error";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

type NextRaceResponse = {
  id?: string;
  raceId?: string;
  name?: string;
  raceName?: string;
  grandPrixName?: string;
  startsAt?: string;
  startTime?: string;
  raceAt?: string;
  raceStartAt?: string;
  scheduledAt?: string;
  date?: string;
  entryOpensAt?: string;
  predictionOpensAt?: string;
  openAt?: string;
  entryClosesAt?: string;
  predictionClosesAt?: string;
  lockAt?: string;
  predictionLocked?: boolean;
  entriesLocked?: boolean;
  lockStatus?: "open" | "locked";
};

type PredictionStatus = "open" | "opens_soon" | "locked";
type LeagueVisibility = "private" | "public";

function assertLeagueVisibility(
  value: string,
): asserts value is LeagueVisibility {
  if (value !== "private" && value !== "public") {
    throw new Error(`Invalid league visibility: ${value}`);
  }
}

export function HomePage() {
  const navigate = useNavigate();
  const [reloadTick, setReloadTick] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextRace, setNextRace] = useState<NextRaceResponse | null>(null);
  const [countdown, setCountdown] = useState("");
  const [leagueName, setLeagueName] = useState("");
  const [leagueVisibility, setLeagueVisibility] =
    useState<LeagueVisibility>("private");
  const [inviteInput, setInviteInput] = useState("");
  const [createState, setCreateState] = useState<
    "idle" | "creating" | "created" | string
  >("idle");
  const [joinState, setJoinState] = useState<
    "idle" | "joining" | "joined" | string
  >("idle");

  useEffect(() => {
    let cancelled = false;

    apiClient
      .get<NextRaceResponse>("/f1/next-race")
      .then((data) => {
        if (!cancelled) setNextRace(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Failed to load next race";
          setError(message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  const raceName = useMemo(
    () =>
      nextRace?.name ?? nextRace?.raceName ?? nextRace?.grandPrixName ?? "TBD",
    [nextRace],
  );

  const startsAt = useMemo(
    () =>
      nextRace?.startsAt ??
      nextRace?.startTime ??
      nextRace?.raceAt ??
      nextRace?.raceStartAt ??
      nextRace?.scheduledAt ??
      nextRace?.date,
    [nextRace],
  );

  const entryOpensAt = useMemo(
    () =>
      nextRace?.entryOpensAt ?? nextRace?.predictionOpensAt ?? nextRace?.openAt,
    [nextRace],
  );

  const entryClosesAt = useMemo(
    () =>
      nextRace?.entryClosesAt ??
      nextRace?.predictionClosesAt ??
      nextRace?.lockAt,
    [nextRace],
  );

  const predictionStatus = useMemo<PredictionStatus>(() => {
    const openTs = entryOpensAt ? new Date(entryOpensAt).getTime() : NaN;
    const closeTs = entryClosesAt ? new Date(entryClosesAt).getTime() : NaN;
    const now = Date.now();

    const lockedByApi =
      nextRace?.predictionLocked === true ||
      nextRace?.entriesLocked === true ||
      nextRace?.lockStatus === "locked";

    if (lockedByApi || (!Number.isNaN(closeTs) && now >= closeTs))
      return "locked";
    if (!Number.isNaN(openTs) && now < openTs) return "opens_soon";
    return "open";
  }, [
    entryClosesAt,
    entryOpensAt,
    nextRace?.entriesLocked,
    nextRace?.lockStatus,
    nextRace?.predictionLocked,
  ]);

  useEffect(() => {
    if (!startsAt) {
      setCountdown("Start time not available");
      return;
    }

    const raceStartMs = new Date(startsAt).getTime();
    if (Number.isNaN(raceStartMs)) {
      setCountdown("Start time not available");
      return;
    }

    const tick = () => {
      const deltaMs = raceStartMs - Date.now();
      if (deltaMs <= 0) {
        setCountdown("Race weekend live");
        return;
      }

      const totalMinutes = Math.floor(deltaMs / 60000);
      const days = Math.floor(totalMinutes / (24 * 60));
      const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
      const minutes = totalMinutes % 60;
      setCountdown(`${days}d ${hours}h ${minutes}m`);
    };

    tick();
    const interval = window.setInterval(tick, 30000);
    return () => window.clearInterval(interval);
  }, [startsAt]);

  const localRaceTime = useMemo(() => {
    if (!startsAt) return "Time TBD";
    const date = new Date(startsAt);
    if (Number.isNaN(date.getTime())) return "Time TBD";
    return date.toLocaleString();
  }, [startsAt]);

  const utcRaceTime = useMemo(() => {
    if (!startsAt) return "UTC TBD";
    const date = new Date(startsAt);
    if (Number.isNaN(date.getTime())) return "UTC TBD";
    return date.toUTCString();
  }, [startsAt]);

  function parseInviteTokenOrLeagueId(raw: string): {
    token?: string;
    leagueId?: string;
  } {
    const input = raw.trim();
    if (!input) return {};

    const readFromPath = (value: string) => {
      const leagueFromPath = value.match(/\/league\/([^/?#]+)/)?.[1];
      const inviteFromPath = value.match(/\/invite\/([^/?#]+)/)?.[1];
      if (leagueFromPath) return { leagueId: leagueFromPath };
      if (inviteFromPath) return { token: inviteFromPath };
      return null;
    };

    if (!input.includes("://")) {
      const fromPath = readFromPath(input);
      return fromPath ?? { token: input };
    }

    try {
      const url = new URL(input);
      const fromPath = readFromPath(url.pathname);
      if (fromPath) return fromPath;

      const inviteFromQuery =
        url.searchParams.get("invite") ?? url.searchParams.get("token");
      if (inviteFromQuery) return { token: inviteFromQuery };
    } catch {
      return { token: input };
    }

    return { token: input };
  }

  async function handleCreateLeague() {
    setCreateState("creating");

    try {
      assertLeagueVisibility(leagueVisibility);
      const payload = {
        name: leagueName.trim() || "My League",
        visibility: leagueVisibility,
      };
      const result = await apiClient.post<{
        id?: string;
        leagueId?: string;
        league?: { id?: string };
      }>("/leagues", payload);

      const createdLeagueId = result.id ?? result.leagueId ?? result.league?.id;
      if (!createdLeagueId) {
        throw new Error("Create league succeeded but no league id returned");
      }

      setCreateState("created");
      navigate(`/league/${createdLeagueId}`);
    } catch (err: unknown) {
      const message = toastApiError(
        err,
        "Create league failed",
        "Failed to create league",
      );
      setCreateState(message);
    }
  }

  async function handleJoinLeague() {
    const parsed = parseInviteTokenOrLeagueId(inviteInput);

    if (!parsed.token && !parsed.leagueId) {
      setJoinState("Paste an invite token or league link");
      return;
    }

    if (parsed.leagueId) {
      setJoinState("joined");
      navigate(`/league/${parsed.leagueId}`);
      return;
    }

    setJoinState("joining");
    try {
      const result = await apiClient.post<{
        leagueId?: string;
        league?: { id?: string };
      }>("/leagues/join", {
        inviteToken: parsed.token,
      });
      const joinedLeagueId = result.leagueId ?? result.league?.id;
      setJoinState("joined");
      navigate(`/league/${joinedLeagueId ?? "demo-league"}`);
    } catch (err: unknown) {
      const message = toastApiError(
        err,
        "Join league failed",
        "Failed to join league",
      );
      setJoinState(message);
    }
  }

  return (
    <section className="w-full">
      <section className="w-full bg-linear-to-br from-neutral-950 via-neutral-900 to-black py-20 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="overflow-hidden rounded-lg border border-neutral-200/20 bg-white/5 backdrop-blur">
            <div className="h-[3px] w-full bg-red-600" />
            <div className="space-y-7 p-10">
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight">Home</h1>
                <p className="text-slate-300">
                  Predict race results with your friends and climb the
                  leaderboard.
                </p>
              </div>

              {loading ? (
                <p className="text-slate-300">Loading next race...</p>
              ) : null}
              {loading ? (
                <div className="space-y-4">
                  <div className="h-8 w-2/3 animate-pulse rounded bg-white/10" />
                  <div className="h-6 w-1/3 animate-pulse rounded bg-white/10" />
                  <div className="h-6 w-1/4 animate-pulse rounded bg-white/10" />
                </div>
              ) : null}
              {error ? (
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold">
                    Couldn&apos;t load next race
                  </h3>
                  <p className="text-slate-300">{error}</p>
                  <Button
                    variant="secondary"
                    onClick={() => setReloadTick((v) => v + 1)}
                  >
                    Retry
                  </Button>
                </div>
              ) : null}

              {!loading && !error ? (
                <>
                  <div className="space-y-3">
                    <p className="hero-kicker text-slate-300">Next Race</p>
                    <h2 className="text-5xl font-extrabold tracking-tight md:text-6xl">
                      {raceName}
                    </h2>
                  </div>

                  <p>
                    <strong title={utcRaceTime}>{localRaceTime}</strong>
                  </p>

                  <div className="hero-metrics">
                    <div>
                      <span className="hero-metric-label text-slate-300">
                        Countdown
                      </span>
                      <strong className="text-3xl font-semibold tracking-[0.04em]">
                        {countdown}
                      </strong>
                    </div>
                  </div>

                  <div className="hero-chips">
                    {predictionStatus === "open" ? (
                      <Badge
                        variant="outline"
                        className="border-green-500/30 bg-green-500/20 text-green-400"
                      >
                        Predictions Open
                      </Badge>
                    ) : null}
                    {predictionStatus === "opens_soon" ? (
                      <Badge tone="info">Predictions Open Soon</Badge>
                    ) : null}
                    {predictionStatus === "locked" ? (
                      <Badge tone="danger">Predictions Locked</Badge>
                    ) : null}
                    {entryClosesAt ? (
                      <Badge
                        variant="outline"
                        className="border-slate-400/30 bg-slate-400/10 text-slate-300"
                      >
                        Locks at {new Date(entryClosesAt).toLocaleString()}
                      </Badge>
                    ) : null}
                  </div>

                  <div>
                    <Button
                      asChild
                      className="h-auto bg-red-600 px-8 py-3 text-base font-semibold text-white! shadow-lg ring-2 ring-red-400/40 transition hover:-translate-y-0.5 hover:bg-red-700"
                    >
                      <Link to="#create-league">Create League</Link>
                    </Button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="w-full bg-background pb-12 pt-20">
        <div className="mx-auto max-w-7xl space-y-8 px-6">
          <div className="space-y-2">
            <div className="mb-4 h-[2px] w-12 bg-red-600" />
            <h2 className="text-3xl font-semibold">Start Competing</h2>
            <p className="text-muted-foreground text-slate-600">
              Create or join a league and challenge your friends.
            </p>
          </div>

          <div id="create-league" className="grid gap-8 md:grid-cols-2">
            <Card className="rounded-lg border border-neutral-200 bg-background transition hover:border-neutral-300">
              <CardHeader>
                <CardTitle>Create League</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>Start a private league and invite your friends.</p>
                <Label htmlFor="leagueName">League name</Label>
                <Input
                  id="leagueName"
                  placeholder="League name"
                  value={leagueName}
                  onChange={(event) => setLeagueName(event.target.value)}
                />
                <Label htmlFor="leagueVisibility">Visibility</Label>
                <Select
                  value={leagueVisibility}
                  onValueChange={(value) =>
                    setLeagueVisibility(value as LeagueVisibility)
                  }
                >
                  <SelectTrigger id="leagueVisibility">
                    <SelectValue placeholder="Select visibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  className="w-full"
                  onClick={handleCreateLeague}
                  disabled={createState === "creating"}
                >
                  {createState === "creating" ? "Creating..." : "Create League"}
                </Button>
                {createState !== "idle" &&
                createState !== "creating" &&
                createState !== "created" ? (
                  <p>{createState}</p>
                ) : null}
              </CardContent>
            </Card>

            <Card className="rounded-lg border border-neutral-200 bg-background transition hover:border-neutral-300">
              <CardHeader>
                <CardTitle>Join League</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  Paste an invite token or full invite link to join instantly.
                </p>
                <Label htmlFor="inviteInput">Invite token or link</Label>
                <Input
                  id="inviteInput"
                  placeholder="Invite token or link"
                  value={inviteInput}
                  onChange={(event) => setInviteInput(event.target.value)}
                />
                <Button
                  className="w-full"
                  variant="secondary"
                  onClick={handleJoinLeague}
                  disabled={joinState === "joining"}
                >
                  {joinState === "joining" ? "Joining..." : "Join League"}
                </Button>
                {joinState !== "idle" &&
                joinState !== "joining" &&
                joinState !== "joined" ? (
                  <p>{joinState}</p>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </section>
  );
}
