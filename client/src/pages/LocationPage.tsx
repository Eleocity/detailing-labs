import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ChevronRight, Star, MapPin, CheckCircle2, Phone,
  Sparkles, Shield, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SEO, { localBusinessSchema, breadcrumbSchema, serviceSchema } from "@/components/SEO";
import { trpc } from "@/lib/trpc";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};
const stagger = { visible: { transition: { staggerChildren: 0.09 } } };

export interface LocationData {
  city: string;
  county: string;
  state: string;
  slug: string;
  headline: string;
  subheadline: string;
  bodyParagraph: string;
  nearbyTowns: string[];
  landmarks?: string;
}

export const LOCATIONS: LocationData[] = [
  {
    city: "Racine",
    county: "Racine County",
    state: "WI",
    slug: "racine-wi",
    headline: "Mobile Auto Detailing in Racine, WI",
    subheadline: "Professional detailing delivered to your driveway in Racine. We bring everything — water, power, and equipment.",
    bodyParagraph: "Detailing Labs serves Racine and surrounding Racine County with professional mobile detailing. Whether you're near the lakefront, in the north side neighborhoods, or out by the Highway 20 corridor, we come to you. No drop-off, no waiting — we show up equipped and ready to work.",
    nearbyTowns: ["Mount Pleasant", "Sturtevant", "Caledonia", "Wind Point", "North Bay"],
    landmarks: "near the Racine lakefront and surrounding neighborhoods",
  },
  {
    city: "Kenosha",
    county: "Kenosha County",
    state: "WI",
    slug: "kenosha-wi",
    headline: "Mobile Auto Detailing in Kenosha, WI",
    subheadline: "We bring professional detailing directly to your home or office in Kenosha. No drop-off required.",
    bodyParagraph: "Detailing Labs provides professional mobile detailing throughout Kenosha and Kenosha County. From the lakeside neighborhoods to Pleasant Prairie and beyond, we operate a fully self-contained setup — our own water tank, our own generator. You stay where you are. We handle everything.",
    nearbyTowns: ["Pleasant Prairie", "Somers", "Bristol", "Salem", "Silver Lake"],
    landmarks: "serving the Kenosha lakefront area and surrounding communities",
  },
  {
    city: "Sturtevant",
    county: "Racine County",
    state: "WI",
    slug: "sturtevant-wi",
    headline: "Mobile Auto Detailing in Sturtevant, WI",
    subheadline: "Detailing Labs is based in Sturtevant. Professional mobile detailing at your door — same-week availability.",
    bodyParagraph: "Our home base is Sturtevant, WI, which means fast response times and same-week availability for most customers in the area. We service vehicles at your home, workplace, or any accessible location. Full interior, exterior, and ceramic coating services available.",
    nearbyTowns: ["Racine", "Mount Pleasant", "Caledonia", "Franksville", "Wind Point"],
  },
  {
    city: "Mount Pleasant",
    county: "Racine County",
    state: "WI",
    slug: "mount-pleasant-wi",
    headline: "Mobile Auto Detailing in Mount Pleasant, WI",
    subheadline: "Professional mobile detailing throughout Mount Pleasant and Racine County. We come to your door.",
    bodyParagraph: "Mount Pleasant is one of our most frequently served areas. Whether you're in a residential neighborhood or a commercial location near Highway 20 or the I-94 corridor, we can reach you quickly. Our mobile setup is fully self-contained — no water or power hookup needed from your property.",
    nearbyTowns: ["Racine", "Sturtevant", "Caledonia", "Union Grove", "Franksville"],
  },
  {
    city: "Oak Creek",
    county: "Milwaukee County",
    state: "WI",
    slug: "oak-creek-wi",
    headline: "Mobile Auto Detailing in Oak Creek, WI",
    subheadline: "We serve Oak Creek and the south Milwaukee area with professional mobile detailing. Book online.",
    bodyParagraph: "Detailing Labs extends service into Oak Creek and the southern Milwaukee suburbs. If you're in Oak Creek, Caledonia, or the surrounding area and looking for a professional mobile detailer who shows up properly equipped, we're the team. We carry everything needed to do the job right.",
    nearbyTowns: ["Caledonia", "South Milwaukee", "Cudahy", "Franklin", "Racine"],
  },
  {
    city: "Caledonia",
    county: "Racine County",
    state: "WI",
    slug: "caledonia-wi",
    headline: "Mobile Auto Detailing in Caledonia, WI",
    subheadline: "Professional mobile detailing in Caledonia, WI. We bring our own water and power — no hookup needed.",
    bodyParagraph: "Caledonia sits right in our core service area. We regularly detail vehicles throughout the township — from rural properties to residential neighborhoods along Highway 31 and 38. Our fully mobile setup means we can reach most locations in Caledonia with ease and same-week availability.",
    nearbyTowns: ["Racine", "Mount Pleasant", "Oak Creek", "Franksville", "Wind Point"],
  },
  {
    city: "Burlington",
    county: "Racine County",
    state: "WI",
    slug: "burlington-wi",
    headline: "Mobile Auto Detailing in Burlington, WI",
    subheadline: "Detailing Labs serves Burlington and western Racine County with professional mobile detailing.",
    bodyParagraph: "We extend our mobile detailing service west into Burlington and the surrounding areas of western Racine County. Travel fees may apply for locations further from our Sturtevant base — we'll confirm at booking. Same professional setup, same quality of work.",
    nearbyTowns: ["Rochester", "Union Grove", "Waterford", "East Troy", "Elkhorn"],
  },
  {
    city: "Franksville",
    county: "Racine County",
    state: "WI",
    slug: "franksville-wi",
    headline: "Mobile Auto Detailing in Franksville, WI",
    subheadline: "Professional mobile detailing in Franksville and central Racine County. We come to your location.",
    bodyParagraph: "Franksville and the surrounding areas of central Racine County are well within our service range. Whether you're a few miles off I-94 or out on a rural property, our self-contained mobile setup can reach you. Book online and we'll confirm availability at your address.",
    nearbyTowns: ["Mount Pleasant", "Sturtevant", "Caledonia", "Wind Point", "Union Grove"],
  },
];

