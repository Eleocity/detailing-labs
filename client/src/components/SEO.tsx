import { Helmet } from "react-helmet-async";

const SITE_NAME    = "Detailing Labs";
const SITE_URL     = "https://detailinglabswi.com";
const DEFAULT_DESC = "Professional mobile auto detailing in Southeast Wisconsin. We bring our own water and power. Serving Racine, Kenosha, and Milwaukee County. Book online in 2 minutes.";
const OG_IMAGE     = "https://d2xsxph8kpxj0f.cloudfront.net/310519663425808543/7UUm3VYuvjMZWzXs65cJTQ/detailing-labs-logo-clean_f1e7bfe0.png";

interface SEOProps {
  title?:       string;
  description?: string;
  image?:       string;
  canonical?:   string;
  noindex?:     boolean;
  type?:        "website" | "article" | "service";
  jsonLd?:      object | object[];
}

export default function SEO({
  title,
  description = DEFAULT_DESC,
  image       = OG_IMAGE,
  canonical,
  noindex     = false,
  type        = "website",
  jsonLd,
}: SEOProps) {
  const fullTitle    = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Professional Mobile Auto Detailing`;
  const canonicalUrl = canonical ? `${SITE_URL}${canonical}` : undefined;

  // Trim description to 155 chars max
  const desc = description.length > 155
    ? description.slice(0, 152) + "..."
    : description;

  return (
    <Helmet>
      {/* Primary */}
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {noindex
        ? <meta name="robots" content="noindex, nofollow" />
        : <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
      }
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* Open Graph */}
      <meta property="og:title"       content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:image"       content={image} />
      <meta property="og:image:width"  content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt"   content="Detailing Labs — Professional Mobile Auto Detailing" />
      <meta property="og:type"        content={type} />
      <meta property="og:site_name"   content={SITE_NAME} />
      <meta property="og:locale"      content="en_US" />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}

      {/* Twitter Card */}
      <meta name="twitter:card"        content="summary_large_image" />
      <meta name="twitter:title"       content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image"       content={image} />
      <meta name="twitter:image:alt"   content="Detailing Labs — Professional Mobile Auto Detailing" />

      {/* Geo */}
      <meta name="geo.region"   content="US-WI" />
      <meta name="geo.placename" content="Racine County, Wisconsin" />

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
  "@context":   "https://schema.org",
  "@type":      ["LocalBusiness", "AutoBodyShop"],
  "name":       "Detailing Labs",
  "description": "Professional mobile auto detailing service based in Southeast Wisconsin. We bring our own water, power, and professional-grade products to your driveway.",
  "url":        SITE_URL,
  "logo":       OG_IMAGE,
  "image":      OG_IMAGE,
  "priceRange": "$$",
  "currenciesAccepted": "USD",
  "paymentAccepted": "Cash, Credit Card",
  "telephone":  "+12622609474",
  "email":      "hello@detailinglabswi.com",
  "address": {
    "@type":           "PostalAddress",
    "streetAddress":   "Sturtevant",
    "addressLocality": "Sturtevant",
    "addressRegion":   "WI",
    "postalCode":      "53177",
    "addressCountry":  "US",
  },
  "geo": {
    "@type":     "GeoCoordinates",
    "latitude":   42.7261,
    "longitude": -87.8897,
  },
  "openingHoursSpecification": [
    {
      "@type":      "OpeningHoursSpecification",
      "dayOfWeek":  ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
      "opens":      "07:00",
      "closes":     "19:00",
    },
  ],
  "areaServed": [
    { "@type": "County", "name": "Racine County",   "containedIn": { "@type": "State", "name": "Wisconsin" } },
    { "@type": "County", "name": "Kenosha County",  "containedIn": { "@type": "State", "name": "Wisconsin" } },
    { "@type": "County", "name": "Milwaukee County","containedIn": { "@type": "State", "name": "Wisconsin" } },
  ],
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name":  "Mobile Auto Detailing Services",
    "itemListElement": [
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Exterior Decon & Shield",      "description": "Decontamination wash and 3-month hydrophobic protection. From $129." } },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Interior Deep Refresh",        "description": "Complete cabin sanitization and restoration. From $129." } },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Full Showroom Reset",          "description": "Complete interior and exterior detail. From $229." } },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "The Lab Grade Detail",         "description": "Full detail with paint correction and ceramic sealant. From $449." } },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Ceramic Coating",              "description": "Professional ceramic coating application. Custom quoted." } },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Paint Correction",             "description": "Remove swirl marks, scratches, and oxidation. Custom quoted." } },
    ],
  },
  "sameAs": [
    "https://www.facebook.com/detailinglabs",
    "https://www.instagram.com/detailinglabs",
  ],
};

export const faqSchema = (faqs: { q: string; a: string }[]) => ({
  "@context": "https://schema.org",
  "@type":    "FAQPage",
  "mainEntity": faqs.map(({ q, a }) => ({
    "@type": "Question",
    "name":  q,
    "acceptedAnswer": { "@type": "Answer", "text": a },
  })),
});

export const serviceSchema = (name: string, description: string, price?: string) => ({
  "@context":    "https://schema.org",
  "@type":       "Service",
  "serviceType": "Auto Detailing",
  "provider": {
    "@type": "LocalBusiness",
    "name":  "Detailing Labs",
    "url":   SITE_URL,
  },
  "name":        name,
  "description": description,
  "areaServed":  { "@type": "State", "name": "Southeast Wisconsin" },
  ...(price ? { "offers": { "@type": "Offer", "price": price, "priceCurrency": "USD" } } : {}),
});

export const breadcrumbSchema = (items: { name: string; url: string }[]) => ({
  "@context": "https://schema.org",
  "@type":    "BreadcrumbList",
  "itemListElement": items.map(({ name, url }, i) => ({
    "@type":    "ListItem",
    "position": i + 1,
    "name":     name,
    "item":     `${SITE_URL}${url}`,
  })),
});

export const reviewSchema = (reviews: { author: string; rating: number; text: string; date?: string }[]) => ({
  "@context": "https://schema.org",
  "@type":    "LocalBusiness",
  "name":     "Detailing Labs",
  "aggregateRating": {
    "@type":       "AggregateRating",
    "ratingValue": "5.0",
    "bestRating":  "5",
    "worstRating": "1",
    "ratingCount": String(reviews.length),
  },
  "review": reviews.map(r => ({
    "@type":        "Review",
    "author":       { "@type": "Person", "name": r.author },
    "reviewRating": { "@type": "Rating", "ratingValue": String(r.rating), "bestRating": "5" },
    "reviewBody":   r.text,
    ...(r.date ? { "datePublished": r.date } : {}),
  })),
});
