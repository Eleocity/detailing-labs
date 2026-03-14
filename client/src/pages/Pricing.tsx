import { Link } from "wouter";
import { motion } from "framer-motion";
import { ChevronRight, CheckCircle2, MapPin, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55 } },
};
const stagger = { visible: { transition: { staggerChildren: 0.10 } } };

const packages = [
  {
    name: "Essential",
    price: 99,
    duration: "~2 hours",
    description: "Perfect for regular maintenance. Keeps your vehicle clean and protected between full details.",
    features: [
      "Exterior hand wash & dry",
      "Wheel & tire cleaning",
      "Window cleaning (exterior)",
      "Interior vacuum",
      "Dashboard & console wipe-down",
      "Door jamb cleaning",
    ],
    popular: false,
    cta: "Book Essential",
  },
  {
    name: "Premium",
    price: 199,
    duration: "~4 hours",
    description: "Our most popular package. A thorough detail inside and out for a showroom-ready finish.",
    features: [
      "Everything in Essential",
      "Clay bar treatment",
      "Hand-applied paint sealant",
      "Interior deep clean",
      "Leather conditioning",
      "Odor elimination",
      "Tire dressing",
      "Air vent detailing",
    ],
    popular: true,
    cta: "Book Premium",
  },
  {
    name: "Signature",
    price: 349,
    duration: "~6 hours",
    description: "The ultimate detailing experience. No corner left untouched — your vehicle restored to its finest.",
    features: [
      "Everything in Premium",
      "Paint decontamination",
      "Engine bay detail",
      "Headlight restoration",
      "Fabric protection treatment",
      "Premium carnauba wax",
      "Detailed photo report",
    ],
    popular: false,
    cta: "Book Signature",
  },
  {
    name: "Ceramic Coating",
    price: 999,
    duration: "Full day",
    description: "Long-term paint protection with a professional ceramic coating. Includes full paint prep and correction.",
    features: [
      "Full paint decontamination",
      "Paint correction (1-stage)",
      "Professional ceramic coating",
      "2-year protection warranty",
      "Hydrophobic finish",
      "Maintenance guide included",
      "Before & after photo documentation",
    ],
    popular: false,
    cta: "Book Ceramic",
    premium: true,
  },
];

const addOns = [
  { name: "Headlight Restoration", price: 59 },
  { name: "Engine Bay Detail", price: 79 },
  { name: "Ozone Odor Treatment", price: 69 },
  { name: "Pet Hair Removal", price: 49 },
  { name: "Fabric Protection", price: 49 },
  { name: "Tire Shine & Dressing", price: 19 },
  { name: "Rain-X Treatment", price: 29 },
  { name: "Paint Sealant Upgrade", price: 39 },
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      {/* Hero */}
      <section className="pt-28 pb-16 bg-[oklch(0.06_0.004_280)] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_30%_50%,oklch(0.60_0.22_295/0.06),transparent)]" />
        <div className="container relative z-10 text-center">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.p variants={fadeUp} className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">
              Transparent Pricing
            </motion.p>
            <motion.h1 variants={fadeUp} className="text-5xl lg:text-6xl font-display font-bold mb-5">
              Packages & Pricing
            </motion.h1>
            <motion.p variants={fadeUp} className="text-muted-foreground text-lg max-w-2xl mx-auto">
              No hidden fees. No surprises. Straightforward pricing for premium mobile detailing delivered to your door.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Packages */}
      <section className="py-20">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {packages.map((pkg) => (
              <motion.div
                key={pkg.name}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                variants={fadeUp}
                className={`relative flex flex-col rounded-2xl border p-7 transition-all ${
                  pkg.popular
                    ? "border-primary/60 bg-primary/8 shadow-xl shadow-primary/15"
                    : pkg.premium
                    ? "border-yellow-500/30 bg-yellow-500/5"
                    : "border-border bg-card hover:border-primary/30"
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold tracking-wide">
                      MOST POPULAR
                    </span>
                  </div>
                )}
                {pkg.premium && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 rounded-full bg-yellow-500 text-black text-xs font-bold tracking-wide">
                      PREMIUM
                    </span>
                  </div>
                )}

                <div className="mb-5">
                  <h3 className="font-display font-bold text-xl mb-1">{pkg.name}</h3>
                  <p className="text-muted-foreground text-sm">{pkg.duration}</p>
                </div>

                <div className="mb-5">
                  <span className="text-4xl font-display font-bold text-foreground">${pkg.price}</span>
                  <span className="text-muted-foreground text-sm ml-2">starting</span>
                </div>

                <p className="text-muted-foreground text-sm leading-relaxed mb-6">{pkg.description}</p>

                <ul className="space-y-2.5 mb-8 flex-1">
                  {pkg.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/book">
                  <Button
                    className={`w-full font-semibold ${
                      pkg.popular
                        ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                        : pkg.premium
                        ? "bg-yellow-500 hover:bg-yellow-400 text-black"
                        : ""
                    }`}
                    variant={pkg.popular || pkg.premium ? "default" : "outline"}
                  >
                    {pkg.cta}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Add-Ons */}
      <section className="py-16 bg-[oklch(0.06_0.004_280)]">
        <div className="container">
          <div className="text-center mb-12">
            <p className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">Customize Your Detail</p>
            <h2 className="text-3xl font-display font-bold">Add-On Services</h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto text-sm">
              Enhance any package with these premium add-ons. Select them during booking.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {addOns.map((addon) => (
              <motion.div
                key={addon.name}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-all text-center"
              >
                <div className="text-xl font-display font-bold text-primary mb-1">${addon.price}</div>
                <div className="text-sm text-muted-foreground">{addon.name}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Notes */}
      <section className="py-12">
        <div className="container">
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="flex gap-3 p-4 rounded-xl border border-border bg-card">
              <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm mb-1">Mobile Service — We Come To You</p>
                <p className="text-muted-foreground text-sm">All services are performed at your location. A travel fee may apply for locations outside our primary service area.</p>
              </div>
            </div>
            <div className="flex gap-3 p-4 rounded-xl border border-border bg-card">
              <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm mb-1">Pricing Notes</p>
                <p className="text-muted-foreground text-sm">Prices shown are starting rates. Final pricing may vary based on vehicle size, condition, and selected add-ons. We'll confirm your exact quote before your appointment.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[oklch(0.06_0.004_280)]">
        <div className="container text-center">
          <h2 className="text-3xl font-display font-bold mb-4">Ready to Book?</h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Choose your package and book online in minutes. We'll confirm your appointment and come to you.
          </p>
          <Link href="/book">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-10 h-12 text-base">
              Book Your Detail
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
