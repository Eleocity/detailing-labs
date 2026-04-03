import { useState, useEffect } from "react";
import { useSearch } from "wouter/use-browser-location";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight, CheckCircle2, MapPin, Info,
  Sparkles, Shield, Phone, Mail, ArrowRight, Zap, Wrench,
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
    { label: "Sedan / Coupe",        price: 129.99 },
    { label: "Small SUV / Truck",    price: 149.99 },
    { label: "Large SUV / Minivan",  price: 199.99 },
  ],
  "Interior Deep Refresh": [
    { label: "Sedan / Coupe",        price: 129.99 },
    { label: "Small SUV / Truck",    price: 149.99 },
    { label: "Large SUV / Minivan",  price: 199.99 },
  ],
  "Full Showroom Reset": [
    { label: "Sedan / Coupe",        price: 229.99 },
    { label: "Small SUV / Truck",    price: 269.99 },
    { label: "Large SUV / Minivan",  price: 359.99 },
  ],
  "The Lab Grade Detail": [
    { label: "Sedan / Coupe",        price: 449.99 },
    { label: "Small SUV / Truck",    price: 529.99 },
    { label: "Large SUV / Minivan",  price: 649.99 },
  ],
};

// Fallback packages (used if DB is empty / not yet configured)
const FALLBACK_PACKAGES = [
  {
    id: 1,
    name: "Exterior Decon & Shield",
    price: "129.99",
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
    price: "129.99",
    duration: 120,
    description: "Complete cabin sanitization and restoration. From $129.",
    features: JSON.stringify([
      "Compressed air blowout",
      "Deep vacuum (all surfaces)",
      "Dash/console/door scrub",
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
    price: "229.99",
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
  {
    id: 4,
    name: "The Lab Grade Detail",
    price: "449.99",
    duration: 480,
    description: "Our most intensive single-day service. Paint-corrected, decontaminated, and coated — the highest result we offer.",
    features: JSON.stringify([
      "Everything in Full Showroom Reset",
      "Iron X iron & fallout decontamination",
      "Clay bar paint decontamination",
      "1-stage paint correction (swirl & scratch reduction)",
      "Ceramic spray sealant (6-month protection)",
      "Before & after photo documentation",
    ]),
    isPopular: false,
    isActive: true,
  },
];

const FALLBACK_ADDONS = [
  { name: "Pet Hair Removal",                    price: "49.99",  description: "Starting at $49" },
  { name: "Odor Elimination Treatment",          price: "49.99",  description: "Interior deodorizer treatment" },
  { name: "Engine Bay Detail",                   price: "49.99",  description: "Degreased & detailed engine bay" },
  { name: "Headlight Restoration",               price: "99.99",  description: "Restore clarity & UV protection" },
  { name: "Seat Extraction — Front Only",        price: "49.99",  description: "$50–$75 depending on condition" },
  { name: "Seat Extraction — Full Vehicle",      price: "99.99", description: "$100–$150 all rows" },
  { name: "Seat Extraction — Per Seat (Spot)",   price: "24.99",  description: "$25 per seat spot treatment" },
];
const PACKAGE_META: Record<string, { bestFor: string }> = {
  "Exterior Decon & Shield": {
    bestFor: "Seasonal refresh, pre-event prep, or maintaining a clean car between full details",
  },
  "Interior Deep Refresh": {
    bestFor: "Used car buyers, pet owners, or anyone whose cabin needs a proper reset",
  },
  "Full Showroom Reset": {
    bestFor: "First-time clients, pre-sale prep, or when you want the full treatment in one visit",
  },
  "The Lab Grade Detail": {
    bestFor: "High-end vehicles, neglected paint, or when only the highest possible result will do",
  },
};


type Tab = "detailing" | "ceramic" | "fleet" | "paint";

export default function Pricing() {
  const [tab, setTab] = useState<Tab | null>("detailing");
  const [vehicleSize, setVehicleSize] = useState<"sedan" | "suv" | "large" | null>(null);

  const VEHICLE_SIZE_LABELS: Record<string, string> = {
    sedan: "Sedan / Coupe",
    suv:   "Small SUV / Truck",
    large: "Large SUV / Minivan",
  };
  const VEHICLE_SIZE_INDEX: Record<string, number> = { sedan: 0, suv: 1, large: 2 };
  const vehicleSizeSelected = vehicleSize !== null;
  const search = useSearch();
  useEffect(() => {
    const params = new URLSearchParams(search);
    const t = params.get("tab");
    if (t === "detailing" || t === "ceramic") setTab(t);
  }, [search]);

  const { data: dbPackages } = trpc.bookings.getPackages.useQuery();
  const { data: dbAddOns } = trpc.bookings.getAddOns.useQuery();
  const { data: contactData } = trpc.content.getSiteContent.useQuery({ section: "contact" });
  const contact = Object.fromEntries((contactData ?? []).map(r => [r.key, r.value ?? ""]));
  const phone      = contact.phone || "(262) 555-0190";
  const email      = contact.email || "hello@detailinglabswi.com";
  const phoneHref  = `tel:${phone.replace(/\D/g, "")}`;
  const emailHref  = `mailto:${email}`;

  const packages = (dbPackages && dbPackages.length > 0 ? dbPackages : FALLBACK_PACKAGES)
    .filter(p => !p.name.toLowerCase().includes("ceramic") && p.isActive);
  const addOns = dbAddOns && dbAddOns.length > 0 ? dbAddOns : FALLBACK_ADDONS;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <SEO
        title="Detailing Packages & Pricing | Racine County, WI"
        description="Transparent pricing on all our mobile detailing packages in Southeast Wisconsin. Interior, exterior, and full-service from $129. Ceramic coating quoted on request."
        canonical="/pricing"
        jsonLd={breadcrumbSchema([{ name: "Home", url: "/" }, { name: "Pricing", url: "/pricing" }])}
      />

      {/* Hero */}
      <section className="pt-24 pb-10 sm:pt-28 sm:pb-16 bg-[oklch(0.06_0.004_280)] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_30%_50%,oklch(0.60_0.22_295/0.06),transparent)]" />
        <div className="container relative z-10 text-center">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.p variants={fadeUp} className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">
              Transparent Pricing
            </motion.p>
            <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-4">
              Packages & Pricing
            </motion.h1>
            <motion.p variants={fadeUp} className="text-muted-foreground text-lg max-w-2xl mx-auto">
              No hidden fees. No surprises. Choose your service type below to see pricing or get a quote.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Service type selector */}
      <section className="py-10 sm:py-16">
        <div className="container">
          <div className={cn("transition-all duration-500", tab ? "max-w-5xl" : "max-w-2xl")} style={{ margin: "0 auto" }}>

            {/* Tab selector cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
              {/* Detailing */}
              <button
                onClick={() => setTab("detailing")}
                className={cn(
                  "group relative flex flex-col items-start gap-4 p-5 sm:p-7 rounded-2xl border-2 text-left transition-all duration-300",
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
                  "group relative flex flex-col items-start gap-4 p-5 sm:p-7 rounded-2xl border-2 text-left transition-all duration-300",
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

              {/* Fleet */}
              <button
                onClick={() => setTab("fleet")}
                className={cn(
                  "group relative flex flex-col items-start gap-4 p-5 sm:p-7 rounded-2xl border-2 text-left transition-all duration-300 sm:col-span-2 lg:col-span-1",
                  tab === "fleet"
                    ? "border-sky-500/60 bg-sky-500/6 shadow-xl shadow-sky-500/10"
                    : "border-border bg-card hover:border-sky-500/40 hover:bg-sky-500/3"
                )}
              >
                {tab === "fleet" && (
                  <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-sky-500 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                  tab === "fleet" ? "bg-sky-500/20" : "bg-muted group-hover:bg-sky-500/10"
                )}>
                  <Zap className={cn("w-6 h-6", tab === "fleet" ? "text-sky-500" : "text-muted-foreground group-hover:text-sky-500")} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-xl mb-2">Fleet Services</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Multiple vehicles? We offer fleet programs for businesses, dealerships, and property managers. Custom pricing and scheduling.
                  </p>
                </div>
                <div className={cn(
                  "flex items-center gap-1.5 text-sm font-semibold mt-auto transition-colors",
                  tab === "fleet" ? "text-sky-500" : "text-muted-foreground group-hover:text-sky-500"
                )}>
                  Get a quote <ArrowRight className="w-4 h-4" />
                </div>
              </button>

              {/* Paint Correction */}
              <button
                onClick={() => setTab("paint")}
                className={cn(
                  "group relative flex flex-col items-start gap-4 p-5 sm:p-7 rounded-2xl border-2 text-left transition-all duration-300 sm:col-span-2 lg:col-span-1",
                  tab === "paint"
                    ? "border-rose-500/60 bg-rose-500/6 shadow-xl shadow-rose-500/10"
                    : "border-border bg-card hover:border-rose-500/40 hover:bg-rose-500/3"
                )}
              >
                {tab === "paint" && (
                  <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-rose-500 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                  tab === "paint" ? "bg-rose-500/20" : "bg-muted group-hover:bg-rose-500/10"
                )}>
                  <Wrench className={cn("w-6 h-6", tab === "paint" ? "text-rose-400" : "text-muted-foreground group-hover:text-rose-400")} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-xl mb-2">Paint Correction</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Remove swirl marks, scratches, and oxidation. Every correction is quoted based on your paint's condition and desired finish level.
                  </p>
                </div>
                <div className={cn(
                  "flex items-center gap-1.5 text-sm font-semibold mt-auto transition-colors",
                  tab === "paint" ? "text-rose-400" : "text-muted-foreground group-hover:text-rose-400"
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
                  {/* Vehicle size selector — prominent */}
                  <div className="mb-8 p-5 rounded-2xl border-2 border-primary/30 bg-primary/5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">1</span>
                      </div>
                      <p className="font-display font-bold text-base text-foreground">What size is your vehicle?</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { id: "sedan", label: "Sedan", sub: "Coupe" },
                        { id: "suv",   label: "SUV",   sub: "Small / Truck" },
                        { id: "large", label: "SUV",   sub: "Large / Minivan" },
                      ] as const).map((opt) => (
                        <button key={opt.id} onClick={() => setVehicleSize(opt.id)}
                          className={cn(
                            "flex flex-col items-center justify-center gap-0.5 py-3 px-2 rounded-xl border-2 transition-all text-center",
                            vehicleSize === opt.id
                              ? "border-primary bg-primary/10 shadow-sm shadow-primary/20"
                              : "border-border bg-background hover:border-primary/50 hover:bg-primary/4"
                          )}>
                          <span className={cn("text-sm font-bold leading-tight", vehicleSize === opt.id ? "text-primary" : "text-muted-foreground")}>
                            {opt.label}
                          </span>
                          <span className={cn("text-[11px] leading-tight", vehicleSize === opt.id ? "text-primary/70" : "text-muted-foreground/60")}>
                            {opt.sub}
                          </span>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-3 text-center">
                      Prices below update based on your selection.
                    </p>
                  </div>

                  {/* Package grid — only shown after vehicle size is selected */}
                  {!vehicleSizeSelected ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center mb-4">
                        <ChevronRight className="w-7 h-7 text-primary/60 rotate-90" />
                      </div>
                      <p className="font-display font-bold text-lg mb-2">Select your vehicle size above</p>
                      <p className="text-muted-foreground text-sm max-w-xs">
                        We want to make sure you see the right price for your vehicle before you book.
                      </p>
                    </div>
                  ) : (
                  <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mb-10">
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
                            <h3 className="font-display font-bold text-xl mb-1">{pkg.name}</h3>
                            {PACKAGE_META[pkg.name] && (
                              <p className="text-xs text-primary font-medium">
                                Best for: {PACKAGE_META[pkg.name].bestFor}
                              </p>
                            )}
                          </div>

                          {/* Single price for selected vehicle size */}
                          <div className="mb-5">
                            {VEHICLE_TIERS[pkg.name] ? (
                              <div className="flex items-end gap-2">
                                <span className="text-4xl font-display font-bold text-foreground">
                                  ${vehicleSize ? (VEHICLE_TIERS[pkg.name][VEHICLE_SIZE_INDEX[vehicleSize]]?.price ?? Number(pkg.price)) : Number(pkg.price)}
                                </span>
                                <span className="text-muted-foreground text-sm mb-1.5">{vehicleSize ? VEHICLE_SIZE_LABELS[vehicleSize] : ""}</span>
                              </div>
                            ) : (
                              <div className="flex items-end gap-2">
                                <span className="text-4xl font-display font-bold">${Number(pkg.price).toLocaleString()}</span>
                                <span className="text-muted-foreground text-sm mb-1.5">starting</span>
                              </div>
                            )}
                          </div>

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
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
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
                        <p className="text-muted-foreground text-sm">Prices shown are for the selected vehicle size. Final price confirmed before your appointment.</p>
                      </div>
                    </div>
                    <div className="flex gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm mb-1">Satisfaction Guarantee</p>
                        <p className="text-muted-foreground text-sm">If you're not happy with the result, tell us and we'll come back and make it right — no charge. We document every job with before and after photos.</p>
                      </div>
                    </div>
                  </div>
                  </>
                  )} {/* end vehicleSizeSelected */}
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
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 mb-3">
                      <span className="text-amber-400 font-bold text-sm">Most passenger vehicles: $499–$799</span>
                    </div>
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
                        href={phoneHref}
                        className="flex items-center gap-4 p-4 rounded-xl border-2 border-primary/30 bg-primary/5 hover:border-primary hover:bg-primary/8 transition-all group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                          <Phone className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground">{phone}</p>
                          <p className="text-muted-foreground text-xs">Fastest way to get a quote — we typically respond within minutes</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                      </a>

                      <a
                        href={emailHref}
                        className="flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary/40 hover:bg-muted/30 transition-all group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                          <Mail className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground">{email}</p>
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

              {/* ── FLEET ── */}
              {tab === "fleet" && (
                <motion.div
                  key="fleet"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="max-w-2xl mx-auto"
                >
                  <div className="rounded-2xl border border-sky-500/25 bg-sky-500/5 p-8 mb-6 text-center">
                    <div className="w-14 h-14 rounded-full bg-sky-500/15 flex items-center justify-center mx-auto mb-5">
                      <Zap className="w-7 h-7 text-sky-500" />
                    </div>
                    <h2 className="text-2xl font-display font-bold mb-3">Fleet & Business Programs</h2>
                    <p className="text-muted-foreground leading-relaxed mb-2">
                      We work with businesses, dealerships, property managers, and anyone running multiple vehicles. Fleet pricing is custom-built around your vehicle count, service frequency, and scheduling needs.
                    </p>
                    <p className="text-muted-foreground text-sm">
                      We'll put together a program that works for your operation — recurring service, on-site detailing at your facility, or flexible scheduling around your fleet's availability.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-6 mb-6">
                    <h3 className="font-display font-bold mb-4">What Fleet Programs Typically Include</h3>
                    <ul className="space-y-2.5">
                      {[
                        "Custom pricing based on vehicle count and service frequency",
                        "Flexible scheduling — we work around your operation",
                        "On-site service at your facility or lot",
                        "Interior, exterior, or full-service depending on your needs",
                        "Consistent quality across every vehicle in your fleet",
                        "Priority scheduling for regular clients",
                      ].map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-sky-500 flex-shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-6 mb-4">
                    <h3 className="font-display font-bold mb-1">Get Your Fleet Quote</h3>
                    <p className="text-muted-foreground text-sm mb-5">Tell us about your fleet and we'll get back to you with a program that fits.</p>
                    <div className="flex flex-col gap-3">
                      <a
                        href={phoneHref}
                        className="flex items-center gap-4 p-4 rounded-xl border-2 border-sky-500/30 bg-sky-500/5 hover:border-sky-500 hover:bg-sky-500/8 transition-all group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-sky-500/15 flex items-center justify-center flex-shrink-0">
                          <Phone className="w-5 h-5 text-sky-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground">{phone}</p>
                          <p className="text-muted-foreground text-xs">Call or text — we'll discuss your fleet needs directly</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-sky-500 transition-colors flex-shrink-0" />
                      </a>
                      <a
                        href={emailHref}
                        className="flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-sky-500/40 hover:bg-muted/30 transition-all group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                          <Mail className="w-5 h-5 text-muted-foreground group-hover:text-sky-500 transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground">{email}</p>
                          <p className="text-muted-foreground text-xs">Send us your vehicle count and we'll build a quote</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-sky-500 transition-colors flex-shrink-0" />
                      </a>
                      <Link href="/contact">
                        <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-sky-500/40 hover:bg-muted/30 transition-all group cursor-pointer">
                          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-sky-500 transition-colors" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground">Contact Form</p>
                            <p className="text-muted-foreground text-xs">Fill out our contact form with your fleet details</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-sky-500 transition-colors flex-shrink-0" />
                        </div>
                      </Link>
                    </div>
                  </div>

                  <p className="text-center text-xs text-muted-foreground">
                    Just need a single vehicle? <button onClick={() => setTab("detailing")} className="text-primary hover:underline font-medium">View our detailing packages →</button>
                  </p>
                </motion.div>
              )}

              {/* ── PAINT CORRECTION QUOTE ── */}
              {tab === "paint" && (
                <motion.div
                  key="paint"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="max-w-2xl mx-auto"
                >
                  <div className="rounded-2xl border border-rose-500/25 bg-rose-500/5 p-8 mb-6 text-center">
                    <div className="w-14 h-14 rounded-full bg-rose-500/15 flex items-center justify-center mx-auto mb-5">
                      <Wrench className="w-7 h-7 text-rose-400" />
                    </div>
                    <h2 className="text-2xl font-display font-bold mb-3">Paint Correction is Custom Work</h2>
                    <p className="text-muted-foreground leading-relaxed mb-2">
                      Every vehicle's paint is different. The level of correction needed depends on the severity of swirl marks, scratches, and oxidation — and how refined a finish you want as the end result.
                    </p>
                    <p className="text-muted-foreground text-sm">
                      We inspect the paint, walk you through what's achievable, and quote based on what's actually needed. No guessing, no surprises.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-6 mb-6">
                    <h3 className="font-display font-bold mb-4">What Paint Correction Addresses</h3>
                    <ul className="space-y-2.5">
                      {[
                        "Swirl marks and buffer trails from improper washing",
                        "Light scratches that haven't penetrated the clear coat",
                        "Water spot etching and environmental contamination",
                        "Oxidation and fading on older paint",
                        "Haze and dullness from sun exposure",
                        "Pre-coating prep — required before any ceramic coating",
                      ].map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-6 mb-4">
                    <h3 className="font-display font-bold mb-1">Get Your Paint Correction Quote</h3>
                    <p className="text-muted-foreground text-sm mb-5">Send us a few photos of your paint or reach out directly — we'll give you a straight assessment.</p>
                    <div className="flex flex-col gap-3">
                      <a
                        href={phoneHref}
                        className="flex items-center gap-4 p-4 rounded-xl border-2 border-rose-500/30 bg-rose-500/5 hover:border-rose-500 hover:bg-rose-500/8 transition-all group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-rose-500/15 flex items-center justify-center flex-shrink-0">
                          <Phone className="w-5 h-5 text-rose-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground">{phone}</p>
                          <p className="text-muted-foreground text-xs">Call or text — we can assess from photos too</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-rose-400 transition-colors flex-shrink-0" />
                      </a>
                      <a
                        href={emailHref}
                        className="flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-rose-500/40 hover:bg-muted/30 transition-all group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                          <Mail className="w-5 h-5 text-muted-foreground group-hover:text-rose-400 transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground">{email}</p>
                          <p className="text-muted-foreground text-xs">Email us with photos for a remote assessment</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-rose-400 transition-colors flex-shrink-0" />
                      </a>
                      <Link href="/contact">
                        <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-rose-500/40 hover:bg-muted/30 transition-all group cursor-pointer">
                          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-rose-400 transition-colors" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground">Contact Form</p>
                            <p className="text-muted-foreground text-xs">Describe your paint issues and we'll follow up with a quote</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-rose-400 transition-colors flex-shrink-0" />
                        </div>
                      </Link>
                    </div>
                  </div>

                  <p className="text-center text-xs text-muted-foreground">
                    Interested in ceramic coating after correction? <button onClick={() => setTab("ceramic")} className="text-amber-500 hover:underline font-medium">View ceramic coating →</button>
                  </p>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Bottom CTA — only when no tab selected or detailing tab */}
      {tab !== "ceramic" && tab !== "fleet" && tab !== "paint" && (
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
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 px-4 sm:px-0">
              {tab === "detailing" ? (
                <Link href="/booking">
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-10 h-12 text-base">
                    Book Your Detail <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              ) : (
                <>
                  <button onClick={() => setTab("detailing")} className="w-full sm:w-auto px-8 h-12 rounded-xl border-2 border-primary text-primary font-semibold text-sm sm:text-base hover:bg-primary hover:text-primary-foreground transition-colors">
                    View Detailing Packages
                  </button>
                  <button onClick={() => setTab("ceramic")} className="w-full sm:w-auto px-8 h-12 rounded-xl border-2 border-amber-500/50 text-amber-500 font-semibold text-sm sm:text-base hover:bg-amber-500/10 transition-colors">
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
