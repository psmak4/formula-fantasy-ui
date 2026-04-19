import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Trophy, Flag, Shield, Star, Zap, Flame, Target, Crown, Rocket, Swords } from "lucide-react";
import { apiClient } from "../api/apiClient";
import { toastApiError } from "../lib/api-error";
import { invalidateLeagueQueries } from "../lib/leagueJoin";
import { AppPageHeader } from "../components/layout/AppPageHeader";
import { Button } from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

const ICON_OPTIONS = [
  { name: "trophy", Icon: Trophy },
  { name: "flag", Icon: Flag },
  { name: "shield", Icon: Shield },
  { name: "star", Icon: Star },
  { name: "zap", Icon: Zap },
  { name: "flame", Icon: Flame },
  { name: "target", Icon: Target },
  { name: "crown", Icon: Crown },
  { name: "rocket", Icon: Rocket },
  { name: "swords", Icon: Swords },
] as const;

const COLOR_OPTIONS = [
  "#e91e8c", "#9c27b0", "#5c35cc", "#1565c0", "#00838f",
  "#2e7d32", "#827717", "#e65100", "#6d4c41", "#546e7a",
] as const;

type LeagueVisibility = "private" | "public";

export function CreateLeaguePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [leagueName, setLeagueName] = useState("");
  const [visibility, setVisibility] = useState<LeagueVisibility>("private");
  const [selectedIcon, setSelectedIcon] = useState<string>("trophy");
  const [selectedColor, setSelectedColor] = useState<string>("#e65100");
  const [createState, setCreateState] = useState<
    "idle" | "creating" | "created" | string
  >("idle");

  const previewName = leagueName.trim() || "Grand Prix Masters";

  const createLeagueMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: previewName,
        visibility,
        icon: selectedIcon,
        color: selectedColor,
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
    onSuccess: async (result) => {
      await invalidateLeagueQueries(queryClient, { includePublicLeagues: true });
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
          <Card className="ff-table-card ">
            <CardContent className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <p className="ff-kicker">Launch Preview</p>
                <p className="text-sm text-on-surface-variant">
                  {previewName} will launch as a {visibility} league with you as commissioner.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[560px]">
                <div className="rounded-md bg-surface-container-low px-4 py-4">
                  <p className="ff-kicker">League</p>
                  <div className="mt-2 flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: selectedColor }}
                    >
                      {ICON_OPTIONS.find((opt) => opt.name === selectedIcon)?.Icon ? (
                        (() => {
                          const IconComp = ICON_OPTIONS.find((opt) => opt.name === selectedIcon)!.Icon;
                          return <IconComp className="h-5 w-5 text-white" />;
                        })()
                      ) : null}
                    </div>
                    <p className="text-base font-semibold text-on-surface truncate">{previewName}</p>
                  </div>
                </div>
                <div className="rounded-md bg-surface-container-low px-4 py-4">
                  <p className="ff-kicker">Access</p>
                  <p className="mt-2 text-2xl font-black text-tertiary">
                    {visibility === "private" ? "Private" : "Public"}
                  </p>
                </div>
                <div className="rounded-md bg-surface-container-low px-4 py-4">
                  <p className="ff-kicker">Commissioner</p>
                  <p className="mt-2 text-2xl font-black text-on-surface">You</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="ff-table-card ">
            <CardContent className="space-y-6 px-6 py-6 md:px-7">
              <div className="ff-field-shell">
                <Label htmlFor="leagueName">League name</Label>
                <Input
                  id="leagueName"
                  placeholder="Grand Prix Masters"
                  maxLength={25}
                  value={leagueName}
                  onChange={(event) => setLeagueName(event.target.value)}
                  className="h-14 text-xl text-on-surface placeholder:text-on-surface-variant md:text-2xl"
                />
                <p className="text-sm text-on-surface-variant">
                  Max 25 characters. Keep it sharp and easy to spot in standings.
                </p>
              </div>

              <div className="space-y-2">
                <p className="ff-kicker">League Icon</p>
                <div className="flex flex-wrap gap-2">
                  {ICON_OPTIONS.map(({ name, Icon }) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setSelectedIcon(name)}
                      className={`flex h-10 w-10 items-center justify-center rounded-md border-2 transition ${
                        selectedIcon === name
                          ? "bg-primary-container"
                          : "bg-surface-container-lowest hover:bg-surface-container-low"
                      }`}
                      aria-label={name}
                    >
                      <Icon className="h-5 w-5 text-on-surface" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="ff-kicker">League Color</p>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      style={{ backgroundColor: color }}
                      className={`h-8 w-8 rounded-full transition ${
                        selectedColor === color
                          ? "ring-2 ring-on-surface ring-offset-2 ring-offset-surface"
                          : ""
                      }`}
                      aria-label={color}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-5">
                <Label>League type</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setVisibility("public")}
                    className={`relative rounded-lg p-6 text-left transition ${
                      visibility === "public"
                        ? "bg-primary-container text-on-primary-container"
                        : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    <span className="ff-kicker text-primary">Public</span>
                    <p className="mt-4 text-2xl font-semibold uppercase tracking-[0.04em] text-on-surface">Open</p>
                    <p className="mt-4 text-sm leading-6 text-on-surface-variant">
                      Anyone can find and join your league from the public list.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVisibility("private")}
                    className={`relative rounded-lg p-6 text-left transition ${
                      visibility === "private"
                        ? "bg-primary-container text-on-primary-container"
                        : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    <span className="ff-kicker text-primary">Private</span>
                    <p className="mt-4 text-2xl font-semibold uppercase tracking-[0.04em] text-on-surface">Invite only</p>
                    <p className="mt-4 text-sm leading-6 text-on-surface-variant">
                      Players join with an invite link that you share after creation.
                    </p>
                  </button>
                </div>
              </div>

              <div className="ff-field-shell">
                <p className="ff-kicker">
                  {visibility === "private" ? "Private league" : "Public league"}
                </p>
                <p className="text-sm leading-6 text-on-surface-variant">
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
                  {createState === "creating" ? "Creating…" : "Create League"}
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/leagues">Cancel</Link>
                </Button>
              </div>
              {createState !== "idle" &&
              createState !== "creating" &&
              createState !== "created" ? (
                <p className="bg-error-container px-4 py-3 text-sm text-on-error-container">
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
