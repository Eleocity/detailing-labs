import { useParams, Link } from "wouter";
import { motion } from "framer-motion";
import { CheckCircle2, Calendar, MapPin, Car, Phone, ChevronRight, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

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
            <div className="w-20 h-20 rounded-full bg-primary/15 border-2 border-primary/30 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-3xl font-display font-bold mb-2">Booking Confirmed!</h1>
            <p className="text-muted-foreground">
              Your appointment has been received. We'll confirm within a few hours.
            </p>
          </motion.div>

          {/* Booking Number */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-5 rounded-xl border border-primary/30 bg-primary/5 text-center mb-6"
          >
            <p className="text-sm text-muted-foreground mb-1">Your Booking Number</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl font-display font-bold text-primary">{bookingNumber}</span>
              <button onClick={copyBookingNumber} className="text-muted-foreground hover:text-primary transition-colors">
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Save this number to track your appointment</p>
          </motion.div>

          {/* Booking Details */}
          {booking && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-6 rounded-2xl border border-border bg-card mb-6"
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
                        hour: "numeric", minute: "2-digit"
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Service Location</div>
                    <div className="text-sm text-muted-foreground">
                      {booking.serviceAddress}{booking.serviceCity ? `, ${booking.serviceCity}` : ""}
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
                      {booking.vehicleYear} {booking.vehicleMake} {booking.vehicleModel}
                      {booking.vehicleColor ? ` · ${booking.vehicleColor}` : ""}
                    </div>
                  </div>
                </div>
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

          {/* What's Next */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-6 rounded-2xl border border-border bg-card mb-8"
          >
            <h2 className="font-display font-semibold mb-4">What Happens Next</h2>
            <div className="space-y-3">
              {[
                { step: "1", text: "We'll review your booking and confirm availability within a few hours." },
                { step: "2", text: "You'll receive a confirmation call or text with your appointment details." },
                { step: "3", text: "Our team will arrive at your location on the scheduled date and time." },
                { step: "4", text: "Sit back and relax while we transform your vehicle!" },
              ].map((item) => (
                <div key={item.step} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                    {item.step}
                  </div>
                  <p className="text-sm text-muted-foreground">{item.text}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap justify-center gap-4"
          >
            <Link href="/">
              <Button variant="outline" className="border-border hover:border-primary/50">
                Back to Home
              </Button>
            </Link>
            <a href="tel:5550000000">
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
