import { useState, useEffect } from "react";
import { useSearch } from "wouter/use-browser-location";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight, CheckCircle2, MapPin, Info,
  Sparkles, Shield, Phone, Mail, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

// Vehicle pricing tiers shown on package cards
const VEHICLE_TIERS: Record<string, { label: string; price: number }[]> = {
  "Exterior Decon & Shield": [
    { label: "Sedan / Coupe",        price: 129 },
    { label: "Small SUV / Truck",    price: 149 },
    { label: "Large SUV / Minivan",  price: 199 },
  ],
  "Interior Deep Refresh": [
    { label: "Sedan / Coupe",        price: 129 },
    { label: "Small SUV / Truck",    price: 149 },
    { label: "Large SUV / Minivan",  price: 199 },
  ],
  "Full Showroom Reset": [
    { label: "Sedan / Coupe",        price: 229 },
    { label: "Small SUV / Truck",    price: 269 },
    { label: "Large SUV / Minivan",  price: 359 },
  ],
};

// Fallback packages (used if DB is empty / not yet configured)
const FALLBACK_PACKAGES = [
  {
    id: 1,
    name: "Exterior Decon & Shield",
    price: "129",
    duration: 120,
    description: "Total decontamination and 3-month hydrophobic protection. From $129.",
    features: JSON.stringify([
      "Signature hand wash",
      "Wheel & tire deep clean",
      "Iron Remover treatment",
      "Bug & Tar Removal",
      "Hydrophobic Spray Wax (3-month protection)",
    ]),
    isPopular: false,
    isActive: true,
  },
  {
    id: 2,
    name: "Interior Deep Refresh",
    price: "129",
    duration: 120,
    description: "Complete cabin sanitization and restoration. From $129.",
    features: JSON.stringify([
      "Compressed air blowout",
      "Deep vacuum (all surfaces)",
      "Dash / console / door scrub",
      "UV protectant treatment",
      "Streak-free interior glass",
      "Floor mat restoration",
    ]),
    isPopular: false,
    isActive: true,
  },
  {
    id: 3,
    name: "Full Showroom Reset",
    price: "229",
    duration: 240,
    description: "Our most popular package — total vehicle transformation inside and out. From $229.",
    features: JSON.stringify([
      "Everything in Exterior Decon & Shield",
      "Everything in Interior Deep Refresh",
      "Best value — save up to $39 vs. booking separately",
      "Like-new vehicle experience inside and out",
    ]),
    isPopular: true,
    isActive: true,
  },
];

const FALLBACK_ADDONS = [
  { name: "Pet Hair Removal",                    price: "49",  description: "Starting at $49" },
  { name: "Odor Elimination Treatment",          price: "49",  description: "Interior deodorizer treatment" },
  { name: "Engine Bay Detail",                   price: "49",  description: "Degreased & detailed engine bay" },
  { name: "Headlight Restoration",               price: "79",  description: "Restore clarity & UV protection" },
  { name: "Seat Extraction — Front Only",        price: "50",  description: "$50–$75 depending on condition" },
  { name: "Seat Extraction — Full Vehicle",      price: "100", description: "$100–$150 all rows" },
  { name: "Seat Extraction — Per Seat (Spot)",   price: "25",  description: "$25 per seat spot treatment" },
];

type Tab = "detailing" | "ceramic";

