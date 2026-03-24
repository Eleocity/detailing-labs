import { Helmet } from "react-helmet-async";

const SITE_NAME = "Detailing Labs";
const SITE_URL = "https://detailinglabswi.com";
const DEFAULT_DESCRIPTION = "Detailing Labs is a professional mobile detailing service in Southeast Wisconsin. Serving Racine County, Kenosha, and surrounding areas. We bring everything — book online.";
const DEFAULT_IMAGE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663425808543/7UUm3VYuvjMZWzXs65cJTQ/detailing-labs-logo-clean_f1e7bfe0.png";

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
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Premium Mobile Auto Detailing`;
  const canonicalUrl = canonical ? `${SITE_URL}${canonical}` : undefined;

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
  "@type": "AutoRepair",
  "name": "Detailing Labs",
  "description": "Premium mobile auto detailing service. We come to your home, office, or anywhere you park.",
  "url": SITE_URL,
  "logo": DEFAULT_IMAGE,
  "image": DEFAULT_IMAGE,
  "priceRange": "$$",
  "servesCuisine": undefined,
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Sturtevant",
    "addressRegion": "WI",
    "addressCountry": "US",
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 42.7261,
    "longitude": -87.7829,
  },
  "openingHoursSpecification": [
    { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"], "opens": "07:00", "closes": "19:00" },
    { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Saturday"], "opens": "08:00", "closes": "17:00" },
  ],
  "areaServed": {
    "@type": "GeoCircle",
    "geoMidpoint": { "@type": "GeoCoordinates", "latitude": 42.7261, "longitude": -86.7816 },
    "geoRadius": "50000",
  },
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "Auto Detailing Services",
    "itemListElement": [
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Interior Detail" } },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Exterior Detail" } },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Full Detail" } },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Ceramic Coating" } },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Paint Correction" } },
    ],
  },
  "sameAs": [
    "https://www.facebook.com/detailinglabs",
    "https://www.instagram.com/detailinglabs",
  ],
};

export const faqSchema = (faqs: { q: string; a: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqs.map(({ q, a }) => ({
    "@type": "Question",
    "name": q,
    "acceptedAnswer": { "@type": "Answer", "text": a },
  })),
});

export const serviceSchema = (name: string, description: string, price?: string) => ({
  "@context": "https://schema.org",
  "@type": "Service",
  "serviceType": "Auto Detailing",
  "provider": { "@type": "LocalBusiness", "name": "Detailing Labs" },
  "name": name,
  "description": description,
  ...(price ? { "offers": { "@type": "Offer", "price": price, "priceCurrency": "USD" } } : {}),
  "areaServed": { "@type": "State", "name": "Southeast Wisconsin" },
});

export const breadcrumbSchema = (items: { name: string; url: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": items.map(({ name, url }, i) => ({
    "@type": "ListItem",
    "position": i + 1,
    "name": name,
    "item": `https://detailinglabswi.com${url}`,
  })),
});
