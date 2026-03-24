import { Link } from "wouter";
import { motion } from "framer-motion";
import { ChevronRight, CheckCircle2, Car, Droplets, Sparkles, Zap, Shield, Wrench, RefreshCw, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SEO, { breadcrumbSchema, serviceSchema } from "@/components/SEO";

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
      <SEO
        title="Auto Detailing Services — Racine County, WI"
        description="Professional mobile detailing services in Southeast Wisconsin. Interior, exterior, and full-service packages serving Racine County, Kenosha, and surrounding areas."
        canonical="/services"
        jsonLd={[serviceSchema("Mobile Auto Detailing", "Professional interior and exterior auto detailing services delivered to your location in Racine County, WI."), breadcrumbSchema([{ name: "Home", url: "/" }, { name: "Services", url: "/services" }])]}
      />

      {/* Hero */}
      <section className="pt-24 pb-10 sm:pt-28 sm:pb-16 bg-[oklch(0.06_0.004_280)] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_70%_50%,oklch(0.60_0.22_295/0.06),transparent)]" />
        <div className="container relative z-10 text-center">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.p variants={fadeUp} className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">
              What We Offer
            </motion.p>
            <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-4">
              Our Services
            </motion.h1>
            <motion.p variants={fadeUp} className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Every service is performed by certified detailers at your location — no drop-off required. We use only professional-grade, paint-safe products.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Packages CTA */}
      <section className="py-12 sm:py-20">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={stagger}
              className="grid grid-cols-1 sm:grid-cols-2 gap-5"
            >
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
                        Interior, exterior, and full-detail packages. Transparent, upfront pricing — book online in minutes.
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                      View packages <ChevronRight className="w-4 h-4" />
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
                      Get a quote <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-10 sm:py-16 bg-[oklch(0.06_0.004_280)]">
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
