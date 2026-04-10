import { Link } from "wouter";
import { Phone, Mail, MapPin, Instagram, Facebook, ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function SiteFooter() {
  const { data: contactContent } = trpc.content.getSiteContent.useQuery({ section: "contact" });
  const contact = (() => {
    const map: Record<string, string> = {};
    if (contactContent) for (const row of contactContent) map[row.key] = row.value ?? "";
    return map;
  })();
  const phone = contact.phone || "(262) 555-0190";
  const email = contact.email || "hello@detailinglabswi.com";
  const address = contact.address || "Greater Milwaukee & Waukesha, WI";

  return (
    <footer className="bg-[oklch(0.06_0.004_280)] border-t border-border">
      <div className="container py-10 sm:py-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-10">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1">
            <div className="mb-4">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663425808543/7UUm3VYuvjMZWzXs65cJTQ/detailing-labs-logo-clean_f1e7bfe0.png"
                alt="Detailing Labs — Professional Mobile Auto Detailing"
                width="160"
                height="80"
                loading="lazy"
                className="h-20 w-auto object-contain"
              />
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed mb-5">
              Premium mobile auto detailing — we come to you. Professional results at your home, office, or anywhere in between.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://www.instagram.com/detailing.labs.wi"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-secondary hover:bg-primary/20 border border-border hover:border-primary/40 flex items-center justify-center text-muted-foreground hover:text-primary transition-all"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://facebook.com/detailinglabs"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-secondary hover:bg-primary/20 border border-border hover:border-primary/40 flex items-center justify-center text-muted-foreground hover:text-primary transition-all"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href="https://tiktok.com/@detailinglabs"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-secondary hover:bg-primary/20 border border-border hover:border-primary/40 flex items-center justify-center text-muted-foreground hover:text-primary transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.79 1.52V6.77a4.85 4.85 0 01-1.02-.08z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-display font-semibold text-foreground mb-4">Services</h4>
            <ul className="space-y-2">
              {["Exterior Decon & Shield", "Interior Deep Refresh", "Full Showroom Reset", "Add-On Services", "Add-On Services", "Book an Appointment"].map((s) => (
                <li key={s}>
                  <Link href="/services">
                    <span className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer flex items-center gap-1 group">
                      <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {s}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-semibold text-foreground mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {[
                { href: "/book", label: "Book Appointment" },
                { href: "/pricing", label: "Pricing & Packages" },
                { href: "/gallery", label: "Photo Gallery" },
                { href: "/about", label: "About Us" },
                { href: "/faq", label: "FAQ" },
                { href: "/blog", label: "Detailing Blog" },
                { href: "/portal", label: "Customer Portal" },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>
                    <span className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer flex items-center gap-1 group">
                      <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {link.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-semibold text-foreground mb-4">Contact</h4>
            <ul className="space-y-3">
              <li>
                <a href={`tel:${phone.replace(/\D/g, "")}`} className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                    <Phone className="w-3.5 h-3.5 text-primary" />
                  </div>
                  {phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${email}`} className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                    <Mail className="w-3.5 h-3.5 text-primary" />
                  </div>
                  {email}
                </a>
              </li>
              <li>
                <div className="flex items-start gap-3 text-sm text-muted-foreground">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span>Mobile Service<br />We Come To You<br />{address}</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 sm:mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Detailing Labs. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="/privacy"><span className="hover:text-foreground transition-colors cursor-pointer">Privacy Policy</span></Link>
            <Link href="/terms"><span className="hover:text-foreground transition-colors cursor-pointer">Terms of Service</span></Link>
            <Link href="/admin">
              <span className="hover:text-foreground transition-colors cursor-pointer opacity-40 hover:opacity-70">Admin</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
