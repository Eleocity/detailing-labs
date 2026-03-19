import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, Car, FileText, Star, ChevronRight, Loader2,
  Clock, MapPin, CheckCircle2, AlertCircle, X, Plus,
  Shield, Droplets, Wrench, RefreshCw, Phone, Mail,
  LogOut, ChevronLeft, Edit, Hash, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow, isPast, isFuture } from "date-fns";
import SEO from "@/components/SEO";

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_PILL: Record<string, string> = {
  new:         "bg-blue-500/12 text-blue-400 border-blue-500/25",
  confirmed:   "bg-emerald-500/12 text-emerald-400 border-emerald-500/25",
  assigned:    "bg-violet-500/12 text-violet-400 border-violet-500/25",
  en_route:    "bg-amber-500/12 text-amber-400 border-amber-500/25",
  in_progress: "bg-orange-500/12 text-orange-400 border-orange-500/25",
  completed:   "bg-green-500/12 text-green-400 border-green-500/25",
  cancelled:   "bg-zinc-500/12 text-zinc-400 border-zinc-500/25",
};

const STATUS_STEPS = ["new", "confirmed", "assigned", "en_route", "in_progress", "completed"];
const STATUS_LABELS: Record<string, string> = {
  new: "Booked", confirmed: "Confirmed", assigned: "Assigned",
  en_route: "On the Way", in_progress: "In Progress", completed: "Done",
};

