import { Link } from "wouter";
import { motion } from "framer-motion";
import { ChevronRight, Home, Phone, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SEO from "@/components/SEO";
import { BRAND } from "@shared/brand";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55 } },
};
const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

const HELPFUL_LINKS = [
  { href: "/services", label: "Services" },
  { href: "/pricing", label: "Pricing" },
  { href: "/commercial", label: "Commercial" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/faq", label: "FAQ" },
];

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <SEO
        title="Page Not Found"
        description="The page you were looking for doesn't exist."
        noindex={true}
      />

      <section className="pt-28 pb-20 sm:pt-32 sm:pb-28 bg-[#0a0a0a] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_0%,oklch(0.55_0.22_29/0.08),transparent)]" />
        <div className="container relative z-10 text-center">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.div
              variants={fadeUp}
              className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto mb-6"
            >
              <Wrench className="w-8 h-8" />
            </motion.div>
            <motion.p
              variants={fadeUp}
              className="text-primary text-sm font-semibold tracking-widest uppercase mb-3"
            >
              404 Error
            </motion.p>
            <motion.h1
              variants={fadeUp}
              className="text-5xl sm:text-6xl font-display font-bold mb-5"
            >
              Page Not Found
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="text-muted-foreground text-lg max-w-xl mx-auto mb-10"
            >
              The page you're looking for doesn't exist — it may have been
              moved, renamed, or the link was mistyped.
            </motion.p>
            <motion.div
              variants={fadeUp}
              className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14"
            >
              <Link href="/">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 h-12 text-base w-full sm:w-auto">
                  <Home className="w-4 h-4 mr-1" />
                  Back to Home
                </Button>
              </Link>
              <a href={`tel:${BRAND.phone.replace(/\D/g, "")}`}>
                <Button
                  variant="outline"
                  className="border-border hover:border-primary/50 px-8 h-12 text-base w-full sm:w-auto"
                >
                  <Phone className="w-4 h-4 mr-1" />
                  Call {BRAND.phone}
                </Button>
              </a>
            </motion.div>

            <motion.div variants={fadeUp}>
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-4">
                Or find your way from here
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg mx-auto">
                {HELPFUL_LINKS.map(link => (
                  <Link key={link.href} href={link.href}>
                    <span className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-border bg-card hover:border-primary/40 hover:bg-primary/5 text-sm text-muted-foreground hover:text-foreground transition-all cursor-pointer">
                      {link.label}
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </Link>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
