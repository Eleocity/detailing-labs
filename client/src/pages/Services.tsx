import { Link } from "wouter";
import { motion } from "framer-motion";
import { ChevronRight, CheckCircle2, Car, Droplets, Sparkles, Zap, Shield, Wrench, RefreshCw, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55 } },
};
const stagger = { visible: { transition: { staggerChildren: 0.10 } } };

const services = [
  {
    icon: <Car className="w-7 h-7" />,
    title: "Interior Detail",
    category: "Interior",
    price: "From $149",
    duration: "3 hours",
    description:
      "A comprehensive interior restoration that leaves every surface spotless. We vacuum, steam clean, and condition every inch of your cabin.",
    includes: [
      "Full interior vacuum (seats, carpets, trunk)",
      "Steam cleaning of all surfaces",
      "Leather cleaning & conditioning",
      "Dashboard, console & door panel wipe-down",
      "Window cleaning (interior)",
      "Odor elimination treatment",
      "Air vent detailing",
      "Floor mat deep clean",
    ],
  },
  {
    icon: <Droplets className="w-7 h-7" />,
    title: "Exterior Detail",
    category: "Exterior",
    price: "From $129",
    duration: "2.5 hours",
    description:
      "A thorough exterior treatment that removes contamination, restores paint clarity, and protects your finish.",
    includes: [
      "Hand wash & rinse",
      "Wheel & tire deep clean",
      "Clay bar decontamination",
      "Paint surface prep",
      "Hand-applied wax or sealant",
      "Window cleaning (exterior)",
      "Tire dressing",
      "Door jamb cleaning",
    ],
  },
  {
    icon: <Sparkles className="w-7 h-7" />,
    title: "Full Detail",
    category: "Full",
    price: "From $249",
    duration: "5 hours",
    description:
      "Our most comprehensive single-visit service. Interior and exterior combined for a complete vehicle transformation.",
    includes: [
      "Everything in Interior Detail",
      "Everything in Exterior Detail",
      "Paint decontamination",
      "Premium carnauba wax",
      "Headlight cleaning",
      "Detailed photo documentation",
    ],
    featured: true,
  },
  {
    icon: <Shield className="w-7 h-7" />,
    title: "Paint Decontamination",
    category: "Paint",
    price: "From $99",
    duration: "1.5 hours",
    description:
      "Remove iron fallout, industrial fallout, and bonded contaminants from your paint surface. Essential prep before coatings or wax.",
    includes: [
      "Iron fallout remover treatment",
      "Clay bar decontamination",
      "Surface inspection",
      "Paint prep for coating or wax",
      "Rinse & dry",
    ],
  },
  {
    icon: <Zap className="w-7 h-7" />,
    title: "Ceramic Coating",
    category: "Coating",
    price: "From $799",
    duration: "8+ hours",
    description:
      "Professional-grade ceramic coating for long-term paint protection, hydrophobic properties, and a deep, glossy finish that lasts years.",
    includes: [
      "Full paint decontamination",
      "1-stage paint correction",
      "Professional ceramic coating application",
      "2-year protection warranty",
      "Hydrophobic finish",
      "UV protection",
      "Before & after photo documentation",
      "Maintenance guide",
    ],
  },
  {
    icon: <Wrench className="w-7 h-7" />,
    title: "Wax / Sealant",
    category: "Paint",
    price: "From $89",
    duration: "1 hour",
    description:
      "Hand-applied premium carnauba wax or synthetic paint sealant for a rich, deep shine and lasting protection.",
    includes: [
      "Surface prep & wipe-down",
      "Hand-applied carnauba wax or sealant",
      "Buff to high gloss",
      "Trim protection",
      "Final inspection",
    ],
  },
  {
    icon: <RefreshCw className="w-7 h-7" />,
    title: "Maintenance Detail",
    category: "Maintenance",
    price: "From $79",
    duration: "1.5 hours",
    description:
      "Keep your vehicle looking its best between full details. A quick but thorough refresh for regular upkeep.",
    includes: [
      "Exterior hand wash & dry",
      "Interior vacuum",
      "Dashboard & console wipe",
      "Window cleaning",
      "Tire dressing",
      "Quick inspection",
    ],
  },
  {
    icon: <Plus className="w-7 h-7" />,
    title: "Add-On Services",
    category: "Add-Ons",
    price: "From $19",
    duration: "Varies",
    description:
      "Enhance any service with our premium add-ons. Customize your detail to address specific needs.",
    includes: [
      "Headlight restoration — $59",
      "Engine bay detail — $79",
      "Ozone odor treatment — $69",
      "Pet hair removal — $49",
      "Fabric protection — $49",
      "Rain-X treatment — $29",
      "Paint sealant upgrade — $39",
    ],
  },
];

export default function Services() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      {/* Hero */}
      <section className="pt-28 pb-16 bg-[oklch(0.06_0.004_280)] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_70%_50%,oklch(0.60_0.22_295/0.06),transparent)]" />
        <div className="container relative z-10 text-center">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.p variants={fadeUp} className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">
              What We Offer
            </motion.p>
            <motion.h1 variants={fadeUp} className="text-5xl lg:text-6xl font-display font-bold mb-5">
              Our Services
            </motion.h1>
            <motion.p variants={fadeUp} className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Every service is performed by certified detailers at your location — no drop-off required. We use only professional-grade, paint-safe products.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {services.map((service, i) => (
              <motion.div
                key={service.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                variants={fadeUp}
                transition={{ delay: i * 0.05 }}
                className={`p-7 rounded-2xl border transition-all ${
                  service.featured
                    ? "border-primary/50 bg-primary/5 shadow-lg shadow-primary/10"
                    : "border-border bg-card hover:border-primary/30"
                }`}
              >
                <div className="flex items-start gap-5">
                  <div
                    className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      service.featured
                        ? "bg-primary/20 border border-primary/40 text-primary"
                        : "bg-primary/10 border border-primary/20 text-primary"
                    }`}
                  >
                    {service.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-display font-bold text-xl">{service.title}</h3>
                      {service.featured && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 font-semibold">
                          Most Popular
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-primary font-semibold">{service.price}</span>
                      <span className="text-muted-foreground text-sm">·</span>
                      <span className="text-muted-foreground text-sm">{service.duration}</span>
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                      {service.description}
                    </p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-5">
                      {service.includes.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <Link href="/book">
                      <Button
                        size="sm"
                        className={service.featured ? "bg-primary hover:bg-primary/90 text-primary-foreground font-semibold" : ""}
                        variant={service.featured ? "default" : "outline"}
                      >
                        Book This Service
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[oklch(0.06_0.004_280)]">
        <div className="container text-center">
          <h2 className="text-3xl font-display font-bold mb-4">Not Sure Which Service You Need?</h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Our team is happy to help you choose the right service for your vehicle. Contact us or start a booking and we'll guide you through it.
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
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
