import { Link } from "wouter";
import { Home, Phone, Calendar, ArrowLeft } from "lucide-react";
import SEO from "@/components/SEO";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO
        title="Page Not Found"
        description="The page you were looking for doesn't exist. Return to Detailing Labs homepage."
        noindex={true}
      />
      <SiteHeader />

      <div className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="text-center max-w-md">
          <p className="text-8xl font-display font-bold text-primary/20 mb-4">404</p>
          <h1 className="text-2xl font-display font-bold mb-3">Page not found</h1>
          <p className="text-muted-foreground text-sm leading-relaxed mb-8">
            This page doesn't exist or has been moved.
            Here's where you probably want to go:
          </p>

          <div className="flex flex-col gap-3 max-w-xs mx-auto">
            <Link href="/">
              <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors">
                <Home className="w-4 h-4" /> Back to Home
              </button>
            </Link>
            <Link href="/booking">
              <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted/30 transition-colors">
                <Calendar className="w-4 h-4" /> Book a Detail
              </button>
            </Link>
            <Link href="/pricing">
              <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted/30 transition-colors">
                <ArrowLeft className="w-4 h-4" /> View Pricing
              </button>
            </Link>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
