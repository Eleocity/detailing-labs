import { useParams, Link } from "wouter";
import { useEffect, type ReactElement } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Calendar,
  MapPin,
  Car,
  Phone,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { BRAND } from "@shared/brand";

type ProviderStatus =
  | "draft"
  | "confirmed"
  | "awaiting_scheduling"
  | "awaiting_deposit"
  | "requested"
  | "requires_review"
  | "failed_sync"
  | "cancelled"
  | null
  | undefined;

const STATUS_DISPLAY: Record<
  string,
  {
    label: string;
    headline: string;
    body: string;
    icon: ReactElement;
    tone: "primary" | "amber" | "red";
  }
> = {
  confirmed: {
    label: "Confirmed",
    headline: "You're Booked!",
    body: "Your appointment is confirmed. We'll see you at the scheduled time.",
    icon: <CheckCircle2 className="w-10 h-10 text-primary" />,
    tone: "primary",
  },
  awaiting_scheduling: {
    label: "Awaiting Scheduling",
    headline: "Almost There",
    body: "We've saved your details. Finish picking your date and time to complete scheduling.",
    icon: <Clock className="w-10 h-10 text-amber-500" />,
    tone: "amber",
  },
  awaiting_deposit: {
    label: "Awaiting Deposit",
    headline: "One Step Left",
    body: "Your appointment is reserved pending a deposit. Complete payment to confirm.",
    icon: <Clock className="w-10 h-10 text-amber-500" />,
    tone: "amber",
  },
  requested: {
    label: "Requested",
    headline: "Request Received",
    body: "Your appointment time is requested, not yet confirmed. We'll follow up shortly to confirm.",
    icon: <Clock className="w-10 h-10 text-primary" />,
    tone: "primary",
  },
  requires_review: {
    label: "Requires Review",
    headline: "Request Received",
    body: "Your request needs a quick look from our team before we confirm scheduling. We'll be in touch shortly.",
    icon: <AlertTriangle className="w-10 h-10 text-amber-500" />,
    tone: "amber",
  },
  failed_sync: {
    label: "Processing",
    headline: "Request Received",
    body: "Your booking was saved. Our scheduling system had a hiccup syncing automatically, so a team member will confirm manually.",
    icon: <AlertTriangle className="w-10 h-10 text-amber-500" />,
    tone: "amber",
  },
  cancelled: {
    label: "Cancelled",
    headline: "Booking Cancelled",
    body: "This booking has been cancelled.",
    icon: <XCircle className="w-10 h-10 text-red-500" />,
    tone: "red",
  },
};

const DEFAULT_STATUS = {
  label: "Requested",
  headline: "Request Received",
  body: "Your booking request has been received. We'll confirm your appointment shortly — this is a request, not a confirmed appointment yet.",
  icon: <Clock className="w-10 h-10 text-primary" />,
  tone: "primary" as const,
};

export default function BookingConfirmation() {
  const { bookingNumber } = useParams<{ bookingNumber: string }>();
  const { data: booking, isLoading } = trpc.bookings.getByNumber.useQuery(
    { bookingNumber: bookingNumber ?? "" },
    { enabled: !!bookingNumber }
  );

  const copyBookingNumber = () => {
    navigator.clipboard.writeText(bookingNumber ?? "");
    toast.success("Booking number copied!");
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

  const providerStatus = (booking as any)?.providerStatus as ProviderStatus;
  const providerMessage = (booking as any)?.providerMessage as
    | string
    | null
    | undefined;
  const display =
    (providerStatus && STATUS_DISPLAY[providerStatus]) || DEFAULT_STATUS;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <div className="pt-24 pb-16">
        <div className="container max-w-2xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <div
              className={`w-20 h-20 rounded-full border-2 flex items-center justify-center mx-auto mb-5 ${
                display.tone === "primary"
                  ? "bg-primary/15 border-primary/30"
                  : display.tone === "amber"
                    ? "bg-amber-500/15 border-amber-500/30"
                    : "bg-red-500/15 border-red-500/30"
              }`}
            >
              {display.icon}
            </div>
            <span className="inline-block mb-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide border border-border text-muted-foreground">
              Status: {display.label}
            </span>
            <h1 className="text-3xl font-display font-bold mb-2">
              {display.headline}
            </h1>
            <p className="text-muted-foreground">
              {providerMessage || display.body}
            </p>
          </motion.div>

          {/* Booking Number */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-5 rounded-xl border border-primary/30 bg-primary/5 text-center mb-6"
          >
            <p className="text-sm text-muted-foreground mb-1">
              Your Reference Number
            </p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl font-display font-bold text-primary">
                {bookingNumber}
              </span>
              <button
                onClick={copyBookingNumber}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Save this number to track your appointment
            </p>
          </motion.div>

          {/* Booking Details */}
          {booking && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-6 rounded-2xl border border-border bg-card mb-6"
            >
              <h2 className="font-display font-semibold mb-4">
                Appointment Details
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">
                      Requested Date & Time
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(booking.appointmentDate).toLocaleString(
                        "en-US",
                        {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        }
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Service Location</div>
                    <div className="text-sm text-muted-foreground">
                      {booking.serviceAddress}
                      {booking.serviceCity ? `, ${booking.serviceCity}` : ""}
                      {booking.serviceState ? `, ${booking.serviceState}` : ""}
                      {booking.serviceZip ? ` ${booking.serviceZip}` : ""}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Car className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Vehicle</div>
                    <div className="text-sm text-muted-foreground">
                      {booking.vehicleYear} {booking.vehicleMake}{" "}
                      {booking.vehicleModel}
                      {booking.vehicleColor ? ` · ${booking.vehicleColor}` : ""}
                    </div>
                  </div>
                </div>
                {booking.packageName && (
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium">Service</div>
                      <div className="text-sm text-muted-foreground">
                        {booking.packageName}
                      </div>
                    </div>
                  </div>
                )}
                {booking.totalAmount && (
                  <div className="pt-3 border-t border-border flex justify-between">
                    <span className="font-medium text-sm">Estimated Total</span>
                    <span className="font-bold text-primary">
                      ${Number(booking.totalAmount).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* What's Next */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-6 rounded-2xl border border-border bg-card mb-8"
          >
            <h2 className="font-display font-semibold mb-4">
              What Happens Next
            </h2>
            <div className="space-y-3">
              {[
                {
                  step: "1",
                  text: "We'll review your request and confirm availability within a few hours.",
                },
                {
                  step: "2",
                  text: "You'll receive a confirmation call or text with your appointment details.",
                },
                {
                  step: "3",
                  text: "Our team will arrive at your location on the scheduled date and time.",
                },
                {
                  step: "4",
                  text: "Sit back and relax while we transform your vehicle!",
                },
              ].map(item => (
                <div key={item.step} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                    {item.step}
                  </div>
                  <p className="text-sm text-muted-foreground">{item.text}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border">
              Need to reschedule or cancel? Call or text us with your reference
              number and we'll take care of it — no online self-service yet.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap justify-center gap-4"
          >
            <Link href="/">
              <Button
                variant="outline"
                className="border-border hover:border-primary/50"
              >
                Back to Home
              </Button>
            </Link>
            <a href={BRAND.phoneHref}>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                <Phone className="w-4 h-4 mr-2" />
                Call Us
              </Button>
            </a>
          </motion.div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
