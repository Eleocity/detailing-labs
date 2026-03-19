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
    category: "Mobile Service",
    questions: [
      {
        q: "Do you come to me?",
        a: "Yes — that's the core of what we do. Detailing Labs is a fully mobile service. We bring our professional equipment, products, and expertise directly to your home, office, or any location that works for you. No drop-off required.",
      },
      {
        q: "What areas do you service?",
        a: "We service the Greater Metro Area and surrounding communities. When you book online, you'll enter your ZIP code and we'll confirm availability in your area. Travel fees may apply for locations outside our primary service zone.",
      },
      {
        q: "Do I need to provide water or power?",
        a: "No. Our mobile units are fully self-contained with their own water supply and power generation. We don't need access to your home's utilities, though having a nearby outlet available can be helpful for extended services.",
      },
      {
        q: "Where should I park my vehicle for the appointment?",
        a: "Ideally, park in a shaded area such as a garage, covered parking, or shaded driveway. We can work in most conditions, but shade helps us achieve the best results and protects the products during application.",
      },
    ],
  },
  {
    category: "Booking & Scheduling",
    questions: [
      {
        q: "How do I book an appointment?",
        a: "You can book online 24/7 through our booking system at detailinglabs.com/book. Choose your service, select a date and time, enter your vehicle and location details, and submit. We'll confirm your appointment within a few hours.",
      },
      {
        q: "How far in advance should I book?",
        a: "We recommend booking at least 3–5 days in advance to secure your preferred date and time. For ceramic coating packages, we suggest booking 1–2 weeks ahead as these require a full day and limited slots are available.",
      },
      {
        q: "How long does detailing take?",
        a: "Service duration depends on the package and your vehicle's size and condition. An Essential Detail takes about 2 hours, a Premium Detail takes 3–4 hours, and a Signature Full Detail takes 5–6 hours. Ceramic coating packages require a full day.",
      },
      {
        q: "Can I reschedule or cancel my appointment?",
        a: "Yes. You can reschedule or cancel through your customer portal or by contacting us directly. We ask for at least 24 hours' notice for rescheduling and 48 hours for cancellations to avoid any fees.",
      },
    ],
  },
  {
    category: "Services & Results",
    questions: [
      {
        q: "What happens if the weather is bad?",
        a: "Light rain won't stop us — we can work in covered areas. However, if weather conditions are severe or unsafe, we'll proactively reach out to reschedule your appointment at no charge. We monitor forecasts and will always communicate with you in advance.",
      },
      {
        q: "Do you offer ceramic coatings?",
        a: "Yes. Our Ceramic Coating Package includes full paint decontamination, 1-stage paint correction, and professional ceramic coating application. This is our most comprehensive protection service and comes with a 2-year warranty.",
      },
      {
        q: "Will detailing remove scratches?",
        a: "Light surface scratches and swirl marks can often be reduced or eliminated through paint correction, which is included in our Signature and Ceramic Coating packages. Deep scratches that penetrate the clear coat require paint repair, which is outside the scope of detailing.",
      },
      {
        q: "How long will the results last?",
        a: "Results vary by service. A standard wax or sealant typically lasts 1–3 months. Our paint sealant upgrade lasts 6+ months. Ceramic coatings provide 2+ years of protection. Regular maintenance details help extend the life of any treatment.",
      },
    ],
  },
  {
    category: "Pricing & Payment",
    questions: [
      {
        q: "Are your prices fixed or do they vary?",
        a: "Our listed prices are starting rates. Final pricing may vary based on vehicle size (trucks and SUVs may cost more than sedans), vehicle condition, and selected add-ons. We'll confirm your exact quote before your appointment.",
      },
      {
        q: "Is there a travel fee?",
        a: "There is no travel fee for locations within our primary service area. A travel fee may apply for locations in our extended service area. You'll see any applicable fees clearly during the booking process.",
      },
      {
        q: "What payment methods do you accept?",
        a: "We accept all major credit and debit cards, as well as cash. Payment is collected after the service is completed to your satisfaction. Online payment options will be available soon.",
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
        title="Frequently Asked Questions"
        description="Answers to common questions about Detailing Labs mobile auto detailing — how it works, what's included, pricing, rescheduling, and more."
        canonical="/faq"
        jsonLd={[
          faqSchema(faqs.flatMap(section => section.questions.map(q => ({ q: q.q, a: q.a })))),
          breadcrumbSchema([{ name: "Home", url: "/" }, { name: "FAQ", url: "/faq" }]),
        ]}
      />
      <SiteHeader />

      {/* Hero */}
      <section className="pt-28 pb-16 bg-[oklch(0.06_0.004_280)]">
        <div className="container text-center">
          <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
            <motion.p variants={fadeUp} className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">
              Got Questions?
            </motion.p>
            <motion.h1 variants={fadeUp} className="text-5xl lg:text-6xl font-display font-bold mb-5">
              Frequently Asked Questions
            </motion.h1>
            <motion.p variants={fadeUp} className="text-muted-foreground text-lg max-w-xl mx-auto">
              Everything you need to know about Detailing Labs and our mobile detailing services.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* FAQ Sections */}
      <section className="py-20">
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
