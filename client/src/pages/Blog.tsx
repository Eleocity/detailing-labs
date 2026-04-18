import { useState } from "react";
import { Link, useParams } from "wouter";
import { motion } from "framer-motion";
import { ChevronRight, Calendar, Clock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SEO, { breadcrumbSchema } from "@/components/SEO";

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

interface Post {
  slug: string;
  title: string;
  date: string;
  readTime: string;
  excerpt: string;
  category: string;
  body: string;
}

const POSTS: Post[] = [
  {
    slug: "how-often-detail-car-wisconsin",
    title: "How Often Should You Detail Your Car in Wisconsin?",
    date: "March 2025",
    readTime: "4 min read",
    category: "Maintenance",
    excerpt: "Wisconsin winters do more damage to your vehicle than most people realize. Here's how often you should be detailing based on the season.",
    body: `Wisconsin is hard on vehicles. Road salt, sand, freezing temps, and freeze-thaw cycles from November through April create conditions that strip wax, embed contamination in your paint, and degrade your interior faster than almost anywhere else in the country.

Here's a realistic schedule for Wisconsin drivers:

**After winter (March–April) — Full detail**

This is the most important detail of the year. Road salt doesn't just sit on your paint — it works into crevices, attacks your undercarriage, and stays embedded in your carpets and floor mats if it's not properly removed. A full interior and exterior detail in early spring should be a standard part of vehicle maintenance for anyone in Southeast Wisconsin.

**Summer (June–August) — Maintenance detail**

Once the salt is gone, summer is about keeping the protection in place. UV exposure breaks down wax and sealants faster in the summer months. A maintenance detail every 6–8 weeks keeps your paint protected and your interior from fading.

**Before winter (October–November) — Protective service**

This is the best time to apply a quality wax or sealant before the first snowfall. Our Exterior Decon & Shield includes a hydrophobic spray wax that provides around 3 months of protection — which gets you right through a Wisconsin winter with far less damage to your finish.

**The honest answer**

Most daily drivers in Wisconsin benefit from 3–4 professional details per year. That's one post-winter full detail, two maintenance details through the summer, and one protective detail in the fall. Vehicles that are garaged and used less can get away with 2 per year. Vehicles that sit outside through a Wisconsin winter and see heavy use need closer to quarterly service.

The key variable is road salt. If you're driving through treated roads regularly from November to March, getting that salt off your paint and out of your interior before it causes lasting damage is worth more than any other maintenance you'll do.`,
  },
  {
    slug: "ceramic-coating-worth-it",
    title: "Is Ceramic Coating Worth It? An Honest Answer.",
    date: "February 2025",
    readTime: "5 min read",
    category: "Services",
    excerpt: "Ceramic coating is marketed as the ultimate paint protection. Here's when it actually makes sense — and when it doesn't.",
    body: `Ceramic coating gets talked about like it's a miracle product. It's not — but it is genuinely excellent protection when applied correctly and maintained properly. Here's an honest breakdown.

**What ceramic coating actually does**

A professionally applied ceramic coating bonds to your paint at a chemical level and creates a hard, hydrophobic layer on top. Water beads and sheets off, contamination doesn't bond to the surface as easily, UV protection is significantly better than wax, and the gloss depth is noticeably improved.

The real benefit isn't the shine — it's that your paint stays cleaner longer and is easier to maintain. A properly coated vehicle needs less frequent washing, and when you do wash it, you're not scrubbing as hard.

**How long does it last?**

Professionally applied ceramic coatings typically last 2–5 years depending on the product and how the vehicle is maintained. Annual maintenance services (inspection, decontamination wash, top coat refresh) extend that significantly.

Spray ceramic products you can buy at an auto parts store last 3–6 months. They're not the same thing.

**When it makes sense**

Ceramic coating makes the most sense on a vehicle you plan to keep for several years and want to maintain in good condition. It makes particular sense in Wisconsin because of the road salt — a coated vehicle is significantly easier to decontaminate each spring because the salt hasn't bonded to the paint as aggressively.

It also makes sense if you care about your vehicle's appearance and want to reduce the time and cost of maintenance over the long term.

**When it doesn't make sense**

If you're planning to sell the vehicle in the next year, the ROI probably isn't there. If the paint has significant scratches or oxidation, that needs to be addressed before coating — you'd be sealing in the damage. And if you're not going to maintain it with proper wash techniques, you'll shorten the life of the coating significantly.

**The bottom line**

Ceramic coating is worth it for the right vehicle and the right owner. It's a genuine investment in protection, not just an aesthetic upgrade. If you're on the fence, reach out — we'll give you a straight answer based on your specific vehicle and situation.`,
  },
  {
    slug: "interior-detail-what-to-expect",
    title: "What Actually Happens During a Professional Interior Detail",
    date: "January 2025",
    readTime: "4 min read",
    category: "Education",
    excerpt: "A professional interior detail is very different from a car wash vacuum. Here's exactly what's included and why it matters.",
    body: `Most people have had a car wash interior cleaning — a quick vacuum, maybe a wipe of the dashboard, a spray of something that smells like vanilla. That's not what a professional interior detail is.

Here's what actually happens during a proper interior detail:

**Compressed air blowout**

Before anything is vacuumed, we use compressed air to blow out every vent, gap between seats, cup holder, and crevice. Debris that's been packed into these spots for months gets loosened first so the vacuum can actually remove it.

**Deep vacuum**

Every surface gets vacuumed — seats, carpet, floor mats, trunk, door pockets, under seats. Not a quick pass. A thorough vacuum of every surface.

**Surface cleaning and dressing**

Every hard surface gets cleaned: dashboard, center console, door panels, steering wheel, cup holders, door jambs. We use UV protectant on surfaces that are exposed to sunlight to prevent cracking and fading over time.

**Glass cleaning**

Interior glass is cleaned streak-free. This includes the windshield from the inside — one of the most difficult surfaces to clean properly due to the angle and the film that builds up from off-gassing interior materials.

**Floor mat restoration**

Floor mats come out, get thoroughly cleaned, and go back in. In Wisconsin, this matters — salt and sand work deep into mat fibers and they don't come out with a quick vacuum.

**Why it matters**

Beyond cleanliness, a proper interior detail is preventative maintenance. Salt, sand, and moisture that get ignored in the winter embed themselves into carpet and eat at upholstery. UV degradation on your dashboard and leather happens faster when those surfaces aren't protected. A professional interior detail once or twice a year extends the life of your interior significantly.

If your vehicle has pets or kids, the difference between a car wash clean and a professional detail is not subtle.`,
  },
  {
    slug: "mobile-detailing-vs-shop",
    title: "Mobile Detailing vs. a Detail Shop: What's the Difference?",
    date: "December 2024",
    readTime: "3 min read",
    category: "Education",
    excerpt: "Both options exist for a reason. Here's how to decide which is right for you — and what to watch out for with each.",
    body: `The detailing industry offers two main options: traditional shops where you drop off your vehicle, and mobile detailers who come to you. Here's an honest comparison.

**Traditional detail shops**

The main advantage of a shop is that they have a controlled environment — overhead lighting, a level concrete floor, access to fixed equipment like steam cleaners and extraction machines. A high-end shop with good techs can do excellent work.

The downsides are what most people already know: you have to get your car there, you wait or arrange a ride, and your schedule has to work around their hours. And frankly, quality varies enormously depending on who's working that day.

**Mobile detailers**

The obvious advantage is convenience. We come to you — your home, your office, wherever the car is. You don't give up half a day. For most clients, that alone is worth it.

The concern people have about mobile detailing is whether quality can match a shop. The answer is yes — if the operation is properly equipped. The key is whether the mobile setup includes proper lighting, professional-grade products, and enough water and power to do the job without cutting corners.

**What to watch out for**

The mobile detailing space has a wide range of operators. Some are properly equipped professionals. Some show up with a bucket of soap and a battery-powered vacuum and charge you $100 for a "detail."

Ask the right questions before you book anyone: Do they bring their own water and power? What products do they use? Can they show you their work? A legitimate professional operation will answer all of these clearly.

**The bottom line**

For most people in Southeast Wisconsin, a properly equipped mobile detailer offers the same quality as a shop with significantly less inconvenience. The key word is "properly equipped." If the mobile setup is self-contained with professional tools and products, you're not giving anything up.`,
  },
];

// ── Blog Index ────────────────────────────────────────────────────────────────
export default function Blog() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <SEO
        title="Detailing Tips & Guides | Detailing Labs — Racine County, WI"
        description="Expert advice on auto detailing, ceramic coating, and vehicle maintenance from Detailing Labs in Southeast Wisconsin."
        canonical="/blog"
        jsonLd={breadcrumbSchema([{ name: "Home", url: "/" }, { name: "Blog", url: "/blog" }])}
      />

      {/* Hero */}
      <section className="pt-24 pb-12 sm:pt-28 sm:pb-16 bg-[oklch(0.06_0.004_280)]">
        <div className="container">
          <motion.div initial="hidden" animate="visible" variants={fadeUp}>
            <p className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">Resources</p>
            <h1 className="text-4xl sm:text-5xl font-display font-bold mb-4">Detailing Tips & Guides</h1>
            <p className="text-muted-foreground max-w-2xl leading-relaxed">
              Honest advice on keeping your vehicle in good shape — from how often to detail to whether ceramic coating is worth it.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Posts */}
      <section className="py-14 sm:py-20">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {POSTS.map((post, i) => (
              <motion.div key={post.slug} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                style={{ transitionDelay: `${i * 0.05}s` }}>
                <Link href={`/blog/${post.slug}`}>
                  <div className="group flex flex-col h-full p-6 rounded-2xl border border-border bg-card hover:border-primary/40 transition-all cursor-pointer">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                        {post.category}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" /> {post.readTime}
                      </div>
                    </div>
                    <h2 className="font-display font-bold text-lg mb-3 group-hover:text-primary transition-colors leading-snug">
                      {post.title}
                    </h2>
                    <p className="text-muted-foreground text-sm leading-relaxed flex-1 mb-5">{post.excerpt}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" /> {post.date}
                      </div>
                      <span className="text-xs font-semibold text-primary flex items-center gap-1">
                        Read more <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 bg-[oklch(0.06_0.004_280)]">
        <div className="container text-center">
          <h2 className="text-2xl font-display font-bold mb-3">Ready to Book?</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">Professional mobile detailing in Southeast Wisconsin.</p>
          <Link href="/booking">
            <Button className="bg-primary hover:bg-primary/90 font-semibold px-8 h-11">
              Book Your Detail <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

// ── Blog Post ─────────────────────────────────────────────────────────────────
export function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = POSTS.find(p => p.slug === slug);

  if (!post) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <SiteHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-20">
            <p className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">404</p>
            <h1 className="text-3xl font-display font-bold mb-3">Post not found</h1>
            <p className="text-muted-foreground text-sm mb-6">That article doesn't exist or has been moved.</p>
            <Link href="/blog"><Button variant="outline">Back to Blog</Button></Link>
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  // Parse markdown-style bold and render body
  const renderBody = (text: string) => {
    return text.split("\n\n").map((para, i) => {
      if (para.startsWith("**") && para.endsWith("**")) {
        const heading = para.slice(2, -2);
        return <h3 key={i} className="text-lg font-display font-bold text-foreground mt-8 mb-3">{heading}</h3>;
      }
      // Inline bold
      const parts = para.split(/(\*\*[^*]+\*\*)/g);
      return (
        <p key={i} className="text-muted-foreground leading-relaxed mb-0">
          {parts.map((part, j) =>
            part.startsWith("**") && part.endsWith("**")
              ? <strong key={j} className="text-foreground font-semibold">{part.slice(2, -2)}</strong>
              : part
          )}
        </p>
      );
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <SEO
        title={`${post.title} | Detailing Labs`}
        description={post.excerpt}
        canonical={`/blog/${post.slug}`}
        jsonLd={breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Blog", url: "/blog" },
          { name: post.title, url: `/blog/${post.slug}` },
        ])}
      />

      {/* Hero */}
      <section className="pt-24 pb-8 sm:pt-28 sm:pb-12 bg-[oklch(0.06_0.004_280)]">
        <div className="container max-w-3xl">
          <Link href="/blog">
            <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
              <ArrowLeft className="w-4 h-4" /> Back to Blog
            </button>
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">{post.category}</span>
            <span className="text-xs text-muted-foreground">{post.date}</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{post.readTime}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold leading-tight mb-5">{post.title}</h1>
          <p className="text-muted-foreground text-lg leading-relaxed">{post.excerpt}</p>
        </div>
      </section>

      {/* Body */}
      <section className="py-12 sm:py-16">
        <div className="container max-w-3xl">
          <div className="space-y-3">
            {renderBody(post.body)}
          </div>

          {/* Bottom CTA */}
          <div className="mt-12 p-7 rounded-2xl border-2 border-primary/40 bg-primary/5 text-center">
            <h3 className="font-display font-bold text-lg mb-2">Serving Racine County & Southeast Wisconsin</h3>
            <p className="text-muted-foreground text-sm mb-5">Book online in under 2 minutes. We show up fully equipped.</p>
            <Link href="/booking">
              <Button className="bg-primary hover:bg-primary/90 font-semibold px-8">
                Book Your Detail <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>

          {/* More posts */}
          <div className="mt-12">
            <h3 className="font-display font-bold text-base mb-5 text-muted-foreground uppercase tracking-widest text-xs">More Articles</h3>
            <div className="space-y-3">
              {POSTS.filter(p => p.slug !== slug).map(p => (
                <Link key={p.slug} href={`/blog/${p.slug}`}>
                  <div className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/40 transition-colors cursor-pointer group">
                    <span className="text-sm font-medium group-hover:text-primary transition-colors">{p.title}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
