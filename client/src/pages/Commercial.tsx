import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  Send,
  Building2,
  Wrench,
  Home as HomeIcon,
  Car,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SEO, { breadcrumbSchema, faqSchema } from "@/components/SEO";
import SmsConsentField from "@/components/SmsConsentField";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { BRAND } from "@shared/brand";
import {
  FLEET_VEHICLE_TYPES,
  FLEET_VEHICLE_TYPE_LABELS,
  FLEET_OPPORTUNITY_TYPES,
  FLEET_OPPORTUNITY_TYPE_LABELS,
  FLEET_FREQUENCIES,
  FLEET_FREQUENCY_LABELS,
  type FleetVehicleType,
  type FleetOpportunityType,
  type FleetFrequency,
} from "@shared/fleetQuote";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55 } },
};
const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

const PRIORITY_TOWNS = [
  "Racine",
  "Mount Pleasant",
  "Caledonia",
  "Sturtevant",
  "Kenosha",
  "Oak Creek",
  "Franklin",
  "Pleasant Prairie",
];

const WHO_ITS_FOR = [
  "Dealerships & used-car lots (lot presentation, delivery prep, CPO/recon support)",
  "Contractor & service fleets (HVAC, plumbing, electrical, landscaping, construction)",
  "Property managers & apartment communities (maintenance / leasing vehicles)",
  "Transportation, limo, and presentation fleets",
  "Any local business with branded company vehicles",
];

const PROGRAM_INCLUDES = [
  "Custom pricing based on vehicle count and service frequency",
  "Flexible scheduling — we work around your operation",
  "On-site service at your facility or lot",
  "Interior, exterior, or full-service depending on your needs",
  "Consistent quality across every vehicle in your fleet",
  "Priority scheduling for regular clients",
];

const PROGRAMS_BY_NEED = [
  {
    icon: <Building2 className="w-6 h-6" />,
    title: "Dealership lot & delivery",
    desc: "Used/CPO presentation, delivery prep, and recurring lot support so cars look ready when customers walk the row.",
  },
  {
    icon: <Wrench className="w-6 h-6" />,
    title: "Branded service fleets",
    desc: "Recurring exterior/interior detailing so company vans and trucks match the brand on the door.",
  },
  {
    icon: <HomeIcon className="w-6 h-6" />,
    title: "Property & facilities",
    desc: "Maintenance and leasing vehicles kept clean for resident and vendor-facing work.",
  },
  {
    icon: <Car className="w-6 h-6" />,
    title: "One-off multi-vehicle jobs",
    desc: "Batch vehicles before an event, season, or sale.",
  },
];

