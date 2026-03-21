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
    <section className="ff-page">
      <div className="ff-shell">
        <div className="ff-section-title">
          <Link
            to="/leagues"
            className="ff-kicker inline-flex items-center text-[#7f828b] transition-colors hover:text-white"
          >
            ← Back To Leagues
          </Link>

          <p className="ff-kicker">Sector 07 // League Initialization</p>
          <h1 className="ff-display text-5xl text-white md:text-7xl">
            Create League
          </h1>
          <p className="max-w-3xl text-base leading-7 text-[#a3a6af] md:text-lg">
            Configure the paddock, choose your access protocol, and launch a league
            that is ready for invite sharing the moment it clears inspection.
          </p>
        </div>

        <div className="ff-grid-main" data-layout="split">
          <Card className="ff-table-card border-white/8">
            <div className="ff-panel-strip">
              <span className="ff-kicker text-[#ffb4a8]">Telemetry Setup</span>
              <span className="ff-kicker">Build sheet active</span>
            </div>
            <CardContent className="space-y-8 px-6 py-8 md:px-8">
              <div className="ff-field-shell">
                <Label htmlFor="leagueName">Sector 01: Identity</Label>
                <Input
                  id="leagueName"
                  placeholder="Grand Prix Masters"
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
                <Label>Sector 02: Access Protocol</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setVisibility("public")}
                    className={`relative p-6 text-left transition ${
                      visibility === "public"
                        ? "bg-[#1d1f25] text-white shadow-[0_0_0_1px_rgba(204,0,0,0.2)]"
                        : "bg-white/3 text-[#d7d9df] hover:bg-white/5"
                    }`}
                  >
                    <span className="ff-kicker text-[#ffb0b0]">Public Circuit</span>
                    <p className="ff-display mt-4 text-3xl">Open Grid</p>
                    <p className="mt-4 text-sm leading-6 text-[#9699a2]">
                      Anyone can find and join your league from the public list.
                    </p>
                    <p className="mt-5 ff-kicker text-[#d0d3d9]">Fast growth • discoverable</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVisibility("private")}
                    className={`relative p-6 text-left transition ${
                      visibility === "private"
                        ? "bg-[#1d1f25] text-white shadow-[0_0_0_1px_rgba(204,0,0,0.2)]"
                        : "bg-white/3 text-[#d7d9df] hover:bg-white/5"
                    }`}
                  >
                    <span className="ff-kicker text-[#ffb0b0]">Private Paddock</span>
                    <p className="ff-display mt-4 text-3xl">Invite Only</p>
                    <p className="mt-4 text-sm leading-6 text-[#9699a2]">
                      Players join with an invite link that you share after creation.
                    </p>
                    <p className="mt-5 ff-kicker text-[#d0d3d9]">Controlled access • commissioner led</p>
                  </button>
                </div>
              </div>

              <div className="ff-field-shell">
                <p className="ff-kicker">
                  {visibility === "private" ? "Private setup" : "Public setup"}
                </p>
                <p className="text-sm leading-6 text-[#a3a6af]">
                  {visibility === "private"
                    ? "Private leagues are best for friend groups, office pools, or invite-only rivalries."
                    : "Public leagues are discoverable in the Join League page and can grow without manual invites."}
                </p>
              </div>

              <div className="ff-action-rail">
                <Button
                  className="w-full md:w-auto md:min-w-64"
                  size="lg"
                  onClick={handleCreateLeague}
                  disabled={createState === "creating"}
                >
                  {createState === "creating" ? "Creating..." : "Create League"}
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/leagues">Cancel</Link>
                </Button>
              </div>
              {createState !== "idle" &&
              createState !== "creating" &&
              createState !== "created" ? (
                <p className="border border-[#7a0d0d] bg-[#350909] px-4 py-3 text-sm text-[#ff8e8e]">
                  {createState}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <div className="ff-side-stack">
            <Card className="ff-hero-band border-white/8 text-white">
              <CardContent className="relative z-10 space-y-6 px-8 py-8">
                <span className="ff-kicker bg-[#cc0000] px-3 py-2 text-white">
                  Live Preview
                </span>
                <div className="space-y-3">
                  <p className="ff-kicker text-[#d0d3d9]">League Identity</p>
                  <p className="ff-display text-5xl text-white">{previewName}</p>
                </div>

                <div className="ff-stat-strip sm:grid-cols-2">
                  <div className="ff-stat">
                    <p className="ff-kicker">Status</p>
                    <p className="mt-2 text-xl font-black text-white">Recruiting</p>
                  </div>
                  <div className="ff-stat">
                    <p className="ff-kicker">Access</p>
                    <p className="mt-2 text-xl font-black text-[#e9c400]">
                      {visibility === "private" ? "Private" : "Public"}
                    </p>
                  </div>
                </div>

                <div className="ff-field-shell bg-black/20">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center bg-white/8 text-lg font-black text-white">
                      {leagueInitials(previewName)}
                    </div>
                    <div>
                      <p className="ff-kicker">Commissioner</p>
                      <p className="text-sm font-semibold uppercase tracking-[0.1em] text-white">
                        You
                      </p>
                    </div>
                  </div>
                  <p className="text-sm leading-6 text-[#c7cad2]">
                    {visibility === "private"
                      ? "Invite links unlock immediately after creation."
                      : "This league will be discoverable from the public join flow."}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/8">
              <div className="ff-panel-strip">
                <span className="ff-kicker text-[#e9c400]">Launch Notes</span>
              </div>
              <CardContent className="space-y-4 px-6 py-6">
                <div className="ff-field-shell">
                  <p className="ff-kicker">After creation</p>
                  <p className="text-sm leading-6 text-[#989aa2]">
                    You will land in league overview with invite controls, current
                    standings state, and the next-race prediction window.
                  </p>
                </div>
                <div className="grid gap-3 text-xs uppercase tracking-[0.16em] text-[#6f727b] sm:grid-cols-3">
                  <p>Engine AP-2026.4</p>
                  <p>Latency 0.02ms</p>
                  <p>Security AES-256</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
