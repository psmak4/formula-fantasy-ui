import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../api/apiClient";
import { toastApiError } from "../lib/api-error";
import { Button } from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

type LeagueVisibility = "private" | "public";

function leagueInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function CreateLeaguePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [leagueName, setLeagueName] = useState("");
  const [visibility, setVisibility] = useState<LeagueVisibility>("private");
  const [createState, setCreateState] = useState<
    "idle" | "creating" | "created" | string
  >("idle");

  const previewName = leagueName.trim() || "Grand Prix Masters";

  const createLeagueMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: previewName,
        visibility,
      };
      return apiClient.post<{
        id?: string;
        leagueId?: string;
        league?: { id?: string };
      }>("/leagues", payload);
    },
    onMutate: () => {
      setCreateState("creating");
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["leagues-page"] });
      queryClient.invalidateQueries({ queryKey: ["home-my-leagues"] });
      queryClient.invalidateQueries({ queryKey: ["public-leagues"] });

      const createdLeagueId = result.id ?? result.leagueId ?? result.league?.id;
      if (!createdLeagueId) {
        throw new Error("Create league succeeded but no league id returned");
      }

      setCreateState("created");
      navigate(`/league/${createdLeagueId}`);
    },
    onError: (err: unknown) => {
      const message = toastApiError(
        err,
        "Create league failed",
        "Failed to create league",
      );
      setCreateState(message);
    },
  });

  function handleCreateLeague() {
    void createLeagueMutation.mutateAsync();
  }

  return (
    <section className="px-6 py-14 md:py-20">
      <div className="mx-auto max-w-7xl space-y-10">
        <div className="space-y-5">
          <Link
            to="/leagues"
            className="ff-kicker inline-flex items-center text-[#7f828b] transition-colors hover:text-white"
          >
            ← Back To Leagues
          </Link>

          <div className="space-y-4">
            <p className="ff-kicker">League Build Sheet</p>
            <h1 className="ff-display text-5xl text-white md:text-7xl">
              Create League
            </h1>
            <p className="max-w-3xl text-base leading-7 text-[#a3a6af] md:text-lg">
              Start your own league and invite friends to compete in race-by-race
              Formula Fantasy predictions.
            </p>
          </div>
        </div>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.82fr)]">
          <Card className="border-white/8 bg-[#15161b]">
            <CardContent className="space-y-10 px-6 py-8 md:px-8">
              <div className="space-y-3">
                <Label htmlFor="leagueName">League Identification</Label>
                <Input
                  id="leagueName"
                  placeholder="Enter league name..."
                  maxLength={25}
                  value={leagueName}
                  onChange={(event) => setLeagueName(event.target.value)}
                  className="ff-display h-16 text-2xl text-white placeholder:text-[#4d5058] md:text-4xl"
                />
                <p className="text-sm text-[#777a84]">
                  Max 25 characters. Keep it sharp and easy to spot in standings.
                </p>
              </div>

              <div className="space-y-5">
                <Label>Visibility Parameters</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setVisibility("public")}
                    className={`relative border p-6 text-left transition ${
                      visibility === "public"
                        ? "border-[#cc0000] bg-[#1d1f25] text-white shadow-[0_0_0_1px_rgba(204,0,0,0.16)]"
                        : "border-white/6 bg-white/3 text-[#d7d9df] hover:border-white/12"
                    }`}
                  >
                    <span className="ff-kicker text-[#ffb0b0]">Public Circuit</span>
                    <p className="ff-display mt-4 text-3xl">Open Grid</p>
                    <p className="mt-4 text-sm leading-6 text-[#9699a2]">
                      Anyone can find and join your league from the public list.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVisibility("private")}
                    className={`relative border p-6 text-left transition ${
                      visibility === "private"
                        ? "border-[#cc0000] bg-[#1d1f25] text-white shadow-[0_0_0_1px_rgba(204,0,0,0.16)]"
                        : "border-white/6 bg-white/3 text-[#d7d9df] hover:border-white/12"
                    }`}
                  >
                    <span className="ff-kicker text-[#ffb0b0]">Private Paddock</span>
                    <p className="ff-display mt-4 text-3xl">Invite Only</p>
                    <p className="mt-4 text-sm leading-6 text-[#9699a2]">
                      Players join with an invite link that you share after creation.
                    </p>
                  </button>
                </div>
              </div>

              <div className="ff-panel border border-white/6 px-5 py-4">
                <p className="ff-kicker mb-2">
                  {visibility === "private" ? "Private setup" : "Public setup"}
                </p>
                <p className="text-sm leading-6 text-[#a3a6af]">
                  {visibility === "private"
                    ? "Private leagues are best for friend groups, office pools, or invite-only rivalries."
                    : "Public leagues are discoverable in the Join League page and can grow without manual invites."}
                </p>
              </div>

              <div className="space-y-4">
                <Button
                  className="w-full md:w-auto md:min-w-64"
                  size="lg"
                  onClick={handleCreateLeague}
                  disabled={createState === "creating"}
                >
                  {createState === "creating" ? "Creating..." : "Create League"}
                </Button>
                {createState !== "idle" &&
                createState !== "creating" &&
                createState !== "created" ? (
                  <p className="border border-[#7a0d0d] bg-[#350909] px-4 py-3 text-sm text-[#ff8e8e]">
                    {createState}
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-white/8 bg-[#15161b]">
            <CardContent className="p-5">
              <div className="relative min-h-[540px] overflow-hidden border border-white/6 bg-[linear-gradient(180deg,#345c67_0%,#1c2026_46%,#121318_100%)] p-8">
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-[linear-gradient(140deg,rgba(255,255,255,0.08),transparent_34%),linear-gradient(180deg,transparent,rgba(0,0,0,0.42))]"
                />
                <div className="relative z-10 flex h-full flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <span className="ff-kicker bg-[#cc0000] px-3 py-2 text-white">
                      New League
                    </span>
                    <span className="text-[#a3a6af]">↗</span>
                  </div>

                  <div className="mt-auto space-y-6">
                    <div>
                      <p className="ff-kicker text-[#d0d3d9]">Live Preview</p>
                      <p className="ff-display mt-3 text-4xl text-white md:text-5xl">
                        {previewName}
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="border-l-2 border-[#cc0000] bg-black/28 p-4">
                        <p className="ff-kicker">Status</p>
                        <p className="mt-3 text-sm font-semibold uppercase tracking-[0.1em] text-white">
                          Recruiting
                        </p>
                      </div>
                      <div className="border-l-2 border-[#e9c400] bg-black/28 p-4">
                        <p className="ff-kicker">Members</p>
                        <p className="mt-3 text-sm font-semibold uppercase tracking-[0.1em] text-white">
                          1 manager
                        </p>
                      </div>
                    </div>

                    <div className="border border-white/6 bg-black/16 p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center border border-white/10 bg-white/6 text-lg font-black text-white">
                          {leagueInitials(previewName)}
                        </div>
                        <div>
                          <p className="ff-kicker">Commissioner</p>
                          <p className="text-sm font-semibold uppercase tracking-[0.1em] text-white">
                            You
                          </p>
                        </div>
                        <p className="ml-auto text-sm font-semibold uppercase tracking-[0.1em] text-[#8d9099]">
                          {visibility} league
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 text-xs uppercase tracking-[0.16em] text-[#6f727b] sm:grid-cols-3">
                      <p>Engine AP-2026.4</p>
                      <p>Latency 0.02ms</p>
                      <p>Security AES-256</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
