import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEO, { faqSchema, breadcrumbSchema } from "@/components/SEO";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { trpc } from "@/lib/trpc";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55 } },
};

const faqs = [
  {
    category: "Service Area & Location",
    questions: [
      {
        q: "What areas do you service?",
        a: "We provide mobile detailing service throughout Southeast Wisconsin. If you're outside our normal service area, a travel fee may apply.",
      },
      {
        q: "Do you come to my home or workplace?",
        a: "Yes. We're fully mobile and can service your vehicle at your home, workplace, or another approved location.",
      },
      {
        q: "Do you need access to water or electricity?",
        a: "No. Our mobile setup includes our own water tank and generator, so we can detail in most locations without needing water or power access.",
      },
    ],
  },
  {
    category: "Appointments & Scheduling",
    questions: [
      {
        q: "How do I book an appointment?",
        a: "You can book directly through our website by selecting your package, vehicle size, and preferred appointment time.",
      },
      {
        q: "How long does a detail take?",
        a: "Service time depends on the package, vehicle size, and condition. Most appointments take between 2 and 6 hours.",
      },
      {
        q: "Do I need to be there during the appointment?",
        a: "Not always. As long as we can access the vehicle, many customers do not need to be present for the full appointment.",
      },
      {
        q: "Can I reschedule or cancel my appointment?",
        a: "Yes. Please give us at least 24 hours' notice for rescheduling and 48 hours for cancellations to avoid any fees.",
      },
    ],
  },
  {
    category: "Our Packages",
    questions: [
      {
        q: "What's included in the Exterior Decon & Shield?",
        a: "This package includes a signature hand wash, wheel and tire deep clean, iron remover treatment, bug and tar removal, and a hydrophobic spray wax for up to 3 months of protection.",
      },
      {
        q: "What's included in the Interior Deep Refresh?",
        a: "This service includes a compressed air blowout, deep vacuum, dash, console, and door panel scrub, UV protectant, streak-free glass cleaning, and floor mat restoration.",
      },
      {
        q: "What is the Full Showroom Reset?",
        a: "The Full Showroom Reset is our best-value package that combines both our Exterior Decon & Shield and Interior Deep Refresh for a complete inside-and-out transformation.",
      },
      {
        q: "Do you charge more for larger vehicles?",
        a: "Yes. Pricing varies by vehicle size because larger vehicles take more time, labor, and product to properly detail.",
      },
    ],
  },
  {
    category: "Add-Ons & Specialty Services",
    questions: [
      {
        q: "Can you remove pet hair?",
        a: "Yes. Pet hair removal is available as a specialty add-on starting at $49. Heavily embedded hair may require additional time.",
      },
      {
        q: "Do you offer stain removal or extraction?",
        a: "Yes. We offer extraction services for front seats, full interiors, and individual spot treatments depending on the condition of the vehicle.",
      },
      {
        q: "Can you get rid of bad smells in my car?",
        a: "We offer an odor elimination treatment designed to reduce many common interior odors. Results can vary depending on the source and severity.",
      },
      {
        q: "Do you detail engine bays?",
        a: "Yes. Engine bay detailing is available as an add-on and is done carefully on accessible surfaces.",
      },
      {
        q: "Do you restore cloudy headlights?",
        a: "Yes. Headlight restoration is available as an add-on and helps improve the look and clarity of oxidized headlights.",
      },
    ],
  },
  {
    category: "Results & Maintenance",
    questions: [
      {
        q: "How often should I have my vehicle detailed?",
        a: "For most daily drivers, we recommend professional detailing every 1 to 3 months to keep the vehicle clean, protected, and easier to maintain.",
      },
      {
        q: "What happens if my vehicle is extra dirty?",
        a: "Vehicles with excessive buildup, heavy pet hair, staining, sand, salt, or unusually difficult conditions may require extra time or additional charges. We'll communicate that clearly before starting.",
      },
    ],
  },
  {
    category: "Payment & Booking",
    questions: [
      {
        q: "How do I pay?",
        a: "Payment is collected on-site after the service is complete and you've inspected the work. We accept cash, Venmo, Zelle, and all major credit and debit cards.",
      },
      {
        q: "Do I pay upfront or after?",
        a: "We collect payment after the job is done and you're satisfied with the results. We don't require a deposit for standard detailing appointments.",
      },
      {
        q: "Is there a cancellation fee?",
        a: "No fee if you cancel or reschedule at least 24 hours in advance. Late cancellations or no-shows may be subject to a fee.",
      },
      {
        q: "Do you offer any discounts or packages?",
        a: "We offer savings when you bundle our interior and exterior services together with the Full Showroom Reset. We may also offer seasonal promotions — follow us on social or ask when you book.",
      },
    ],
  },
  {
    category: "Ceramic Coating",
    questions: [
      {
        q: "Do you offer ceramic coatings?",
        a: "Yes. Ceramic coating pricing is custom-quoted based on your vehicle's size and paint condition. Contact us for a no-pressure quote.",
      },
      {
        q: "How long does ceramic coating last?",
        a: "Professional ceramic coatings typically last 2 years or more with proper maintenance. We recommend an annual inspection and maintenance detail to maximize protection.",
      },
    ],
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-secondary/50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="font-medium text-sm sm:text-base">{q}</span>
        <ChevronDown className={`w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border pt-4">
          {a}
        </div>
      )}
    </div>
  );
}

export default function FAQ() {
  const { data: faqContent } = trpc.content.getSiteContent.useQuery({ section: "faq" });

  // Build dynamic FAQs from DB content
  const dynamicFaqs = (() => {
    if (!faqContent || faqContent.length === 0) return null;
    const map: Record<string, string> = {};
    for (const row of faqContent) map[row.key] = row.value ?? "";
    const indices = Object.keys(map)
      .filter((k) => k.endsWith("_q"))
      .map((k) => k.replace("item_", "").replace("_q", ""))
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort((a, b) => Number(a) - Number(b));
    return indices
      .map((i) => ({ q: map[`item_${i}_q`] ?? "", a: map[`item_${i}_a`] ?? "" }))
      .filter((f) => f.q && f.a);
  })();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="FAQs — Mobile Detailing in Racine County, WI | Detailing Labs"
        description="Common questions about Detailing Labs mobile detailing in Southeast Wisconsin — service area, packages, pricing, and what to expect."
        canonical="/faq"
        jsonLd={[
          faqSchema(faqs.flatMap(section => section.questions.map(q => ({ q: q.q, a: q.a })))),
          breadcrumbSchema([{ name: "Home", url: "/" }, { name: "FAQ", url: "/faq" }]),
        ]}
      />
      <SiteHeader />

      {/* Hero */}
      <section className="pt-24 pb-10 sm:pt-28 sm:pb-16 bg-[oklch(0.06_0.004_280)]">
        <div className="container text-center">
          <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
            <motion.p variants={fadeUp} className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">
              Got Questions?
            </motion.p>
            <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-4">
              Frequently Asked Questions
            </motion.h1>
            <motion.p variants={fadeUp} className="text-muted-foreground text-lg max-w-xl mx-auto">
              Everything you need to know about Detailing Labs and our mobile detailing services.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* FAQ Sections */}
      <section className="py-12 sm:py-20">
        <div className="container max-w-3xl">
          <div className="space-y-12">
            {dynamicFaqs && dynamicFaqs.length > 0 ? (
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                variants={fadeUp}
              >
                <div className="space-y-3">
                  {dynamicFaqs.map((faq) => (
                    <FAQItem key={faq.q} q={faq.q} a={faq.a} />
                  ))}
                </div>
              </motion.div>
            ) : (
              faqs.map((section) => (
                <motion.div
                  key={section.category}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-60px" }}
                  variants={fadeUp}
                >
                  <h2 className="text-xl font-display font-bold mb-4 text-primary">{section.category}</h2>
                  <div className="space-y-3">
                    {section.questions.map((faq) => (
                      <FAQItem key={faq.q} q={faq.q} a={faq.a} />
                    ))}
                  </div>
                </motion.div>
              ))
            )}
          </div>

          <div className="mt-16 p-8 rounded-2xl border border-border bg-card text-center">
            <h3 className="font-display font-bold text-xl mb-3">Still Have Questions?</h3>
            <p className="text-muted-foreground text-sm mb-6">
              We're happy to help. Reach out directly and we'll get back to you quickly.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/contact">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8">
                  Contact Us
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
              <Link href="/book">
                <Button variant="outline" className="border-border hover:border-primary/50 px-8">
                  Book Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
