import { Link } from "wouter";
import { motion } from "framer-motion";
import { ChevronRight, MapPin, CheckCircle2, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SEO, { breadcrumbSchema, localBusinessSchema } from "@/components/SEO";
import { BRAND } from "@shared/brand";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

export default function ServiceArea() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <SEO
        title="Service Area — Racine & Kenosha County, WI"
        description={`Forma Auto Spa serves ${BRAND.serviceArea.primaryRegionLabel}. Enter your address at booking to confirm coverage, travel fee, or availability at your location.`}
        canonical="/service-area"
        jsonLd={[
          localBusinessSchema,
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Service Area", url: "/service-area" },
          ]),
        ]}
      />

      <section className="pt-24 pb-14 sm:pt-28 sm:pb-20 bg-[oklch(0.06_0.002_75)] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_30%_30%,oklch(0.65_0.10_75/0.07),transparent)]" />
        <div className="container relative z-10 text-center">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.div
              variants={fadeUp}
              className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6"
            >
              <MapPin className="w-7 h-7 text-primary" />
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-5"
            >
              Where We Work
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed"
            >
              Forma Auto Spa is based in {BRAND.serviceArea.headquartersCity},{" "}
              {BRAND.serviceArea.headquartersState}, and serves{" "}
              {BRAND.serviceArea.primaryRegionLabel}.
            </motion.p>
          </motion.div>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="container max-w-3xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.h2
              variants={fadeUp}
              className="text-2xl sm:text-3xl font-display font-bold mb-6 text-center"
            >
              Communities We Serve
            </motion.h2>
            <motion.div
              variants={fadeUp}
              className="flex flex-wrap justify-center gap-2 mb-14"
            >
              {BRAND.serviceArea.towns.map(t => (
                <span
                  key={t}
                  className="text-sm px-4 py-2 rounded-full border border-border bg-card text-foreground"
                >
                  {t}
                </span>
              ))}
            </motion.div>

            <motion.div
              variants={stagger}
              className="grid sm:grid-cols-3 gap-4 mb-14"
            >
              <motion.div
                variants={fadeUp}
                className="p-5 rounded-xl border border-primary/30 bg-primary/5"
              >
                <CheckCircle2 className="w-5 h-5 text-primary mb-2" />
                <h3 className="font-semibold text-sm mb-1">
                  Included Service Area
                </h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  No travel fee. Standard scheduling.
                </p>
              </motion.div>
              <motion.div
                variants={fadeUp}
                className="p-5 rounded-xl border border-border bg-card"
              >
                <Navigation className="w-5 h-5 text-muted-foreground mb-2" />
                <h3 className="font-semibold text-sm mb-1">Travel-Fee Area</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  A modest travel fee applies, shown before you confirm your
                  booking.
                </p>
              </motion.div>
              <motion.div
                variants={fadeUp}
                className="p-5 rounded-xl border border-border bg-card"
              >
                <MapPin className="w-5 h-5 text-muted-foreground mb-2" />
                <h3 className="font-semibold text-sm mb-1">
                  Outside Our Range
                </h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  We'll let you know at booking and can flag your request for
                  manual review instead of an instant confirmation.
                </p>
              </motion.div>
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="p-6 rounded-2xl border border-border bg-card text-center"
            >
              <h3 className="font-display font-bold text-lg mb-2">
                Not sure if we reach you?
              </h3>
              <p className="text-muted-foreground text-sm mb-5 max-w-md mx-auto">
                Enter your address during booking and we'll confirm coverage —
                included area, travel fee, or manual review — before you pick a
                time.
              </p>
              <Link href={BRAND.booking.primaryPath}>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8">
                  Check My Address <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
