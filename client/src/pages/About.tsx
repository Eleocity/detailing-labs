import { Link } from "wouter";
import { motion } from "framer-motion";
import { ChevronRight, Shield, MapPin, Sparkles, CheckCircle2, Zap, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SEO, { breadcrumbSchema, localBusinessSchema } from "@/components/SEO";

const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.55 } } };
const stagger = { visible: { transition: { staggerChildren: 0.10 } } };

const values = [
  { icon: <Zap className="w-5 h-5" />,      title: "Self-Contained Operation",   desc: "We bring our own water tank and generator. We don't need access to your utilities — we show up and get to work." },
  { icon: <Shield className="w-5 h-5" />,   title: "Professional Products",      desc: "We use the same products professionals trust on high-end vehicles. Not whatever's cheapest." },
  { icon: <Star className="w-5 h-5" />,     title: "No Shortcuts",               desc: "We don't rush jobs. Every vehicle gets the same level of care regardless of size or service level." },
  { icon: <MapPin className="w-5 h-5" />,   title: "Local and Committed",        desc: "We're based in Sturtevant and focused on Southeast Wisconsin. This is our home market — we're building a reputation here." },
  { icon: <Sparkles className="w-5 h-5" />, title: "Honest Pricing",             desc: "What you see on the pricing page is what you pay. We quote before we start, and we don't add surprise charges." },
];

export default function About() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <SEO
        title="About Detailing Labs — Mobile Detailing in Southeast Wisconsin"
        description="Detailing Labs is a mobile detailing company based in Sturtevant, WI serving Racine County and surrounding areas. Learn about who we are and how we work."
        canonical="/about"
        jsonLd={[
          localBusinessSchema,
          breadcrumbSchema([{ name: "Home", url: "/" }, { name: "About", url: "/about" }]),
        ]}
      />

      {/* Hero */}
      <section className="pt-24 pb-12 sm:pt-28 sm:pb-20 bg-[oklch(0.06_0.004_280)] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_80%_50%,oklch(0.60_0.22_295/0.07),transparent)]" />
        <div className="container relative z-10">
          <div className="max-w-3xl">
            <motion.div initial="hidden" animate="visible" variants={stagger}>
              <motion.p variants={fadeUp} className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">
                Based in Sturtevant, WI
              </motion.p>
              <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-5 leading-tight">
                A Mobile Detailing Service<br />Built for Wisconsin.
              </motion.h1>
              <motion.p variants={fadeUp} className="text-muted-foreground text-lg leading-relaxed">
                We started Detailing Labs because getting a truly professional detail in Southeast Wisconsin shouldn't require a trip to a shop, a half-day of waiting, and hoping they do good work. We built the alternative.
              </motion.p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-12 sm:py-20">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start max-w-5xl mx-auto">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
              <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl font-display font-bold mb-6">
                Why We Started This
              </motion.h2>
              <motion.div variants={fadeUp} className="space-y-5 text-muted-foreground leading-relaxed">
                <p>
                  The idea behind Detailing Labs is straightforward. Too many mobile detailers show up with a bucket and a pressure washer and call it professional. Too many shops rush through jobs and charge accordingly. We wanted to offer something different — a proper, professional-grade detail that comes to you.
                </p>
                <p>
                  We're based in Sturtevant and serve Racine County, Kenosha County, and surrounding areas. We operate a fully self-contained mobile setup — our own water supply, our own power, professional equipment on every job. You don't need to do anything except tell us where to show up.
                </p>
                <p>
                  We've been doing this in Wisconsin for 3 years. We're not a franchise. We're not a side gig. This is our business and our reputation is built one vehicle at a time.
                </p>
              </motion.div>

              <motion.div variants={fadeUp} className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link href="/booking">
                  <Button className="bg-primary hover:bg-primary/90 font-semibold px-7 w-full sm:w-auto">
                    Book a Service <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button variant="outline" className="border-border hover:border-primary/50 px-7 w-full sm:w-auto">
                    Get In Touch
                  </Button>
                </Link>
              </motion.div>
            </motion.div>

            {/* Stats */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="space-y-4">
              <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4">
                {[
                  { value: "100+", label: "Vehicles Detailed" },
                  { value: "5.0★", label: "Average Rating" },
                  { value: "3 yrs", label: "In SE Wisconsin" },
                  { value: "100%", label: "Mobile Service" },
                ].map((stat) => (
                  <div key={stat.label} className="p-5 rounded-xl border border-border bg-card text-center">
                    <div className="text-3xl font-display font-bold text-primary mb-1">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </motion.div>

              <motion.div variants={fadeUp} className="p-5 rounded-xl border border-border bg-card">
                <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Service Area</p>
                <div className="flex flex-wrap gap-1.5">
                  {["Sturtevant", "Racine", "Kenosha", "Mount Pleasant", "Caledonia", "Oak Creek", "Burlington", "Franksville"].map(t => (
                    <span key={t} className="text-xs px-2.5 py-1 rounded-full border border-border bg-background text-muted-foreground">{t}</span>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How we work */}
      <section className="py-12 sm:py-20 bg-[oklch(0.06_0.004_280)]">
        <div className="container">
          <div className="text-center mb-12">
            <p className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">How We Operate</p>
            <h2 className="text-2xl sm:text-3xl font-display font-bold">What Makes Us Different</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {values.map((v) => (
              <motion.div key={v.title} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="p-6 rounded-xl border border-border bg-card hover:border-primary/30 transition-all">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4">
                  {v.icon}
                </div>
                <h3 className="font-display font-semibold text-base mb-2">{v.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* What to expect */}
      <section className="py-12 sm:py-20">
        <div className="container max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-display font-bold mb-8 text-center">What to Expect When You Book</h2>
          <div className="space-y-4">
            {[
              { step: "1", title: "Book online", desc: "Choose your package, enter your address, and pick a date. Takes under two minutes." },
              { step: "2", title: "We confirm",  desc: "You'll get a booking confirmation by email with your appointment details and our contact number." },
              { step: "3", title: "We show up",  desc: "We arrive at your location with all equipment. No water or power hookup needed from you." },
              { step: "4", title: "We deliver",  desc: "We complete the service and you inspect the work. Payment is collected on-site when you're satisfied." },
            ].map(item => (
              <div key={item.step} className="flex items-start gap-4 p-5 rounded-xl border border-border bg-card">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">
                  {item.step}
                </div>
                <div>
                  <h4 className="font-semibold mb-1">{item.title}</h4>
                  <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 sm:py-16 bg-[oklch(0.06_0.004_280)]">
        <div className="container text-center">
          <h2 className="text-2xl sm:text-3xl font-display font-bold mb-4">Ready to See the Difference?</h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto text-sm">
            Book online and we'll handle everything from there. Same-week availability on most dates.
          </p>
          <Link href="/booking">
            <Button className="bg-primary hover:bg-primary/90 font-semibold px-10 h-12">
              Book Your Detail <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
