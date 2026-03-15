import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
type LoginForm = z.infer<typeof loginSchema>;

const LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663425808543/7UUm3VYuvjMZWzXs65cJTQ/detailing-labs-logo_00201e93.png";

export default function Login() {
  const [, navigate] = useLocation();
  const [showPassword, setShowPassword] = useState(false);

  // Read returnTo from query string
  const params = new URLSearchParams(window.location.search);
  const returnTo = params.get("returnTo") ?? "/";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const utils = trpc.useUtils();
  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async (data) => {
      await utils.auth.me.invalidate();
      toast.success(`Welcome back, ${data.user.name ?? data.user.email}!`);
      navigate(returnTo);
    },
    onError: (err) => {
      toast.error(err.message ?? "Login failed. Please try again.");
    },
  });

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

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
            <CardTitle className="text-2xl font-display">Sign In</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
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

              <Button
                type="submit"
                className="w-full"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <LogIn className="h-4 w-4 mr-2" />
                )}
                Sign In
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/register" className="text-primary hover:underline font-medium">
                Create one
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          <Link href="/" className="hover:underline">
            ← Back to Detailing Labs
          </Link>
        </p>
      </div>
    </div>
  );
}
