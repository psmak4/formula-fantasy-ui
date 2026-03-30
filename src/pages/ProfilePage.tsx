import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { authClient } from "@/auth/authClient";
import { ApiError, apiClient, getDebugUserId } from "@/api/apiClient";
import { Badge } from "@/components/ui/Badge";
import { AppPageHeader } from "@/components/layout/AppPageHeader";
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
      await authClient.$fetch("/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword,
          newPassword,
          revokeOtherSessions,
        }),
      });
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
      <div className="ff-shell space-y-6">
        <AppPageHeader
          eyebrow="Account"
          title="Profile"
          description="Manage your display name, avatar, and password without affecting gameplay or league membership."
          meta={
            <>
              <Badge variant="secondary">
                Driver profile
              </Badge>
              <Badge tone="neutral">
                Member since {memberSince}
              </Badge>
            </>
          }
          utility={
            <>
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center border border-[#d9dee5] bg-[#eef1f4] text-lg font-black text-[#111318]">
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
                <div className="min-w-0">
                  <p className="ff-kicker">Signed in as</p>
                  <p className="truncate text-sm font-semibold text-[#111318]">{displayHandle}</p>
                  <p className="truncate text-sm text-[#66707d]">{email}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neutral">
                  {avatarUrl.trim() ? "Avatar set" : "No avatar set"}
                </Badge>
                <Badge tone={revokeOtherSessions ? "warning" : "info"}>
                  {revokeOtherSessions ? "Strict security" : "Normal security"}
                </Badge>
              </div>
            </>
          }
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="ff-table-card overflow-hidden border-[#d9dee5]">
            <div className="ff-panel-strip">
              <CardTitle className="text-[#111318]">Profile Settings</CardTitle>
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

          <Card className="ff-table-card overflow-hidden border-[#d9dee5]">
            <div className="ff-panel-strip">
              <CardTitle className="text-[#111318]">Security Controls</CardTitle>
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

                <label className="flex items-center gap-3 border border-[#e1e6ec] bg-[#f8f9fb] px-4 py-4 text-sm text-[#45515f]">
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
