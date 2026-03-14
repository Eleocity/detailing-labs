import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ChevronRight, Star, Shield, Clock, MapPin, Sparkles, CheckCircle2,
  ArrowRight, Car, Droplets, Zap, Award, Phone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { trpc } from "@/lib/trpc";

function useContent(section: string) {
  const { data } = trpc.content.getSiteContent.useQuery({ section });
  const map: Record<string, string> = {};
  if (data) for (const row of data) map[row.key] = row.value ?? "";
  return map;
}

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

const services = [
  {
    icon: <Car className="w-6 h-6" />,
    title: "Interior Detail",
    desc: "Deep clean of every surface — vacuuming, steam cleaning, leather conditioning, and odor elimination.",
    price: "From $149",
  },
  {
    icon: <Droplets className="w-6 h-6" />,
    title: "Exterior Detail",
    desc: "Full exterior wash, clay bar treatment, paint decontamination, and hand-applied wax or sealant.",
    price: "From $129",
  },
  {
    icon: <Sparkles className="w-6 h-6" />,
    title: "Full Detail",
    desc: "The complete Detailing Labs experience — interior and exterior, nothing left untouched.",
    price: "From $249",
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: "Ceramic Coating",
    desc: "Professional-grade ceramic coating for long-term paint protection and a hydrophobic finish.",
    price: "From $799",
  },
];

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
    icon: <Award className="w-5 h-5" />,
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
    text: "Absolutely incredible work. My M4 looks better than the day I drove it off the lot. The team was professional, thorough, and the results speak for themselves.",
  },
  {
    name: "Sarah K.",
    vehicle: "2021 Range Rover",
    rating: 5,
    text: "I've tried other mobile detailers before, but Detailing Labs is on a completely different level. The attention to detail is unmatched. Will never go anywhere else.",
  },
  {
    name: "James R.",
    vehicle: "2023 Porsche Cayenne",
    rating: 5,
    text: "The ceramic coating package was worth every penny. Three months later and the car still looks like it was just detailed. Highly recommend.",
  },
];

const packages = [
  { name: "Essential", price: "$99", time: "2 hrs", popular: false },
  { name: "Premium", price: "$199", time: "4 hrs", popular: true },
  { name: "Signature", price: "$349", time: "6 hrs", popular: false },
];

