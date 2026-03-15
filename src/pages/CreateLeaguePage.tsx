import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../api/apiClient";
import { toastApiError } from "../lib/api-error";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

export function CreateLeaguePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [leagueName, setLeagueName] = useState("");
  const [createState, setCreateState] = useState<"idle" | "creating" | "created" | string>("idle");

  const createLeagueMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: leagueName.trim() || "My League",
        visibility: "private" as const,
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
    <section className="relative w-full pb-12 pt-20">
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
        <div className="space-y-2">
          <h2 className="font-['Orbitron'] text-3xl font-bold uppercase tracking-tight text-black">
            Create League
          </h2>
          <p className="text-muted-foreground text-slate-600">
            Start a league, invite your friends, and compete all season.
          </p>
        </div>

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>League Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Label htmlFor="leagueName">League name</Label>
            <Input
              id="leagueName"
              placeholder="League name"
              value={leagueName}
              onChange={(event) => setLeagueName(event.target.value)}
            />
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-slate-600">
              Leagues are private in MVP. You can invite players with a join link after creation.
            </div>
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
              <p className="text-sm text-red-600">{createState}</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
