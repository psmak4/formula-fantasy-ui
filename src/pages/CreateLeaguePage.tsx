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

  const previewName = leagueName.trim() || "League Title";

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
    <section className="bg-[linear-gradient(180deg,#f6f3ee_0%,#f2ede6_100%)] pb-14 pt-14">
      <div className="mx-auto max-w-6xl space-y-8 px-6">
        <div className="space-y-5">
          <Link
            to="/leagues"
            className="inline-flex items-center text-sm font-semibold text-slate-600 hover:text-black hover:no-underline"
          >
            ← Back
          </Link>

          <div>
            <h1 className="font-['Orbitron'] text-4xl font-black uppercase tracking-tight text-black md:text-5xl">
              Create A League
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
              Start your own league and invite friends to compete in race-by-race
              Formula Fantasy predictions.
            </p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.95fr)]">
          <Card className="rounded-[32px] border-[#ddd6cc] bg-white shadow-[0_16px_38px_rgba(15,23,42,0.05)]">
            <CardContent className="space-y-8 px-6 py-6 md:px-8 md:py-8">
              <div className="space-y-3">
                <Label htmlFor="leagueName" className="text-sm font-semibold text-black">
                  League name
                </Label>
                <Input
                  id="leagueName"
                  placeholder="Enter a league name"
                  maxLength={25}
                  value={leagueName}
                  onChange={(event) => setLeagueName(event.target.value)}
                  className="h-12 rounded-2xl border-neutral-400 text-base"
                />
                <p className="text-sm text-slate-500">
                  Max 25 characters.
                </p>
              </div>

              <div className="border-t border-[#ece5dc] pt-8">
                <p className="text-sm font-semibold text-black">Type of league</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setVisibility("private")}
                    className={`rounded-[24px] border px-5 py-5 text-left transition ${
                      visibility === "private"
                        ? "border-black bg-neutral-950 text-white"
                        : "border-[#ddd6cc] bg-white text-black"
                    }`}
                  >
                    <p className="font-['Orbitron'] text-2xl font-black tracking-tight">
                      Private
                    </p>
                    <p
                      className={`mt-3 text-sm leading-6 ${
                        visibility === "private" ? "text-white/72" : "text-slate-600"
                      }`}
                    >
                      Players join with an invite link that you share after creation.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVisibility("public")}
                    className={`rounded-[24px] border px-5 py-5 text-left transition ${
                      visibility === "public"
                        ? "border-black bg-neutral-950 text-white"
                        : "border-[#ddd6cc] bg-white text-black"
                    }`}
                  >
                    <p className="font-['Orbitron'] text-2xl font-black tracking-tight">
                      Public
                    </p>
                    <p
                      className={`mt-3 text-sm leading-6 ${
                        visibility === "public" ? "text-white/72" : "text-slate-600"
                      }`}
                    >
                      Anyone can find and join your league from the public list.
                    </p>
                  </button>
                </div>
              </div>

              <div className="border-t border-[#ece5dc] pt-8">
                <div className="rounded-[24px] border border-neutral-200 bg-neutral-50 px-5 py-4 text-sm leading-6 text-slate-600">
                  {visibility === "private"
                    ? "Private leagues are best for friend groups, office pools, or invite-only rivalries."
                    : "Public leagues are discoverable in the Join A League page and can grow without manual invites."}
                </div>
              </div>

              <div className="space-y-4 border-t border-[#ece5dc] pt-8">
                <Button
                  className="w-full rounded-full"
                  onClick={handleCreateLeague}
                  disabled={createState === "creating"}
                >
                  {createState === "creating" ? "Creating..." : "Create a league"}
                </Button>
                {createState !== "idle" &&
                createState !== "creating" &&
                createState !== "created" ? (
                  <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {createState}
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <div className="rounded-[32px] border border-[#ddd6cc] bg-white p-5 shadow-[0_16px_38px_rgba(15,23,42,0.04)]">
            <div className="flex h-full min-h-[420px] flex-col justify-center rounded-[28px] bg-[linear-gradient(180deg,#f7f4ec_0%,#efebe3_100%)] px-8 py-10 text-center">
              <div
                className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full text-2xl font-black ${
                  visibility === "private"
                    ? "bg-black text-white"
                    : "bg-red-600 text-white"
                }`}
              >
                {leagueInitials(previewName)}
              </div>
              <p className="mt-6 font-['Orbitron'] text-3xl font-black tracking-tight text-black">
                {previewName}
              </p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {visibility} league
              </p>
              <p className="mx-auto mt-6 max-w-sm text-sm leading-6 text-slate-600">
                Your league preview updates as you type. Once created, you can
                invite other players or share it publicly depending on the league type.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
