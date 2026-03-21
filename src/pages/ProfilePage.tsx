import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { authClient } from "@/auth/authClient";
import { API_BASE_URL, ApiError, apiClient, getDebugUserId } from "@/api/apiClient";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/Card";
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

function formatMemberSince(value?: string) {
  if (!value) return "Unknown";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown";
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

function initialsFromName(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "FF";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session, isPending } = authClient.useSession();
  const debugUserId = getDebugUserId();
  const hasDebugAuth =
    import.meta.env.DEV &&
    import.meta.env.VITE_ALLOW_DEBUG_AUTH === "true" &&
    debugUserId.length > 0;

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
    if (!isPending && !session?.user && !hasDebugAuth) {
      navigate("/sign-in", { replace: true });
    }
  }, [hasDebugAuth, isPending, navigate, session]);

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
    enabled: Boolean(session?.user) || hasDebugAuth,
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

  const isPageLoading = isPending || (!session?.user && !hasDebugAuth && isPending);

  const canSaveProfile = useMemo(() => displayName.trim().length > 0, [displayName]);

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      const normalizedDisplayName = displayName.trim();
      const normalizedAvatarUrl = avatarUrl.trim().length > 0 ? avatarUrl.trim() : null;
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
    await saveProfileMutation.mutateAsync().finally(() => setIsSavingProfile(false));
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
    await changePasswordMutation.mutateAsync().finally(() => setIsSavingPassword(false));
  }

  if (isPageLoading) {
    return (
      <section className="px-6 py-14 md:py-20">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm text-[#989aa2]">Loading profile...</p>
        </div>
      </section>
    );
  }

  const profile = meQuery.data;
  const displayHandle = displayName.trim() || profile?.displayName || "Manager";
  const memberSince = formatMemberSince(profile?.createdAt);

  return (
    <section className="ff-page">
      <div className="ff-shell">
        <section className="ff-hero-band overflow-hidden border border-white/8">
          <div className="grid gap-8 px-8 py-10 lg:grid-cols-[minmax(0,1.3fr)_300px] lg:px-10 lg:py-12">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone="info">Driver Profile</Badge>
                <Badge tone="neutral">Member since {memberSince}</Badge>
              </div>

              <div className="space-y-4">
                <p className="ff-kicker">Account Telemetry</p>
                <h1 className="ff-display text-5xl text-white md:text-7xl">
                  {displayHandle}
                </h1>
                <p className="max-w-2xl text-base leading-7 text-[#c2c4cb]">
                  Manage your paddock identity, avatar, and security settings without changing any gameplay data or league membership.
                </p>
              </div>

              <div className="ff-stat-strip sm:grid-cols-3">
                <div className="ff-stat bg-black/20">
                  <p className="ff-kicker">Account email</p>
                  <p className="mt-2 break-all text-sm font-semibold text-white">{email}</p>
                </div>
                <div className="ff-stat bg-black/20">
                  <p className="ff-kicker">Profile state</p>
                  <p className="mt-2 text-3xl font-black text-[#e9c400]">Live</p>
                </div>
                <div className="ff-stat bg-black/20">
                  <p className="ff-kicker">Security mode</p>
                  <p className="mt-2 text-3xl font-black text-white">
                    {revokeOtherSessions ? "Strict" : "Normal"}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="flex h-36 w-36 items-center justify-center border border-white/10 bg-[linear-gradient(180deg,#1f2229_0%,#0f1014_100%)] text-4xl font-black text-white">
                {avatarUrl.trim() ? (
                  <img
                    src={avatarUrl}
                    alt={displayHandle}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initialsFromName(displayHandle)
                )}
              </div>

              <Card className="border-white/8 bg-black/20">
                <CardContent className="space-y-4 px-6 py-6">
                  <p className="ff-kicker">Identity Snapshot</p>
                  <div className="space-y-3">
                    <div className="ff-field-shell bg-white/4">
                      <p className="ff-kicker">Display name</p>
                      <p className="mt-2 text-2xl font-black text-white">{displayHandle}</p>
                    </div>
                    <div className="ff-field-shell bg-white/4">
                      <p className="ff-kicker">Avatar source</p>
                      <p className="mt-2 text-sm leading-6 text-[#d0d3d9]">
                        {avatarUrl.trim() || "No avatar URL set"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="ff-table-card overflow-hidden border-white/8">
            <div className="ff-panel-strip">
              <CardTitle>Profile Settings</CardTitle>
            </div>
            <CardContent className="space-y-4">
              <CardDescription>Update your account details and visual identity.</CardDescription>
              {meQuery.isLoading ? (
                <p className="text-sm text-[#989aa2]">Loading profile...</p>
              ) : (
                <form className="space-y-4" onSubmit={handleSaveProfile}>
                  <div className="ff-field-shell">
                    <Label htmlFor="profileDisplayName">Display name</Label>
                    <Input
                      id="profileDisplayName"
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      required
                    />
                  </div>
                  <div className="ff-field-shell">
                    <Label htmlFor="profileEmail">Email</Label>
                    <Input
                      id="profileEmail"
                      type="email"
                      value={email}
                      readOnly
                      disabled
                    />
                  </div>
                  <div className="ff-field-shell">
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
                    <div className="border border-[#7a0d0d] bg-[#350909] px-4 py-3 text-sm text-[#ff8e8e]">
                      {profileError}
                    </div>
                  ) : null}
                  {profileSuccess ? (
                    <div className="border border-[#205038] bg-[#102317] px-4 py-3 text-sm text-[#6ee7a8]">
                      {profileSuccess}
                    </div>
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

          <Card className="ff-table-card overflow-hidden border-white/8">
            <div className="ff-panel-strip">
              <CardTitle>Security Controls</CardTitle>
            </div>
            <CardContent className="space-y-4">
              <CardDescription>Set a new password and decide whether to revoke other sessions.</CardDescription>
              <form className="space-y-4" onSubmit={handleChangePassword}>
                <div className="ff-field-shell">
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
                <div className="ff-field-shell">
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
                <div className="ff-field-shell">
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

                <label className="flex items-center gap-3 bg-white/3 px-4 py-4 text-sm text-[#d0d3d9]">
                  <input
                    type="checkbox"
                    checked={revokeOtherSessions}
                    onChange={(event) => setRevokeOtherSessions(event.target.checked)}
                  />
                  Sign out other devices after password change
                </label>

                {passwordError ? (
                  <div className="border border-[#7a0d0d] bg-[#350909] px-4 py-3 text-sm text-[#ff8e8e]">
                    {passwordError}
                  </div>
                ) : null}
                {passwordSuccess ? (
                  <div className="border border-[#205038] bg-[#102317] px-4 py-3 text-sm text-[#6ee7a8]">
                    {passwordSuccess}
                  </div>
                ) : null}

                <Button type="submit" className="w-full" disabled={isSavingPassword}>
                  {isSavingPassword ? "Updating..." : "Update password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
