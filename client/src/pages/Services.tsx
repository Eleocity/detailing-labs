import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ChevronRight, CheckCircle2, Sparkles, Shield, Wrench, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SEO, { localBusinessSchema, serviceSchema, breadcrumbSchema } from "@/components/SEO";
import { PACKAGES, ADD_ONS } from "@/lib/pricing";

const fadeUp = {
  hidden:   { opacity: 0, y: 24 },
  visible:  { opacity: 1, y: 0, transition: { duration: 0.55 } },
};
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

// Services not in the core packages (quoted work)
const SPECIALTY_SERVICES = [
  {
    icon:  <Shield className="w-6 h-6 text-amber-400" />,
    name:  "Ceramic Coating",
    color: "amber",
    desc:  "Professional ceramic coating for multi-year paint protection. Every job is assessed and custom-quoted — pricing depends on vehicle size, paint condition, and correction level needed.",
    items: [
      "Full paint decontamination & prep",
      "Paint correction (1 or 2 stage)",
      "Professional-grade ceramic application",
      "Multi-year protection warranty",
      "Before & after photo documentation",
    ],
    cta:  "Get a Ceramic Quote",
    href: "/pricing?tab=ceramic",
    price: "Custom quoted",
  },
  {
    icon:  <Wrench className="w-6 h-6 text-rose-400" />,
    name:  "Paint Correction",
    color: "rose",
    desc:  "Remove swirl marks, scratches, and oxidation. Quoted after assessing your paint's condition and your target level of finish — no guessing, no surprises.",
    items: [
      "Single-stage correction (swirl & light scratch removal)",
      "Multi-stage correction (deeper defect removal)",
      "Water spot & oxidation treatment",
      "Pre-coating prep (required before ceramic)",
    ],
    cta:  "Get a Paint Quote",
    href: "/pricing?tab=paint",
    price: "Custom quoted",
  },
  {
    icon:  <Zap className="w-6 h-6 text-sky-400" />,
    name:  "Fleet Services",
    color: "sky",
    desc:  "Custom programs for businesses, dealerships, and property managers. Pricing and scheduling built around your vehicle count and operational needs.",
    items: [
      "Custom pricing by vehicle count & frequency",
      "Flexible on-site scheduling at your facility",
      "Interior, exterior, or full-service programs",
      "Priority scheduling for recurring clients",
    ],
    cta:  "Get a Fleet Quote",
    href: "/pricing?tab=fleet",
    price: "Custom quoted",
  },
];

const COLOR_MAP: Record<string, string> = {
  amber: "border-amber-500/30 bg-amber-500/5",
  rose:  "border-rose-500/30 bg-rose-500/5",
  sky:   "border-sky-500/30 bg-sky-500/5",
};
const CTA_COLOR: Record<string, string> = {
  amber: "text-amber-400 hover:text-amber-300",
  rose:  "text-rose-400 hover:text-rose-300",
  sky:   "text-sky-400 hover:text-sky-300",
};

