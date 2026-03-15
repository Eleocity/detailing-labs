import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
type ResetForm = z.infer<typeof schema>;

const LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663425808543/7UUm3VYuvjMZWzXs65cJTQ/detailing-labs-logo_00201e93.png";

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") ?? "";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetForm>({ resolver: zodResolver(schema) });

  const utils = trpc.useUtils();
  const resetMutation = trpc.auth.resetPassword.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      setSuccess(true);
      toast.success("Password reset successfully! You are now signed in.");
      setTimeout(() => navigate("/"), 2000);
    },
    onError: (err) => {
      toast.error(err.message ?? "Reset failed. Please request a new link.");
    },
  });

  const onSubmit = (data: ResetForm) => {
    if (!token) {
      toast.error("Invalid reset link. Please request a new one.");
      return;
    }
    resetMutation.mutate({ token, password: data.password });
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center space-y-4">
          <p className="text-muted-foreground">Invalid or missing reset token.</p>
          <Link href="/forgot-password">
            <Button variant="outline">Request a new reset link</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/">
            <img src={LOGO_URL} alt="Detailing Labs" className="h-20 object-contain cursor-pointer" />
          </Link>
        </div>

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-display">Reset Password</CardTitle>
            <CardDescription>Enter your new password below</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {success ? (
              <div className="text-center space-y-4 py-4">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Password Reset!</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    You're now signed in. Redirecting you home…
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 8 characters"
                      autoComplete="new-password"
                      className="pr-10"
                      {...register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Re-enter your new password"
                    autoComplete="new-password"
                    {...register("confirmPassword")}
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={resetMutation.isPending}
                >
                  {resetMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Lock className="h-4 w-4 mr-2" />
                  )}
                  Reset Password
                </Button>
              </form>
            )}

            {!success && (
              <div className="mt-6 text-center">
                <Link
                  href="/login"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Back to Sign In
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
