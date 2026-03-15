import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Loader2, ShieldAlert, Eye, EyeOff } from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663425808543/7UUm3VYuvjMZWzXs65cJTQ/detailing-labs-logo_00201e93.png";

export default function AcceptInvite() {
  const [, navigate] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") || "";

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Look up the invitation
  const { data: invite, isLoading, error: inviteError } = trpc.invitations.getByToken.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  const acceptMutation = trpc.invitations.accept.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setTimeout(() => navigate("/admin"), 2000);
    },
    onError: (err) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Please enter your name.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    acceptMutation.mutate({ token, name: name.trim(), password });
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-foreground font-medium">Invalid invitation link.</p>
            <p className="text-muted-foreground text-sm mt-1">This link is missing a token. Please check your email for the correct link.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (inviteError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-foreground font-medium">Invitation unavailable</p>
            <p className="text-muted-foreground text-sm mt-1">{inviteError.message}</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/login")}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-foreground font-medium text-lg">Account created!</p>
            <p className="text-muted-foreground text-sm mt-1">Redirecting you to the dashboard…</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const roleLabel = invite?.role === "admin" ? "Admin" : invite?.role === "employee" ? "Employee" : "Team Member";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <img src={LOGO_URL} alt="Detailing Labs" className="h-16 mx-auto" />
        </div>

        <Card className="border-border/50">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-bold">Accept Invitation</CardTitle>
            <CardDescription>
              You've been invited to join Detailing Labs as a{" "}
              <span className="text-primary font-medium">{roleLabel}</span>.
              Set up your account below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Pre-filled email (read-only) */}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={invite?.email || ""}
                  disabled
                  className="bg-muted/50 text-muted-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={acceptMutation.isPending}
              >
                {acceptMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account…</>
                ) : (
                  "Create Account & Sign In"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <button onClick={() => navigate("/login")} className="text-primary hover:underline">
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
