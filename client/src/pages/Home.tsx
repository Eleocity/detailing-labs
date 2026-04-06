import { useState, useRef, useCallback } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ChevronRight, Star, Shield, Clock, MapPin, Sparkles,
  CheckCircle2, ArrowRight, Phone, Zap, Wrench, Droplets,
  ChevronLeft, HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { trpc } from "@/lib/trpc";
import SEO, { localBusinessSchema, breadcrumbSchema, faqSchema, reviewSchema } from "@/components/SEO";

function useContent(section: string) {
  const { data } = trpc.content.getSiteContent.useQuery({ section });
  const map: Record<string, string> = {};
  if (data) for (const row of data) map[row.key] = row.value ?? "";
  return map;
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55 } },
};
const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

const SERVICE_TOWNS = [
  "Sturtevant", "Racine", "Kenosha", "Mount Pleasant",
  "Caledonia", "Oak Creek", "Wind Point", "Burlington",
];

const pillars = [
  {
    icon: <Droplets className="w-5 h-5" />,
    title: "Fully Self-Contained Rig",
    desc: "We carry our own water tank and run our own generator. We don't need your hose or your outlet — we show up completely independent and ready to work.",
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: "Professional Products. By Name.",
    desc: "Iron X decontamination. Gyeon protection coatings. Professional polishing compounds. Not consumer bottles from the auto parts store.",
  },
  {
    icon: <Star className="w-5 h-5" />,
    title: "Same Team Every Time",
    desc: "Detailing Labs is small by design. You get the same trained technicians on every job — the same people who built this business and stand behind every result.",
  },
  {
    icon: <Clock className="w-5 h-5" />,
    title: "Documented Start to Finish",
    desc: "We photograph before and after every single job, every time. No ambiguity. No 'I didn't notice that before.' You'll see exactly what we did.",
  },
];

const testimonials = [
  {
    name: "Marcus T.",
    city: "Racine, WI",
    vehicle: "2022 BMW M4",
    rating: 5,
    text: "Better than any detail shop I've used. They came to my driveway, didn't rush, and the car looked like it did the day I picked it up. Genuinely impressive.",
  },
  {
    name: "Sarah K.",
    city: "Kenosha, WI",
    vehicle: "2021 Range Rover",
    rating: 5,
    text: "I've had other mobile detailers out before. The difference with Detailing Labs is they actually care about the result — not just getting done and leaving.",
  },
  {
    name: "James R.",
    city: "Caledonia, WI",
    vehicle: "2023 Porsche Cayenne",
    rating: 5,
    text: "Did the ceramic coating six months ago. Still looks perfect. Worth every dollar.",
  },
];

const beforeAfterPairs = [
  {
    label: "Interior Deep Refresh",
    vehicle: "2021 Ford F-150",
    beforeSrc: "",
    afterSrc: "",
  },
  {
    label: "Full Showroom Reset",
    vehicle: "2020 Chevy Tahoe",
    beforeSrc: "",
    afterSrc: "",
  },
  {
    label: "Exterior Decon & Shield",
    vehicle: "2022 BMW 3 Series",
    beforeSrc: "",
    afterSrc: "",
  },
];

const PACKAGE_META: Record<string, { bestFor: string; duration: string }> = {
  "Exterior Decon & Shield": {
    bestFor: "Seasonal refresh, pre-event prep, or maintaining a clean car between full details",
    duration: "~2 hours",
  },
  "Interior Deep Refresh": {
    bestFor: "Used car buyers, pet owners, or anyone whose cabin needs a proper reset",
    duration: "~2 hours",
  },
  "Full Showroom Reset": {
    bestFor: "First-time clients, pre-sale prep, or when you want the full treatment in one visit",
    duration: "~4 hours",
  },
  "The Lab Grade Detail": {
    bestFor: "High-end vehicles, neglected paint, or when only the highest possible result will do",
    duration: "~6–8 hours",
  },
};

