import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, KeyRound, ShieldCheck, Users as UsersIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

type AccountUser = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  role: "user" | "admin";
  lastSignedIn: string | Date;
  createdAt: string | Date;
};

function dateText(value: string | Date | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

export default function AccountPage() {
  const [, navigate] = useLocation();
  const t = useTranslation();
  const { user } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/login" });
  const utils = trpc.useUtils();

  const [name, setName] = useState(user?.name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const [accounts, setAccounts] = useState<AccountUser[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  const previewLetter = useMemo(() => {
    return (name || user?.email || "?").slice(0, 1).toUpperCase();
  }, [name, user?.email]);

  useEffect(() => {
    setName(user?.name ?? "");
    setAvatarUrl(user?.avatarUrl ?? "");
  }, [user?.name, user?.avatarUrl]);

  const loadAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const res = await fetch("/api/auth/users", { credentials: "include" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to load accounts");
        return;
      }
      const data = await res.json();
      setAccounts(Array.isArray(data?.users) ? data.users : []);
    } catch {
      toast.error(t("networkError") || "Network error, please try again");
    } finally {
      setLoadingAccounts(false);
    }
  };

  useEffect(() => {
    void loadAccounts();
  }, []);

  const handleUpload = async (file: File) => {
    const useLocalImage = () => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setAvatarUrl(reader.result);
          toast.success(t("usingLocalImage") || "Using local image");
        }
      };
      reader.readAsDataURL(file);
    };

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload-image", { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = data.error || "Upload failed";
        toast.warning(typeof msg === "string" ? msg : "Upload failed");
        useLocalImage();
        return;
      }
      const data = await res.json();
      if (data?.url) setAvatarUrl(data.url);
    } catch {
      toast.warning(t("networkError") || "Network error, please try again");
      useLocalImage();
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: name.trim() || undefined, avatarUrl: avatarUrl.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Update failed");
        return;
      }
      await utils.auth.me.invalidate();
      toast.success(t("profileUpdated") || "Profile updated");
      await loadAccounts();
    } catch {
      toast.error(t("networkError") || "Network error, please try again");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword) {
      toast.error("Please fill in all password fields");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to change password");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed successfully");
    } catch {
      toast.error(t("networkError") || "Network error, please try again");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/50 via-background to-background px-4 py-6">
      <div className="mx-auto w-full max-w-5xl space-y-5">
        <div className="flex items-center justify-between rounded-2xl border bg-card/80 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate("/")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-semibold">{t("accountManagement") || "Account settings"}</h1>
              <p className="text-sm text-muted-foreground">{t("accountManagementDesc") || "Manage your profile, password, and members"}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><ShieldCheck className="h-5 w-5" />Profile</CardTitle>
              <CardDescription>Update your avatar and display name</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 overflow-hidden rounded-full bg-muted text-lg font-semibold text-muted-foreground flex items-center justify-center">
                    {avatarUrl ? <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" /> : previewLetter}
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="avatar">{t("avatar") || "Avatar"}</Label>
                    <Input
                      id="avatar"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(file);
                      }}
                      disabled={uploading}
                    />
                    <p className="text-xs text-muted-foreground">
                      {uploading ? t("uploading") || "Uploading..." : t("avatarHint") || "Square image recommended"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">{t("name") || "Name"}</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder={t("namePlaceholder") || "Your name"}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="avatarUrl">{t("avatarUrl") || "Avatar URL"}</Label>
                  <Input
                    id="avatarUrl"
                    type="url"
                    placeholder="https://..."
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={saving || uploading}>
                  {saving ? t("saving") || "Saving..." : t("saveChanges") || "Save changes"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><KeyRound className="h-5 w-5" />Password</CardTitle>
              <CardDescription>Change your login password</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm new password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={changingPassword}>
                  {changingPassword ? "Updating..." : "Update password"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><UsersIcon className="h-5 w-5" />Accounts in this recipe space</CardTitle>
              <CardDescription>All members that currently have access to shared recipes</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingAccounts ? (
                <p className="text-sm text-muted-foreground">Loading accounts...</p>
              ) : accounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No accounts found.</p>
              ) : (
                <div className="space-y-2">
                  {accounts.map((account) => {
                    const initial = (account.name || account.email || "?").slice(0, 1).toUpperCase();
                    return (
                      <div key={account.openId} className="flex items-center justify-between rounded-xl border bg-background px-3 py-2">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 overflow-hidden rounded-full bg-muted text-sm font-semibold text-muted-foreground flex items-center justify-center">
                            {account.avatarUrl ? <img src={account.avatarUrl} alt={account.name || "user"} className="h-full w-full object-cover" /> : initial}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{account.name || "Unnamed user"}</p>
                            <p className="text-xs text-muted-foreground">{account.email || "No email"}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium uppercase text-muted-foreground">{account.role}</p>
                          <p className="text-xs text-muted-foreground">Last login: {dateText(account.lastSignedIn)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
