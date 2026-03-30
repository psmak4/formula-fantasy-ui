import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../api/apiClient";
import { toastApiError } from "../lib/api-error";
import { AppPageHeader } from "../components/layout/AppPageHeader";
import { Button } from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

type LeagueVisibility = "private" | "public";

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
        <AppPageHeader
          backHref="/leagues"
          backLabel="Back to leagues"
          eyebrow="League Setup"
          title="Create League"
          description="Start a league, choose whether it is public or private, and launch it ready for invites."
        />

        <div className="space-y-6">
          <Card className="ff-table-card border-[#d9dee5]">
            <CardContent className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <p className="ff-kicker">Launch Preview</p>
                <p className="text-sm text-[#989aa2]">
                  {previewName} will launch as a {visibility} league with you as commissioner.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[560px]">
                <div className="border border-[#e1e6ec] bg-[#f8f9fb] px-4 py-4">
                  <p className="ff-kicker">League</p>
                  <p className="mt-2 text-base font-semibold text-[#111318]">{previewName}</p>
                </div>
                <div className="border border-[#e1e6ec] bg-[#f8f9fb] px-4 py-4">
                  <p className="ff-kicker">Access</p>
                  <p className="mt-2 text-2xl font-black text-[#e9c400]">
                    {visibility === "private" ? "Private" : "Public"}
                  </p>
                </div>
                <div className="border border-[#e1e6ec] bg-[#f8f9fb] px-4 py-4">
                  <p className="ff-kicker">Commissioner</p>
                  <p className="mt-2 text-2xl font-black text-[#111318]">You</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="ff-table-card border-[#d9dee5]">
            <CardContent className="space-y-6 px-6 py-6 md:px-7">
              <div className="ff-field-shell">
                <Label htmlFor="leagueName">League name</Label>
                <Input
                  id="leagueName"
                  placeholder="Grand Prix Masters"
                  maxLength={25}
                  value={leagueName}
                  onChange={(event) => setLeagueName(event.target.value)}
                  className="h-14 text-xl text-[#111318] placeholder:text-[#7b8592] md:text-2xl"
                />
                <p className="text-sm text-[#777a84]">
                  Max 25 characters. Keep it sharp and easy to spot in standings.
                </p>
              </div>

              <div className="space-y-5">
                <Label>League type</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setVisibility("public")}
                    className={`relative p-6 text-left transition ${
                      visibility === "public"
                        ? "border border-[rgba(225,6,0,0.22)] bg-[#fff0ee] text-[#111318] shadow-[0_0_0_1px_rgba(225,6,0,0.08)]"
                        : "border border-[#e1e6ec] bg-[#f8f9fb] text-[#45515f] hover:bg-[#eef1f4]"
                    }`}
                  >
                    <span className="ff-kicker text-[#c80500]">Public</span>
                    <p className="mt-4 text-2xl font-semibold uppercase tracking-[0.04em] text-[#111318]">Open</p>
                    <p className="mt-4 text-sm leading-6 text-[#9699a2]">
                      Anyone can find and join your league from the public list.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVisibility("private")}
                    className={`relative p-6 text-left transition ${
                      visibility === "private"
                        ? "border border-[rgba(225,6,0,0.22)] bg-[#fff0ee] text-[#111318] shadow-[0_0_0_1px_rgba(225,6,0,0.08)]"
                        : "border border-[#e1e6ec] bg-[#f8f9fb] text-[#45515f] hover:bg-[#eef1f4]"
                    }`}
                  >
                    <span className="ff-kicker text-[#c80500]">Private</span>
                    <p className="mt-4 text-2xl font-semibold uppercase tracking-[0.04em] text-[#111318]">Invite only</p>
                    <p className="mt-4 text-sm leading-6 text-[#9699a2]">
                      Players join with an invite link that you share after creation.
                    </p>
                  </button>
                </div>
              </div>

              <div className="ff-field-shell">
                <p className="ff-kicker">
                  {visibility === "private" ? "Private league" : "Public league"}
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
        </div>
      </div>
    </section>
  );
}
