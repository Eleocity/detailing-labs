import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import {
  Calendar, Car, FileText, Camera, Star, ChevronRight, Loader2,
  Clock, MapPin, CheckCircle2, AlertCircle, X
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from "wouter";

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  confirmed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  assigned: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  en_route: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  in_progress: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  completed: "bg-green-500/15 text-green-400 border-green-500/20",
  cancelled: "bg-red-500/15 text-red-400 border-red-500/20",
};

const STATUS_ICONS: Record<string, any> = {
  new: Clock,
  confirmed: CheckCircle2,
  assigned: Car,
  en_route: MapPin,
  in_progress: Clock,
  completed: CheckCircle2,
  cancelled: X,
};

// ── Lookup by booking number (no auth required) ───────────────────────────────
function BookingLookup() {
  const [bookingNumber, setBookingNumber] = useState("");
  const [searched, setSearched] = useState(false);

  const { data: booking, isLoading, refetch } = trpc.bookings.getByNumber.useQuery(
    { bookingNumber },
    { enabled: false }
  );

  const handleSearch = () => {
    if (!bookingNumber.trim()) return;
    setSearched(true);
    refetch();
  };

  const StatusIcon = booking ? (STATUS_ICONS[booking.status] ?? Clock) : Clock;

  return (
    <div className="max-w-xl mx-auto">
      <div className="p-6 rounded-2xl border border-border bg-card mb-6">
        <h2 className="font-display font-bold text-lg mb-4">Track Your Booking</h2>
        <div className="flex gap-3">
          <Input
            placeholder="Enter booking number (e.g. DL-ABC123-XYZ)"
            value={bookingNumber}
            onChange={(e) => setBookingNumber(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="bg-input border-border font-mono"
          />
          <Button
            onClick={handleSearch}
            disabled={isLoading || !bookingNumber.trim()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold whitespace-nowrap"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Look Up"}
          </Button>
        </div>
      </div>

      {searched && !isLoading && !booking && (
        <div className="p-6 rounded-2xl border border-border bg-card text-center">
          <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">No booking found with that number. Please check and try again.</p>
        </div>
      )}

      {booking && (
        <div className="p-6 rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-bold">{booking.bookingNumber}</h3>
              <p className="text-muted-foreground text-sm">{booking.customerFirstName} {booking.customerLastName}</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full border font-medium ${STATUS_COLORS[booking.status] ?? ""}`}>
              {booking.status.replace("_", " ")}
            </span>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
              {new Date(booking.appointmentDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })} at {new Date(booking.appointmentDate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Car className="w-4 h-4 text-primary flex-shrink-0" />
              {booking.vehicleYear} {booking.vehicleMake} {booking.vehicleModel}
              {booking.vehicleColor && ` · ${booking.vehicleColor}`}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
              {booking.serviceAddress}{booking.serviceCity ? `, ${booking.serviceCity}` : ""}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="w-4 h-4 text-primary flex-shrink-0" />
              {booking.packageName ?? booking.serviceName ?? "Custom Service"}
            </div>
            {booking.totalAmount && (
              <div className="pt-3 border-t border-border flex items-center justify-between">
                <span className="font-medium">Total</span>
                <span className="font-bold text-primary text-lg">${Number(booking.totalAmount).toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Status Progress */}
          <div className="mt-5 pt-4 border-t border-border">
            <div className="flex items-center justify-between text-xs">
              {["new", "confirmed", "in_progress", "completed"].map((s, i) => {
                const statuses = ["new", "confirmed", "assigned", "en_route", "in_progress", "completed"];
                const currentIdx = statuses.indexOf(booking.status);
                const stepIdx = statuses.indexOf(s);
                const isActive = stepIdx <= currentIdx;
                return (
                  <div key={s} className="flex flex-col items-center gap-1">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isActive ? "bg-primary" : "bg-muted"}`}>
                      <CheckCircle2 className={`w-3 h-3 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`} />
                    </div>
                    <span className={`capitalize ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                      {s.replace("_", " ")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Portal ───────────────────────────────────────────────────────────────
export default function CustomerPortal() {
  const { user, isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<"bookings" | "vehicles" | "invoices" | "photos">("bookings");

  // For authenticated users — fetch their bookings by email
  const { data: bookingsData } = trpc.bookings.list.useQuery(
    { limit: 20, offset: 0 },
    { enabled: false } // Portal uses lookup for now; full auth portal is admin-only
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />
      <main className="flex-1 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-3">Customer Portal</h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Track your booking status, view appointment history, and manage your account.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
            {[
              { icon: Calendar, label: "Book Service", href: "/booking", color: "text-primary" },
              { icon: FileText, label: "View Invoice", href: "#lookup", color: "text-blue-400" },
              { icon: Camera, label: "Photo Gallery", href: "#lookup", color: "text-purple-400" },
              { icon: Star, label: "Leave Review", href: "#lookup", color: "text-amber-400" },
            ].map(({ icon: Icon, label, href, color }) => (
              <Link key={label} href={href}>
                <div className="p-5 rounded-xl border border-border bg-card hover:border-primary/40 transition-all cursor-pointer text-center group">
                  <Icon className={`w-6 h-6 mx-auto mb-2 ${color} group-hover:scale-110 transition-transform`} />
                  <div className="text-sm font-medium">{label}</div>
                </div>
              </Link>
            ))}
          </div>

          {/* Booking Lookup */}
          <div id="lookup">
            <BookingLookup />
          </div>

          {/* Info Section */}
          <div className="mt-12 p-6 rounded-2xl border border-border bg-card">
            <h2 className="font-display font-bold text-lg mb-4">Need Help?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="font-medium mb-1">Reschedule or Cancel</div>
                <p className="text-muted-foreground">Contact us at least 24 hours in advance to reschedule or cancel your appointment without a fee.</p>
              </div>
              <div>
                <div className="font-medium mb-1">Payment</div>
                <p className="text-muted-foreground">Payment is collected at time of service. We accept cash, card, Venmo, and Zelle.</p>
              </div>
              <div>
                <div className="font-medium mb-1">Contact Us</div>
                <p className="text-muted-foreground">Call or text us directly for fastest response. We're available 7 days a week.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
