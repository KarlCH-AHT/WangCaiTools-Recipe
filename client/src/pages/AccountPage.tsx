import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

export default function AccountPage() {
  const [, navigate] = useLocation();
  const t = useTranslation();
  const { user } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/login" });
  const utils = trpc.useUtils();

  const [name, setName] = useState(user?.name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const previewLetter = useMemo(() => {
    return (name || user?.email || "?").slice(0, 1).toUpperCase();
  }, [name, user?.email]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload-image", { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = data.error || "Upload failed";
        if (typeof msg === "string" && msg.includes("Image storage is not configured")) {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === "string") {
              setAvatarUrl(reader.result);
              toast.success(t("usingLocalImage") || "Using local image");
            }
          };
          reader.readAsDataURL(file);
          return;
        }
        toast.error(msg);
        return;
      }
      const data = await res.json();
      if (data?.url) setAvatarUrl(data.url);
    } catch {
      toast.error(t("networkError") || "Network error, please try again");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
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
      navigate("/");
    } catch {
      toast.error(t("networkError") || "Network error, please try again");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t("accountManagement") || "Account"}</CardTitle>
          <CardDescription>{t("accountManagementDesc") || "Manage your profile and avatar"}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-muted overflow-hidden flex items-center justify-center text-lg font-semibold text-muted-foreground">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  previewLetter
                )}
              </div>
              <div className="flex-1">
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
                <p className="mt-1 text-xs text-muted-foreground">
                  {uploading ? t("uploading") || "Uploading..." : t("avatarHint") || "Upload a square image for best results"}
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
    </div>
  );
}