const VEHICLE_TYPES = ["sedan","suv","truck","van","coupe","convertible","wagon","other"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full border capitalize", STATUS_PILL[status] ?? "bg-zinc-500/12 text-zinc-400 border-zinc-500/25")}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function BookingProgressBar({ status }: { status: string }) {
  const idx = STATUS_STEPS.indexOf(status);
  return (
    <div className="flex items-center gap-0 mt-4">
      {STATUS_STEPS.map((s, i) => {
        const done = i <= idx;
        const current = i === idx;
        return (
          <div key={s} className="flex items-center flex-1">
            <div className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
              done ? "bg-primary border-primary" : "bg-background border-border"
            )}>
              {done && <Check className="w-2.5 h-2.5 text-white" />}
            </div>
            {i < STATUS_STEPS.length - 1 && (
              <div className={cn("flex-1 h-0.5 transition-all", done && i < idx ? "bg-primary" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Add Vehicle Dialog ───────────────────────────────────────────────────────
function AddVehicleDialog({ email, open, onClose, onSuccess }: {
  email: string; open: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const [form, setForm] = useState({ make: "", model: "", year: new Date().getFullYear(), color: "", vehicleType: "sedan", licensePlate: "", notes: "" });
  const mut = trpc.crm.addVehicleByEmail.useMutation({
    onSuccess: () => { toast.success("Vehicle added to your garage!"); onSuccess(); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md bg-card border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display"><Car className="w-4 h-4 text-primary" />Add Vehicle</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-1">
          <div className="space-y-1"><Label className="text-xs">Year *</Label><Input type="number" value={form.year} onChange={e => setForm(p => ({ ...p, year: Number(e.target.value) }))} className="h-9 bg-background/50 border-border/50" /></div>
          <div className="space-y-1"><Label className="text-xs">Make *</Label><Input value={form.make} onChange={f("make")} placeholder="BMW" className="h-9 bg-background/50 border-border/50" /></div>
          <div className="space-y-1"><Label className="text-xs">Model *</Label><Input value={form.model} onChange={f("model")} placeholder="M3" className="h-9 bg-background/50 border-border/50" /></div>
          <div className="space-y-1"><Label className="text-xs">Color</Label><Input value={form.color} onChange={f("color")} placeholder="Blue" className="h-9 bg-background/50 border-border/50" /></div>
          <div className="space-y-1">
            <Label className="text-xs">Type</Label>
            <Select value={form.vehicleType} onValueChange={v => setForm(p => ({ ...p, vehicleType: v }))}>
              <SelectTrigger className="h-9 bg-background/50 border-border/50"><SelectValue /></SelectTrigger>
              <SelectContent>{VEHICLE_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label className="text-xs">License Plate</Label><Input value={form.licensePlate} onChange={f("licensePlate")} placeholder="ABC-1234" className="h-9 bg-background/50 border-border/50" /></div>
          <div className="col-span-2 space-y-1"><Label className="text-xs">Notes</Label><Textarea value={form.notes} onChange={f("notes")} rows={2} placeholder="Any special notes..." className="resize-none bg-background/50 border-border/50 text-sm" /></div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="border-border/50">Cancel</Button>
          <Button onClick={() => mut.mutate({ email, ...form } as any)} disabled={!form.make || !form.model || mut.isPending} className="bg-primary hover:bg-primary/90">
            {mut.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Adding…</> : "Add Vehicle"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Ceramic Tracker ─────────────────────────────────────────────────────────
function CeramicTracker({ vehicle, bookings }: { vehicle: any; bookings: any[] }) {
  // Find the most recent ceramic coating booking for this vehicle
  const ceramicBooking = bookings.find(b =>
    b.status === "completed" &&
    (b.packageName?.toLowerCase().includes("ceramic") || b.serviceName?.toLowerCase().includes("ceramic"))
  );

  if (!ceramicBooking) return null;

  const installDate = new Date(ceramicBooking.appointmentDate);

  // Try to detect coating duration from package name (1yr, 3yr, 5yr, 7yr)
  const nameStr = (ceramicBooking.packageName ?? ceramicBooking.serviceName ?? "").toLowerCase();
  const years = nameStr.includes("7yr") || nameStr.includes("7 yr") ? 7
    : nameStr.includes("5yr") || nameStr.includes("5 yr") ? 5
    : nameStr.includes("3yr") || nameStr.includes("3 yr") ? 3
    : 1;

  const expiryDate = new Date(installDate);
  expiryDate.setFullYear(expiryDate.getFullYear() + years);

  const nextService = new Date(installDate);
  nextService.setFullYear(nextService.getFullYear() + 1);

  const now = new Date();
  const totalMs = expiryDate.getTime() - installDate.getTime();
  const elapsedMs = now.getTime() - installDate.getTime();
  const pct = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));
  const isExpired = isPast(expiryDate);
  const needsService = isPast(nextService) && !isExpired;

  return (
    <div className={cn(
      "mt-4 rounded-xl border p-4",
      isExpired ? "border-red-500/30 bg-red-500/5" :
      needsService ? "border-amber-500/30 bg-amber-500/5" :
      "border-primary/30 bg-primary/5"
    )}>
      <div className="flex items-center gap-2 mb-3">
        <Shield className={cn("w-4 h-4", isExpired ? "text-red-400" : needsService ? "text-amber-400" : "text-primary")} />
        <span className="text-sm font-semibold text-foreground">Ceramic Coating</span>
        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border",
          isExpired ? "bg-red-500/10 text-red-400 border-red-500/20" :
          needsService ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
          "bg-green-500/10 text-green-400 border-green-500/20"
        )}>
          {isExpired ? "Expired" : needsService ? "Service Due" : "Active"}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
          <span>Installed {format(installDate, "MMM d, yyyy")}</span>
          <span>Expires {format(expiryDate, "MMM yyyy")}</span>
        </div>
        <div className="h-2 bg-border rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", isExpired ? "bg-red-500" : needsService ? "bg-amber-500" : "bg-primary")}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className="text-muted-foreground">{Math.round(pct)}% of {years}-year warranty used</span>
          {!isExpired && <span className="text-muted-foreground">{formatDistanceToNow(expiryDate, { addSuffix: true })}</span>}
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-background/50 rounded-lg p-2">
          <div className="text-muted-foreground mb-0.5">Package</div>
          <div className="font-medium text-foreground truncate">{ceramicBooking.packageName ?? "Ceramic Coating"}</div>
        </div>
        <div className="bg-background/50 rounded-lg p-2">
          <div className="text-muted-foreground mb-0.5">Annual Service</div>
          <div className={cn("font-medium", needsService ? "text-amber-400" : "text-foreground")}>
            {isPast(nextService) ? "Due now" : format(nextService, "MMM yyyy")}
          </div>
        </div>
      </div>

      {(needsService || isExpired) && (
        <Link href="/booking">
          <button className="w-full mt-3 py-2 rounded-lg bg-primary/90 hover:bg-primary text-white text-xs font-semibold transition-colors">
            {isExpired ? "Re-apply Ceramic Coating" : "Book Annual Inspection"}
          </button>
        </Link>
      )}
    </div>
  );
}

// ─── Booking Card ─────────────────────────────────────────────────────────────
function BookingCard({ booking }: { booking: any }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(booking.appointmentDate);
  const upcoming = isFuture(date);

  return (
    <div className={cn(
      "rounded-xl border overflow-hidden transition-all",
      upcoming ? "border-primary/30 bg-primary/3" : "border-border bg-card"
    )}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-sm font-semibold text-foreground">{booking.packageName ?? booking.serviceName ?? "Custom Service"}</span>
              {upcoming && <span className="text-[10px] font-bold bg-primary/15 text-primary border border-primary/25 px-2 py-0.5 rounded-full">Upcoming</span>}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              {format(date, "EEE, MMM d, yyyy")} at {format(date, "h:mm a")}
            </div>
          </div>
          <StatusBadge status={booking.status} />
        </div>

        <div className="flex flex-col gap-1.5 text-xs text-muted-foreground mb-3">
          <div className="flex items-center gap-1.5">
            <Car className="w-3 h-3 flex-shrink-0" />
            {booking.vehicleYear} {booking.vehicleMake} {booking.vehicleModel}
            {booking.vehicleColor && ` · ${booking.vehicleColor}`}
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            {booking.serviceAddress}{booking.serviceCity ? `, ${booking.serviceCity}` : ""}
          </div>
        </div>

        {booking.totalAmount && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-bold text-foreground">${Number(booking.totalAmount).toFixed(2)}</span>
          </div>
        )}

        {/* Progress bar for active bookings */}
        {upcoming && booking.status !== "cancelled" && (
          <BookingProgressBar status={booking.status} />
        )}

        {/* Expand toggle */}
        <button onClick={() => setExpanded(!expanded)}
          className="mt-3 text-xs text-primary font-medium flex items-center gap-1 hover:underline">
          {expanded ? "Less details" : "More details"}
          <ChevronRight className={cn("w-3 h-3 transition-transform", expanded && "rotate-90")} />
        </button>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-border/60 space-y-2 text-xs text-muted-foreground">
            <div className="flex justify-between"><span>Booking #</span><span className="font-mono text-foreground">{booking.bookingNumber}</span></div>
            {booking.packageName && <div className="flex justify-between"><span>Service</span><span className="text-foreground">{booking.packageName}</span></div>}
            {booking.subtotal && <div className="flex justify-between"><span>Subtotal</span><span>${Number(booking.subtotal).toFixed(2)}</span></div>}
            {Number(booking.taxAmount) > 0 && <div className="flex justify-between"><span>Tax</span><span>${Number(booking.taxAmount).toFixed(2)}</span></div>}
            {booking.notes && <div><span className="block mb-0.5">Notes</span><p className="text-foreground">{booking.notes}</p></div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Vehicle Garage Card ──────────────────────────────────────────────────────
function GarageCard({ vehicle, bookings }: { vehicle: any; bookings: any[] }) {
  const vehicleBookings = bookings.filter(b =>
    b.vehicleMake?.toLowerCase() === vehicle.make?.toLowerCase() &&
    b.vehicleModel?.toLowerCase() === vehicle.model?.toLowerCase()
  );

  const totalSpent = vehicleBookings
    .filter(b => b.status === "completed")
    .reduce((s, b) => s + Number(b.totalAmount ?? 0), 0);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-5">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <Car className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-foreground">{vehicle.year} {vehicle.make} {vehicle.model}</div>
            <div className="text-sm text-muted-foreground capitalize">{vehicle.color} · {vehicle.vehicleType}</div>
            {vehicle.licensePlate && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <Hash className="w-3 h-3" />{vehicle.licensePlate}
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-background/50 rounded-lg p-3 border border-border/50">
            <div className="text-lg font-display font-bold text-foreground">{vehicleBookings.filter(b => b.status === "completed").length}</div>
            <div className="text-xs text-muted-foreground">Services Completed</div>
          </div>
          <div className="bg-background/50 rounded-lg p-3 border border-border/50">
            <div className="text-lg font-display font-bold text-foreground">${totalSpent.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Total Invested</div>
          </div>
        </div>

        {/* Service history chips */}
        {vehicleBookings.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-medium text-muted-foreground mb-2">Service History</div>
            <div className="flex flex-wrap gap-1.5">
              {vehicleBookings.filter(b => b.status === "completed").slice(0, 4).map((b, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-md bg-muted/50 border border-border/50 text-muted-foreground truncate max-w-[150px]">
                  {b.packageName ?? "Service"}
                </span>
              ))}
              {vehicleBookings.filter(b => b.status === "completed").length > 4 && (
                <span className="text-xs text-primary">+{vehicleBookings.filter(b => b.status === "completed").length - 4} more</span>
              )}
            </div>
          </div>
        )}

        {/* Ceramic tracker */}
        <CeramicTracker vehicle={vehicle} bookings={vehicleBookings} />

        {vehicle.notes && (
          <p className="mt-3 pt-3 border-t border-border/60 text-xs text-muted-foreground leading-relaxed">{vehicle.notes}</p>
        )}
      </div>
    </div>
  );
}

// ─── Guest Portal (no login) ──────────────────────────────────────────────────
function GuestPortal() {
  const [bookingNumber, setBookingNumber] = useState("");
  const [searched, setSearched] = useState(false);
  const { data: booking, isLoading, refetch } = trpc.bookings.getByNumber.useQuery(
    { bookingNumber },
    { enabled: false }
  );

  const handleSearch = () => { if (bookingNumber.trim()) { setSearched(true); refetch(); } };

  return (
    <div className="py-24 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
            <User className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-bold mb-2">Customer Portal</h1>
          <p className="text-sm text-muted-foreground">Sign in to access your bookings, garage, and ceramic tracking.</p>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col gap-3 mb-10">
          <Link href="/login?returnTo=/portal">
            <Button className="w-full bg-primary hover:bg-primary/90 font-semibold h-11">Sign In to My Account</Button>
          </Link>
          <Link href="/register?returnTo=/portal">
            <Button variant="outline" className="w-full border-border font-medium h-11">Create Account</Button>
          </Link>
        </div>

        {/* Divider */}
        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center"><span className="px-3 text-xs text-muted-foreground bg-background">or track a booking without signing in</span></div>
        </div>

        {/* Lookup */}
        <div className="p-5 rounded-xl border border-border bg-card">
          <h2 className="font-semibold text-sm mb-3">Look Up a Booking</h2>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. DL-ABC123-XYZ"
              value={bookingNumber}
              onChange={(e) => setBookingNumber(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="bg-input border-border font-mono text-sm"
            />
            <Button onClick={handleSearch} disabled={isLoading || !bookingNumber.trim()} className="bg-primary hover:bg-primary/90 whitespace-nowrap">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Track"}
            </Button>
          </div>

          {searched && !isLoading && !booking && (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> No booking found with that number.
            </div>
          )}

          {booking && (
            <div className="mt-4">
              <BookingCard booking={booking} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Authenticated Portal ─────────────────────────────────────────────────────
type PortalTab = "upcoming" | "past" | "garage" | "account";

function AuthPortal({ user }: { user: NonNullable<ReturnType<typeof useAuth>["user"]> }) {
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<PortalTab>("upcoming");
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const { logout } = useAuth();

  const email = user.email ?? "";

  const { data: bookings = [], isLoading: loadingBookings, refetch: refetchBookings } = trpc.bookings.listByEmail.useQuery(
    { email },
    { enabled: !!email }
  );

  const { data: vehicles = [], isLoading: loadingVehicles, refetch: refetchVehicles } = trpc.crm.listVehiclesByEmail.useQuery(
    { email },
    { enabled: !!email }
  );

  const now = new Date();
  const upcomingBookings = bookings.filter(b => isFuture(new Date(b.appointmentDate)) && b.status !== "cancelled");
  const pastBookings = bookings.filter(b => isPast(new Date(b.appointmentDate)) || b.status === "completed" || b.status === "cancelled");

  const TABS: { id: PortalTab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: "upcoming", label: "Upcoming",  icon: Calendar, count: upcomingBookings.length || undefined },
    { id: "past",     label: "History",   icon: Clock },
    { id: "garage",   label: "Garage",    icon: Car,      count: vehicles.length || undefined },
    { id: "account",  label: "Account",   icon: User },
  ];

  const initials = user.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) ?? "?";

  return (
    <div className="min-h-screen bg-background">

      <SEO
        title="Customer Portal"
        description="View your upcoming and past bookings, manage your vehicles, and track your ceramic coating warranty."
        canonical="/portal"
        noindex={false}
      />      {/* Portal header */}
      <div className="border-b border-border/60 bg-background/95 sticky top-0 z-40 backdrop-blur">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">{initials}</div>
              <div>
                <p className="text-sm font-semibold text-foreground leading-none">{user.name ?? "My Account"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
              </div>
            </div>
            <Link href="/booking">
              <Button size="sm" className="bg-primary hover:bg-primary/90 font-semibold text-xs h-8 px-4">Book Service</Button>
            </Link>
          </div>

          {/* Tab bar */}
          <div className="flex border-t border-border/40">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium border-b-2 transition-colors",
                  tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                )}>
                <t.icon className="w-4 h-4" />
                <span>{t.label}</span>
                {t.count != null && (
                  <span className={cn("text-[9px] font-bold px-1.5 rounded-full leading-4",
                    tab === t.id ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>

            {/* UPCOMING */}
            {tab === "upcoming" && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display font-bold text-base">Upcoming Appointments</h2>
                </div>
                {loadingBookings ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                ) : upcomingBookings.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-14 text-center">
                    <Calendar className="w-10 h-10 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No upcoming appointments.</p>
                    <Link href="/booking"><Button className="bg-primary hover:bg-primary/90 text-sm h-9">Book a Service</Button></Link>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {upcomingBookings.map(b => <BookingCard key={b.id} booking={b} />)}
                  </div>
                )}
              </div>
            )}

            {/* HISTORY */}
            {tab === "past" && (
              <div>
                <h2 className="font-display font-bold text-base mb-4">Service History</h2>
                {loadingBookings ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                ) : pastBookings.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-14 text-center">
                    <Clock className="w-10 h-10 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No service history yet.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {pastBookings.map(b => <BookingCard key={b.id} booking={b} />)}
                  </div>
                )}
              </div>
            )}

            {/* GARAGE */}
            {tab === "garage" && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-display font-bold text-base">My Garage</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Track your vehicles and ceramic coating status</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setShowAddVehicle(true)} className="border-border/60 gap-1.5 text-xs h-8">
                    <Plus className="w-3.5 h-3.5" /> Add Vehicle
                  </Button>
                </div>

                {loadingVehicles ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                ) : vehicles.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-14 text-center">
                    <Car className="w-10 h-10 text-muted-foreground/30" />
                    <p className="text-sm font-medium text-foreground">Your garage is empty</p>
                    <p className="text-xs text-muted-foreground max-w-xs">Add your vehicles to track ceramic coating status, service history, and get maintenance reminders.</p>
                    <Button size="sm" variant="outline" onClick={() => setShowAddVehicle(true)} className="border-border gap-1.5 mt-1">
                      <Plus className="w-3.5 h-3.5" /> Add Your First Vehicle
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {vehicles.map(v => <GarageCard key={v.id} vehicle={v} bookings={bookings} />)}
                  </div>
                )}
              </div>
            )}

            {/* ACCOUNT */}
            {tab === "account" && (
              <div>
                <h2 className="font-display font-bold text-base mb-5">Account</h2>
                <div className="flex flex-col gap-3">
                  {/* Profile card */}
                  <div className="rounded-xl border border-border bg-card p-5">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center text-xl font-bold text-primary">{initials}</div>
                      <div>
                        <p className="font-display font-bold text-foreground">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      {[
                        { label: "Total Bookings", value: bookings.length },
                        { label: "Completed", value: bookings.filter(b => b.status === "completed").length },
                        { label: "Vehicles", value: vehicles.length },
                      ].map(s => (
                        <div key={s.label} className="bg-background/50 rounded-lg p-3 border border-border/50">
                          <div className="text-lg font-display font-bold text-foreground">{s.value}</div>
                          <div className="text-[10px] text-muted-foreground">{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick links */}
                  {[
                    { icon: Calendar, label: "Book a New Service", action: () => setLocation("/booking") },
                    { icon: Edit, label: "Profile Settings", action: () => setLocation("/admin/profile") },
                  ].map(item => (
                    <button key={item.label} onClick={item.action}
                      className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors text-left">
                      <item.icon className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-sm font-medium text-foreground flex-1">{item.label}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  ))}

                  {/* Help section */}
                  <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-sm font-semibold text-foreground mb-3">Need Help?</p>
                    <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                      <p>To reschedule or cancel, contact us at least 24 hours in advance.</p>
                      <p>For fastest response, call or text us directly.</p>
                    </div>
                  </div>

                  <button onClick={logout}
                    className="flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-colors text-left">
                    <LogOut className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-red-400">Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <AddVehicleDialog
        email={email}
        open={showAddVehicle}
        onClose={() => setShowAddVehicle(false)}
        onSuccess={() => { refetchVehicles(); refetchBookings(); }}
      />
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function CustomerPortal() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SiteHeader />
        <main className="flex-1"><GuestPortal /></main>
        <SiteFooter />
      </div>
    );
  }

  return <AuthPortal user={user} />;
}

// Missing import
function Check({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
