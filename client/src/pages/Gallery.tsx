import { useState } from "react";
import { motion } from "framer-motion";
import { X, ZoomIn } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SEO, { breadcrumbSchema } from "@/components/SEO";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55 } },
};

// Placeholder gallery items — replace with real S3 URLs
const galleryItems = [
  { id: 1, label: "After", category: "Exterior", caption: "BMW M4 — Full Detail", color: "from-purple-900/60 to-black/80" },
  { id: 2, label: "Before", category: "Exterior", caption: "Range Rover — Before Detail", color: "from-gray-800/60 to-black/80" },
  { id: 3, label: "After", category: "Interior", caption: "Porsche Cayenne — Interior Detail", color: "from-purple-800/60 to-black/80" },
  { id: 4, label: "After", category: "Ceramic", caption: "Tesla Model S — Ceramic Coating", color: "from-indigo-900/60 to-black/80" },
  { id: 5, label: "Before", category: "Interior", caption: "Ford F-150 — Before Interior", color: "from-gray-700/60 to-black/80" },
  { id: 6, label: "After", category: "Interior", caption: "Ford F-150 — After Interior", color: "from-purple-900/60 to-black/80" },
  { id: 7, label: "After", category: "Exterior", caption: "Mercedes C63 — Paint Decon", color: "from-violet-900/60 to-black/80" },
  { id: 8, label: "After", category: "Ceramic", caption: "Audi RS7 — Ceramic Coating", color: "from-purple-800/60 to-black/80" },
  { id: 9, label: "After", category: "Exterior", caption: "Corvette C8 — Full Detail", color: "from-indigo-800/60 to-black/80" },
];

const categories = ["All", "Exterior", "Interior", "Ceramic"];

export default function Gallery() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [selected, setSelected] = useState<number | null>(null);

  const filtered = activeCategory === "All"
    ? galleryItems
    : galleryItems.filter((g) => g.category === activeCategory);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <SEO
        title="Before & After Gallery | Detailing Labs — Racine County, WI"
        description="Real before and after photos from Detailing Labs mobile detailing jobs in Southeast Wisconsin. Interior details, exterior decon, and ceramic coatings."

        canonical="/gallery"
        jsonLd={breadcrumbSchema([{ name: "Home", url: "/" }, { name: "Gallery", url: "/gallery" }])}
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
              Real results from real vehicles. Browse our before & after transformations and completed work.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Filter */}
      <section className="py-8 border-b border-border">
        <div className="container flex items-center justify-center gap-2 flex-wrap">
          {categories.map((cat) => (
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
                className="group relative aspect-[4/3] rounded-xl overflow-hidden border border-border cursor-pointer"
                onClick={() => setSelected(item.id)}
              >
                {/* Placeholder gradient background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${item.color}`} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl sm:text-4xl font-display font-bold text-white/20 mb-2">{item.category}</div>
                    <div className="text-white/40 text-sm">Photo Placeholder</div>
                  </div>
                </div>

                {/* Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                  <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>

                {/* Labels */}
                <div className="absolute top-3 left-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    item.label === "After"
                      ? "bg-primary/80 text-primary-foreground"
                      : "bg-black/60 text-white/80 border border-white/20"
                  }`}>
                    {item.label}
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-white text-sm font-medium">{item.caption}</p>
                  <p className="text-white/60 text-xs">{item.category}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-muted-foreground text-sm">
              More photos coming soon. Follow us on{" "}
              <a href="https://instagram.com/detailinglabs" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                Instagram
              </a>{" "}
              for the latest work.
            </p>
          </div>
        </div>
      </section>

      {/* Lightbox */}
      {selected !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            onClick={() => setSelected(null)}
          >
            <X className="w-5 h-5" />
          </button>
          <div className="max-w-3xl w-full">
            {(() => {
              const item = galleryItems.find((g) => g.id === selected);
              if (!item) return null;
              return (
                <div className={`aspect-[4/3] rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center`}>
                  <div className="text-center text-white/40">
                    <div className="text-3xl sm:text-5xl font-display font-bold mb-2">{item.category}</div>
                    <div>{item.caption}</div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      <SiteFooter />
    </div>
  );
}
