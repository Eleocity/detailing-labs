import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ZoomIn, Camera } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SEO, { breadcrumbSchema, localBusinessSchema } from "@/components/SEO";
import { trpc } from "@/lib/trpc";

const fadeUp = {
  hidden:   { opacity: 0, y: 24 },
  visible:  { opacity: 1, y: 0, transition: { duration: 0.55 } },
};

// Placeholder gradient items shown while real photos are loading or not yet uploaded
const PLACEHOLDER_ITEMS = [
  { id: -1,  label: "after",  caption: "BMW M4 — Full Detail",          category: "Exterior", color: "from-purple-900/60 to-black/80" },
  { id: -2,  label: "before", caption: "Range Rover — Before Detail",   category: "Exterior", color: "from-gray-800/60 to-black/80"   },
  { id: -3,  label: "after",  caption: "Porsche Cayenne — Interior",    category: "Interior", color: "from-purple-800/60 to-black/80" },
  { id: -4,  label: "after",  caption: "Tesla Model S — Ceramic",       category: "Ceramic",  color: "from-indigo-900/60 to-black/80" },
  { id: -5,  label: "before", caption: "Ford F-150 — Before Interior",  category: "Interior", color: "from-gray-700/60 to-black/80"   },
  { id: -6,  label: "after",  caption: "Ford F-150 — After Interior",   category: "Interior", color: "from-purple-900/60 to-black/80" },
  { id: -7,  label: "after",  caption: "Mercedes C63 — Paint Decon",    category: "Exterior", color: "from-violet-900/60 to-black/80" },
  { id: -8,  label: "after",  caption: "Audi RS7 — Ceramic Coating",    category: "Ceramic",  color: "from-purple-800/60 to-black/80" },
  { id: -9,  label: "after",  caption: "Corvette C8 — Full Detail",     category: "Exterior", color: "from-indigo-800/60 to-black/80" },
];

function inferCategory(caption: string | null): string {
  const c = (caption ?? "").toLowerCase();
  if (c.includes("interior") || c.includes("cabin") || c.includes("seat")) return "Interior";
  if (c.includes("ceramic") || c.includes("coating")) return "Ceramic";
  if (c.includes("paint") || c.includes("correction")) return "Paint";
  return "Exterior";
}

const CATEGORIES = ["All", "Exterior", "Interior", "Ceramic", "Paint"];

