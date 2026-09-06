import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ChevronRight,
  CheckCircle2,
  Sparkles,
  Shield,
  Wrench,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SEO, { breadcrumbSchema, serviceSchema } from "@/components/SEO";
import { trpc } from "@/lib/trpc";
import { PACKAGES, ADD_ONS } from "@shared/services";
import { BRAND } from "@shared/brand";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55 } },
};
const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

const ICONS: Record<string, React.ReactNode> = {
  "full-showroom-reset": <Sparkles className="w-7 h-7" />,
  "signature-detail": <Wrench className="w-7 h-7" />,
  "ceramic-coating": <Shield className="w-7 h-7" />,
  "paint-correction": <Wrench className="w-7 h-7" />,
};

const activePackages = PACKAGES.filter(p => p.isActive).sort(
  (a, b) => a.sortOrder - b.sortOrder
);
const activeAddOns = ADD_ONS.filter(a => a.isActive).sort(
  (a, b) => a.sortOrder - b.sortOrder
);

export default function Services() {
  // Package NAME/description/icon/etc. still come from the static catalog
  // (shared/services.ts) — it's the only place quote-only services
  // (ceramic, paint correction) and retired ones (isActive:false) are
  // defined at all. But displayed PRICE and included-items both now
  // prefer the DB `packages` table row when one exists by name, so an
  // approved FormaOps pricing or services ChangeRequest (which only write
  // to that table — see server/formaops/executors/{pricing,services}.ts)
  // is reflected here too, not just on /pricing and the booking wizard,
  // which already read the DB row directly.
  const { data: dbPackages } = trpc.bookings.getPackages.useQuery();
  const dbPriceByName = new Map(
    (dbPackages ?? []).map(p => [p.name, Number(p.price)])
  );
  const dbFeaturesByName = new Map(
    (dbPackages ?? []).map(p => [
      p.name,
      p.features ? (JSON.parse(p.features) as string[]) : null,
    ])
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <SEO
        title="Auto Detailing Services — Racine County, WI"
        description={`Professional mobile detailing services in ${BRAND.serviceArea.primaryRegionLabel}. Interior, exterior, ceramic coating, and paint correction — quoted transparently, delivered at your location.`}
        canonical="/services"
        jsonLd={[
          serviceSchema(
            "Mobile Auto Detailing",
            `Professional interior and exterior auto detailing services delivered to your location in ${BRAND.serviceArea.primaryRegionLabel}.`
          ),
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Services", url: "/services" },
          ]),
        ]}
      />

      {/* Hero */}
      <section className="pt-24 pb-10 sm:pt-28 sm:pb-16 bg-[#0a0a0a] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_70%_50%,oklch(0.55_0.22_29/0.06),transparent)]" />
        <div className="container relative z-10 text-center">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.p
              variants={fadeUp}
              className="text-primary text-sm font-semibold tracking-widest uppercase mb-3"
            >
              What We Offer
            </motion.p>
            <motion.h1
              variants={fadeUp}
              className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-4"
            >
              Our Services
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="text-muted-foreground text-lg max-w-2xl mx-auto"
            >
              Every service is performed at your location — no drop-off
              required. We bring professional-grade, paint-safe products and
              equipment; you provide access to water and power.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Package grid */}
      <section className="py-12 sm:py-20">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-5xl mx-auto"
          >
            {activePackages.map(pkg => {
              const displayPrice = dbPriceByName.get(pkg.name) ?? pkg.fromPrice;
              const displayFeatures = dbFeaturesByName.get(pkg.name) ?? pkg.included;
              return (
              <motion.div key={pkg.internalKey} variants={fadeUp}>
                <Link
                  href={
                    pkg.requiresQuote
                      ? "/pricing?tab=ceramic"
                      : "/pricing?tab=detailing"
                  }
                >
                  <div
                    className={`group flex flex-col gap-4 p-7 rounded-2xl border-2 bg-card transition-all cursor-pointer h-full ${pkg.isPopular ? "border-primary/60 shadow-lg shadow-primary/10" : "border-border hover:border-primary/50 hover:bg-primary/4"}`}
                  >
                    {pkg.isPopular && (
                      <span className="self-start px-3 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold tracking-wide">
                        MOST POPULAR
                      </span>
                    )}
                    <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                      {ICONS[pkg.internalKey]}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <h3 className="font-display font-bold text-xl">
                          {pkg.name}
                        </h3>
                        <span className="text-sm font-semibold text-primary whitespace-nowrap">
                          {displayPrice > 0
                            ? `From $${displayPrice}`
                            : "Custom quote"}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                        {pkg.fullDescription}
                      </p>
                      <ul className="space-y-1.5">
                        {displayFeatures.slice(0, 4).map(item => (
                          <li
                            key={item}
                            className="flex items-start gap-2 text-xs text-muted-foreground"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                      {pkg.requiresQuote ? "Get a quote" : "View pricing"}{" "}
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Add-ons */}
      <section className="py-12 sm:py-16 bg-[#0a0a0a]">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
              <Plus className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-display font-bold text-2xl mb-2">
              Add-On Services
            </h2>
            <p className="text-muted-foreground text-sm">
              Enhance any package during booking to address specific needs.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-w-4xl mx-auto">
            {activeAddOns.map(addon => (
              <div
                key={addon.internalKey}
                className="p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-all text-center"
              >
                <div className="text-lg font-display font-bold text-primary mb-1">
                  ${addon.price.toFixed(2)}
                </div>
                <div className="text-sm font-medium text-foreground mb-0.5">
                  {addon.name}
                </div>
                <div className="text-[11px] text-muted-foreground leading-tight">
                  {addon.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-10 sm:py-16">
        <div className="container text-center">
          <h2 className="text-3xl font-display font-bold mb-4">
            Not Sure Which Service You Need?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Our team is happy to help you choose the right service for your
            vehicle. Contact us or start a booking and we'll guide you through
            it.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href={BRAND.booking.primaryPath}>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8">
                Book Now
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button
                variant="outline"
                className="border-border hover:border-primary/50 px-8"
              >
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