const faqs = [
  {
    q: "Do you need access to water or power at my location?",
    a: "No. We carry everything — our own water tank and our own generator. Your hookups stay yours. We operate completely independently.",
  },
  {
    q: "What if I'm not home during the appointment?",
    a: "Most clients aren't. As long as we can access the vehicle and you're reachable by phone if needed, we'll handle it and send you photos when we're done.",
  },
  {
    q: "How long does a detail take?",
    a: "Exterior or interior alone is about 2 hours. Full Showroom Reset is 3–4 hours. The Lab Grade Detail runs 6–8 hours. We'll give you a time window when you book.",
  },
  {
    q: "Do you service my area?",
    a: "We cover all of Racine County, Kenosha County, and the greater Milwaukee metro. Enter your address when you book to confirm we can get to you.",
  },
  {
    q: "What if I'm not happy with the result?",
    a: "Tell us. We'll come back and make it right, no charge. We document every job with before and after photos so there's no ambiguity about what was done.",
  },
  {
    q: "How do I book?",
    a: "Online in about 2 minutes — choose your package, enter your address, pick a date. No calls required. We confirm within a few hours and show up ready.",
  },
];

// ─── Before/After Slider ───────────────────────────────────────────────────
function BeforeAfterSlider({ label, vehicle }: { label: string; vehicle: string }) {
  const [pos, setPos] = useState(50);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const updatePos = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    setPos(pct);
  }, []);

  return (
    <div className="flex flex-col">
      <div
        ref={containerRef}
        className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-border bg-muted/20 select-none cursor-col-resize"
        onMouseDown={(e) => { setDragging(true); updatePos(e.clientX); }}
        onMouseMove={(e) => { if (dragging) updatePos(e.clientX); }}
        onMouseUp={() => setDragging(false)}
        onMouseLeave={() => setDragging(false)}
        onTouchStart={(e) => { setDragging(true); updatePos(e.touches[0].clientX); }}
        onTouchMove={(e) => { updatePos(e.touches[0].clientX); }}
        onTouchEnd={() => setDragging(false)}
      >
        {/* AFTER — full width base */}
        <div className="absolute inset-0 bg-gradient-to-br from-muted/30 to-muted/10 flex items-center justify-center">
          <div className="text-center text-muted-foreground/30">
            <Sparkles className="w-12 h-12 mx-auto mb-2" />
            <p className="text-xs font-medium">After Photo</p>
          </div>
        </div>

        {/* BEFORE — clipped left side */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${pos}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.15_0.005_280)] to-[oklch(0.10_0.003_280)] flex items-center justify-center">
            <div className="text-center text-muted-foreground/30">
              <Wrench className="w-12 h-12 mx-auto mb-2" />
              <p className="text-xs font-medium">Before Photo</p>
            </div>
          </div>
        </div>

        {/* Divider line + handle */}
        <div
          className="absolute top-0 bottom-0 w-px bg-white/70 shadow-lg"
          style={{ left: `${pos}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-xl flex items-center justify-center border border-white/20">
            <div className="flex items-center gap-0.5">
              <ChevronLeft className="w-3 h-3 text-black" />
              <ChevronRight className="w-3 h-3 text-black" />
            </div>
          </div>
        </div>

        {/* Labels */}
        <div className="absolute top-3 left-3 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded-md backdrop-blur-sm">BEFORE</div>
        <div className="absolute top-3 right-3 bg-primary/80 text-white text-xs font-bold px-2 py-1 rounded-md backdrop-blur-sm">AFTER</div>
      </div>
      <div className="mt-3">
        <p className="font-semibold text-sm text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{vehicle}</p>
      </div>
    </div>
  );
}

// ─── FAQ Item ──────────────────────────────────────────────────────────────
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border/60 last:border-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full py-4 text-left gap-4"
      >
        <span className="font-medium text-sm text-foreground">{q}</span>
        <ChevronRight
          className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        />
      </button>
      {open && (
        <p className="text-sm text-muted-foreground leading-relaxed pb-4">{a}</p>
      )}
    </div>
  );
}

export default function Home() {
  const hero    = useContent("hero");
  const about   = useContent("about");
  const contact = useContent("contact");

  const phone     = contact.phone     || "(262) 260-9474";
  const phoneHref = `tel:${phone.replace(/\D/g, "")}`;

  const { data: dbPackages } = trpc.bookings.getPackages.useQuery();
  const packages = (dbPackages ?? []).filter(p => p.isActive).slice(0, 4);

  const VEHICLE_TIERS: Record<string, number> = {
    "Exterior Decon & Shield": 129.99,
    "Interior Deep Refresh":   129.99,
    "Full Showroom Reset":     229.99,
    "The Lab Grade Detail":    449.99,
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <SEO
        title="Mobile Auto Detailing — Racine County, WI | Detailing Labs"
        description="Professional mobile detailing in SE Wisconsin. We bring our own water & power. Serving Racine, Kenosha & Milwaukee County. Book online in 2 minutes."
        canonical="/"
        jsonLd={[
          localBusinessSchema,
          reviewSchema(testimonials.map(t => ({ author: t.name, rating: t.rating, text: t.text }))),
          faqSchema(faqs.map(f => ({ q: f.q, a: f.a }))),
          breadcrumbSchema([{ name: "Home", url: "/" }]),
        ]}
      />

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.06_0.004_280)] via-[oklch(0.08_0.005_280)] to-[oklch(0.10_0.008_295)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_60%_40%,oklch(0.60_0.22_295/0.08),transparent)]" />
        <div className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: `linear-gradient(oklch(0.60 0.22 295) 1px,transparent 1px),linear-gradient(90deg,oklch(0.60 0.22 295) 1px,transparent 1px)`, backgroundSize: "60px 60px" }} />

        <div className="container relative z-10 pt-20 pb-14 sm:pt-24 sm:pb-20">
          <div className="max-w-4xl">
            <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-6">

              <motion.div variants={fadeUp}>
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold tracking-widest uppercase">
                  <MapPin className="w-3 h-3" />
                  {hero.badge || "Mobile Detailing · Racine & Kenosha County, WI"}
                </span>
              </motion.div>

              <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl lg:text-7xl font-display font-bold leading-[1.05] tracking-tight">
                {hero.headline ? (
                  <span dangerouslySetInnerHTML={{ __html: hero.headline }} />
                ) : (
                  <>Professional Mobile Detailing.<br />
                  <span className="text-gradient">We Bring Everything.</span></>
                )}
              </motion.h1>

              <motion.p variants={fadeUp} className="text-lg sm:text-xl text-muted-foreground max-w-2xl leading-relaxed">
                {hero.subheadline || "Detailing Labs is a self-contained mobile detail service in Southeast Wisconsin. We carry our own water, run our own generator, and bring professional-grade products to your driveway. No hookups. No drop-offs. Book online in two minutes."}
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link href="/booking">
                  <Button size="lg" className="bg-primary hover:bg-primary/85 text-primary-foreground font-bold px-10 h-14 text-lg shadow-xl shadow-primary/30 w-full sm:w-auto">
                    {hero.cta_primary || "Book My Appointment"}
                    <ChevronRight className="w-5 h-5 ml-1" />
                  </Button>
                </Link>
                <Link href="/pricing">
                  <span className="flex items-center justify-center gap-1.5 h-14 px-6 text-muted-foreground hover:text-foreground text-sm font-medium transition-colors cursor-pointer">
                    {hero.cta_secondary || "See packages & pricing"}
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </Link>
              </motion.div>

              <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-3 sm:gap-6 pt-2">
                <div className="flex items-center gap-1.5">
                  {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
                  <span className="ml-1 text-sm text-muted-foreground">{hero.trust_reviews || "5.0 · Google Reviews"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  {hero.trust_certified || "Fully insured & self-contained"}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  {hero.trust_availability || "Mon–Sat, 7am–7pm"}
                </div>
              </motion.div>

            </motion.div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground/40">
          <span className="text-xs tracking-widest uppercase">Scroll</span>
          <div className="w-px h-12 bg-gradient-to-b from-muted-foreground/40 to-transparent" />
        </div>
      </section>

      {/* ── STATS BAR ─────────────────────────────────────────────────────── */}
      <section className="border-y border-border bg-[oklch(0.10_0.008_280)]">
        <div className="container py-5 sm:py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: about.vehicles_detailed || "150+", label: "Vehicles Detailed" },
              { value: "5.0★",                             label: "Google Rating" },
              { value: about.years_experience   || "3+",  label: "Years in SE Wisconsin" },
              { value: "Mon–Sat",                          label: "7am – 7pm" },
            ].map(stat => (
              <div key={stat.label}>
                <div className="text-2xl font-display font-bold text-primary">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BEFORE / AFTER ────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-32">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-12">
            <motion.p variants={fadeUp} className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">Real Results</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold">
              This Is What We Do.
            </motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground mt-4 max-w-xl mx-auto text-sm leading-relaxed">
              Every photo is from an actual Detailing Labs appointment in Southeast Wisconsin.
              Drag the slider to compare.
            </motion.p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
            {beforeAfterPairs.map((pair) => (
              <motion.div key={pair.label} variants={fadeUp}>
                <BeforeAfterSlider label={pair.label} vehicle={pair.vehicle} />
              </motion.div>
            ))}
          </motion.div>

          <div className="text-center">
            <Link href="/gallery">
              <Button variant="outline" className="border-border hover:border-primary/50 hover:bg-primary/5">
                See the Full Gallery
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-32 bg-[oklch(0.06_0.004_280)]">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-14">
            <motion.p variants={fadeUp} className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">The Process</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold">
              Three Steps. Zero Hassle.
            </motion.h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto mb-14">
            {[
              {
                n: "01",
                title: "Book online in 2 minutes",
                desc: "Choose your package, enter your address, pick a date. No calls. No back-and-forth. We confirm within a few hours.",
              },
              {
                n: "02",
                title: "We show up fully equipped",
                desc: "Water tank, generator, professional equipment — all ours. You don't move a thing or provide a single hookup.",
              },
              {
                n: "03",
                title: "Your car comes back clean",
                desc: "We photograph before and after every job. You'll see exactly what changed. Then we clean up and leave.",
              },
            ].map((step) => (
              <motion.div key={step.n} variants={fadeUp} className="flex flex-col gap-4">
                <div className="text-5xl font-display font-bold text-primary/20">{step.n}</div>
                <h3 className="font-display font-bold text-xl">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center">
            <Link href="/booking">
              <Button size="lg" className="bg-primary hover:bg-primary/85 text-primary-foreground font-bold px-10 h-14 text-lg shadow-xl shadow-primary/30">
                Book Now — Same-Week Availability
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </Link>
            <p className="text-xs text-muted-foreground mt-3">No credit card required to book.</p>
          </motion.div>
        </div>
      </section>

      {/* ── PACKAGES ──────────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-32">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-12">
            <motion.p variants={fadeUp} className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">Detailing Packages</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold">
              Find Your Package
            </motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground mt-4 max-w-xl mx-auto text-sm">
              Transparent pricing. No surprises at checkout. Prices vary by vehicle size — see exact pricing on the pricing page.
            </motion.p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl mx-auto mb-10">
            {(packages.length > 0 ? packages : [
              { id: 1, name: "Exterior Decon & Shield", price: "129.99", duration: 120, isPopular: false, isActive: true },
              { id: 2, name: "Interior Deep Refresh",   price: "129.99", duration: 120, isPopular: false, isActive: true },
              { id: 3, name: "Full Showroom Reset",     price: "229.99", duration: 240, isPopular: true,  isActive: true },
              { id: 4, name: "The Lab Grade Detail",    price: "449.99", duration: 480, isPopular: false, isActive: true },
            ]).map((pkg) => {
              const meta = PACKAGE_META[pkg.name];
              return (
                <motion.div key={pkg.id} variants={fadeUp}>
                  <Link href="/pricing?tab=detailing">
                    <div className={`group relative flex flex-col gap-4 p-7 rounded-2xl border-2 bg-card hover:bg-primary/4 transition-all cursor-pointer h-full ${pkg.isPopular ? "border-primary/60 shadow-lg shadow-primary/10" : "border-border hover:border-primary/50"}`}>
                      {pkg.isPopular && (
                        <div className="absolute -top-3 left-6">
                          <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold tracking-wide">
                            MOST POPULAR
                          </span>
                        </div>
                      )}
                      <div>
                        <h3 className="font-display font-bold text-xl mb-1">{pkg.name}</h3>
                        {meta && (
                          <p className="text-xs text-primary font-medium">
                            Best for: {meta.bestFor}
                          </p>
                        )}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-display font-bold">From ${VEHICLE_TIERS[pkg.name] ?? Number(pkg.price)}</span>
                        {meta && <span className="text-xs text-muted-foreground">{meta.duration}</span>}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-primary mt-auto">
                        See what's included <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Ceramic anchor */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="max-w-3xl mx-auto p-5 rounded-2xl border border-amber-500/25 bg-amber-500/5 text-center">
            <p className="text-sm text-muted-foreground">
              Need <strong className="text-foreground">ceramic coating</strong> or <strong className="text-foreground">paint correction</strong>? Those are quoted to your vehicle.
              Pricing depends on your paint's condition and the correction needed. Every job is custom-quoted —{" "}
              <Link href="/pricing?tab=ceramic">
                <span className="text-amber-500 font-semibold hover:underline cursor-pointer">Get a free estimate →</span>
              </Link>
            </p>
          </motion.div>

          <div className="text-center mt-8">
            <Link href="/pricing">
              <Button variant="outline" className="border-border hover:border-primary/50 hover:bg-primary/5">
                See All Packages & Exact Pricing
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── WHY DETAILING LABS ────────────────────────────────────────────── */}
      <section className="py-20 sm:py-32 bg-[oklch(0.06_0.004_280)]">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
              <motion.p variants={fadeUp} className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">Why We're Different</motion.p>
              <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-6">
                Not a Franchise.<br />Not a Car Wash.<br />Not a Guy With a Bucket.
              </motion.h2>
              <motion.p variants={fadeUp} className="text-muted-foreground leading-relaxed mb-8">
                {about.body || "We built Detailing Labs around one problem: finding a truly professional mobile detailer in Southeast Wisconsin shouldn't be this hard. We carry our own water tank, run our own generator, and use professional-grade products on every single job. You don't give up your day. We handle it where your car lives."}
              </motion.p>
              <motion.div variants={stagger} className="space-y-4">
                {pillars.map(item => (
                  <motion.div key={item.title} variants={fadeUp} className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0 mt-0.5">
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="font-semibold mb-0.5">{item.title}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="space-y-4">
              <motion.div variants={fadeUp} className="p-7 rounded-2xl border-2 border-primary/50 bg-primary/8 shadow-xl shadow-primary/15">
                <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Serving Southeast Wisconsin</p>
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {SERVICE_TOWNS.map(t => (
                    <span key={t} className="text-xs px-2.5 py-1 rounded-full border border-border bg-muted/30 text-muted-foreground">{t}</span>
                  ))}
                </div>
                <h3 className="font-display font-bold text-xl mb-2">Most clients book same-week.</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-5">
                  Book online in two minutes. We confirm your appointment and show up with everything we need — no hookups, no hassle, no surprises.
                </p>
                <Link href="/booking">
                  <Button className="w-full bg-primary hover:bg-primary/85 text-primary-foreground font-bold h-12 text-base mb-3">
                    Get on the Schedule
                    <ChevronRight className="w-5 h-5 ml-1" />
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button variant="outline" className="w-full border-border hover:border-primary/50 font-medium">
                    View Packages & Pricing
                  </Button>
                </Link>
              </motion.div>

              <motion.div variants={fadeUp} className="p-5 rounded-2xl border border-border bg-card flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Prefer to call?</p>
                  <a href={phoneHref} className="text-primary text-sm hover:underline">{phone}</a>
                </div>
              </motion.div>

              {/* Satisfaction guarantee */}
              <motion.div variants={fadeUp} className="p-5 rounded-2xl border border-border bg-card flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Satisfaction Guarantee</p>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                    If you're not happy with the result, tell us and we'll come back and make it right — no charge.
                  </p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-32">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-14">
            <motion.p variants={fadeUp} className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">Client Reviews</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold">From Clients in Southeast Wisconsin</motion.h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
            {testimonials.map(t => (
              <motion.div key={t.name} variants={fadeUp} className="p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-all flex flex-col">
                <div className="flex items-center gap-0.5 mb-1">
                  {Array.from({ length: t.rating }).map((_, i) => <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
                </div>
                <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1.5">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  via Google
                </p>
                <p className="text-muted-foreground text-sm leading-relaxed mb-5 flex-1">"{t.text}"</p>
                <div>
                  <div className="font-semibold text-sm">{t.name} · {t.city}</div>
                  <div className="text-xs text-muted-foreground">{t.vehicle}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <div className="text-center">
            <a
              href="https://g.page/r/detailing-labs/review"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Read all reviews on Google
              <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </section>

      {/* ── MID-PAGE CTA ──────────────────────────────────────────────────── */}
      <section className="py-14 bg-[oklch(0.06_0.004_280)]">
        <div className="container">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-7 rounded-2xl border border-primary/30 bg-primary/6">
            <div>
              <p className="font-display font-bold text-lg mb-1">Ready to see the difference?</p>
              <p className="text-muted-foreground text-sm">Same-week availability on most dates. Cancel or reschedule up to 24 hours before, no charge.</p>
            </div>
            <Link href="/booking">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold whitespace-nowrap px-7 flex-shrink-0">
                Book My Detail
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-32">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="max-w-2xl mx-auto">
            <motion.div variants={fadeUp} className="text-center mb-10">
              <p className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">Common Questions</p>
              <h2 className="text-3xl sm:text-4xl font-display font-bold">Before You Book</h2>
            </motion.div>
            <motion.div variants={fadeUp} className="divide-y divide-border/60 rounded-2xl border border-border bg-card px-6">
              {faqs.map((faq) => (
                <FAQItem key={faq.q} q={faq.q} a={faq.a} />
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── SERVICE AREA ──────────────────────────────────────────────────── */}
      <section className="py-14 sm:py-20 bg-[oklch(0.06_0.004_280)]">
        <div className="container">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-7 rounded-2xl border border-border bg-card">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg">We Come to You — All of SE Wisconsin</h3>
                <p className="text-muted-foreground text-sm mt-1 max-w-md">
                  Racine County, Kenosha County, and the greater Milwaukee metro. Enter your address at booking to confirm we can reach you.
                </p>
              </div>
            </div>
            <Link href="/booking">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold whitespace-nowrap px-7 flex-shrink-0">
                Check Availability
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_0%_50%,oklch(0.60_0.22_295/0.15),transparent)]" />
        <div className="container relative z-10 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl lg:text-6xl font-display font-bold mb-5">
              Your car is sitting in the<br />driveway right now.
            </motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground text-lg max-w-xl mx-auto mb-2">
              Let's do something about that.
            </motion.p>
            <motion.p variants={fadeUp} className="text-muted-foreground/60 text-sm max-w-xl mx-auto mb-8">
              Same-week availability on most dates. Book in under two minutes — no credit card required.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 px-4 sm:px-0">
              <Link href="/booking">
                <Button size="lg" className="bg-primary hover:bg-primary/85 text-primary-foreground font-bold px-10 h-14 text-lg shadow-xl shadow-primary/30 w-full sm:w-auto">
                  Book My Appointment
                  <ChevronRight className="w-5 h-5 ml-1" />
                </Button>
              </Link>
              <a href={phoneHref}>
                <Button size="lg" variant="outline" className="border-border hover:border-primary/60 font-semibold px-10 h-14 text-lg w-full sm:w-auto">
                  <Phone className="w-4 h-4 mr-2" />
                  {phone}
                </Button>
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