const FAQS = [
  {
    q: "Do you come to our lot or yard?",
    a: "Yes — on-site is our default. We bring professional-grade, paint-safe products and equipment to your facility or lot.",
  },
  {
    q: "Is pricing per vehicle or monthly?",
    a: "Custom either way, depending on what fits your operation. We'll confirm the structure after a short call or form.",
  },
  {
    q: "Can we set up a recurring schedule?",
    a: "Yes — regular clients get priority scheduling, and we'll build a recurring cadence around your operation.",
  },
  {
    q: "What do we need to provide?",
    a: "Access to the vehicles, workable space, and water/power at the service location.",
  },
  {
    q: "Do you work with dealerships?",
    a: "Yes — lot presentation, delivery prep, and recurring lot support for used and CPO inventory.",
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
        <ChevronDown
          className={`w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border pt-4">
          {a}
        </div>
      )}
    </div>
  );
}

interface FleetForm {
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  city: string;
  vehicleCount: string;
  vehicleTypes: FleetVehicleType[];
  opportunityType: FleetOpportunityType | null;
  frequency: FleetFrequency | null;
  notes: string;
  smsConsent: boolean;
}

const EMPTY_FORM: FleetForm = {
  companyName: "",
  contactName: "",
  phone: "",
  email: "",
  city: "",
  vehicleCount: "",
  vehicleTypes: [],
  opportunityType: null,
  frequency: null,
  notes: "",
  smsConsent: false,
};

export default function Commercial() {
  const [form, setForm] = useState<FleetForm>(EMPTY_FORM);
  const [sending, setSending] = useState(false);

  const sendFleetQuote = trpc.content.sendFleetQuote.useMutation({
    onSuccess: () => {
      toast.success(
        `Thanks — we'll review your fleet details and follow up shortly. For faster help, call or text ${BRAND.phone}.`
      );
      setForm(EMPTY_FORM);
      setSending(false);
    },
    onError: err => {
      toast.error(err.message || "Failed to send. Please call us directly.");
      setSending(false);
    },
  });

  const toggleVehicleType = (type: FleetVehicleType) => {
    setForm(f => ({
      ...f,
      vehicleTypes: f.vehicleTypes.includes(type)
        ? f.vehicleTypes.filter(t => t !== type)
        : [...f.vehicleTypes, type],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !form.companyName ||
      !form.contactName ||
      !form.phone ||
      !form.email ||
      !form.city ||
      !form.vehicleCount
    ) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (form.vehicleTypes.length === 0) {
      toast.error("Select at least one vehicle type.");
      return;
    }
    if (!form.opportunityType) {
      toast.error("Select the opportunity type that fits best.");
      return;
    }
    if (!form.frequency) {
      toast.error("Select your preferred frequency.");
      return;
    }
    setSending(true);
    sendFleetQuote.mutate({
      companyName: form.companyName,
      contactName: form.contactName,
      phone: form.phone,
      email: form.email,
      city: form.city,
      vehicleCount: form.vehicleCount,
      vehicleTypes: form.vehicleTypes,
      opportunityType: form.opportunityType,
      frequency: form.frequency,
      notes: form.notes || undefined,
      smsConsent: form.smsConsent,
    });
  };

  const phoneHref = `tel:${BRAND.phone.replace(/\D/g, "")}`;
  const emailHref = `mailto:${BRAND.email}`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <SEO
        title="Fleet & Commercial Detailing in Racine & SE Wisconsin"
        description="On-site fleet and dealership detailing for Racine, Kenosha, Oak Creek, and nearby SE Wisconsin. Custom programs for businesses, contractors, and property managers. Call (262) 260-9474."
        canonical="/commercial"
        jsonLd={[
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Commercial", url: "/commercial" },
          ]),
          faqSchema(FAQS),
        ]}
      />

      {/* Hero */}
      <section className="pt-24 pb-10 sm:pt-28 sm:pb-16 bg-[#0a0a0a] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_70%_40%,oklch(0.55_0.18_240/0.08),transparent)]" />
        <div className="container relative z-10 text-center">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.p
              variants={fadeUp}
              className="text-primary text-sm font-semibold tracking-widest uppercase mb-3"
            >
              Forma Auto Spa · Racine County & SE Wisconsin
            </motion.p>
            <motion.h1
              variants={fadeUp}
              className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-5 max-w-3xl mx-auto"
            >
              Fleet & commercial detailing that keeps your vehicles
              presentation-ready
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8"
            >
              We detail fleets, dealership lots, and company vehicles on-site
              — so your brand looks as sharp as your work. Serving Racine,
              Mount Pleasant, Caledonia, Sturtevant, Kenosha, Oak Creek,
              Franklin, Pleasant Prairie, and nearby.
            </motion.p>
            <motion.div
              variants={fadeUp}
              className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6"
            >
              <a href="#fleet-quote-form">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 h-12 text-base w-full sm:w-auto">
                  Get a fleet quote
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </a>
              <a href={phoneHref}>
                <Button
                  variant="outline"
                  className="border-border hover:border-primary/50 px-8 h-12 text-base w-full sm:w-auto"
                >
                  <Phone className="w-4 h-4 mr-1" />
                  Call or text {BRAND.phone}
                </Button>
              </a>
            </motion.div>
            <motion.p
              variants={fadeUp}
              className="text-muted-foreground text-xs sm:text-sm"
            >
              Fully insured · Professionally equipped · Same-week
              availability when open slots allow
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Who this is for */}
      <section className="py-16 sm:py-20">
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
              Built for operations that run more than one vehicle
            </motion.h2>
            <motion.ul variants={fadeUp} className="space-y-3 mb-6">
              {WHO_ITS_FOR.map(item => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </motion.ul>
            <motion.p
              variants={fadeUp}
              className="text-center text-muted-foreground text-sm italic"
            >
              One truck that looks neglected becomes the customer's first
              impression. We help you keep every unit consistent.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 sm:py-20 bg-[#0a0a0a]">
        <div className="container max-w-4xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.h2
              variants={fadeUp}
              className="text-2xl sm:text-3xl font-display font-bold mb-10 text-center"
            >
              Simple fleet programs — not a one-size retail package
            </motion.h2>
            <motion.div
              variants={fadeUp}
              className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8"
            >
              {[
                {
                  n: 1,
                  title: "Tell us your fleet",
                  desc: "Vehicle count, types, locations, and how often you need service.",
                },
                {
                  n: 2,
                  title: "We propose a program",
                  desc: "Recurring wash/detail cadence, on-site at your facility or lot.",
                },
                {
                  n: 3,
                  title: "We show up and stay consistent",
                  desc: "Same standards across the fleet, scheduled around your operation.",
                },
              ].map(step => (
                <div
                  key={step.n}
                  className="p-6 rounded-2xl border border-border bg-card"
                >
                  <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center mb-4">
                    <span className="text-primary-foreground text-sm font-bold">
                      {step.n}
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-base mb-2">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              ))}
            </motion.div>
            <motion.p
              variants={fadeUp}
              className="text-center text-muted-foreground text-sm max-w-2xl mx-auto"
            >
              Every service is performed at your location — no drop-off
              required. We bring professional-grade, paint-safe products and
              equipment; you provide access to water and power.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* What's included */}
      <section className="py-16 sm:py-20">
        <div className="container max-w-3xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.h2
              variants={fadeUp}
              className="text-2xl sm:text-3xl font-display font-bold mb-8 text-center"
            >
              What fleet programs typically include
            </motion.h2>
            <motion.ul
              variants={fadeUp}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8"
            >
              {PROGRAM_INCLUDES.map(item => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-sm p-4 rounded-xl border border-border bg-card"
                >
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </motion.ul>
            <motion.div
              variants={fadeUp}
              className="rounded-2xl border border-primary/25 bg-primary/5 p-6 text-center"
            >
              <p className="text-sm text-muted-foreground mb-4">
                Fleet pricing is custom-built. No published package prices —
                we quote after we understand count, frequency, and scope.
              </p>
              <a href="#fleet-quote-form">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8">
                  Get your fleet quote
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Programs by need */}
      <section className="py-16 sm:py-20 bg-[#0a0a0a]">
        <div className="container max-w-4xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.h2
              variants={fadeUp}
              className="text-2xl sm:text-3xl font-display font-bold mb-10 text-center"
            >
              Common setups we build
            </motion.h2>
            <motion.div
              variants={fadeUp}
              className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8"
            >
              {PROGRAMS_BY_NEED.map(p => (
                <div
                  key={p.title}
                  className="p-6 rounded-2xl border border-border bg-card"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4">
                    {p.icon}
                  </div>
                  <h3 className="font-display font-bold text-base mb-2">
                    {p.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {p.desc}
                  </p>
                </div>
              ))}
            </motion.div>
            <motion.p variants={fadeUp} className="text-center text-sm">
              <span className="text-muted-foreground">
                Just need a single vehicle?{" "}
              </span>
              <Link href="/pricing">
                <span className="text-primary hover:underline font-medium cursor-pointer">
                  View our detailing packages
                </span>
              </Link>
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Service area */}
      <section className="py-16 sm:py-20">
        <div className="container max-w-3xl text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.div
              variants={fadeUp}
              className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto mb-5"
            >
              <MapPin className="w-6 h-6" />
            </motion.div>
            <motion.h2
              variants={fadeUp}
              className="text-2xl sm:text-3xl font-display font-bold mb-5"
            >
              Service Area
            </motion.h2>
            <motion.div
              variants={fadeUp}
              className="flex flex-wrap items-center justify-center gap-2 mb-4"
            >
              {PRIORITY_TOWNS.map((town, i) => (
                <span key={town} className="text-sm text-muted-foreground">
                  {town}
                  {i < PRIORITY_TOWNS.length - 1 && (
                    <span className="text-muted-foreground/40 ml-2">·</span>
                  )}
                </span>
              ))}
            </motion.div>
            <motion.p
              variants={fadeUp}
              className="text-muted-foreground text-sm"
            >
              Travel outside our priority area may include a travel fee —
              see{" "}
              <Link href="/service-area">
                <span className="text-primary hover:underline font-medium cursor-pointer">
                  full service area details
                </span>
              </Link>
              .
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Fleet quote form */}
      <section
        id="fleet-quote-form"
        className="py-16 sm:py-20 bg-[#0a0a0a] scroll-mt-24"
      >
        <div className="container max-w-2xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto mb-5">
                <ClipboardList className="w-6 h-6" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-display font-bold mb-3">
                Get a Fleet Quote
              </h2>
              <p className="text-muted-foreground text-sm max-w-lg mx-auto">
                Tell us about your fleet. We'll get back with a program that
                fits.
              </p>
            </div>

            <div className="p-6 sm:p-8 rounded-2xl border border-border bg-card">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">
                      Company name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="companyName"
                      placeholder="Your company"
                      value={form.companyName}
                      onChange={e =>
                        setForm({ ...form, companyName: e.target.value })
                      }
                      className="bg-input border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactName">
                      Contact name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="contactName"
                      placeholder="Your name"
                      value={form.contactName}
                      onChange={e =>
                        setForm({ ...form, contactName: e.target.value })
                      }
                      className="bg-input border-border"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">
                      Phone <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="phone"
                      placeholder="(555) 000-0000"
                      value={form.phone}
                      onChange={e =>
                        setForm({ ...form, phone: e.target.value })
                      }
                      className="bg-input border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      Email <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      value={form.email}
                      onChange={e =>
                        setForm({ ...form, email: e.target.value })
                      }
                      className="bg-input border-border"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">
                      City / service location{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="city"
                      placeholder="e.g. Racine, WI"
                      value={form.city}
                      onChange={e =>
                        setForm({ ...form, city: e.target.value })
                      }
                      className="bg-input border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicleCount">
                      Approx. number of vehicles{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="vehicleCount"
                      placeholder="e.g. 8"
                      value={form.vehicleCount}
                      onChange={e =>
                        setForm({ ...form, vehicleCount: e.target.value })
                      }
                      className="bg-input border-border"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>
                    Vehicle types <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {FLEET_VEHICLE_TYPES.map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => toggleVehicleType(type)}
                        className={cn(
                          "px-3.5 py-2 rounded-lg border text-sm font-medium transition-all",
                          form.vehicleTypes.includes(type)
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/40"
                        )}
                      >
                        {FLEET_VEHICLE_TYPE_LABELS[type]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>
                    Opportunity type{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {FLEET_OPPORTUNITY_TYPES.map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() =>
                          setForm({ ...form, opportunityType: type })
                        }
                        className={cn(
                          "px-3.5 py-2 rounded-lg border text-sm font-medium transition-all",
                          form.opportunityType === type
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/40"
                        )}
                      >
                        {FLEET_OPPORTUNITY_TYPE_LABELS[type]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>
                    Preferred frequency{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {FLEET_FREQUENCIES.map(freq => (
                      <button
                        key={freq}
                        type="button"
                        onClick={() => setForm({ ...form, frequency: freq })}
                        className={cn(
                          "px-3.5 py-2 rounded-lg border text-sm font-medium transition-all",
                          form.frequency === freq
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/40"
                        )}
                      >
                        {FLEET_FREQUENCY_LABELS[freq]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Anything else we should know about your fleet or operation..."
                    rows={4}
                    value={form.notes}
                    onChange={e =>
                      setForm({ ...form, notes: e.target.value })
                    }
                    className="bg-input border-border resize-none"
                  />
                </div>

                <SmsConsentField
                  id="fleet-sms-consent"
                  checked={form.smsConsent}
                  onChange={v => setForm({ ...form, smsConsent: v })}
                />

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-11"
                  disabled={sending}
                >
                  {sending ? (
                    "Sending..."
                  ) : (
                    <>
                      Get My Fleet Quote
                      <Send className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-20">
        <div className="container max-w-2xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.h2
              variants={fadeUp}
              className="text-2xl sm:text-3xl font-display font-bold mb-8 text-center"
            >
              Frequently Asked Questions
            </motion.h2>
            <motion.div variants={fadeUp} className="space-y-3">
              {FAQS.map(faq => (
                <FAQItem key={faq.q} q={faq.q} a={faq.a} />
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 sm:py-20 bg-[#0a0a0a] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_50%_50%,oklch(0.55_0.18_240/0.1),transparent)]" />
        <div className="container relative z-10 text-center">
          <h2 className="text-2xl sm:text-3xl font-display font-bold mb-3">
            Tell us about your fleet.
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            We'll get back with a program that fits.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="#fleet-quote-form">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 h-12 text-base w-full sm:w-auto">
                Get a fleet quote
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </a>
            <a href={phoneHref}>
              <Button
                variant="outline"
                className="border-border hover:border-primary/50 px-8 h-12 text-base w-full sm:w-auto"
              >
                <Phone className="w-4 h-4 mr-1" />
                Call {BRAND.phone}
              </Button>
            </a>
            <a href={emailHref}>
              <Button
                variant="outline"
                className="border-border hover:border-primary/50 px-8 h-12 text-base w-full sm:w-auto"
              >
                <Mail className="w-4 h-4 mr-1" />
                Email us
              </Button>
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
