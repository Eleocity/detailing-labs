import { useState } from "react";
import { motion } from "framer-motion";
import { X, ZoomIn, ImageOff, Loader2 } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import { trpc } from "@/lib/trpc";
import { BRAND } from "@shared/brand";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55 } },
};

const categories = ["All", "before", "after", "progress", "completed"];
const categoryLabels: Record<string, string> = {
  All: "All",
  before: "Before",
  after: "After",
  progress: "In Progress",
  completed: "Completed",
};

export default function Gallery() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [selected, setSelected] = useState<number | null>(null);

  const { data: items = [], isLoading } =
    trpc.media.listPublicGallery.useQuery();

  const filtered =
    activeCategory === "All"
      ? items
      : items.filter(g => g.label === activeCategory);

  const selectedItem = items.find(g => g.id === selected);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <SEO
        title="Before & After Gallery | Forma Auto Spa — Racine County, WI"
        description="Real before and after photos from Forma Auto Spa mobile detailing jobs in Southeast Wisconsin. Interior details, exterior decon, and ceramic coatings."
        canonical="/gallery"
        jsonLd={breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Gallery", url: "/gallery" },
        ])}
      />

      {/* Hero */}
      <section className="pt-24 pb-10 sm:pt-28 sm:pb-16 bg-[oklch(0.06_0.002_75)]">
        <div className="container text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          >
            <motion.p
              variants={fadeUp}
              className="text-primary text-sm font-semibold tracking-widest uppercase mb-3"
            >
              Our Work
            </motion.p>
            <motion.h1
              variants={fadeUp}
              className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-4"
            >
              Photo Gallery
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="text-muted-foreground text-lg max-w-xl mx-auto"
            >
              Real results from real vehicles. Browse our before & after
              transformations and completed work.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Filter */}
      <section className="py-8 border-b border-border">
        <div className="container flex items-center justify-center gap-2 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
              }`}
            >
              {categoryLabels[cat] ?? cat}
            </button>
          ))}
        </div>
      </section>

      {/* Grid */}
      <section className="py-16">
        <div className="container">
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24">
              <ImageOff className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">
                No photos in this category yet.
              </p>
              <p className="text-muted-foreground/60 text-sm mt-1">
                Follow us on{" "}
                <a
                  href={BRAND.social.instagram}
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Instagram
                </a>{" "}
                for the latest work.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.06, duration: 0.4 }}
                  className="group relative aspect-[4/3] rounded-xl overflow-hidden border border-border cursor-pointer bg-card"
                  onClick={() => setSelected(item.id)}
                >
                  <img
                    src={item.url}
                    alt={item.caption ?? `${item.label} photo`}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                    <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  <div className="absolute top-3 left-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                        item.label === "after" || item.label === "completed"
                          ? "bg-primary/80 text-primary-foreground"
                          : "bg-black/60 text-white/80 border border-white/20"
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                  {item.caption && (
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                      <p className="text-white text-sm font-medium">
                        {item.caption}
                      </p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}

          {!isLoading && items.length > 0 && (
            <div className="text-center mt-12">
              <p className="text-muted-foreground text-sm">
                Follow us on{" "}
                <a
                  href={BRAND.social.instagram}
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Instagram
                </a>{" "}
                for the latest work.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Lightbox */}
      {selected !== null && selectedItem && (
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
          <div className="max-w-4xl w-full" onClick={e => e.stopPropagation()}>
            <img
              src={selectedItem.url}
              alt={selectedItem.caption ?? "Gallery photo"}
              className="w-full rounded-2xl object-contain max-h-[80vh]"
            />
            {selectedItem.caption && (
              <p className="text-center text-white/70 mt-4 text-sm">
                {selectedItem.caption}
              </p>
            )}
          </div>
        </div>
      )}

      <SiteFooter />
    </div>
  );
}
