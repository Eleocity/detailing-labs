import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ChevronRight, Star, Shield, Clock, MapPin, Sparkles,
  CheckCircle2, ArrowRight, Phone, Zap, Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { trpc } from "@/lib/trpc";
import SEO, { localBusinessSchema, breadcrumbSchema } from "@/components/SEO";

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
    icon: <Zap className="w-5 h-5" />,
    title: "We Bring Everything",
    desc: "Water tank, generator, professional equipment. We operate independently — no hookup to your home required.",
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: "Professional Products Only",
    desc: "We use products chosen for protection and results, not cost. The same quality used on high-end vehicles.",
  },
  {
    icon: <Star className="w-5 h-5" />,
    title: "Trained Technicians",
    desc: "Every job is done by someone who takes this seriously. We don't cut corners or rush.",
  },
  {
    icon: <Clock className="w-5 h-5" />,
    title: "Flexible Scheduling",
    desc: "Mon–Sat, 7am–7pm. We work around your schedule — not the other way around.",
  },
];

const testimonials = [
  {
    name: "Marcus T.",
    vehicle: "2022 BMW M4",
    rating: 5,
    text: "Better than any detail shop I've used. They came to my driveway, didn't rush, and the car looked like it did the day I picked it up. Genuinely impressive.",
  },
  {
    name: "Sarah K.",
    vehicle: "2021 Range Rover",
    rating: 5,
    text: "I've had other mobile detailers out before. The difference with Detailing Labs is they actually care about the result — not just getting done and leaving.",
  },
  {
    name: "James R.",
    vehicle: "2023 Porsche Cayenne",
    rating: 5,
    text: "Did the ceramic coating six months ago. Still looks perfect. Worth every dollar.",
  },
];