export default function Services() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <SEO
        title="Mobile Detailing Services | Detailing Labs — Racine County, WI"
        description="Professional mobile detailing services in SE Wisconsin. Interior, exterior & full-service packages. Serving Racine County, Kenosha & surrounding areas."
        canonical="/services"
        jsonLd={[
          localBusinessSchema,
          serviceSchema("Mobile Auto Detailing", "Professional interior and exterior auto detailing services delivered to your location in Racine County, WI.", "129"),
          serviceSchema("Ceramic Coating", "Professional ceramic coating application for long-term paint protection. Custom quoted per vehicle."),
          serviceSchema("Paint Correction", "Remove swirl marks, scratches, and oxidation. Custom quoted based on paint condition."),
          breadcrumbSchema([{ name: "Home", url: "/" }, { name: "Services", url: "/services" }]),
        ]}
      />

      {/* Hero */}
      <section className="pt-24 pb-14 sm:pt-32 sm:pb-20 bg-[oklch(0.06_0.004_280)] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_30%_50%,oklch(0.60_0.22_295/0.06),transparent)]" />
        <div className="container relative z-10 text-center">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.p variants={fadeUp} className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">
              What We Do
            </motion.p>
            <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-5">
              Every Service We Offer
            </motion.h1>
            <motion.p variants={fadeUp} className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
              Fully self-contained mobile detailing — we bring water, power, and professional-grade products to your location.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/booking">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 h-12">
                  Book Now <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="outline" className="border-border hover:border-primary/50 h-12 px-8">
                  See Pricing
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── CORE DETAILING PACKAGES ─────────────────────────────────────── */}
      <section className="py-16 sm:py-24">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-12">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold tracking-widest uppercase mb-4">
              <Sparkles className="w-3.5 h-3.5" /> Detailing Packages
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-display font-bold mb-4">
              Transparent Pricing. No Surprises.
            </motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground max-w-xl mx-auto">
              All four packages are available online. Select your vehicle size on the pricing page to see your exact price.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto mb-10">
            {PACKAGES.map((pkg) => (
              <motion.div
                key={pkg.slug}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className={`relative flex flex-col rounded-2xl border p-6 transition-all ${
                  pkg.isPopular
                    ? "border-primary/50 bg-primary/8 shadow-xl shadow-primary/10"
                    : "border-border bg-card hover:border-primary/30"
                }`}
              >
                {pkg.isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold tracking-wide">
                      MOST POPULAR
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="font-display font-bold text-lg mb-1 leading-tight">{pkg.name}</h3>
                  <p className="text-xs text-primary font-medium leading-snug">Best for: {pkg.bestFor}</p>
                </div>

                <div className="mb-4">
                  <p className="text-3xl font-display font-bold">From ${pkg.pricing.sedan}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{pkg.duration} · price varies by vehicle size</p>
                </div>

                <ul className="space-y-2 mb-6 flex-1">
                  {pkg.features.slice(0, 4).map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                  {pkg.features.length > 4 && (
                    <li className="text-xs text-muted-foreground pl-5">+ {pkg.features.length - 4} more</li>
                  )}
                </ul>

                <Link href={`/booking`}>
                  <Button
                    className={`w-full text-sm font-semibold ${pkg.isPopular ? "bg-primary hover:bg-primary/90 text-primary-foreground" : ""}`}
                    variant={pkg.isPopular ? "default" : "outline"}
                    size="sm"
                  >
                    Book {pkg.name.split(" ")[0]} <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="text-center">
            <Link href="/pricing">
              <Button variant="outline" className="border-border hover:border-primary/50">
                See full pricing by vehicle size <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── SPECIALTY / QUOTED SERVICES ─────────────────────────────────── */}
      <section className="py-16 sm:py-24 bg-[oklch(0.06_0.004_280)]">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-12">
            <motion.p variants={fadeUp} className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">Specialty Services</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-display font-bold mb-4">Custom-Quoted Work</motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground max-w-xl mx-auto">
              These services are assessed and quoted per vehicle — because every paint and every fleet is different.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {SPECIALTY_SERVICES.map((svc) => (
              <motion.div
                key={svc.name}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className={`flex flex-col rounded-2xl border p-6 ${COLOR_MAP[svc.color]}`}
              >
                <div className="flex items-center gap-3 mb-4">
                  {svc.icon}
                  <h3 className="font-display font-bold text-lg">{svc.name}</h3>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed mb-5">{svc.desc}</p>
                <ul className="space-y-2 mb-6 flex-1">
                  {svc.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 opacity-60" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{svc.price}</span>
                  <Link href={svc.href}>
                    <span className={`flex items-center gap-1 text-sm font-semibold cursor-pointer transition-colors ${CTA_COLOR[svc.color]}`}>
                      {svc.cta} <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ADD-ONS ──────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24">
        <div className="container max-w-4xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-10">
            <motion.p variants={fadeUp} className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">Add-Ons</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl font-display font-bold mb-4">Customize Your Detail</motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground text-sm max-w-lg mx-auto">
              Added during booking — priced as shown below.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {ADD_ONS.map((addon) => (
              <motion.div
                key={addon.name}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="p-4 rounded-xl border border-border bg-card text-center hover:border-primary/30 transition-all"
              >
                <p className="text-xl font-display font-bold text-primary mb-1">${addon.price}</p>
                <p className="text-sm font-medium text-foreground mb-1">{addon.name}</p>
                <p className="text-xs text-muted-foreground leading-tight">{addon.description}</p>
              </motion.div>
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Add-ons are selected during the booking flow after you've chosen your package.
          </p>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
      <section className="py-16 bg-[oklch(0.06_0.004_280)]">
        <div className="container text-center">
          <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
            Ready to Book?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto text-sm">
            Pick your package online, enter your address, choose a date. We confirm and show up ready — fully equipped.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/booking">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-10 h-12">
                Book Your Detail <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" className="border-border hover:border-primary/50 h-12 px-8">
                View All Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
