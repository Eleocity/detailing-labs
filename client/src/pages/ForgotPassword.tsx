import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

const schema = z.object({
  email: z.string().email("Please enter a valid email address"),
});
type ForgotForm = z.infer<typeof schema>;

const LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663425808543/7UUm3VYuvjMZWzXs65cJTQ/detailing-labs-logo_00201e93.png";

export default function ForgotPassword() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotForm>({ resolver: zodResolver(schema) });

  const forgotMutation = trpc.auth.forgotPassword.useMutation({
    onSuccess: () => setSubmitted(true),
  });

  const onSubmit = (data: ForgotForm) => {
    forgotMutation.mutate(data);
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
            <CardTitle className="text-2xl font-display">Forgot Password</CardTitle>
            <CardDescription>
              Enter your email and we'll send you a reset link
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {submitted ? (
              <div className="text-center space-y-4 py-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Mail className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Check your email</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    If an account exists for{" "}
                    <span className="text-foreground font-medium">{getValues("email")}</span>,
                    you'll receive a password reset link shortly.
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Didn't receive it? Check your spam folder or{" "}
                  <button
                    onClick={() => setSubmitted(false)}
                    className="text-primary hover:underline"
                  >
                    try again
                  </button>
                  .
                </p>
              </div>
            ) : (
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

                <Button
                  type="submit"
                  className="w-full"
                  disabled={forgotMutation.isPending}
                >
                  {forgotMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  Send Reset Link
                </Button>
              </form>
            )}

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
