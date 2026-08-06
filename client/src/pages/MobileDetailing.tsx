import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ChevronRight,
  CheckCircle2,
  Droplets,
  Zap,
  Home as HomeIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SEO, { breadcrumbSchema, serviceSchema } from "@/components/SEO";
import { BRAND } from "@shared/brand";
import { getBookingEligiblePackages } from "@shared/services";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

const packages = getBookingEligiblePackages();

const reasons = [
  {
    icon: <Droplets className="w-5 h-5" />,
    title: "We bring our own water and power",
    desc: "A self-contained rig with its own water tank and generator. Your hose and outlet stay yours — we don't need either.",
  },
  {
    icon: <HomeIcon className="w-5 h-5" />,
    title: "At your home, office, or anywhere you park",
    desc: "No driving to a shop, no waiting room, no arranging a ride. We work where your car already is.",
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: "You don't have to be there the whole time",
    desc: "As long as we can access the vehicle, most clients go about their day and we send photos when it's done.",
  },
];

export default function MobileDetailing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <SEO
        title="Mobile Detailing — We Come to You | Racine & Kenosha County, WI"
        description={`Fully self-contained mobile auto detailing across ${BRAND.serviceArea.primaryRegionLabel}. We bring our own water and power — no hookups needed at your location.`}
        canonical="/mobile-detailing"
        jsonLd={[
          serviceSchema(
            "Mobile Auto Detailing",
            "Self-contained mobile detailing service that brings its own water and power to the customer's location."
          ),
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Mobile Detailing", url: "/mobile-detailing" },
          ]),
        ]}
      />

      <section className="pt-24 pb-14 sm:pt-28 sm:pb-20 bg-[oklch(0.06_0.002_75)] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_70%_30%,oklch(0.65_0.10_75/0.07),transparent)]" />
        <div className="container relative z-10 text-center">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.p
              variants={fadeUp}
              className="text-primary text-sm font-semibold tracking-widest uppercase mb-3"
            >
              How It Works
            </motion.p>
            <motion.h1
              variants={fadeUp}
              className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-5"
            >
              Mobile Detailing, Done Properly
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed mb-8"
            >
              Forma Auto Spa is mobile-only, by design — a fully self-contained
              rig with its own water tank and generator, so we can deliver a
              professional-grade detail at your home, office, or anywhere else
              you park.
            </motion.p>
            <motion.div variants={fadeUp}>
              <Link href={BRAND.booking.primaryPath}>
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-10 h-14 text-lg"
                >
                  Book Your Detail <ChevronRight className="w-5 h-5 ml-1" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto mb-16"
          >
            {reasons.map(r => (
              <motion.div
                key={r.title}
                variants={fadeUp}
                className="flex flex-col gap-3"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  {r.icon}
                </div>
                <h3 className="font-display font-bold text-base">{r.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {r.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="max-w-3xl mx-auto"
          >
            <motion.h2
              variants={fadeUp}
              className="text-2xl sm:text-3xl font-display font-bold mb-2 text-center"
            >
              Available Mobile Packages
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="text-muted-foreground text-sm text-center mb-8"
            >
              All of these are booked directly online, with pricing that varies
              by vehicle size.
            </motion.p>
            <motion.div
              variants={stagger}
              className="grid sm:grid-cols-2 gap-4"
            >
              {packages.map(pkg => (
                <motion.div
                  key={pkg.internalKey}
                  variants={fadeUp}
                  className="p-5 rounded-xl border border-border bg-card"
                >
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <h3 className="font-display font-bold text-base">
                      {pkg.name}
                    </h3>
                    <span className="text-sm font-semibold text-primary whitespace-nowrap">
                      From ${pkg.fromPrice}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {pkg.shortDescription}
                  </p>
                </motion.div>
              ))}
            </motion.div>
            <motion.div
              variants={fadeUp}
              className="mt-8 flex items-start gap-3 p-4 rounded-xl border border-border bg-card"
            >
              <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                Need ceramic coating or paint correction instead? Those are
                quoted to your vehicle's condition —{" "}
                <Link href="/ceramic-coatings">
                  <span className="text-primary font-medium hover:underline cursor-pointer">
                    see ceramic coatings
                  </span>
                </Link>{" "}
                or{" "}
                <Link href="/paint-correction">
                  <span className="text-primary font-medium hover:underline cursor-pointer">
                    paint correction
                  </span>
                </Link>
                .
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="py-14 bg-[oklch(0.06_0.002_75)]">
        <div className="container text-center">
          <h2 className="font-display font-bold text-2xl mb-3">
            Serving {BRAND.serviceArea.primaryRegionLabel}
          </h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto mb-6">
            Enter your address at booking and we'll confirm coverage
            automatically.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href={BRAND.booking.primaryPath}>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8">
                Book Now <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link href="/service-area">
              <Button
                variant="outline"
                className="border-border hover:border-primary/50 px-8"
              >
                View Service Area
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
