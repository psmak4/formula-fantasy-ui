import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { authClient } from "@/auth/authClient";
import { API_BASE_URL, ApiError, apiClient } from "@/api/apiClient";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type MeResponse = {
  userId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: string;
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return error.message;
  }
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

export function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session, isPending } = authClient.useSession();

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [revokeOtherSessions, setRevokeOtherSessions] = useState(true);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    if (!isPending && !session?.user) {
      navigate("/sign-in", { replace: true });
    }
  }, [isPending, navigate, session]);

  useEffect(() => {
    if (!session?.user) {
      return;
    }
    setEmail(session.user.email ?? "");
    setDisplayName(session.user.name ?? "");
    setAvatarUrl(session.user.image ?? "");
  }, [session]);

  const meQuery = useQuery({
    queryKey: ["me"],
    enabled: Boolean(session?.user),
    queryFn: () => apiClient.get<MeResponse>("/me"),
  });

  useEffect(() => {
    if (!meQuery.data) {
      return;
    }
    setEmail(meQuery.data.email ?? "");
    setDisplayName(meQuery.data.displayName ?? "");
    setAvatarUrl(meQuery.data.avatarUrl ?? "");
  }, [meQuery.data]);

  const isPageLoading = isPending || (!session?.user && isPending);

  const canSaveProfile = useMemo(() => {
    return displayName.trim().length > 0;
  }, [displayName]);

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      const normalizedDisplayName = displayName.trim();
      const normalizedAvatarUrl =
        avatarUrl.trim().length > 0 ? avatarUrl.trim() : null;
      const payload = {
        displayName: normalizedDisplayName,
        avatarUrl: normalizedAvatarUrl,
      };
      await apiClient.put<MeResponse>("/me/profile", payload);
      await authClient.$fetch("/update-user", {
        method: "POST",
        body: {
          name: normalizedDisplayName,
          image: normalizedAvatarUrl,
        },
      });
      await authClient.getSession();
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onSuccess: () => {
      setProfileSuccess("Profile updated.");
    },
    onError: (error: unknown) => {
      setProfileError(getErrorMessage(error, "Unable to update profile."));
    },
  });

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    setIsSavingProfile(true);
    await saveProfileMutation
      .mutateAsync()
      .finally(() => setIsSavingProfile(false));
  }

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          revokeOtherSessions,
        }),
      });

      if (!response.ok) {
        let message = "Unable to change password.";
        try {
          const body = (await response.json()) as { message?: string };
          if (typeof body.message === "string" && body.message.length > 0) {
            message = body.message;
          }
        } catch {
          // Ignore parse errors and use fallback message.
        }
        throw new Error(message);
      }
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess("Password updated.");
    },
    onError: (error: unknown) => {
      setPasswordError(getErrorMessage(error, "Unable to change password."));
    },
  });

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setIsSavingPassword(true);
    await changePasswordMutation
      .mutateAsync()
      .finally(() => setIsSavingPassword(false));
  }

  if (isPageLoading) {
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
        <div className="relative z-10 mx-auto w-full max-w-7xl px-6">
          <p className="text-sm text-slate-600">Loading...</p>
        </div>
      </section>
    );
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
      <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-6 px-6 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="h-[3px] w-full bg-red-600" />
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl font-semibold tracking-tight text-neutral-900">
              Profile
            </CardTitle>
            <p className="text-sm text-slate-600">
              Update your account details.
            </p>
          </CardHeader>
          <CardContent>
            {meQuery.isLoading ? (
              <p className="text-sm text-slate-600">Loading profile...</p>
            ) : (
              <form className="space-y-4" onSubmit={handleSaveProfile}>
                <div className="space-y-2">
                  <Label htmlFor="profileDisplayName">Display name</Label>
                  <Input
                    id="profileDisplayName"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profileEmail">Email</Label>
                  <Input
                    id="profileEmail"
                    type="email"
                    value={email}
                    readOnly
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profileAvatarUrl">Avatar URL</Label>
                  <Input
                    id="profileAvatarUrl"
                    type="url"
                    placeholder="https://example.com/avatar.jpg"
                    value={avatarUrl}
                    onChange={(event) => setAvatarUrl(event.target.value)}
                  />
                </div>

                {profileError ? (
                  <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {profileError}
                  </p>
                ) : null}
                {profileSuccess ? (
                  <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                    {profileSuccess}
                  </p>
                ) : null}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSavingProfile || !canSaveProfile}
                >
                  {isSavingProfile ? "Saving..." : "Save profile"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <div className="h-[3px] w-full bg-red-600" />
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl font-semibold tracking-tight text-neutral-900">
              Change Password
            </CardTitle>
            <p className="text-sm text-slate-600">
              Set a new password for your account.
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleChangePassword}>
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  minLength={8}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={8}
                  required
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={revokeOtherSessions}
                  onChange={(event) =>
                    setRevokeOtherSessions(event.target.checked)
                  }
                />
                Sign out other devices
              </label>

              {passwordError ? (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {passwordError}
                </p>
              ) : null}
              {passwordSuccess ? (
                <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                  {passwordSuccess}
                </p>
              ) : null}

              <Button
                type="submit"
                className="w-full"
                disabled={isSavingPassword}
              >
                {isSavingPassword ? "Updating..." : "Update password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