export default function Pricing() {
  const [tab, setTab] = useState<Tab | null>(null);
  const search = useSearch();
  useEffect(() => {
    const params = new URLSearchParams(search);
    const t = params.get("tab");
    if (t === "detailing" || t === "ceramic") setTab(t);
  }, [search]);

  const { data: dbPackages } = trpc.bookings.getPackages.useQuery();
  const { data: dbAddOns } = trpc.bookings.getAddOns.useQuery();

  const packages = (dbPackages && dbPackages.length > 0 ? dbPackages : FALLBACK_PACKAGES)
    .filter(p => !p.name.toLowerCase().includes("ceramic") && p.isActive);
  const addOns = dbAddOns && dbAddOns.length > 0 ? dbAddOns : FALLBACK_ADDONS;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <SEO
        title="Detailing Packages & Pricing"
        description="Transparent pricing on all our mobile detailing packages. Or get a custom quote for ceramic coating. No hidden fees."
        canonical="/pricing"
        jsonLd={breadcrumbSchema([{ name: "Home", url: "/" }, { name: "Pricing", url: "/pricing" }])}
      />

      {/* Hero */}
      <section className="pt-28 pb-16 bg-[oklch(0.06_0.004_280)] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_30%_50%,oklch(0.60_0.22_295/0.06),transparent)]" />
        <div className="container relative z-10 text-center">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.p variants={fadeUp} className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">
              Transparent Pricing
            </motion.p>
            <motion.h1 variants={fadeUp} className="text-5xl lg:text-6xl font-display font-bold mb-5">
              Packages & Pricing
            </motion.h1>
            <motion.p variants={fadeUp} className="text-muted-foreground text-lg max-w-2xl mx-auto">
              No hidden fees. No surprises. Choose your service type below to see pricing or get a quote.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Service type selector */}
      <section className="py-16">
        <div className="container">
          <div className={cn("transition-all duration-500", tab ? "max-w-5xl" : "max-w-2xl")} style={{ margin: "0 auto" }}>

            {/* Tab selector cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
              {/* Detailing */}
              <button
                onClick={() => setTab("detailing")}
                className={cn(
                  "group relative flex flex-col items-start gap-4 p-7 rounded-2xl border-2 text-left transition-all duration-300",
                  tab === "detailing"
                    ? "border-primary bg-primary/8 shadow-xl shadow-primary/15"
                    : "border-border bg-card hover:border-primary/50 hover:bg-primary/4"
                )}
              >
                {tab === "detailing" && (
                  <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                  tab === "detailing" ? "bg-primary/20" : "bg-muted group-hover:bg-primary/10"
                )}>
                  <Sparkles className={cn("w-6 h-6", tab === "detailing" ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-xl mb-2">Detailing</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Interior, exterior, and full-detail packages with transparent, upfront pricing. Book online instantly.
                  </p>
                </div>
                <div className={cn(
                  "flex items-center gap-1.5 text-sm font-semibold mt-auto transition-colors",
                  tab === "detailing" ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                )}>
                  View packages <ArrowRight className="w-4 h-4" />
                </div>
              </button>

              {/* Ceramic Coating */}
              <button
                onClick={() => setTab("ceramic")}
                className={cn(
                  "group relative flex flex-col items-start gap-4 p-7 rounded-2xl border-2 text-left transition-all duration-300",
                  tab === "ceramic"
                    ? "border-amber-500/60 bg-amber-500/6 shadow-xl shadow-amber-500/10"
                    : "border-border bg-card hover:border-amber-500/40 hover:bg-amber-500/3"
                )}
              >
                {tab === "ceramic" && (
                  <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-black" />
                  </div>
                )}
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                  tab === "ceramic" ? "bg-amber-500/20" : "bg-muted group-hover:bg-amber-500/10"
                )}>
                  <Shield className={cn("w-6 h-6", tab === "ceramic" ? "text-amber-500" : "text-muted-foreground group-hover:text-amber-500")} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-xl mb-2">Ceramic Coating</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Long-term paint protection tailored to your vehicle. Every coating is custom-quoted based on size and condition.
                  </p>
                </div>
                <div className={cn(
                  "flex items-center gap-1.5 text-sm font-semibold mt-auto transition-colors",
                  tab === "ceramic" ? "text-amber-500" : "text-muted-foreground group-hover:text-amber-500"
                )}>
                  Get a quote <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            </div>

            {/* Tab content */}
            <AnimatePresence mode="wait">

              {/* ── DETAILING PACKAGES ── */}
              {tab === "detailing" && (
                <motion.div
                  key="detailing"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Package grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
                    {packages.map((pkg) => {
                      const features: string[] = pkg.features ? JSON.parse(pkg.features) : [];
                      const hrs = Math.floor(pkg.duration / 60);
                      const mins = pkg.duration % 60;
                      const durationStr = hrs > 0 ? `~${hrs}h${mins > 0 ? ` ${mins}m` : ""}` : `~${mins}m`;
                      return (
                        <motion.div
                          key={pkg.name}
                          initial="hidden"
                          animate="visible"
                          variants={fadeUp}
                          className={cn(
                            "relative flex flex-col rounded-2xl border p-6 transition-all",
                            pkg.isPopular
                              ? "border-primary/60 bg-primary/8 shadow-xl shadow-primary/15"
                              : "border-border bg-card hover:border-primary/30"
                          )}
                        >
                          {pkg.isPopular && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                              <span className="px-4 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold tracking-wide">
                                MOST POPULAR
                              </span>
                            </div>
                          )}

                          <div className="mb-4">
                            <h3 className="font-display font-bold text-xl mb-0.5">{pkg.name}</h3>
                            <p className="text-muted-foreground text-xs">{durationStr}</p>
                          </div>

                          {/* Vehicle tier pricing */}
                          {VEHICLE_TIERS[pkg.name] ? (
                            <div className="mb-5 space-y-1.5">
                              {VEHICLE_TIERS[pkg.name].map(tier => (
                                <div key={tier.label} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                                  <span className="text-sm text-muted-foreground">{tier.label}</span>
                                  <span className="font-display font-bold text-foreground">${tier.price}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="mb-4">
                              <span className="text-4xl font-display font-bold">${Number(pkg.price).toLocaleString()}</span>
                              <span className="text-muted-foreground text-sm ml-2">starting</span>
                            </div>
                          )}

                          <p className="text-muted-foreground text-sm leading-relaxed mb-5">{pkg.description}</p>

                          <ul className="space-y-2 mb-7 flex-1">
                            {features.map((f) => (
                              <li key={f} className="flex items-start gap-2 text-sm">
                                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                                <span className="text-muted-foreground">{f}</span>
                              </li>
                            ))}
                          </ul>

                          <Link href="/booking">
                            <Button
                              className={cn(
                                "w-full font-semibold",
                                pkg.isPopular ? "bg-primary hover:bg-primary/90 text-primary-foreground" : ""
                              )}
                              variant={pkg.isPopular ? "default" : "outline"}
                            >
                              Book {pkg.name}
                              <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Add-Ons */}
                  <div className="rounded-2xl border border-border bg-[oklch(0.06_0.004_280)] p-8 mb-8">
                    <div className="text-center mb-8">
                      <p className="text-primary text-xs font-semibold tracking-widest uppercase mb-2">Customize Your Detail</p>
                      <h2 className="text-2xl font-display font-bold">Add-On Services</h2>
                      <p className="text-muted-foreground mt-2 text-sm">Select any of these during booking to enhance your package.</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {addOns.map((addon) => (
                        <div key={addon.name} className="p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-all text-center">
                          <div className="text-xl font-display font-bold text-primary mb-1">
                            {(addon as any).description?.includes("–") ? (addon as any).description?.split(" ")?.[0] + "+" : `$${Number(addon.price).toLocaleString()}`}
                          </div>
                          <div className="text-sm font-medium text-foreground mb-0.5">{addon.name}</div>
                          {(addon as any).description && (
                            <div className="text-[11px] text-muted-foreground leading-tight">{(addon as any).description}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-3">
                    <div className="flex gap-3 p-4 rounded-xl border border-border bg-card">
                      <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm mb-1">Mobile Service — We Come To You</p>
                        <p className="text-muted-foreground text-sm">All services are performed at your location. A travel fee may apply outside our primary service area.</p>
                      </div>
                    </div>
                    <div className="flex gap-3 p-4 rounded-xl border border-border bg-card">
                      <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm mb-1">Pricing Notes</p>
                        <p className="text-muted-foreground text-sm">Prices shown are starting rates. Final pricing may vary based on vehicle size and condition. We confirm your exact quote before the appointment.</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── CERAMIC COATING QUOTE ── */}
              {tab === "ceramic" && (
                <motion.div
                  key="ceramic"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="max-w-2xl mx-auto"
                >
                  {/* Why custom pricing */}
                  <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-8 mb-6 text-center">
                    <div className="w-14 h-14 rounded-full bg-amber-500/15 flex items-center justify-center mx-auto mb-5">
                      <Shield className="w-7 h-7 text-amber-500" />
                    </div>
                    <h2 className="text-2xl font-display font-bold mb-3">Every Ceramic Job is Custom</h2>
                    <p className="text-muted-foreground leading-relaxed mb-2">
                      Ceramic coating pricing depends on your vehicle's size, paint condition, and the level of correction needed before coating. We don't believe in one-size-fits-all pricing for a job this important.
                    </p>
                    <p className="text-muted-foreground text-sm">
                      We'll assess your vehicle, walk you through exactly what's needed, and give you a transparent quote with no pressure.
                    </p>
                  </div>

                  {/* What's included teaser */}
                  <div className="rounded-2xl border border-border bg-card p-6 mb-6">
                    <h3 className="font-display font-bold mb-4">What's Typically Included</h3>
                    <ul className="space-y-2.5">
                      {[
                        "Full paint decontamination & wash",
                        "Paint correction (1 or 2 stage based on condition)",
                        "Professional-grade ceramic coating application",
                        "Multi-year protection warranty",
                        "Hydrophobic finish — water beads right off",
                        "Before & after photo documentation",
                        "Aftercare kit & maintenance guide",
                      ].map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Contact options */}
                  <div className="rounded-2xl border border-border bg-card p-6 mb-4">
                    <h3 className="font-display font-bold mb-1">Get Your Quote</h3>
                    <p className="text-muted-foreground text-sm mb-5">Reach out and we'll get back to you within a few hours.</p>
                    <div className="flex flex-col gap-3">
                      <a
                        href="tel:+12625550190"
                        className="flex items-center gap-4 p-4 rounded-xl border-2 border-primary/30 bg-primary/5 hover:border-primary hover:bg-primary/8 transition-all group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                          <Phone className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground">Call or Text Us</p>
                          <p className="text-muted-foreground text-xs">Fastest way to get a quote — we typically respond within minutes</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                      </a>

                      <a
                        href="mailto:hello@detailinglabswi.com"
                        className="flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary/40 hover:bg-muted/30 transition-all group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                          <Mail className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground">Email Us</p>
                          <p className="text-muted-foreground text-xs">Send us your vehicle details and we'll prepare a full quote</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                      </a>

                      <Link href="/contact">
                        <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary/40 hover:bg-muted/30 transition-all group cursor-pointer">
                          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground">Contact Form</p>
                            <p className="text-muted-foreground text-xs">Fill out our contact form and we'll follow up with a quote</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                        </div>
                      </Link>
                    </div>
                  </div>

                  <p className="text-center text-xs text-muted-foreground">
                    Not ready for ceramic? <button onClick={() => setTab("detailing")} className="text-primary hover:underline font-medium">View our detailing packages instead →</button>
                  </p>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Bottom CTA — only when no tab selected or detailing tab */}
      {tab !== "ceramic" && (
        <section className="py-16 bg-[oklch(0.06_0.004_280)]">
          <div className="container text-center">
            <h2 className="text-3xl font-display font-bold mb-4">
              {tab === "detailing" ? "Ready to Book?" : "Not sure which service you need?"}
            </h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto text-sm">
              {tab === "detailing"
                ? "Choose your package and book online in minutes. We'll confirm and come to you."
                : "Start by selecting a service type above, or reach out and we'll help you decide."}
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {tab === "detailing" ? (
                <Link href="/booking">
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-10 h-12 text-base">
                    Book Your Detail <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              ) : (
                <>
                  <button onClick={() => setTab("detailing")} className="px-8 h-12 rounded-xl border-2 border-primary text-primary font-semibold text-base hover:bg-primary hover:text-primary-foreground transition-colors">
                    View Detailing Packages
                  </button>
                  <button onClick={() => setTab("ceramic")} className="px-8 h-12 rounded-xl border-2 border-amber-500/50 text-amber-500 font-semibold text-base hover:bg-amber-500/10 transition-colors">
                    Get Ceramic Quote
                  </button>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      <SiteFooter />
    </div>
  );
}