export default function Gallery() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedId, setSelectedId]         = useState<number | null>(null);

  const { data: dbPhotos, isLoading } = trpc.media.listPublicGallery.useQuery();

  // Build display items — real photos if available, otherwise placeholders
  const realItems = (dbPhotos ?? []).map(p => ({
    id:       p.id,
    url:      p.url ?? "",
    label:    p.label ?? "after",
    caption:  p.caption ?? "",
    category: inferCategory(p.caption),
    isReal:   true,
  }));

  const displayItems = realItems.length > 0
    ? realItems
    : PLACEHOLDER_ITEMS.map(p => ({ ...p, url: "", isReal: false }));

  const filtered = activeCategory === "All"
    ? displayItems
    : displayItems.filter(g => g.category === activeCategory);

  const selectedItem = selectedId !== null
    ? displayItems.find(i => i.id === selectedId)
    : null;

  const labelColor: Record<string, string> = {
    before:    "bg-black/60 text-white/80 border border-white/20",
    after:     "bg-primary/80 text-white",
    completed: "bg-green-600/80 text-white",
    progress:  "bg-yellow-600/80 text-white",
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <SEO
        title="Before & After Gallery | Detailing Labs — Racine County, WI"
        description="Real before and after photos from Detailing Labs mobile detailing jobs in Southeast Wisconsin. Interior details, exterior decon, and ceramic coatings."
        canonical="/gallery"
        jsonLd={[localBusinessSchema, breadcrumbSchema([{ name: "Home", url: "/" }, { name: "Gallery", url: "/gallery" }])]}
      />

      {/* Hero */}
      <section className="pt-24 pb-10 sm:pt-28 sm:pb-16 bg-[oklch(0.06_0.004_280)]">
        <div className="container text-center">
          <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
            <motion.p variants={fadeUp} className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">
              Our Work
            </motion.p>
            <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-4">
              Photo Gallery
            </motion.h1>
            <motion.p variants={fadeUp} className="text-muted-foreground text-lg max-w-xl mx-auto">
              Real results from real vehicles. Browse our before & after transformations.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Category filter */}
      <section className="py-8 border-b border-border">
        <div className="container flex items-center justify-center gap-2 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Grid */}
      <section className="py-16">
        <div className="container">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-[4/3] rounded-xl border border-border bg-muted/20 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {filtered.map((item, i) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.04, duration: 0.35 }}
                    className="group relative aspect-[4/3] rounded-xl overflow-hidden border border-border cursor-pointer"
                    onClick={() => setSelectedId(item.id)}
                  >
                    {item.isReal && item.url ? (
                      <img
                        src={item.url}
                        alt={item.caption || `${item.label} detail photo`}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                        width="600"
                        height="450"
                      />
                    ) : (
                      <div className={`absolute inset-0 bg-gradient-to-br ${'color' in item ? item.color : 'from-purple-900/60 to-black/80'} flex items-center justify-center`}>
                        <div className="text-center text-white/20">
                          <Camera className="w-10 h-10 mx-auto mb-2" />
                          <p className="text-xs font-medium">Photo coming soon</p>
                        </div>
                      </div>
                    )}

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                      <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>

                    {/* Label badge */}
                    <div className="absolute top-3 left-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${labelColor[item.label] ?? labelColor.after}`}>
                        {item.label}
                      </span>
                    </div>

                    {/* Caption */}
                    {item.caption && (
                      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                        <p className="text-white text-sm font-medium">{item.caption}</p>
                        <p className="text-white/60 text-xs mt-0.5">{item.category}</p>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-16">
              <Camera className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No photos in this category yet.</p>
            </div>
          )}

          {/* Coming soon note if still using placeholders */}
          {!isLoading && realItems.length === 0 && (
            <div className="text-center mt-10">
              <p className="text-muted-foreground text-sm">
                Real photos coming soon. Follow us on{" "}
                <a href="https://instagram.com/detailinglabs" target="_blank" rel="noopener noreferrer"
                  className="text-primary hover:underline">Instagram</a>{" "}for updates.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setSelectedId(null)}
          >
            <button
              className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors z-10"
              onClick={() => setSelectedId(null)}
              aria-label="Close"
            >
              <X className="w-7 h-7" />
            </button>

            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="max-w-4xl w-full max-h-[85vh] rounded-2xl overflow-hidden border border-white/10"
              onClick={e => e.stopPropagation()}
            >
              {selectedItem.isReal && selectedItem.url ? (
                <img
                  src={selectedItem.url}
                  alt={selectedItem.caption || "Detail photo"}
                  className="w-full h-full object-contain max-h-[75vh]"
                />
              ) : (
                <div className={`aspect-[4/3] bg-gradient-to-br ${'color' in selectedItem ? selectedItem.color : 'from-purple-900/60 to-black/80'} flex items-center justify-center`}>
                  <div className="text-center text-white/20">
                    <Camera className="w-16 h-16 mx-auto mb-3" />
                    <p className="text-sm font-medium">Photo coming soon</p>
                  </div>
                </div>
              )}
              {selectedItem.caption && (
                <div className="bg-[oklch(0.10_0.008_280)] px-6 py-4 border-t border-white/10">
                  <p className="text-white font-medium">{selectedItem.caption}</p>
                  <p className="text-white/50 text-sm mt-0.5 capitalize">{selectedItem.label} · {selectedItem.category}</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SEO content */}
      <section className="py-12 bg-[oklch(0.06_0.004_280)] border-t border-border">
        <div className="container max-w-3xl mx-auto">
          <h2 className="text-2xl font-display font-bold mb-4 text-center">Real Results from Real Jobs</h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-4 text-center">
            Every photo in this gallery is from an actual Detailing Labs appointment in Southeast Wisconsin.
            We photograph before and after every single job — so you can see exactly what we do.
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed text-center">
            Our work spans interior deep refreshes, exterior decontamination, full showroom resets, and ceramic
            coating applications across Racine County, Kenosha County, and the greater Milwaukee metro.
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
