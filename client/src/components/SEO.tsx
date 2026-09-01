import { Helmet } from "react-helmet-async";
import { BRAND, absoluteUrl } from "@shared/brand";
import { getActivePackages } from "@shared/services";

const SITE_NAME = BRAND.displayName;
// Points at the domain actually deployed today, not the future `primary`
// placeholder — see the comment on BRAND.domain.live for why.
const SITE_URL = `https://${BRAND.domain.live}`;
const DEFAULT_DESCRIPTION = BRAND.seo.defaultDescription;
const DEFAULT_IMAGE = BRAND.logo.ogImageAbsoluteUrl(SITE_URL);
const VERIFIED_SOCIAL_URLS = [
  BRAND.social.instagram,
  BRAND.social.facebook,
  BRAND.social.tiktok,
].filter((url): url is string => Boolean(url));

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  canonical?: string;
  noindex?: boolean;
  type?: "website" | "article" | "service";
  jsonLd?: object | object[];
}

export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  canonical,
  noindex = false,
  type = "website",
  jsonLd,
}: SEOProps) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : BRAND.seo.defaultTitle;
  const canonicalUrl = canonical ? absoluteUrl(SITE_URL, canonical) : undefined;

  return (
    <Helmet>
      {/* Primary */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* JSON-LD Structured Data */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(Array.isArray(jsonLd) ? jsonLd : [jsonLd])}
        </script>
      )}
    </Helmet>
  );
}

// ── Pre-built JSON-LD schemas ─────────────────────────────────────────────────

export const localBusinessSchema = {
  "@context": "https://schema.org",
  // schema.org has no dedicated "auto detailing" type. Of the
  // AutomotiveBusiness subtypes, AutoWash (a car-wash/cosmetic-care
  // business) is the closest accurate fit — Forma does exterior/interior
  // detailing, paint correction, and ceramic coating, none of which is
  // mechanical repair, so "AutoRepair" (a body/repair shop) misrepresents
  // the business.
  "@type": "AutoWash",
  name: BRAND.displayName,
  description: `${BRAND.tagline} Mobile detailing studio serving ${BRAND.serviceArea.primaryRegionLabel}.`,
  url: SITE_URL,
  logo: DEFAULT_IMAGE,
  image: DEFAULT_IMAGE,
  telephone: BRAND.phoneHref.replace("tel:", ""),
  priceRange: "$$",
  address: {
    "@type": "PostalAddress",
    addressLocality: BRAND.serviceArea.headquartersCity,
    addressRegion: BRAND.serviceArea.headquartersState,
    addressCountry: "US",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: BRAND.serviceArea.headquartersLat,
    longitude: BRAND.serviceArea.headquartersLng,
  },
  openingHoursSpecification: BRAND.hours.schema.map(s => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: s.days,
    opens: s.opens,
    closes: s.closes,
  })),
  areaServed: {
    "@type": "GeoCircle",
    geoMidpoint: {
      "@type": "GeoCoordinates",
      latitude: BRAND.serviceArea.headquartersLat,
      longitude: BRAND.serviceArea.headquartersLng,
    },
    geoRadius: "50000",
  },
  // Built from the same catalog the marketing/booking pages use — see
  // shared/services.ts — so a package rename/retirement (e.g. standalone
  // interior/exterior detailing being discontinued) can't silently leave
  // stale offers in structured data.
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Auto Detailing Services",
    itemListElement: getActivePackages().map(p => ({
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: p.name },
    })),
  },
  // Omit rather than list social profiles we can't confirm are real/correct
  // — see the comment on BRAND.social in shared/brand.ts for why every
  // value there is currently `null`.
  ...(VERIFIED_SOCIAL_URLS.length ? { sameAs: VERIFIED_SOCIAL_URLS } : {}),
};

export const faqSchema = (faqs: { q: string; a: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
});

export const serviceSchema = (
  name: string,
  description: string,
  price?: string
) => ({
  "@context": "https://schema.org",
  "@type": "Service",
  serviceType: "Auto Detailing",
  provider: { "@type": "LocalBusiness", name: BRAND.displayName },
  name: name,
  description: description,
  ...(price
    ? { offers: { "@type": "Offer", price: price, priceCurrency: "USD" } }
    : {}),
  areaServed: { "@type": "State", name: "Southeast Wisconsin" },
});

export const breadcrumbSchema = (items: { name: string; url: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map(({ name, url }, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: name,
    item: absoluteUrl(SITE_URL, url),
  })),
});
