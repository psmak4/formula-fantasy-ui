import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { authClient } from "@/auth/authClient";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
  banExpires?: string | Date | null;
  createdAt?: string | Date;
};

type ListUsersResponse = {
  users: AdminUser[];
  total: number;
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

function unwrapAuthResponse<T>(response: unknown): T {
  if (typeof response === "object" && response !== null) {
    if ("error" in response) {
      const error = (response as { error?: { message?: string } | null }).error;
      if (error) {
        throw new Error(error.message ?? "Request failed");
      }
    }
    if ("data" in response) {
      return (response as { data: T }).data;
    }
  }
  return response as T;
}

function isAdminRole(role: string | null | undefined): boolean {
  if (!role) {
    return false;
  }
  return role
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .includes("admin");
}

export function AdminPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session, isPending } = authClient.useSession();
  const [actionError, setActionError] = useState<string | null>(null);
  const [banTarget, setBanTarget] = useState<Pick<
    AdminUser,
    "id" | "name" | "email"
  > | null>(null);

  const canLoad = Boolean(session?.user);

  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    enabled: canLoad,
    queryFn: async () => {
      const response = await authClient.$fetch("/admin/list-users", {
        method: "GET",
        query: {
          limit: 100,
          offset: 0,
          sortBy: "createdAt",
          sortDirection: "desc",
        },
      });
      return unwrapAuthResponse<ListUsersResponse>(response);
    },
  });

  const banMutation = useMutation({
    mutationFn: async (input: { userId: string; ban: boolean }) => {
      if (input.ban) {
        const response = await authClient.$fetch("/admin/ban-user", {
          method: "POST",
          body: {
            userId: input.userId,
            banReason: "Disabled by admin",
          },
        });
        unwrapAuthResponse<{ user: AdminUser }>(response);
        return;
      }

      const response = await authClient.$fetch("/admin/unban-user", {
        method: "POST",
        body: {
          userId: input.userId,
        },
      });
      unwrapAuthResponse<{ user: AdminUser }>(response);
    },
    onSuccess: async () => {
      setActionError(null);
      setBanTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: unknown) => {
      setActionError(
        getErrorMessage(error, "Unable to update user ban state."),
      );
    },
  });

  useEffect(() => {
    if (!isPending && !session?.user) {
      const redirect = encodeURIComponent(
        `${location.pathname}${location.search}`,
      );
      navigate(`/sign-in?redirect=${redirect}`, { replace: true });
    }
  }, [isPending, location.pathname, location.search, navigate, session?.user]);

  if (!isPending && !session?.user) {
    return null;
  }

  const rows = usersQuery.data?.users ?? [];
  const loading = isPending || usersQuery.isLoading;
  const errorMessage = usersQuery.error
    ? getErrorMessage(usersQuery.error, "Unable to load users.")
    : null;

  return (
    <>
      <div className="space-y-8">
        <div className="space-y-2">
          <h2 className="font-['Orbitron'] text-3xl font-bold uppercase tracking-tight text-black">
            Users
          </h2>
          <p className="text-slate-600">
            Manage users, roles, and access controls.
          </p>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle>User Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {actionError ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {actionError}
              </p>
            ) : null}

            {loading ? (
              <p className="text-slate-600">Loading users...</p>
            ) : null}

            {!loading && errorMessage ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorMessage}
              </p>
            ) : null}

            {!loading && !errorMessage ? (
              <div>
                <table className="w-full table-fixed text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200">
                      <th className="px-3 py-2 text-left font-medium text-slate-500 whitespace-normal wrap-break-word">
                        Name
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500 whitespace-normal wrap-break-word">
                        Email
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500 whitespace-normal wrap-break-word">
                        Role
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500 whitespace-normal wrap-break-word">
                        Status
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500 whitespace-normal wrap-break-word">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((user) => {
                      const adminRole = isAdminRole(user.role);
                      const banned = Boolean(user.banned);

                      return (
                        <tr
                          key={user.id}
                          className="border-b border-neutral-200 last:border-0"
                        >
                          <td className="px-3 py-3 whitespace-normal wrap-break-word align-top">
                            {user.name}
                          </td>
                          <td className="px-3 py-3 whitespace-normal break-all align-top">
                            {user.email}
                          </td>
                          <td className="px-3 py-3 whitespace-normal wrap-break-word align-top">
                            {adminRole ? (
                              <Badge tone="info">admin</Badge>
                            ) : (
                              <Badge>user</Badge>
                            )}
                          </td>
                          <td className="px-3 py-3 whitespace-normal wrap-break-word align-top">
                            {banned ? (
                              <Badge tone="danger">banned</Badge>
                            ) : (
                              <Badge tone="success">active</Badge>
                            )}
                            {banned && user.banReason ? (
                              <p className="mt-1 text-xs text-slate-500">
                                {user.banReason}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-3 py-3 whitespace-normal wrap-break-word align-top">
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant={banned ? "secondary" : "destructive"}
                                disabled={banMutation.isPending}
                                onClick={() => {
                                  if (!banned) {
                                    setBanTarget({
                                      id: user.id,
                                      name: user.name,
                                      email: user.email,
                                    });
                                    return;
                                  }
                                  void banMutation.mutateAsync({
                                    userId: user.id,
                                    ban: false,
                                  });
                                }}
                              >
                                {banned ? "Unban" : "Ban"}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-3 py-8 text-center text-slate-500"
                        >
                          No users found.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={Boolean(banTarget)}
        onOpenChange={(open) => !open && setBanTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Ban</DialogTitle>
            <DialogDescription>
              This will block this user from signing in until an admin unbans
              them.
            </DialogDescription>
          </DialogHeader>
          {banTarget ? (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm text-slate-700">
              <p>
                <strong>Name:</strong> {banTarget.name}
              </p>
              <p>
                <strong>Email:</strong> {banTarget.email}
              </p>
            </div>
          ) : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary" disabled={banMutation.isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={banMutation.isPending || !banTarget}
              onClick={() => {
                if (!banTarget) return;
                void banMutation.mutateAsync({
                  userId: banTarget.id,
                  ban: true,
                });
              }}
            >
              {banMutation.isPending ? "Banning..." : "Confirm Ban"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
