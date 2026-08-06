import { Link } from "wouter";
import { motion } from "framer-motion";
import { ChevronRight, CheckCircle2, Shield, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SEO, { breadcrumbSchema, serviceSchema } from "@/components/SEO";
import { trpc } from "@/lib/trpc";
import { BRAND } from "@shared/brand";
import { getPackageByKey } from "@shared/services";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

const pkg = getPackageByKey("ceramic-coating")!;

export default function CeramicCoatings() {
  const { data: contactData } = trpc.content.getSiteContent.useQuery({
    section: "contact",
  });
  const contact = Object.fromEntries(
    (contactData ?? []).map(r => [r.key, r.value ?? ""])
  );
  const phone = contact.phone || BRAND.phone;
  const email = contact.email || BRAND.emailLive;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <SEO
        title="Ceramic Coating — Racine & Kenosha County, WI"
        description={`Professional ceramic coating in ${BRAND.serviceArea.primaryRegionLabel}. Multi-year hydrophobic paint protection, custom-quoted to your vehicle. Full paint prep and correction included.`}
        canonical="/ceramic-coatings"
        jsonLd={[
          serviceSchema("Ceramic Coating", pkg.fullDescription),
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Ceramic Coatings", url: "/ceramic-coatings" },
          ]),
        ]}
      />

      <section className="pt-24 pb-14 sm:pt-28 sm:pb-20 bg-[#0a0a0a] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_70%_30%,oklch(0.55_0.22_29/0.07),transparent)]" />
        <div className="container relative z-10">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="max-w-2xl"
          >
            <motion.div
              variants={fadeUp}
              className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6"
            >
              <Shield className="w-7 h-7 text-primary" />
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-5"
            >
              Ceramic Coatings
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="text-muted-foreground text-lg leading-relaxed mb-8"
            >
              {pkg.fullDescription}
            </motion.p>
            <motion.div
              variants={fadeUp}
              className="flex flex-col sm:flex-row gap-3"
            >
              <a href={`tel:${phone.replace(/\D/g, "")}`}>
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 w-full sm:w-auto"
                >
                  <Phone className="w-4 h-4 mr-2" /> Call for a Quote — {phone}
                </Button>
              </a>
              <Link href="/contact">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-border hover:border-primary/50 px-8 w-full sm:w-auto"
                >
                  Request a Quote Online
                </Button>
              </Link>
            </motion.div>
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
              className="text-2xl sm:text-3xl font-display font-bold mb-6"
            >
              What's Included
            </motion.h2>
            <motion.ul variants={stagger} className="space-y-3 mb-10">
              {pkg.included.map(item => (
                <motion.li
                  key={item}
                  variants={fadeUp}
                  className="flex items-start gap-3 text-sm text-muted-foreground"
                >
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  {item}
                </motion.li>
              ))}
            </motion.ul>

            <motion.div
              variants={fadeUp}
              className="p-6 rounded-2xl border border-primary/25 bg-primary/5 mb-10"
            >
              <h3 className="font-display font-bold text-lg mb-2">
                Why every coating is custom-quoted
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Ceramic coating pricing depends on your vehicle's size and how
                much paint correction is needed before coating. We assess your
                paint first, walk you through exactly what's required, and give
                you a transparent quote — no pressure, no guessing.
              </p>
            </motion.div>

            <motion.h2
              variants={fadeUp}
              className="text-2xl sm:text-3xl font-display font-bold mb-4"
            >
              Best for
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="text-muted-foreground leading-relaxed mb-10"
            >
              {pkg.recommendedFor}
            </motion.p>

            <motion.div
              variants={fadeUp}
              className="p-6 rounded-2xl border border-border bg-card"
            >
              <h3 className="font-display font-bold text-lg mb-1">
                Pairs with paint correction
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                Coating over unaddressed swirl marks or scratches locks them in.
                If your paint has visible imperfections, we'll recommend
                correction first.
              </p>
              <Link href="/paint-correction">
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline cursor-pointer">
                  See Paint Correction <ChevronRight className="w-4 h-4" />
                </span>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="py-14 bg-[#0a0a0a]">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center p-8 rounded-2xl border border-border bg-card">
            <h2 className="font-display font-bold text-xl mb-2">
              Get Your Ceramic Coating Quote
            </h2>
            <p className="text-muted-foreground text-sm mb-6">
              Reach out and we'll get back to you within a few hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href={`tel:${phone.replace(/\D/g, "")}`}
                className="flex items-center justify-center gap-2 h-12 px-6 rounded-xl border-2 border-primary/30 bg-primary/5 hover:border-primary text-sm font-semibold"
              >
                <Phone className="w-4 h-4 text-primary" /> {phone}
              </a>
              <a
                href={`mailto:${email}`}
                className="flex items-center justify-center gap-2 h-12 px-6 rounded-xl border-2 border-border hover:border-primary/40 text-sm font-semibold"
              >
                <Mail className="w-4 h-4 text-muted-foreground" /> {email}
              </a>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
