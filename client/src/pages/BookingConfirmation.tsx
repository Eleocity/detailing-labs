import { useParams, Link } from "wouter";
import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2, Calendar, MapPin, Car, Phone,
  ChevronRight, Copy, Star, Share2, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SEO from "@/components/SEO";

export default function BookingConfirmation() {
  const { bookingNumber } = useParams<{ bookingNumber: string }>();
  const { data: booking, isLoading } = trpc.bookings.getByNumber.useQuery(
    { bookingNumber: bookingNumber ?? "" },
    { enabled: !!bookingNumber }
  );
  const { data: contactData } = trpc.content.getSiteContent.useQuery({ section: "contact" });
  const contact = Object.fromEntries((contactData ?? []).map(r => [r.key, r.value ?? ""]));
  const phone     = contact.phone     || "(262) 260-9474";
  const phoneHref = `tel:${phone.replace(/\D/g, "")}`;

  const copyBookingNumber = () => {
    navigator.clipboard.writeText(bookingNumber ?? "");
    toast.success("Booking number copied!");
  };

  const addToCalendar = () => {
    if (!booking?.appointmentDate) return;
    const start = new Date(booking.appointmentDate);
    const end   = new Date(start.getTime() + 4 * 60 * 60 * 1000); // 4h default

    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const title   = encodeURIComponent(`Detailing Labs — ${booking.packageName ?? "Detail"}`);
    const details = encodeURIComponent(`Booking #${booking.bookingNumber}\nService: ${booking.packageName ?? "Mobile Detailing"}\nLocation: ${booking.serviceAddress}`);
    const location = encodeURIComponent(booking.serviceAddress ?? "");

    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fmt(start)}/${fmt(end)}&details=${details}&location=${location}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  useEffect(() => {
    if (!booking) return;
    const fbq = (window as any).fbq;
    if (typeof fbq !== "function") return;
    fbq("track", "Lead", {
      content_name: booking.packageName ?? "Detailing Booking",
      currency: "USD",
      value: booking.totalAmount ? Number(booking.totalAmount) : undefined,
    });
    fbq("track", "Schedule");
  }, [booking]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title={`Booking Confirmed — ${bookingNumber}`}
        description="Your Detailing Labs appointment is confirmed. We'll see you soon."
        noindex={true}
      />
      <SiteHeader />

      <div className="pt-24 pb-16">
        <div className="container max-w-2xl">

          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <div className="w-20 h-20 rounded-full bg-green-500/15 border-2 border-green-500/30 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-3xl font-display font-bold mb-2">You're booked.</h1>
            <p className="text-muted-foreground">
              We'll confirm your appointment within a few hours.
            </p>
          </motion.div>

          {/* Booking Number */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-5 rounded-xl border border-primary/30 bg-primary/5 text-center mb-5"
          >
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Booking Number</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl font-display font-bold text-primary font-mono">{bookingNumber}</span>
              <button onClick={copyBookingNumber} className="text-muted-foreground hover:text-primary transition-colors" title="Copy">
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Save this to reference your appointment</p>
          </motion.div>

          {/* Booking Details */}
          {booking && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="p-6 rounded-2xl border border-border bg-card mb-5"
            >
              <h2 className="font-display font-semibold mb-4">Appointment Details</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Date & Time</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(booking.appointmentDate).toLocaleString("en-US", {
                        weekday: "long", year: "numeric", month: "long", day: "numeric",
                        hour: "numeric", minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Service Location</div>
                    <div className="text-sm text-muted-foreground">
                      {[booking.serviceAddress, booking.serviceCity, booking.serviceState, booking.serviceZip]
                        .filter(Boolean).join(", ")}
                    </div>
                  </div>
                </div>

                {(booking.vehicleMake || booking.vehicleModel) && (
                  <div className="flex items-start gap-3">
                    <Car className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium">Vehicle</div>
                      <div className="text-sm text-muted-foreground">
                        {[booking.vehicleYear, booking.vehicleMake, booking.vehicleModel, booking.vehicleColor ? `· ${booking.vehicleColor}` : null]
                          .filter(Boolean).join(" ")}
                      </div>
                    </div>
                  </div>
                )}

                {booking.packageName && (
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium">Service</div>
                      <div className="text-sm text-muted-foreground">{booking.packageName}</div>
                    </div>
                  </div>
                )}

                {booking.totalAmount && (
                  <div className="pt-3 border-t border-border flex justify-between">
                    <span className="font-medium text-sm">Estimated Total</span>
                    <span className="font-bold text-primary">${Number(booking.totalAmount).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Quick actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="grid grid-cols-2 gap-3 mb-5"
          >
            <button
              onClick={addToCalendar}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 text-sm font-medium text-foreground transition-all"
            >
              <Calendar className="w-4 h-4 text-primary" />
              Add to Calendar
            </button>
            <a
              href={phoneHref}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 text-sm font-medium text-foreground transition-all"
            >
              <Phone className="w-4 h-4 text-primary" />
              {phone}
            </a>
          </motion.div>

          {/* What's Next */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-6 rounded-2xl border border-border bg-card mb-5"
          >
            <h2 className="font-display font-semibold mb-4">What Happens Next</h2>
            <div className="space-y-3">
              {[
                { step: "1", text: "We'll review your booking and confirm availability within a few hours." },
                { step: "2", text: "You'll get a confirmation call or text with your appointment details." },
                { step: "3", text: "We arrive fully equipped — water, power, everything. You don't need to provide anything." },
                { step: "4", text: "We photograph before and after. You'll see exactly what was done." },
              ].map((item) => (
                <div key={item.step} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0 mt-0.5">
                    {item.step}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Refer a friend */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="p-5 rounded-2xl border border-primary/20 bg-primary/5 mb-8 text-center"
          >
            <Star className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
            <p className="font-semibold text-sm mb-1">Know someone with a dirty car?</p>
            <p className="text-xs text-muted-foreground mb-3">
              We'd love to help. Share our booking link with a friend.
            </p>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: "Detailing Labs — Mobile Auto Detailing",
                    text: "I just booked a mobile detail with Detailing Labs in SE Wisconsin. They come to you — no drop-off needed.",
                    url: "https://detailinglabswi.com/booking",
                  }).catch(() => {});
                } else {
                  navigator.clipboard.writeText("https://detailinglabswi.com/booking");
                  toast.success("Booking link copied!");
                }
              }}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" /> Share Booking Link
            </button>
          </motion.div>

          {/* Bottom nav */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
            className="flex flex-wrap justify-center gap-3"
          >
            <Link href="/">
              <Button variant="outline" className="border-border hover:border-primary/50">
                Back to Home
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" className="border-border hover:border-primary/50">
                View Other Services
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </motion.div>

        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
