import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ChevronRight, Star, Shield, Clock, MapPin, Sparkles,
  CheckCircle2, ArrowRight, Phone,
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

const whyUs = [
  {
    icon: <MapPin className="w-5 h-5" />,
    title: "We Come To You",
    desc: "No drop-off, no waiting rooms. We bring the detail shop to your home, office, or anywhere you need us.",
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: "Premium Products Only",
    desc: "We use professional-grade, paint-safe products that protect and enhance your vehicle's finish.",
  },
  {
    icon: <Star className="w-5 h-5" />,
    title: "Certified Detailers",
    desc: "Our team is trained, certified, and passionate about delivering results that exceed expectations.",
  },
  {
    icon: <Clock className="w-5 h-5" />,
    title: "Flexible Scheduling",
    desc: "Book online 24/7. We work around your schedule — mornings, evenings, and weekends available.",
  },
];

const testimonials = [
  {
    name: "Marcus T.",
    vehicle: "2022 BMW M4",
    rating: 5,
    text: "Absolutely incredible work. My M4 looks better than the day I drove it off the lot. Professional, thorough, and the results speak for themselves.",
  },
  {
    name: "Sarah K.",
    vehicle: "2021 Range Rover",
    rating: 5,
    text: "I've tried other mobile detailers before, but Detailing Labs is on a completely different level. The attention to detail is unmatched.",
  },
  {
    name: "James R.",
    vehicle: "2023 Porsche Cayenne",
    rating: 5,
    text: "The ceramic coating was worth every penny. Three months later and the car still looks like it was just detailed. Highly recommend.",
  },
];

