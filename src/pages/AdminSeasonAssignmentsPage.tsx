import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, ApiError } from "@/api/apiClient";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";

type Role = "race_driver" | "reserve" | "test";

type SeasonAssignmentsResponse = {
  seasons: Array<{
    id: string;
    year: number;
    raceCount: number;
    entryCount: number;
  }>;
  selectedSeason: null | {
    id: string;
    year: number;
    raceCount: number;
    entryCount: number;
  };
  summary: {
    raceDriverCount: number;
    reserveCount: number;
    testCount: number;
    referencedEntries: number;
  };
  entries: Array<{
    id: string;
    seasonId: string;
    seasonYear: number;
    driverId: string;
    driverName: string;
    constructorId: string;
    constructorName: string;
    carNumber: number | null;
    role: Role;
    usage: {
      qualifyingResults: number;
      raceResults: number;
      total: number;
    };
  }>;
  drivers: Array<{
    id: string;
    givenName: string;
    familyName: string;
  }>;
  constructors: Array<{
    id: string;
    name: string;
  }>;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Unable to load season assignments.";
}

export function AdminSeasonAssignmentsPage() {
  const queryClient = useQueryClient();
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [createState, setCreateState] = useState({
    driverId: "",
    constructorId: "",
    role: "race_driver" as Role,
    carNumber: "",
    reason: "",
  });
  const [editState, setEditState] = useState({
    constructorId: "",
    role: "race_driver" as Role,
    carNumber: "",
    reason: "",
  });

  const assignmentsQuery = useQuery({
    queryKey: ["admin-season-assignments", selectedSeasonId],
    queryFn: () =>
      apiClient.get<SeasonAssignmentsResponse>(
        selectedSeasonId
          ? `/admin/season-assignments?seasonId=${selectedSeasonId}`
          : "/admin/season-assignments",
      ),
  });

  const selectedSeason = assignmentsQuery.data?.selectedSeason ?? null;
  const entries = assignmentsQuery.data?.entries ?? [];
  const drivers = assignmentsQuery.data?.drivers ?? [];
  const constructors = assignmentsQuery.data?.constructors ?? [];
  const summary = assignmentsQuery.data?.summary;

  useEffect(() => {
    if (!selectedSeasonId && assignmentsQuery.data?.selectedSeason?.id) {
      setSelectedSeasonId(assignmentsQuery.data.selectedSeason.id);
    }
  }, [assignmentsQuery.data?.selectedSeason?.id, selectedSeasonId]);

  useEffect(() => {
    if (!createState.driverId && drivers[0]) {
      setCreateState((current) => ({ ...current, driverId: drivers[0].id }));
    }
    if (!createState.constructorId && constructors[0]) {
      setCreateState((current) => ({ ...current, constructorId: constructors[0].id }));
    }
  }, [constructors, createState.constructorId, createState.driverId, drivers]);

  const editingEntry = useMemo(
    () => entries.find((entry) => entry.id === editingEntryId) ?? null,
    [editingEntryId, entries],
  );

  useEffect(() => {
    if (!editingEntry) return;
    setEditState({
      constructorId: editingEntry.constructorId,
      role: editingEntry.role,
      carNumber: editingEntry.carNumber ? String(editingEntry.carNumber) : "",
      reason: "",
    });
  }, [editingEntry]);

  const createMutation = useMutation({
    mutationFn: async () =>
      apiClient.post("/admin/season-assignments", {
        seasonId: selectedSeasonId,
        driverId: createState.driverId,
        constructorId: createState.constructorId,
        role: createState.role,
        carNumber: createState.carNumber ? Number(createState.carNumber) : null,
        reason: createState.reason.trim(),
      }),
    onSuccess: async () => {
      setIsCreateOpen(false);
      setCreateState((current) => ({ ...current, carNumber: "", reason: "" }));
      await queryClient.invalidateQueries({ queryKey: ["admin-season-assignments"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () =>
      apiClient.put(`/admin/season-assignments/${editingEntryId}`, {
        constructorId: editState.constructorId,
        role: editState.role,
        carNumber: editState.carNumber ? Number(editState.carNumber) : null,
        reason: editState.reason.trim(),
      }),
    onSuccess: async () => {
      setEditingEntryId(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-season-assignments"] });
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-4">
          <p className="ff-kicker">Season Entry Registry</p>
          <h2 className="ff-display text-4xl text-white md:text-5xl">
            Season Assignments
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-[#989aa2] md:text-base">
            Manage driver-to-constructor season assignments with audit reasons. These changes affect future pools and ingestion resolution, but do not directly rescore completed rounds.
          </p>
        </div>

        <div className="border border-[#594b11] bg-[#2b2508] px-5 py-4 text-sm text-[#f3db53] xl:max-w-sm">
          <p className="ff-kicker text-[#d4c68b]">Data Safety</p>
          <p className="mt-2 leading-6">
            Referenced entries should be corrected, not repurposed or deleted, so stored qualifying and race rows retain valid season-entry linkage.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[240px] space-y-2">
          <Label htmlFor="seasonSelect">Season</Label>
          <Select value={selectedSeasonId} onValueChange={setSelectedSeasonId}>
            <SelectTrigger id="seasonSelect">
              <SelectValue placeholder="Select season" />
            </SelectTrigger>
            <SelectContent>
              {(assignmentsQuery.data?.seasons ?? []).map((season) => (
                <SelectItem key={season.id} value={season.id}>
                  {season.year} · {season.entryCount} entries
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => setIsCreateOpen(true)} disabled={!selectedSeasonId}>
          Create Assignment
        </Button>
      </div>

      {assignmentsQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((value) => (
            <div
              key={value}
              className="h-32 animate-pulse border border-white/8 bg-[#15161b]"
            />
          ))}
        </div>
      ) : null}

      {assignmentsQuery.isError ? (
        <div className="border border-[#7a0d0d] bg-[#350909] px-4 py-3 text-sm text-[#ff8e8e]">
          {getErrorMessage(assignmentsQuery.error)}
        </div>
      ) : null}

      {selectedSeason && summary ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Race Drivers"
            value={summary.raceDriverCount}
            subtitle="Active race-driver entries"
          />
          <MetricCard
            title="Reserves"
            value={summary.reserveCount}
            subtitle="Reserve assignments"
          />
          <MetricCard title="Test" value={summary.testCount} subtitle="Test-only assignments" />
          <MetricCard
            title="Referenced"
            value={summary.referencedEntries}
            subtitle="Used by stored race data"
            accent="warning"
          />
        </div>
      ) : null}

      <Card className="border-white/8 bg-[#15161b]">
        <CardContent className="space-y-5 px-0 py-0">
          <div className="flex flex-col gap-3 border-b border-white/6 px-6 py-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="ff-display text-3xl text-white">
                {selectedSeason ? `${selectedSeason.year} Assignments` : "Assignments"}
              </p>
              <p className="mt-2 text-sm text-[#989aa2]">
                Control panel for season-entry linkage, constructor mapping, and role assignment.
              </p>
            </div>
            {selectedSeason ? (
              <span className="ff-kicker bg-white/6 px-3 py-2 text-[#d0d3d9]">
                {selectedSeason.raceCount} races · {selectedSeason.entryCount} entries
              </span>
            ) : null}
          </div>

          <div className="mx-6 border border-[#594b11] bg-[#2b2508] p-4 text-sm text-[#f3db53]">
            Referenced entries should not be hard-deleted. Update them with a reason so historical race rows keep valid season-entry linkage and the change stays auditable.
          </div>

          <div className="px-6 pb-6">
            <Table ariaLabel="Season assignments">
              <TableHeader>
                <TableRow>
                  <TableHead>Driver</TableHead>
                  <TableHead>Constructor</TableHead>
                  <TableHead>Car</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length > 0 ? (
                  entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-semibold text-white">{entry.driverName}</div>
                          <div className="text-xs text-[#7f828b]">{entry.driverId}</div>
                        </div>
                      </TableCell>
                      <TableCell>{entry.constructorName}</TableCell>
                      <TableCell>{entry.carNumber ?? "Not set"}</TableCell>
                      <TableCell>{formatRole(entry.role)}</TableCell>
                      <TableCell className="text-xs text-[#989aa2]">
                        {entry.usage.total > 0
                          ? `${entry.usage.raceResults} race / ${entry.usage.qualifyingResults} qualifying`
                          : "Unused"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setEditingEntryId(entry.id)}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-[#989aa2]">
                      No season assignments found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateState((current) => ({ ...current, reason: "", carNumber: "" }));
          }
          setIsCreateOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Assignment</DialogTitle>
            <DialogDescription>
              Add a new season entry. Use this for a missing assignment instead of repurposing an existing referenced row.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void createMutation.mutateAsync();
            }}
          >
            <div className="space-y-2">
              <Label>Driver</Label>
              <Select
                value={createState.driverId}
                onValueChange={(value) =>
                  setCreateState((current) => ({ ...current, driverId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.givenName} {driver.familyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Constructor</Label>
              <Select
                value={createState.constructorId}
                onValueChange={(value) =>
                  setCreateState((current) => ({ ...current, constructorId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {constructors.map((constructor) => (
                    <SelectItem key={constructor.id} value={constructor.id}>
                      {constructor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={createState.role}
                onValueChange={(value) =>
                  setCreateState((current) => ({ ...current, role: value as Role }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="race_driver">Race driver</SelectItem>
                  <SelectItem value="reserve">Reserve</SelectItem>
                  <SelectItem value="test">Test</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Car Number</Label>
              <Input
                value={createState.carNumber}
                onChange={(event) =>
                  setCreateState((current) => ({
                    ...current,
                    carNumber: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Input
                value={createState.reason}
                onChange={(event) =>
                  setCreateState((current) => ({ ...current, reason: event.target.value }))
                }
              />
            </div>
            {createMutation.isError ? (
              <div className="border border-[#7a0d0d] bg-[#350909] px-4 py-3 text-sm text-[#ff8e8e]">
                {getErrorMessage(createMutation.error)}
              </div>
            ) : null}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary" disabled={createMutation.isPending}>
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={createMutation.isPending || createState.reason.trim().length < 8}
              >
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editingEntry)}
        onOpenChange={(open) => !open && setEditingEntryId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Assignment</DialogTitle>
            <DialogDescription>
              Update constructor, car number, or role. Referenced usage is shown so you can judge the blast radius.
            </DialogDescription>
          </DialogHeader>
          {editingEntry ? (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void updateMutation.mutateAsync();
              }}
            >
              <div className="border border-white/8 bg-white/3 p-4 text-sm text-[#d0d3d9]">
                {editingEntry.driverName} ·{" "}
                {editingEntry.usage.total > 0
                  ? `${editingEntry.usage.raceResults} race / ${editingEntry.usage.qualifyingResults} qualifying references`
                  : "No stored race references"}
              </div>
              <div className="space-y-2">
                <Label>Constructor</Label>
                <Select
                  value={editState.constructorId}
                  onValueChange={(value) =>
                    setEditState((current) => ({ ...current, constructorId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {constructors.map((constructor) => (
                      <SelectItem key={constructor.id} value={constructor.id}>
                        {constructor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={editState.role}
                  onValueChange={(value) =>
                    setEditState((current) => ({ ...current, role: value as Role }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="race_driver">Race driver</SelectItem>
                    <SelectItem value="reserve">Reserve</SelectItem>
                    <SelectItem value="test">Test</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Car Number</Label>
                <Input
                  value={editState.carNumber}
                  onChange={(event) =>
                    setEditState((current) => ({
                      ...current,
                      carNumber: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Input
                  value={editState.reason}
                  onChange={(event) =>
                    setEditState((current) => ({ ...current, reason: event.target.value }))
                  }
                />
              </div>
              {updateMutation.isError ? (
                <div className="border border-[#7a0d0d] bg-[#350909] px-4 py-3 text-sm text-[#ff8e8e]">
                  {getErrorMessage(updateMutation.error)}
                </div>
              ) : null}
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="secondary" disabled={updateMutation.isPending}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending || editState.reason.trim().length < 8}
                >
                  {updateMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatRole(role: Role): string {
  if (role === "race_driver") return "Race driver";
  if (role === "reserve") return "Reserve";
  return "Test";
}

function MetricCard(props: {
  title: string;
  value: number;
  subtitle: string;
  accent?: "neutral" | "warning";
}) {
  return (
    <Card className="border-white/8 bg-[#15161b]">
      <CardContent className="space-y-2 px-6 py-6">
        <p className="ff-kicker">{props.title}</p>
        <p
          className={`text-5xl font-black ${
            props.accent === "warning" ? "text-[#f3db53]" : "text-white"
          }`}
        >
          {props.value}
        </p>
        <p className="text-sm leading-6 text-[#989aa2]">{props.subtitle}</p>
      </CardContent>
    </Card>
  );
}
