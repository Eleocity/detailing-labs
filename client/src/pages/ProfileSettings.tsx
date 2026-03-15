import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  User, Mail, Phone, Lock, Eye, EyeOff,
  CheckCircle, Shield, AlertTriangle, Loader2, Save,
} from "lucide-react";
import { toast } from "sonner";

export default function ProfileSettings() {
  const { user, loading } = useAuth();
  const utils = trpc.useUtils();

  // ── Profile form state ──────────────────────────────────────────────────────
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState((user as any)?.phone ?? "");
  const [profileSaved, setProfileSaved] = useState(false);

  // ── Password form state ─────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // ── tRPC mutations ──────────────────────────────────────────────────────────
  const updateProfileMutation = trpc.users.update.useMutation({
    onSuccess: () => {
      setProfileSaved(true);
      utils.auth.me.invalidate();
      toast.success("Profile updated successfully.");
      setTimeout(() => setProfileSaved(false), 3000);
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const changePasswordMutation = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError("");
      toast.success("Password changed successfully.");
    },
    onError: (err: { message: string }) => {
      setPasswordError(err.message);
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Name cannot be empty.");
    updateProfileMutation.mutate({ userId: user!.id, name: name.trim(), phone: phone.trim() || undefined });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    if (newPassword.length < 8) return setPasswordError("New password must be at least 8 characters.");
    if (newPassword !== confirmPassword) return setPasswordError("Passwords do not match.");
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  const initials = (user?.name ?? user?.email ?? "?").charAt(0).toUpperCase();

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <User className="h-6 w-6 text-primary" /> Profile Settings
          </h1>
          <p className="text-muted-foreground mt-1">Manage your account information and security settings.</p>
        </div>

        {/* Account overview */}
        <Card className="border-border/50 bg-card/60">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold truncate">{user?.name ?? "—"}</p>
                <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  {user?.role === "admin" ? (
                    <Badge className="bg-primary/20 text-primary border-primary/30 gap-1 text-xs">
                      <Shield className="h-3 w-3" /> Admin
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground text-xs">User</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile info */}
        <Card className="border-border/50 bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Personal Information
            </CardTitle>
            <CardDescription>Update your display name and contact details.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="profile-name">Full Name</Label>
                  <Input
                    id="profile-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="profile-phone">Phone Number</Label>
                  <Input
                    id="profile-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 000-0000"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="profile-email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="profile-email"
                    type="email"
                    value={user?.email ?? ""}
                    disabled
                    className="pl-9 bg-muted/50 text-muted-foreground"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Email cannot be changed here. Contact an admin to update it.</p>
              </div>

              <div className="flex items-center justify-between pt-1">
                {profileSaved && (
                  <span className="text-sm text-green-500 flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4" /> Saved
                  </span>
                )}
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="ml-auto gap-2"
                >
                  {updateProfileMutation.isPending
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                    : <><Save className="h-4 w-4" /> Save Changes</>}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Separator />

        {/* Change password */}
        <Card className="border-border/50 bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" /> Change Password
            </CardTitle>
            <CardDescription>Choose a strong password with at least 8 characters.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="current-password">Current Password</Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showCurrent ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {/* Password strength indicator */}
                {newPassword.length > 0 && (
                  <div className="flex gap-1 mt-1.5">
                    {[1, 2, 3, 4].map((level) => {
                      const strength = Math.min(
                        4,
                        (newPassword.length >= 8 ? 1 : 0) +
                        (/[A-Z]/.test(newPassword) ? 1 : 0) +
                        (/[0-9]/.test(newPassword) ? 1 : 0) +
                        (/[^A-Za-z0-9]/.test(newPassword) ? 1 : 0)
                      );
                      const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-500"];
                      return (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full transition-colors ${level <= strength ? colors[strength - 1] : "bg-muted"}`}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type={showNew ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your new password"
                  required
                />
              </div>

              {passwordError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{passwordError}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end pt-1">
                <Button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className="gap-2"
                >
                  {changePasswordMutation.isPending
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Updating…</>
                    : <><Lock className="h-4 w-4" /> Update Password</>}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