export default function Home() {
  const hero    = useContent("hero");
  const about   = useContent("about");
  const contact = useContent("contact");

  const phone     = contact.phone     || "(262) 260-9474";
  const phoneHref = `tel:${phone.replace(/\D/g, "")}`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <SEO
        title="Mobile Auto Detailing — Racine County, WI | Detailing Labs"
        description="Detailing Labs is a professional mobile detailing service in Southeast Wisconsin. Serving Racine County, Kenosha, and surrounding areas. Interior, exterior, ceramic coating. We bring everything — book online."
        canonical="/"
        jsonLd={[localBusinessSchema, breadcrumbSchema([{ name: "Home", url: "/" }])]}
      />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.06_0.004_280)] via-[oklch(0.08_0.005_280)] to-[oklch(0.10_0.008_295)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_60%_40%,oklch(0.60_0.22_295/0.08),transparent)]" />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: `linear-gradient(oklch(0.60 0.22 295) 1px,transparent 1px),linear-gradient(90deg,oklch(0.60 0.22 295) 1px,transparent 1px)`, backgroundSize: "60px 60px" }} />

        <div className="container relative z-10 pt-20 pb-14 sm:pt-24 sm:pb-20">
          <div className="max-w-4xl">
            <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-6">

              <motion.div variants={fadeUp}>
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold tracking-widest uppercase">
                  <MapPin className="w-3 h-3" />
                  {hero.badge || "Mobile Detailing · Racine County, WI"}
                </span>
              </motion.div>

              <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl lg:text-7xl font-display font-bold leading-[1.05] tracking-tight">
                {hero.headline ? (
                  <span dangerouslySetInnerHTML={{ __html: hero.headline }} />
                ) : (
                  <>Your Car Deserves<br />Better Than a{" "}
                  <span className="text-gradient">Drive-Through.</span></>
                )}
              </motion.h1>

              <motion.p variants={fadeUp} className="text-lg sm:text-xl text-muted-foreground max-w-2xl leading-relaxed">
                {hero.subheadline || "Detailing Labs is a professional mobile detailing service based in Southeast Wisconsin. We bring a fully equipped setup — our own water, our own power — directly to your driveway. No drop-off. No waiting rooms. Just results."}
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 pt-2 w-full sm:w-auto">
                <Link href="/booking">
                  <Button size="lg" className="bg-primary hover:bg-primary/85 text-primary-foreground font-bold px-10 h-14 text-lg shadow-xl shadow-primary/30 w-full sm:w-auto">
                    {hero.cta_primary || "Book Your Appointment"}
                    <ChevronRight className="w-5 h-5 ml-1" />
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button size="lg" variant="outline" className="border-border hover:border-primary/60 hover:bg-primary/8 font-semibold px-10 h-14 text-lg w-full sm:w-auto">
                    {hero.cta_secondary || "See What's Included"}
                  </Button>
                </Link>
              </motion.div>

              <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-3 sm:gap-5 pt-2">
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
                  <span className="ml-2 text-sm text-muted-foreground">{hero.trust_reviews || "5.0 · Racine County"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  {hero.trust_certified || "Fully insured & equipped"}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  {hero.trust_availability || "Mon–Sat, 9am–5pm"}
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

      {/* ── STATS BAR ────────────────────────────────────────────────────── */}
      <section className="border-y border-border bg-[oklch(0.10_0.008_280)]">
        <div className="container py-5 sm:py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: about.vehicles_detailed || "100+", label: "Vehicles Detailed" },
              { value: "5.0★",                              label: "Average Rating" },
              { value: about.years_experience   || "3+",   label: "Years in SE Wisconsin" },
              { value: "Mon–Sat",                           label: "7am – 7pm" },
            ].map(stat => (
              <div key={stat.label}>
                <div className="text-2xl font-display font-bold text-primary">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY — lead with differentiation before services ──────────────── */}
      <section className="py-20 sm:py-32">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
              <motion.p variants={fadeUp} className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">Why We're Different</motion.p>
              <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-6">
                Not a Franchise.<br />Not a Car Wash.
              </motion.h2>
              <motion.p variants={fadeUp} className="text-muted-foreground leading-relaxed mb-8">
                {about.body || "We designed Detailing Labs around one problem: finding a truly professional detailer in Southeast Wisconsin shouldn't be hard. We carry our own water tank, run our own generator, and use professional-grade products on every single job. You don't give up your day. You don't drive anywhere. We handle it where your car lives."}
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

            {/* Book CTA block */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="space-y-4">
              <motion.div variants={fadeUp} className="p-7 rounded-2xl border-2 border-primary/50 bg-primary/8 shadow-xl shadow-primary/15">
                <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Serving Southeast Wisconsin</p>
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {SERVICE_TOWNS.map(t => (
                    <span key={t} className="text-xs px-2.5 py-1 rounded-full border border-border bg-muted/30 text-muted-foreground">{t}</span>
                  ))}
                </div>
                <h3 className="font-display font-bold text-xl mb-2">Ready to book?</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-5">
                  Book online in two minutes. We'll confirm your appointment and show up ready — water, power, and everything else included.
                </p>
                <Link href="/booking">
                  <Button className="w-full bg-primary hover:bg-primary/85 text-primary-foreground font-bold h-12 text-base mb-3">
                    Schedule Your Detail
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
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── SERVICES ─────────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-32 bg-[oklch(0.06_0.004_280)]">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="text-center mb-12">
            <motion.p variants={fadeUp} className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">What We Do</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold">
              Four Services. Done Right.
            </motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground mt-4 max-w-xl mx-auto text-sm">
              No upsells you didn't ask for. No mystery pricing. Just focused, professional work on your vehicle.
            </motion.p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
            <motion.div variants={fadeUp}>
              <Link href="/pricing?tab=detailing">
                <div className="group flex flex-col gap-5 p-7 rounded-2xl border-2 border-border bg-card hover:border-primary/60 hover:bg-primary/4 transition-all cursor-pointer h-full">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display font-bold text-xl mb-2">Detailing</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Interior, exterior, and full-service packages. Transparent pricing from $129. Book online and we show up ready.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                    View packages <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Link href="/pricing?tab=ceramic">
                <div className="group flex flex-col gap-5 p-7 rounded-2xl border-2 border-border bg-card hover:border-amber-500/50 hover:bg-amber-500/3 transition-all cursor-pointer h-full">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                    <Shield className="w-6 h-6 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display font-bold text-xl mb-2">Ceramic Coating</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Custom-quoted to your vehicle. Long-term paint protection, professionally applied.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-500">
                    Get a quote <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            </motion.div>

            {/* Fleet */}
            <motion.div variants={fadeUp}>
              <Link href="/pricing?tab=fleet">
                <div className="group flex flex-col gap-5 p-7 rounded-2xl border-2 border-border bg-card hover:border-sky-500/50 hover:bg-sky-500/3 transition-all cursor-pointer h-full">
                  <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center group-hover:bg-sky-500/20 transition-colors">
                    <Zap className="w-6 h-6 text-sky-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display font-bold text-xl mb-2">Fleet Services</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Multiple vehicles? Custom programs for businesses, dealerships, and property managers.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-sky-500">
                    Get a quote <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            </motion.div>

            {/* Paint Correction */}
            <motion.div variants={fadeUp}>
              <Link href="/pricing?tab=paint">
                <div className="group flex flex-col gap-5 p-7 rounded-2xl border-2 border-border bg-card hover:border-rose-500/50 hover:bg-rose-500/3 transition-all cursor-pointer h-full">
                  <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center group-hover:bg-rose-500/20 transition-colors">
                    <Wrench className="w-6 h-6 text-rose-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display font-bold text-xl mb-2">Paint Correction</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Remove swirl marks, scratches, and oxidation. Quoted based on your paint's condition.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-rose-400">
                    Get a quote <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            </motion.div>
          </motion.div>

          <div className="text-center mt-10">
            <Link href="/pricing">
              <Button variant="outline" className="border-border hover:border-primary/50 hover:bg-primary/5">
                See All Packages & Pricing
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-32">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-14">
            <motion.p variants={fadeUp} className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">What Clients Say</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold">Real Results. Real Reviews.</motion.h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {testimonials.map(t => (
              <motion.div key={t.name} variants={fadeUp} className="p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-all">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed mb-5">"{t.text}"</p>
                <div>
                  <div className="font-semibold text-sm">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.vehicle}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── SERVICE AREA ─────────────────────────────────────────────────── */}
      <section className="py-14 sm:py-20 bg-[oklch(0.06_0.004_280)]">
        <div className="container">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-7 rounded-2xl border border-border bg-card">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg">We Come to You — Anywhere in SE Wisconsin</h3>
                <p className="text-muted-foreground text-sm mt-1 max-w-md">
                  If you're in Racine County, Kenosha County, or the greater Milwaukee metro, we can almost certainly get to you. Enter your address when you book to confirm.
                </p>
              </div>
            </div>
            <Link href="/booking">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold whitespace-nowrap px-7">
                Check Availability
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_0%_50%,oklch(0.60_0.22_295/0.15),transparent)]" />
        <div className="container relative z-10 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl lg:text-6xl font-display font-bold mb-5">
              Stop Settling for Average.
            </motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
              Your car is worth better than a gas station detail. Book online in under two minutes — we'll take it from there.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 px-4 sm:px-0">
              <Link href="/booking">
                <Button size="lg" className="bg-primary hover:bg-primary/85 text-primary-foreground font-bold px-10 h-14 text-lg shadow-xl shadow-primary/30 w-full sm:w-auto">
                  Book Your Appointment
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
