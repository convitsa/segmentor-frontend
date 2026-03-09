"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useConfirm } from "@/components/confirm-dialog";
import { api } from "@/lib/api";
import { posthog } from "@/lib/posthog";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Mail,
  Calendar,
  Lock,
  Trash2,
  Shield,
  Loader2,
  Check,
  AlertTriangle,
  Eye,
  EyeOff,
  CreditCard,
  ArrowUpRight,
} from "lucide-react";
import { SegiOrb } from "@/components/segi-orb";

interface ProfileData {
  id: string;
  email: string;
  name?: string;
  hasPassword: boolean;
  hasGoogle: boolean;
  createdAt: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, logout, login } = useAuth();
  const confirm = useConfirm();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Profile editing
  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Set password (for Google-only users)
  const [setNewPw, setSetNewPw] = useState("");
  const [setConfirmPw, setSetConfirmPw] = useState("");
  const [settingPassword, setSettingPassword] = useState(false);

  // Billing
  const [subscription, setSubscription] = useState<{
    status: string;
    interval: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    plan: { name: string; monthlyPrice: number; yearlyPrice: number } | null;
  } | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  // Delete account
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadProfile();
    loadSubscription();
  }, []);

  async function loadProfile() {
    try {
      const data = await api.get<ProfileData>("/api/auth/me");
      setProfile(data);
      setDisplayName(data.name || "");
    } catch {
      toast.error("Failed to load profile");
    } finally {
      setLoadingProfile(false);
    }
  }

  async function loadSubscription() {
    try {
      const data = await api.get<{ subscription: typeof subscription }>("/api/billing/subscription");
      setSubscription(data.subscription);
    } catch { /* ignore */ }
  }

  async function openPortal() {
    setPortalLoading(true);
    try {
      const data = await api.post<{ url: string }>("/api/billing/portal", {});
      if (data.url) window.location.href = data.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to open billing portal");
    } finally {
      setPortalLoading(false);
    }
  }

  async function handleSaveName() {
    if (!displayName.trim()) return;
    setSavingName(true);
    try {
      const updated = await api.patch<{ id: string; email: string; name: string; createdAt: string }>(
        "/api/auth/profile",
        { name: displayName.trim() }
      );
      setProfile((prev) => prev ? { ...prev, name: updated.name } : prev);
      if (user) {
        let token = "";
        try { token = localStorage.getItem("segmentor_token") || ""; } catch { /* localStorage unavailable */ }
        login(token, { ...user, name: updated.name });
      }
      posthog.capture("settings_updated", { field: "name" });
      toast.success("Name updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update name");
    } finally {
      setSavingName(false);
    }
  }

  async function handleChangePassword() {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setSavingPassword(true);
    try {
      await api.patch("/api/auth/password", { currentPassword, newPassword });
      posthog.capture("settings_updated", { field: "password" });
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleSetPassword() {
    if (setNewPw !== setConfirmPw) {
      toast.error("Passwords do not match");
      return;
    }
    if (setNewPw.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setSettingPassword(true);
    try {
      await api.post("/api/auth/set-password", { newPassword: setNewPw });
      toast.success("Password set successfully");
      setSetNewPw("");
      setSetConfirmPw("");
      setProfile((prev) => prev ? { ...prev, hasPassword: true } : prev);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to set password");
    } finally {
      setSettingPassword(false);
    }
  }

  async function handleDeleteAccount() {
    const confirmed = await confirm({
      title: "Delete Account",
      description:
        "This will permanently delete your account, all projects, personalizations, and analytics data. This action cannot be undone.",
      confirmLabel: "Delete my account",
      destructive: true,
    });
    if (!confirmed) return;

    setDeleting(true);
    try {
      await api.delete("/api/auth/account");
      toast.success("Account deleted");
      logout();
      router.push("/auth/signin");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete account");
    } finally {
      setDeleting(false);
    }
  }

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center py-20">
        <SegiOrb size={48} thinking />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* ─── Profile ─── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="size-5 text-primary" />
            <CardTitle className="text-lg">Profile</CardTitle>
          </div>
          <CardDescription>Your personal account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Display Name</label>
            <div className="flex gap-2">
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
              />
              <Button
                onClick={handleSaveName}
                disabled={savingName || !displayName.trim() || displayName === (profile?.name || "")}
                size="sm"
                className="shrink-0"
              >
                {savingName ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              </Button>
            </div>
          </div>

          <Separator />

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Mail className="size-3.5" />
                Email
              </label>
              <p className="text-sm font-medium">{profile?.email}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Calendar className="size-3.5" />
                Member since
              </label>
              <p className="text-sm font-medium">
                {profile?.createdAt
                  ? new Date(profile.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "—"}
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Shield className="size-3.5" />
              Authentication Methods
            </label>
            <div className="flex items-center gap-2 pt-1">
              {profile?.hasPassword && (
                <Badge variant="secondary" className="gap-1">
                  <Lock className="size-3" />
                  Password
                </Badge>
              )}
              {profile?.hasGoogle && (
                <Badge variant="secondary" className="gap-1">
                  <svg className="size-3" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </Badge>
              )}
              {!profile?.hasPassword && !profile?.hasGoogle && (
                <span className="text-sm text-muted-foreground">None configured</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Security / Password ─── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="size-5 text-primary" />
            <CardTitle className="text-lg">Security</CardTitle>
          </div>
          <CardDescription>
            {profile?.hasPassword
              ? "Change your password to keep your account secure"
              : "Set a password so you can also sign in with email"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profile?.hasPassword ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Current Password</label>
                <div className="relative">
                  <Input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">New Password</label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Confirm New Password</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
              <Button
                onClick={handleChangePassword}
                disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
                className="mt-1"
              >
                {savingPassword && <Loader2 className="mr-2 size-4 animate-spin" />}
                Change Password
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                You signed up with Google. Set a password to also sign in with your email.
              </p>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">New Password</label>
                <Input
                  type="password"
                  value={setNewPw}
                  onChange={(e) => setSetNewPw(e.target.value)}
                  placeholder="At least 8 characters"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Confirm Password</label>
                <Input
                  type="password"
                  value={setConfirmPw}
                  onChange={(e) => setSetConfirmPw(e.target.value)}
                  placeholder="Confirm password"
                />
              </div>
              <Button
                onClick={handleSetPassword}
                disabled={settingPassword || !setNewPw || !setConfirmPw}
                className="mt-1"
              >
                {settingPassword && <Loader2 className="mr-2 size-4 animate-spin" />}
                Set Password
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Billing ─── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="size-5 text-primary" />
            <CardTitle className="text-lg">Billing</CardTitle>
          </div>
          <CardDescription>Your subscription and billing details</CardDescription>
        </CardHeader>
        <CardContent>
          {subscription ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{subscription.plan?.name || "Pro"} Plan</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {subscription.interval}ly &middot; {subscription.status}
                  </p>
                </div>
                <Badge variant={subscription.status === "active" ? "default" : "outline"}>
                  {subscription.status === "active" ? "Active" : subscription.status}
                </Badge>
              </div>
              {subscription.cancelAtPeriodEnd && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Cancels on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              )}
              {!subscription.cancelAtPeriodEnd && (
                <p className="text-xs text-muted-foreground">
                  Renews on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              )}
              <Button size="sm" onClick={openPortal} disabled={portalLoading}>
                {portalLoading ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <ArrowUpRight className="mr-2 size-4" />
                )}
                Manage Billing
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">No active subscription.</p>
              <Button size="sm" onClick={() => router.push("/billing")}>
                View Plans
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Danger Zone ─── */}
      <Card className="border-destructive/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" />
            <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
          </div>
          <CardDescription>Irreversible actions for your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Delete Account</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all associated data including projects, personalizations, audiences, and analytics.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="shrink-0"
            >
              {deleting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 size-4" />
              )}
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