function LocationPage({ location }: { location: LocationData }) {
  const { data: contactData } = trpc.content.getSiteContent.useQuery({ section: "contact" });
  const contact = Object.fromEntries((contactData ?? []).map(r => [r.key, r.value ?? ""]));
  const phone     = contact.phone || "(262) 555-0190";
  const phoneHref = `tel:${phone.replace(/\D/g, "")}`;

  const fullLocation = `${location.city}, ${location.state}`;
  const canonicalPath = `/mobile-detailing-${location.slug}`;

  const jsonLd = [
    {
      ...localBusinessSchema,
      name: `Detailing Labs — ${fullLocation}`,
      description: location.subheadline,
      areaServed: {
        "@type": "City",
        "name": fullLocation,
      },
    },
    serviceSchema(
      `Mobile Auto Detailing in ${fullLocation}`,
      location.bodyParagraph
    ),
    breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: `Mobile Detailing ${location.city}`, url: canonicalPath },
    ]),
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <SEO
        title={`${location.headline} | Detailing Labs`}
        description={`${location.subheadline} Serving ${location.city}, ${location.county}, and surrounding areas.`}
        canonical={canonicalPath}
        jsonLd={jsonLd}
      />

      {/* Hero */}
      <section className="relative pt-24 pb-14 sm:pt-32 sm:pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.06_0.004_280)] via-[oklch(0.08_0.005_280)] to-[oklch(0.10_0.008_295)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_30%_50%,oklch(0.60_0.22_295/0.07),transparent)]" />
        <div className="container relative z-10">
          <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-3xl">
            <motion.div variants={fadeUp} className="mb-4">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold tracking-widest uppercase">
                <MapPin className="w-3 h-3" /> {location.city}, {location.county}
              </span>
            </motion.div>
            <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-5 leading-tight">
              {location.headline}
            </motion.h1>
            <motion.p variants={fadeUp} className="text-lg text-muted-foreground max-w-2xl leading-relaxed mb-8">
              {location.subheadline}
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3">
              <Link href="/booking">
                <Button size="lg" className="bg-primary hover:bg-primary/90 font-semibold px-8 h-12 w-full sm:w-auto">
                  Book in {location.city} <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
              <a href={phoneHref}>
                <Button size="lg" variant="outline" className="border-border hover:border-primary/50 font-semibold px-8 h-12 w-full sm:w-auto">
                  <Phone className="w-4 h-4 mr-2" /> {phone}
                </Button>
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Body */}
      <section className="py-14 sm:py-20">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start max-w-5xl mx-auto">
            <div>
              <h2 className="text-2xl sm:text-3xl font-display font-bold mb-5">
                Professional Mobile Detailing — {location.city}
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">{location.bodyParagraph}</p>

              {location.landmarks && (
                <p className="text-muted-foreground leading-relaxed mb-6">
                  We operate throughout {location.city} — {location.landmarks} — and can service your vehicle at your home, workplace, or any accessible location.
                </p>
              )}

              <p className="text-muted-foreground leading-relaxed mb-8">
                All services are performed by a trained detailer with professional-grade equipment. We use our own water tank and generator, so we don't need access to your property's utilities.
              </p>

              {/* What's included */}
              <div className="space-y-3">
                {[
                  "Exterior Decon & Shield — from $129",
                  "Interior Deep Refresh — from $129",
                  "Full Showroom Reset — from $229",
                  "Ceramic Coating — custom quoted",
                  "Specialty add-ons available",
                ].map(item => (
                  <div key={item} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {/* Trust signals */}
              <div className="p-6 rounded-2xl border border-border bg-card">
                <div className="flex items-center gap-1 mb-3">
                  {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
                  <span className="ml-2 text-sm text-muted-foreground">5.0 rating</span>
                </div>
                <h3 className="font-display font-bold text-lg mb-3">Why {location.city} Customers Choose Us</h3>
                <div className="space-y-3">
                  {[
                    "Fully self-contained — our own water & power",
                    "Professional products on every job",
                    "Trained technicians, not day laborers",
                    "Same-week availability on most dates",
                    "Fully insured mobile operation",
                  ].map(point => (
                    <div key={point} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{point}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA card */}
              <div className="p-6 rounded-2xl border-2 border-primary/40 bg-primary/5">
                <h3 className="font-display font-bold mb-2">Ready to Book in {location.city}?</h3>
                <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                  Book online in under 2 minutes. We'll confirm your appointment and show up equipped.
                </p>
                <Link href="/booking">
                  <Button className="w-full bg-primary hover:bg-primary/90 font-semibold mb-3">
                    Book Your Detail <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button variant="outline" className="w-full border-border hover:border-primary/50 text-sm">
                    View Packages & Pricing
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services section */}
      <section className="py-12 sm:py-16 bg-[oklch(0.06_0.004_280)]">
        <div className="container">
          <div className="text-center mb-10">
            <p className="text-primary text-xs font-semibold tracking-widest uppercase mb-2">Services in {location.city}</p>
            <h2 className="text-2xl sm:text-3xl font-display font-bold">What We Offer</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <Link href="/pricing?tab=detailing">
              <div className="group flex flex-col gap-4 p-6 rounded-2xl border-2 border-border bg-card hover:border-primary/60 hover:bg-primary/4 transition-all cursor-pointer h-full">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base mb-1">Detailing Packages</h3>
                  <p className="text-muted-foreground text-sm">Interior, exterior, and full-service from $129.</p>
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-primary mt-auto">
                  View pricing <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </Link>
            <Link href="/pricing?tab=ceramic">
              <div className="group flex flex-col gap-4 p-6 rounded-2xl border-2 border-border bg-card hover:border-amber-500/50 hover:bg-amber-500/3 transition-all cursor-pointer h-full">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                  <Shield className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base mb-1">Ceramic Coating</h3>
                  <p className="text-muted-foreground text-sm">Custom-quoted to your vehicle. Long-term protection.</p>
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-amber-500 mt-auto">
                  Get a quote <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Nearby towns */}
      <section className="py-12 sm:py-16">
        <div className="container max-w-3xl mx-auto">
          <h2 className="text-xl font-display font-bold mb-5">Also Serving Near {location.city}</h2>
          <div className="flex flex-wrap gap-2">
            {location.nearbyTowns.map(town => (
              <span key={town} className="text-sm px-3.5 py-1.5 rounded-full border border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
                {town}, WI
              </span>
            ))}
          </div>
          <p className="text-muted-foreground text-sm mt-5 leading-relaxed">
            We service {location.city} and surrounding {location.county} communities. If your town isn't listed, <Link href="/contact"><span className="text-primary hover:underline cursor-pointer">contact us</span></Link> — we likely cover it.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-14 bg-[oklch(0.06_0.004_280)]">
        <div className="container text-center">
          <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">Ready for a Professional Detail in {location.city}?</h2>
          <p className="text-muted-foreground max-w-lg mx-auto mb-8 text-sm">
            Book online, we confirm, and we show up at your location — fully equipped. No drop-off. No hassle.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 px-4 sm:px-0">
            <Link href="/booking">
              <Button className="bg-primary hover:bg-primary/90 font-semibold px-10 h-12 w-full sm:w-auto">
                Book in {location.city} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <a href={phoneHref}>
              <Button variant="outline" className="border-border hover:border-primary/50 font-semibold px-8 h-12 w-full sm:w-auto">
                <Phone className="w-4 h-4 mr-2" /> {phone}
              </Button>
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

// Individual page exports
export function LocationPageRacine()       { return <LocationPage location={LOCATIONS[0]} />; }
export function LocationPageKenosha()      { return <LocationPage location={LOCATIONS[1]} />; }
export function LocationPageSturtevant()   { return <LocationPage location={LOCATIONS[2]} />; }
export function LocationPageMountPleasant(){ return <LocationPage location={LOCATIONS[3]} />; }
export function LocationPageOakCreek()     { return <LocationPage location={LOCATIONS[4]} />; }
export function LocationPageCaledonia()    { return <LocationPage location={LOCATIONS[5]} />; }
export function LocationPageBurlington()   { return <LocationPage location={LOCATIONS[6]} />; }
export function LocationPageFranksville()  { return <LocationPage location={LOCATIONS[7]} />; }
