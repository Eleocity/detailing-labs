import { Link } from "wouter";
import { motion } from "framer-motion";
import { ChevronRight, Shield, Award, MapPin, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SEO, { breadcrumbSchema } from "@/components/SEO";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55 } },
};
const stagger = { visible: { transition: { staggerChildren: 0.10 } } };

const values = [
  { icon: <Shield className="w-6 h-6" />, title: "Uncompromising Quality", desc: "We use only professional-grade products and proven techniques. Every vehicle gets the same meticulous attention to detail." },
  { icon: <MapPin className="w-6 h-6" />, title: "True Mobile Service", desc: "We built our business around your convenience. Our fully equipped mobile units bring the detail shop to your door." },
  { icon: <Award className="w-6 h-6" />, title: "Certified Expertise", desc: "Our detailers are trained and certified. We stay current with the latest techniques, products, and industry standards." },
  { icon: <Sparkles className="w-6 h-6" />, title: "Passion for Perfection", desc: "Detailing isn't just a job for us — it's a craft. We take pride in every vehicle we touch and every result we deliver." },
  { icon: <Users className="w-6 h-6" />, title: "Client-First Approach", desc: "Your satisfaction drives everything we do. We communicate clearly, show up on time, and stand behind our work." },
];

export default function About() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <SEO
        title="About Us — Our Story"
        description="Detailing Labs was founded on one simple belief: your car deserves professional care without the hassle of a trip to the shop. Learn about our team and story."
        canonical="/about"
        jsonLd={breadcrumbSchema([{ name: "Home", url: "/" }, { name: "About", url: "/about" }])}
      />

      {/* Hero */}
      <section className="pt-24 pb-12 sm:pt-28 sm:pb-20 bg-[oklch(0.06_0.004_280)] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_80%_50%,oklch(0.60_0.22_295/0.07),transparent)]" />
        <div className="container relative z-10">
          <div className="max-w-3xl">
            <motion.div initial="hidden" animate="visible" variants={stagger}>
              <motion.p variants={fadeUp} className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">
                Our Story
              </motion.p>
              <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-5">
                Built for the Modern Car Enthusiast
              </motion.h1>
              <motion.p variants={fadeUp} className="text-muted-foreground text-lg leading-relaxed">
                Detailing Labs was founded with a simple mission: deliver premium auto detailing results without the hassle of a traditional shop. We believe your vehicle deserves expert care, and you deserve the convenience of having it done at your door.
              </motion.p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-12 sm:py-20">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
              <motion.h2 variants={fadeUp} className="text-3xl font-display font-bold mb-5">
                Why We Started Detailing Labs
              </motion.h2>
              <motion.div variants={fadeUp} className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  We started Detailing Labs because we saw a gap in the market. Traditional detailing shops required drop-offs, long wait times, and inconvenient scheduling. Car enthusiasts deserved better — and so did everyday drivers who simply wanted their vehicle to look its best.
                </p>
                <p>
                  By building a fully mobile operation, we eliminated the friction. Our team arrives at your location with everything needed to perform a world-class detail — professional-grade equipment, premium products, and the expertise to use them correctly.
                </p>
                <p>
                  We serve clients at their homes, offices, apartment complexes, and anywhere else that works for them. Our goal is simple: make premium detailing accessible, convenient, and consistently excellent.
                </p>
              </motion.div>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="space-y-4">
              <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4">
                {[
                  { value: "500+", label: "Vehicles Detailed" },
                  { value: "5.0★", label: "Average Rating" },
                  { value: "3+", label: "Years Experience" },
                  { value: "100%", label: "Mobile Service" },
                ].map((stat) => (
                  <div key={stat.label} className="p-5 rounded-xl border border-border bg-card text-center">
                    <div className="text-3xl font-display font-bold text-primary mb-1">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-12 sm:py-20 bg-[oklch(0.06_0.004_280)]">
        <div className="container">
          <div className="text-center mb-12">
            <p className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">What We Stand For</p>
            <h2 className="text-3xl font-display font-bold">Our Values</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {values.map((v) => (
              <motion.div
                key={v.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="p-6 rounded-xl border border-border bg-card hover:border-primary/30 transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4">
                  {v.icon}
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{v.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 sm:py-20">
        <div className="container text-center">
          <h2 className="text-3xl font-display font-bold mb-4">Experience the Detailing Labs Difference</h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Book your first detail and see why our clients keep coming back. We're confident you'll love the results.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/book">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8">
                Book Now
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" className="border-border hover:border-primary/50 px-8">
                Get In Touch
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
