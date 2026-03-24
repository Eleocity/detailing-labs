import { useSearch } from "wouter/use-browser-location";
import { Link } from "wouter";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export default function InvoicePaid() {
  const search = useSearch();
  const invoice = new URLSearchParams(search).get("invoice");
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center max-w-md px-6">
          <div className="w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-display font-bold mb-3">Payment Received</h1>
          {invoice && <p className="text-muted-foreground text-sm mb-2 font-mono">{invoice}</p>}
          <p className="text-muted-foreground mb-8">
            Thank you — your payment has been confirmed. A receipt has been sent to your email.
          </p>
          <Link href="/">
            <Button className="bg-primary hover:bg-primary/90 font-semibold px-8">
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
