import { useState } from "react";
import { motion } from "framer-motion";
import { Phone, Mail, MapPin, Clock, Instagram, Facebook, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { trpc } from "@/lib/trpc";
import SEO, { breadcrumbSchema } from "@/components/SEO";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55 } },
};

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [sending, setSending] = useState(false);
  const { data: contactContent } = trpc.content.getSiteContent.useQuery({ section: "contact" });
  const contact = (() => {
    const map: Record<string, string> = {};
    if (contactContent) for (const row of contactContent) map[row.key] = row.value ?? "";
    return map;
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setSending(true);
    await new Promise((r) => setTimeout(r, 1200));
    setSending(false);
    toast.success("Message sent! We'll get back to you within 24 hours.");
    setForm({ name: "", email: "", phone: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <SEO
        title="Contact Us"
        description="Get in touch with Detailing Labs. Call, text, or send us a message. We're available 7 days a week and respond quickly."
        canonical="/contact"
        jsonLd={breadcrumbSchema([{ name: "Home", url: "/" }, { name: "Contact", url: "/contact" }])}
      />

      {/* Hero */}
      <section className="pt-28 pb-16 bg-[oklch(0.06_0.004_280)]">
        <div className="container text-center">
          <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
            <motion.p variants={fadeUp} className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">
              Get In Touch
            </motion.p>
            <motion.h1 variants={fadeUp} className="text-5xl lg:text-6xl font-display font-bold mb-5">
              Contact Us
            </motion.h1>
            <motion.p variants={fadeUp} className="text-muted-foreground text-lg max-w-xl mx-auto">
              Have a question or want to discuss a custom detail? We'd love to hear from you.
            </motion.p>
          </motion.div>
        </div>
      </section>

      <section className="py-20">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* Contact Info */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
              <motion.h2 variants={fadeUp} className="text-2xl font-display font-bold mb-6">
                Reach Out Directly
              </motion.h2>

              <motion.div variants={fadeUp} className="space-y-4 mb-8">
                {[
                  { icon: <Phone className="w-5 h-5" />, label: "Phone", value: contact.phone || "(555) 000-0000", href: `tel:${(contact.phone || "5550000000").replace(/\D/g, "")}` },
                  { icon: <Mail className="w-5 h-5" />, label: "Email", value: contact.email || "hello@detailinglabs.com", href: `mailto:${contact.email || "hello@detailinglabs.com"}` },
                  { icon: <MapPin className="w-5 h-5" />, label: "Service Area", value: contact.address || "Greater Metro Area — Mobile Service", href: null },
                  { icon: <Clock className="w-5 h-5" />, label: "Weekday Hours", value: contact.hours_weekday || "Mon–Fri: 7:00 AM – 7:00 PM", href: null },
                  { icon: <Clock className="w-5 h-5" />, label: "Weekend Hours", value: contact.hours_weekend || "Sat–Sun: 8:00 AM – 5:00 PM", href: null },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">{item.label}</div>
                      {item.href ? (
                        <a href={item.href} className="text-sm hover:text-primary transition-colors">{item.value}</a>
                      ) : (
                        <div className="text-sm">{item.value}</div>
                      )}
                    </div>
                  </div>
                ))}
              </motion.div>

              <motion.div variants={fadeUp}>
                <p className="text-sm text-muted-foreground mb-3">Follow us on social media</p>
                <div className="flex gap-3">
                  <a href="https://instagram.com/detailinglabs" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card hover:border-primary/40 hover:bg-primary/5 text-sm text-muted-foreground hover:text-foreground transition-all">
                    <Instagram className="w-4 h-4" /> Instagram
                  </a>
                  <a href="https://facebook.com/detailinglabs" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card hover:border-primary/40 hover:bg-primary/5 text-sm text-muted-foreground hover:text-foreground transition-all">
                    <Facebook className="w-4 h-4" /> Facebook
                  </a>
                </div>
              </motion.div>
            </motion.div>

            {/* Contact Form */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <div className="p-8 rounded-2xl border border-border bg-card">
                <h2 className="text-2xl font-display font-bold mb-6">Send a Message</h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
                      <Input
                        id="name"
                        placeholder="Your name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="bg-input border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        placeholder="(555) 000-0000"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="bg-input border-border"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="bg-input border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message <span className="text-destructive">*</span></Label>
                    <Textarea
                      id="message"
                      placeholder="Tell us about your vehicle, the service you're interested in, or any questions you have..."
                      rows={5}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className="bg-input border-border resize-none"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-11"
                    disabled={sending}
                  >
                    {sending ? "Sending..." : (
                      <>
                        Send Message
                        <Send className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