export default function Home() {
  const hero  = useContent("hero");
  const about = useContent("about");
  const contact = useContent("contact");

  const phone     = contact.phone     || "(262) 555-0190";
  const phoneHref = `tel:${phone.replace(/\D/g, "")}`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <SEO
        title="Premium Mobile Auto Detailing — Nashville, TN"
        description="Detailing Labs brings professional auto detailing to your door. Interior, exterior, ceramic coatings & paint correction. Serving Nashville and surrounding areas."
        canonical="/"
        jsonLd={[localBusinessSchema, breadcrumbSchema([{ name: "Home", url: "/" }])]}
      />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.06_0.004_280)] via-[oklch(0.08_0.005_280)] to-[oklch(0.10_0.008_295)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_60%_40%,oklch(0.60_0.22_295/0.08),transparent)]" />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: `linear-gradient(oklch(0.60 0.22 295) 1px,transparent 1px),linear-gradient(90deg,oklch(0.60 0.22 295) 1px,transparent 1px)`, backgroundSize: "60px 60px" }} />

        <div className="container relative z-10 pt-24 pb-20">
          <div className="max-w-4xl">
            <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-6">

              <motion.div variants={fadeUp}>
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold tracking-widest uppercase">
                  <Sparkles className="w-3 h-3" />
                  {hero.badge || "Premium Mobile Detailing — Wisconsin"}
                </span>
              </motion.div>

              <motion.h1 variants={fadeUp} className="text-5xl sm:text-6xl lg:text-7xl font-display font-bold leading-[1.05] tracking-tight">
                {hero.headline ? (
                  <span dangerouslySetInnerHTML={{ __html: hero.headline }} />
                ) : (
                  <>Your Vehicle.{" "}<span className="text-gradient">Perfected.</span><br />At Your Door.</>
                )}
              </motion.h1>

              <motion.p variants={fadeUp} className="text-lg sm:text-xl text-muted-foreground max-w-2xl leading-relaxed">
                {hero.subheadline || "Detailing Labs brings showroom-quality results directly to you. Professional mobile detailing — at your home, office, or anywhere that works. No drop-off. No hassle."}
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-wrap gap-4 pt-2">
                <Link href="/booking">
                  <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 h-12 text-base shadow-lg shadow-primary/25">
                    {hero.cta_primary || "Book Your Detail"}
                    <ChevronRight className="w-5 h-5 ml-1" />
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button size="lg" variant="outline" className="border-border hover:border-primary/50 hover:bg-primary/5 font-semibold px-8 h-12 text-base">
                    {hero.cta_secondary || "View Packages"}
                  </Button>
                </Link>
              </motion.div>

              <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-5 pt-2">
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
                  <span className="ml-2 text-sm text-muted-foreground">{hero.trust_reviews || "5.0 · 150+ five-star reviews"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  {hero.trust_certified || "Fully insured & certified"}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  {hero.trust_availability || "Same-week availability"}
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
        <div className="container py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: about.vehicles_detailed || "1,000+", label: "Vehicles Detailed" },
              { value: "5.0★",                               label: "Average Rating" },
              { value: about.years_experience || "5+",       label: "Years in Business" },
              { value: about.satisfaction_rate || "99%",     label: "Satisfaction Rate" },
            ].map(stat => (
              <div key={stat.label}>
                <div className="text-2xl font-display font-bold text-primary">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICES ─────────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="text-center mb-14">
            <motion.p variants={fadeUp} className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">What We Offer</motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl lg:text-5xl font-display font-bold">Premium Detailing Services</motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground mt-4 max-w-xl mx-auto">
              Every service is performed by certified detailers using professional-grade products — delivered directly to your location.
            </motion.p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl mx-auto">

            {/* Detailing card */}
            <motion.div variants={fadeUp}>
              <Link href="/pricing?tab=detailing">
                <div className="group flex flex-col gap-5 p-7 rounded-2xl border-2 border-border bg-card hover:border-primary/60 hover:bg-primary/4 transition-all cursor-pointer h-full">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display font-bold text-xl mb-2">Detailing</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Interior, exterior, and full-detail packages. Transparent upfront pricing — book online in minutes.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                    View packages <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            </motion.div>

            {/* Ceramic card */}
            <motion.div variants={fadeUp}>
              <Link href="/pricing?tab=ceramic">
                <div className="group flex flex-col gap-5 p-7 rounded-2xl border-2 border-border bg-card hover:border-amber-500/50 hover:bg-amber-500/3 transition-all cursor-pointer h-full">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                    <Shield className="w-6 h-6 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display font-bold text-xl mb-2">Ceramic Coating</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Long-term paint protection custom-quoted to your vehicle. Call or email us for a no-pressure quote.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-500">
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

      {/* ── WHY CHOOSE US ────────────────────────────────────────────────── */}
      <section className="py-24 bg-[oklch(0.06_0.004_280)]">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
              <motion.p variants={fadeUp} className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">Why Detailing Labs</motion.p>
              <motion.h2 variants={fadeUp} className="text-4xl lg:text-5xl font-display font-bold mb-6">
                Convenience Without Compromising Quality
              </motion.h2>
              <motion.p variants={fadeUp} className="text-muted-foreground leading-relaxed mb-8">
                {about.body || "We built Detailing Labs around one principle: your time is valuable. We bring the equipment, the expertise, and the premium products directly to you — so you can enjoy a showroom-quality vehicle without disrupting your day."}
              </motion.p>
              <motion.div variants={stagger} className="space-y-4">
                {whyUs.map(item => (
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

            {/* Right col — CTA block */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="space-y-5">
              <motion.p variants={fadeUp} className="text-sm text-muted-foreground font-medium uppercase tracking-widest">
                Ready to Book?
              </motion.p>

              <motion.div variants={fadeUp} className="p-7 rounded-2xl border-2 border-primary/50 bg-primary/8 shadow-xl shadow-primary/15">
                <h3 className="font-display font-bold text-2xl mb-2">Book Online in Minutes</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                  Choose your service, pick a date, tell us where to go. We'll show up with everything needed — no water or power hookup required.
                </p>
                <Link href="/booking">
                  <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-11 text-base mb-3">
                    Book Your Detail
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

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-14">
            <motion.p variants={fadeUp} className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">Client Reviews</motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl lg:text-5xl font-display font-bold">What Our Clients Say</motion.h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map(t => (
              <motion.div key={t.name} variants={fadeUp} className="p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-all">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed mb-5 italic">"{t.text}"</p>
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
      <section className="py-16 bg-[oklch(0.06_0.004_280)]">
        <div className="container">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-7 rounded-2xl border border-border bg-card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg">Mobile Service Area</h3>
                <p className="text-muted-foreground text-sm mt-0.5">
                  Serving the greater Nashville area and surrounding communities. Enter your ZIP at booking to confirm availability.
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
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_0%_50%,oklch(0.60_0.22_295/0.15),transparent)]" />
        <div className="container relative z-10 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.h2 variants={fadeUp} className="text-4xl lg:text-6xl font-display font-bold mb-6">
              Ready for a Flawless Finish?
            </motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
              Book your detail online in minutes. We'll handle the rest — right at your door.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-4">
              <Link href="/booking">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-10 h-12 text-base shadow-lg shadow-primary/30">
                  Book Your Detail Now
                  <ChevronRight className="w-5 h-5 ml-1" />
                </Button>
              </Link>
              <a href={phoneHref}>
                <Button size="lg" variant="outline" className="border-border hover:border-primary/50 font-semibold px-8 h-12 text-base">
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