export default function Home() {
  const hero = useContent("hero");
  const about = useContent("about");
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.06_0.004_280)] via-[oklch(0.08_0.005_280)] to-[oklch(0.10_0.008_295)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_60%_40%,oklch(0.60_0.22_295/0.08),transparent)]" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(oklch(0.60 0.22 295) 1px, transparent 1px), linear-gradient(90deg, oklch(0.60 0.22 295) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        <div className="container relative z-10 pt-24 pb-16">
          <div className="max-w-4xl">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={stagger}
              className="space-y-6"
            >
              <motion.div variants={fadeUp}>
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold tracking-widest uppercase">
                  <Sparkles className="w-3 h-3" />
                  {hero.badge || "Premium Mobile Detailing"}
                </span>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="text-5xl sm:text-6xl lg:text-7xl font-display font-bold leading-[1.05] tracking-tight"
              >
                {hero.headline ? (
                  <span dangerouslySetInnerHTML={{ __html: hero.headline.replace(/(Perfected\.?)/, '<span class="text-gradient">$1</span>') }} />
                ) : (
                  <>
                    Your Vehicle.{" "}
                    <span className="text-gradient">Perfected.</span>
                    <br />
                    At Your Door.
                  </>
                )}
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="text-lg sm:text-xl text-muted-foreground max-w-2xl leading-relaxed"
              >
                {hero.subheadline || "Detailing Labs brings showroom-quality results directly to you. Professional mobile detailing at your home, office, or anywhere that works — no drop-off required."}
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-wrap gap-4 pt-2">
                <Link href="/booking">
                  <Button
                    size="lg"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 h-12 text-base shadow-lg shadow-primary/25"
                  >
                    {hero.cta_primary || "Book Your Detail"}
                    <ChevronRight className="w-5 h-5 ml-1" />
                  </Button>
                </Link>
                <Link href="/services">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-border hover:border-primary/50 hover:bg-primary/5 font-semibold px-8 h-12 text-base"
                  >
                    {hero.cta_secondary || "View Services"}
                  </Button>
                </Link>
              </motion.div>

              <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-6 pt-4">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                  <span className="ml-2 text-sm text-muted-foreground">{hero.trust_reviews || "5.0 · 200+ reviews"}</span>
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

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground/40">
          <span className="text-xs tracking-widest uppercase">Scroll</span>
          <div className="w-px h-12 bg-gradient-to-b from-muted-foreground/40 to-transparent" />
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────────────────────── */}
      <section className="border-y border-border bg-[oklch(0.10_0.008_280)]">
        <div className="container py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: about.vehicles_detailed || "2,500+", label: "Vehicles Detailed" },
              { value: "5.0★", label: "Average Rating" },
              { value: about.years_experience || "8+", label: "Years in Business" },
              { value: about.satisfaction_rate || "99%", label: "Satisfaction Rate" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl font-display font-bold text-primary">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Services ─────────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="text-center mb-14"
          >
            <motion.p variants={fadeUp} className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">
              What We Offer
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl lg:text-5xl font-display font-bold">
              Premium Detailing Services
            </motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground mt-4 max-w-xl mx-auto">
              Every service is performed by certified detailers using professional-grade products — delivered directly to your location.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            {services.map((s) => (
              <motion.div
                key={s.title}
                variants={fadeUp}
                className="group p-6 rounded-xl bg-card border border-border hover:border-primary/40 hover:bg-primary/5 transition-all duration-300 cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4 group-hover:bg-primary/20 transition-colors">
                  {s.icon}
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{s.desc}</p>
                <div className="flex items-center justify-between">
                  <span className="text-primary font-semibold text-sm">{s.price}</span>
                  <Link href="/book">
                    <span className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 cursor-pointer">
                      Book <ArrowRight className="w-3 h-3" />
                    </span>
                  </Link>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <div className="text-center mt-10">
            <Link href="/services">
              <Button variant="outline" className="border-border hover:border-primary/50 hover:bg-primary/5">
                View All Services
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Why Choose Us ────────────────────────────────────────────────── */}
      <section className="py-24 bg-[oklch(0.06_0.004_280)]">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={stagger}
            >
              <motion.p variants={fadeUp} className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">
                Why Detailing Labs
              </motion.p>
              <motion.h2 variants={fadeUp} className="text-4xl lg:text-5xl font-display font-bold mb-6">
                Convenience Without Compromising Quality
              </motion.h2>
              <motion.p variants={fadeUp} className="text-muted-foreground leading-relaxed mb-8">
                We built Detailing Labs around one principle: your time is valuable. That's why we bring everything to you — the equipment, the expertise, and the premium products — so you can enjoy a flawlessly detailed vehicle without disrupting your day.
              </motion.p>
              <motion.div variants={stagger} className="space-y-4">
                {whyUs.map((item) => (
                  <motion.div key={item.title} variants={fadeUp} className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0 mt-0.5">
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">{item.title}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>

            {/* Packages preview */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={stagger}
              className="space-y-4"
            >
              <motion.p variants={fadeUp} className="text-sm text-muted-foreground font-medium uppercase tracking-widest mb-6">
                Popular Packages
              </motion.p>
              {packages.map((pkg) => (
                <motion.div
                  key={pkg.name}
                  variants={fadeUp}
                  className={`p-5 rounded-xl border transition-all ${
                    pkg.popular
                      ? "border-primary/50 bg-primary/8 shadow-lg shadow-primary/10"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display font-semibold text-lg">{pkg.name} Detail</span>
                        {pkg.popular && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 font-semibold">
                            Most Popular
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">{pkg.time} service</span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-display font-bold text-primary">{pkg.price}</div>
                      <Link href="/book">
                        <span className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                          Book →
                        </span>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
              <motion.div variants={fadeUp}>
                <Link href="/pricing">
                  <Button className="w-full mt-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                    See Full Pricing
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="text-center mb-14"
          >
            <motion.p variants={fadeUp} className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">
              Client Reviews
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl lg:text-5xl font-display font-bold">
              What Our Clients Say
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {testimonials.map((t) => (
              <motion.div
                key={t.name}
                variants={fadeUp}
                className="p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-all"
              >
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
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

      {/* ── Service Area ─────────────────────────────────────────────────── */}
      <section className="py-16 bg-[oklch(0.06_0.004_280)]">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 p-8 rounded-2xl border border-border bg-card">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <MapPin className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-bold text-xl">Mobile Service Area</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  We service the Greater Metro Area and surrounding communities. Enter your ZIP code at booking to confirm availability.
                </p>
              </div>
            </div>
            <Link href="/book">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold whitespace-nowrap px-8">
                Check My Area
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────────────────── */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_0%_50%,oklch(0.60_0.22_295/0.15),transparent)]" />
        <div className="container relative z-10 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.h2 variants={fadeUp} className="text-4xl lg:text-6xl font-display font-bold mb-6">
              Ready for a Flawless Finish?
            </motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
              Book your detail online in minutes. We'll handle the rest — right at your door.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-4">
              <Link href="/book">
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-10 h-13 text-base shadow-lg shadow-primary/30"
                >
                  Book Your Detail Now
                  <ChevronRight className="w-5 h-5 ml-1" />
                </Button>
              </Link>
              <a href="tel:5550000000">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-border hover:border-primary/50 font-semibold px-8 h-13 text-base"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Call Us
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
