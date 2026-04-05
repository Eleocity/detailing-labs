import { useState } from "react";
import { useSearch } from "wouter/use-browser-location";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Mail, CheckCircle2, AlertCircle, ChevronRight, ArrowLeft } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { trpc } from "@/lib/trpc";
import SEO from "@/components/SEO";

type State = "idle" | "loading" | "done" | "error";

export default function Unsubscribe() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  // Klaviyo passes ?email= in unsubscribe links automatically
  const prefilled = params.get("email") ?? "";

  const [email, setEmail] = useState(prefilled);
  const [state, setState] = useState<State>("idle");

  const unsubscribe = trpc.content.unsubscribeEmail.useMutation({
    onSuccess: () => setState("done"),
    onError:   () => setState("error"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setState("loading");
    unsubscribe.mutate({ email: email.trim().toLowerCase() });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />
      <SEO
        title="Unsubscribe from Email Marketing | Detailing Labs"
        description="Unsubscribe from Detailing Labs marketing emails."
        canonical="/unsubscribe"
        noindex={true}
      />

      <div className="flex-1 flex items-center justify-center px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Done state */}
          {state === "done" ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h1 className="text-2xl font-display font-bold mb-3">You're unsubscribed.</h1>
              <p className="text-muted-foreground text-sm leading-relaxed mb-2">
                <strong className="text-foreground">{email}</strong> has been removed from our marketing emails.
              </p>
              <p className="text-muted-foreground text-sm mb-8">
                You won't receive any promotional emails from Detailing Labs.
                Booking confirmations and receipts are unaffected.
              </p>
              <Link href="/">
                <button className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to home
                </button>
              </Link>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <h1 className="text-2xl font-display font-bold mb-2">Unsubscribe from emails</h1>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Enter the email address you'd like to remove from our marketing list.
                  Booking confirmations and receipts will still be sent.
                </p>
              </div>

              {/* Error */}
              {state === "error" && (
                <div className="flex items-start gap-3 p-4 rounded-xl border border-destructive/30 bg-destructive/8 mb-5">
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">
                    Something went wrong. Please try again or{" "}
                    <a href="mailto:hello@detailinglabswi.com" className="underline">contact us directly</a>.
                  </p>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground text-sm focus:outline-none focus:border-primary/60 transition-colors placeholder:text-muted-foreground"
                  />
                </div>

                <button
                  type="submit"
                  disabled={state === "loading" || !email.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
                >
                  {state === "loading" ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Unsubscribing…
                    </>
                  ) : (
                    <>Unsubscribe <ChevronRight className="w-4 h-4" /></>
                  )}
                </button>
              </form>

              {/* Footer note */}
              <p className="text-center text-xs text-muted-foreground mt-6 leading-relaxed">
                Changed your mind?{" "}
                <Link href="/"><span className="text-primary hover:underline cursor-pointer">Return to the homepage.</span></Link>
                <br />
                Questions? Email us at{" "}
                <a href="mailto:hello@detailinglabswi.com" className="text-primary hover:underline">
                  hello@detailinglabswi.com
                </a>
              </p>
            </>
          )}
        </motion.div>
      </div>

      <SiteFooter />
    </div>
  );
}
