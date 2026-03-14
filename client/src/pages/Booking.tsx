import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight, ChevronLeft, Check, Car, Calendar, MapPin, User, Sparkles, Plus, Minus, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import SiteHeader from "@/components/SiteHeader";

// ── Types ────────────────────────────────────────────────────────────────────
interface BookingData {
  // Step 1: Service
  packageId?: number;
  packageName?: string;
  packagePrice?: number;
  packageDuration?: number;
  // Step 2: Add-ons
  selectedAddOns: number[];
  // Step 3: Vehicle
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  vehicleColor: string;
  vehicleType: string;
  vehicleLicensePlate: string;
  // Step 4: Location
  serviceAddress: string;
  serviceCity: string;
  serviceState: string;
  serviceZip: string;
  gateInstructions: string;
  // Step 5: Date/Time
  appointmentDate: string;
  appointmentTime: string;
  // Step 6: Customer Info
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
  howHeard: string;
}

const STEPS = [
  { id: 1, label: "Service", icon: <Sparkles className="w-4 h-4" /> },
  { id: 2, label: "Add-Ons", icon: <Plus className="w-4 h-4" /> },
  { id: 3, label: "Vehicle", icon: <Car className="w-4 h-4" /> },
  { id: 4, label: "Location", icon: <MapPin className="w-4 h-4" /> },
  { id: 5, label: "Schedule", icon: <Calendar className="w-4 h-4" /> },
  { id: 6, label: "Details", icon: <User className="w-4 h-4" /> },
];

const VEHICLE_TYPES = ["Sedan", "SUV", "Truck", "Van", "Coupe", "Convertible", "Wagon", "Other"];
const HOW_HEARD = ["Google Search", "Instagram", "Facebook", "Friend/Referral", "Yelp", "Nextdoor", "Other"];

// Generate available time slots
function getTimeSlots() {
  const slots = [];
  for (let h = 7; h <= 17; h++) {
    for (const m of [0, 30]) {
      if (h === 17 && m > 0) break;
      const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
      const ampm = h >= 12 ? "PM" : "AM";
      const label = `${hour12}:${m === 0 ? "00" : "30"} ${ampm}`;
      const value = `${String(h).padStart(2, "0")}:${m === 0 ? "00" : "30"}`;
      slots.push({ label, value });
    }
  }
  return slots;
}

const TIME_SLOTS = getTimeSlots();

// Get next 30 days (excluding past dates)
function getAvailableDates() {
  const dates = [];
  const today = new Date();
  for (let i = 1; i <= 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (d.getDay() !== 0) { // Exclude Sundays
      dates.push(d);
    }
  }
  return dates;
}

const AVAILABLE_DATES = getAvailableDates();

// ── Step Components ──────────────────────────────────────────────────────────

function StepService({ data, setData }: { data: BookingData; setData: (d: Partial<BookingData>) => void }) {
  const { data: packages } = trpc.bookings.getPackages.useQuery();

  return (
    <div>
      <h2 className="text-2xl font-display font-bold mb-2">Choose Your Package</h2>
      <p className="text-muted-foreground text-sm mb-6">Select the detailing package that best fits your needs.</p>
      <div className="flex flex-col gap-3">
        {(packages ?? []).map((pkg) => {
          const features = pkg.features ? JSON.parse(pkg.features) : [];
          const isSelected = data.packageId === pkg.id;
          return (
            <button
              key={pkg.id}
              onClick={() => setData({
                packageId: pkg.id,
                packageName: pkg.name,
                packagePrice: Number(pkg.price),
                packageDuration: pkg.duration,
              })}
              className={`w-full text-left p-5 rounded-xl border transition-all ${
                isSelected
                  ? "border-primary bg-primary/8 shadow-md shadow-primary/10"
                  : "border-border bg-card hover:border-primary/40 hover:bg-primary/5"
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Left: name + duration + description */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-display font-bold text-lg">{pkg.name}</span>
                    {pkg.isPopular && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 font-semibold">Popular</span>
                    )}
                  </div>
                  <span className="text-muted-foreground text-xs block mb-2">{Math.floor(pkg.duration / 60)}h {pkg.duration % 60 > 0 ? `${pkg.duration % 60}m` : ""}</span>
                  <p className="text-muted-foreground text-xs leading-relaxed">{pkg.description}</p>
                </div>
                {/* Middle: feature list */}
                {features.length > 0 && (
                  <ul className="hidden sm:flex flex-col gap-1 min-w-[180px]">
                    {features.slice(0, 4).map((f: string) => (
                      <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Check className="w-3 h-3 text-primary flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                    {features.length > 4 && (
                      <li className="text-xs text-primary">+{features.length - 4} more included</li>
                    )}
                  </ul>
                )}
                {/* Right: price + check */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <div className="text-2xl font-display font-bold text-primary">${Number(pkg.price)}</div>
                  {isSelected
                    ? <Check className="w-5 h-5 text-primary" />
                    : <div className="w-5 h-5 rounded-full border-2 border-border" />}
                </div>
              </div>
              {/* Mobile feature list */}
              {features.length > 0 && (
                <ul className="sm:hidden flex flex-wrap gap-x-4 gap-y-1 mt-3 pt-3 border-t border-border/50">
                  {features.slice(0, 4).map((f: string) => (
                    <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Check className="w-3 h-3 text-primary flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                  {features.length > 4 && (
                    <li className="text-xs text-primary">+{features.length - 4} more included</li>
                  )}
                </ul>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepAddOns({ data, setData }: { data: BookingData; setData: (d: Partial<BookingData>) => void }) {
  const { data: addOns } = trpc.bookings.getAddOns.useQuery();

  const toggleAddOn = (id: number) => {
    const current = data.selectedAddOns;
    setData({
      selectedAddOns: current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    });
  };

  return (
    <div>
      <h2 className="text-2xl font-display font-bold mb-2">Enhance Your Detail</h2>
      <p className="text-muted-foreground text-sm mb-6">Add premium services to your package. All optional.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(addOns ?? []).map((addon) => {
          const isSelected = data.selectedAddOns.includes(addon.id);
          return (
            <button
              key={addon.id}
              onClick={() => toggleAddOn(addon.id)}
              className={`text-left p-4 rounded-xl border transition-all ${
                isSelected
                  ? "border-primary bg-primary/8"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{addon.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{addon.description}</div>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <span className="text-primary font-semibold text-sm">${Number(addon.price)}</span>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    isSelected ? "border-primary bg-primary" : "border-border"
                  }`}>
                    {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {data.selectedAddOns.length === 0 && (
        <p className="text-center text-muted-foreground text-sm mt-6">No add-ons selected. You can continue without any.</p>
      )}
    </div>
  );
}

function StepVehicle({ data, setData }: { data: BookingData; setData: (d: Partial<BookingData>) => void }) {
  return (
    <div>
      <h2 className="text-2xl font-display font-bold mb-2">Your Vehicle</h2>
      <p className="text-muted-foreground text-sm mb-6">Tell us about the vehicle we'll be detailing.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Make <span className="text-destructive">*</span></Label>
          <Input placeholder="e.g. BMW" value={data.vehicleMake} onChange={(e) => setData({ vehicleMake: e.target.value })} className="bg-input border-border" />
        </div>
        <div className="space-y-2">
          <Label>Model <span className="text-destructive">*</span></Label>
          <Input placeholder="e.g. M4" value={data.vehicleModel} onChange={(e) => setData({ vehicleModel: e.target.value })} className="bg-input border-border" />
        </div>
        <div className="space-y-2">
          <Label>Year <span className="text-destructive">*</span></Label>
          <Input placeholder="e.g. 2022" value={data.vehicleYear} onChange={(e) => setData({ vehicleYear: e.target.value })} className="bg-input border-border" type="number" min="1990" max="2030" />
        </div>
        <div className="space-y-2">
          <Label>Color</Label>
          <Input placeholder="e.g. Midnight Blue" value={data.vehicleColor} onChange={(e) => setData({ vehicleColor: e.target.value })} className="bg-input border-border" />
        </div>
        <div className="space-y-2">
          <Label>Vehicle Type</Label>
          <select
            value={data.vehicleType}
            onChange={(e) => setData({ vehicleType: e.target.value })}
            className="w-full h-10 px-3 rounded-md border border-border bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Select type...</option>
            {VEHICLE_TYPES.map((t) => <option key={t} value={t.toLowerCase()}>{t}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label>License Plate</Label>
          <Input placeholder="Optional" value={data.vehicleLicensePlate} onChange={(e) => setData({ vehicleLicensePlate: e.target.value })} className="bg-input border-border" />
        </div>
      </div>
    </div>
  );
}

function StepLocation({ data, setData }: { data: BookingData; setData: (d: Partial<BookingData>) => void }) {
  return (
    <div>
      <h2 className="text-2xl font-display font-bold mb-2">Service Location</h2>
      <p className="text-muted-foreground text-sm mb-6">Where should we come to detail your vehicle?</p>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Street Address <span className="text-destructive">*</span></Label>
          <Input placeholder="123 Main Street" value={data.serviceAddress} onChange={(e) => setData({ serviceAddress: e.target.value })} className="bg-input border-border" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="space-y-2 col-span-2 sm:col-span-1">
            <Label>City <span className="text-destructive">*</span></Label>
            <Input placeholder="City" value={data.serviceCity} onChange={(e) => setData({ serviceCity: e.target.value })} className="bg-input border-border" />
          </div>
          <div className="space-y-2">
            <Label>State</Label>
            <Input placeholder="TX" value={data.serviceState} onChange={(e) => setData({ serviceState: e.target.value })} className="bg-input border-border" maxLength={2} />
          </div>
          <div className="space-y-2">
            <Label>ZIP Code <span className="text-destructive">*</span></Label>
            <Input placeholder="78701" value={data.serviceZip} onChange={(e) => setData({ serviceZip: e.target.value })} className="bg-input border-border" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Gate Code / Access Instructions</Label>
          <Textarea
            placeholder="e.g. Gate code #1234, park in visitor spot 5..."
            value={data.gateInstructions}
            onChange={(e) => setData({ gateInstructions: e.target.value })}
            className="bg-input border-border resize-none"
            rows={3}
          />
        </div>
        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 text-sm text-muted-foreground">
          <span className="text-primary font-medium">Mobile Service:</span> We come to you with all equipment. No water or power connection needed.
        </div>
      </div>
    </div>
  );
}

function StepSchedule({ data, setData }: { data: BookingData; setData: (d: Partial<BookingData>) => void }) {
  const [selectedDate, setSelectedDate] = useState(data.appointmentDate);

  const formatDate = (d: Date) => {
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  return (
    <div>
      <h2 className="text-2xl font-display font-bold mb-2">Choose Date & Time</h2>
      <p className="text-muted-foreground text-sm mb-6">Select your preferred appointment date and time.</p>

      {/* Date Picker */}
      <div className="mb-6">
        <Label className="mb-3 block">Select Date <span className="text-destructive">*</span></Label>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {AVAILABLE_DATES.slice(0, 15).map((d) => {
            const dateStr = d.toISOString().split("T")[0];
            const isSelected = selectedDate === dateStr;
            const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
            const dayNum = d.getDate();
            const month = d.toLocaleDateString("en-US", { month: "short" });
            return (
              <button
                key={dateStr}
                onClick={() => {
                  setSelectedDate(dateStr);
                  setData({ appointmentDate: dateStr });
                }}
                className={`p-3 rounded-xl border text-center transition-all ${
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="text-xs font-medium opacity-70">{dayName}</div>
                <div className="text-lg font-display font-bold">{dayNum}</div>
                <div className="text-xs opacity-70">{month}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Picker */}
      {selectedDate && (
        <div>
          <Label className="mb-3 block">Select Time <span className="text-destructive">*</span></Label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {TIME_SLOTS.map((slot) => {
              const isSelected = data.appointmentTime === slot.value;
              return (
                <button
                  key={slot.value}
                  onClick={() => setData({ appointmentTime: slot.value })}
                  className={`py-2.5 px-3 rounded-lg border text-sm font-medium transition-all ${
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  {slot.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StepDetails({ data, setData }: { data: BookingData; setData: (d: Partial<BookingData>) => void }) {
  return (
    <div>
      <h2 className="text-2xl font-display font-bold mb-2">Your Information</h2>
      <p className="text-muted-foreground text-sm mb-6">Almost done! Just a few details so we can confirm your appointment.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>First Name <span className="text-destructive">*</span></Label>
          <Input placeholder="First name" value={data.firstName} onChange={(e) => setData({ firstName: e.target.value })} className="bg-input border-border" />
        </div>
        <div className="space-y-2">
          <Label>Last Name <span className="text-destructive">*</span></Label>
          <Input placeholder="Last name" value={data.lastName} onChange={(e) => setData({ lastName: e.target.value })} className="bg-input border-border" />
        </div>
        <div className="space-y-2">
          <Label>Phone <span className="text-destructive">*</span></Label>
          <Input placeholder="(555) 000-0000" value={data.phone} onChange={(e) => setData({ phone: e.target.value })} className="bg-input border-border" type="tel" />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input placeholder="you@example.com" value={data.email} onChange={(e) => setData({ email: e.target.value })} className="bg-input border-border" type="email" />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>How did you hear about us?</Label>
          <select
            value={data.howHeard}
            onChange={(e) => setData({ howHeard: e.target.value })}
            className="w-full h-10 px-3 rounded-md border border-border bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Select...</option>
            {HOW_HEARD.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Special Instructions / Notes</Label>
          <Textarea
            placeholder="Any special requests or notes for our team..."
            value={data.notes}
            onChange={(e) => setData({ notes: e.target.value })}
            className="bg-input border-border resize-none"
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}

// ── Main Booking Page ────────────────────────────────────────────────────────
export default function Booking() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);
  const [bookingData, setBookingData] = useState<BookingData>({
    selectedAddOns: [],
    vehicleMake: "", vehicleModel: "", vehicleYear: "", vehicleColor: "",
    vehicleType: "", vehicleLicensePlate: "",
    serviceAddress: "", serviceCity: "", serviceState: "", serviceZip: "", gateInstructions: "",
    appointmentDate: "", appointmentTime: "",
    firstName: "", lastName: "", email: "", phone: "", notes: "", howHeard: "",
  });

  const { data: addOnsData } = trpc.bookings.getAddOns.useQuery();
  const createBooking = trpc.bookings.create.useMutation();

  const updateData = (partial: Partial<BookingData>) => {
    setBookingData((prev) => ({ ...prev, ...partial }));
  };

  // Calculate pricing
  const pricing = useMemo(() => {
    const base = bookingData.packagePrice ?? 0;
    const addOnTotal = (addOnsData ?? [])
      .filter((a) => bookingData.selectedAddOns.includes(a.id))
      .reduce((sum, a) => sum + Number(a.price), 0);
    const subtotal = base + addOnTotal;
    const travelFee = 0;
    const taxRate = 0.0825;
    const taxAmount = subtotal * taxRate;
    const total = subtotal + travelFee + taxAmount;
    return { base, addOnTotal, subtotal, travelFee, taxAmount, total };
  }, [bookingData.packagePrice, bookingData.selectedAddOns, addOnsData]);

  const validateStep = () => {
    switch (step) {
      case 1: if (!bookingData.packageId) { toast.error("Please select a package."); return false; } break;
      case 3:
        if (!bookingData.vehicleMake || !bookingData.vehicleModel || !bookingData.vehicleYear) {
          toast.error("Please fill in vehicle make, model, and year.");
          return false;
        }
        break;
      case 4:
        if (!bookingData.serviceAddress || !bookingData.serviceCity || !bookingData.serviceZip) {
          toast.error("Please fill in your service address.");
          return false;
        }
        break;
      case 5:
        if (!bookingData.appointmentDate || !bookingData.appointmentTime) {
          toast.error("Please select a date and time.");
          return false;
        }
        break;
      case 6:
        if (!bookingData.firstName || !bookingData.lastName || !bookingData.phone) {
          toast.error("Please fill in your name and phone number.");
          return false;
        }
        break;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (step < STEPS.length) setStep(step + 1);
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    const appointmentDateTime = new Date(`${bookingData.appointmentDate}T${bookingData.appointmentTime}:00`);

    try {
      const result = await createBooking.mutateAsync({
        customerFirstName: bookingData.firstName,
        customerLastName: bookingData.lastName,
        customerEmail: bookingData.email || undefined,
        customerPhone: bookingData.phone,
        vehicleMake: bookingData.vehicleMake,
        vehicleModel: bookingData.vehicleModel,
        vehicleYear: parseInt(bookingData.vehicleYear),
        vehicleColor: bookingData.vehicleColor,
        vehicleType: bookingData.vehicleType,
        vehicleLicensePlate: bookingData.vehicleLicensePlate,
        packageId: bookingData.packageId,
        packageName: bookingData.packageName,
        addOnIds: bookingData.selectedAddOns,
        appointmentDate: appointmentDateTime.toISOString(),
        duration: bookingData.packageDuration,
        serviceAddress: bookingData.serviceAddress,
        serviceCity: bookingData.serviceCity,
        serviceState: bookingData.serviceState,
        serviceZip: bookingData.serviceZip,
        gateInstructions: bookingData.gateInstructions,
        subtotal: pricing.subtotal,
        travelFee: pricing.travelFee,
        taxAmount: pricing.taxAmount,
        totalAmount: pricing.total,
        notes: bookingData.notes,
        howHeard: bookingData.howHeard,
      });
      navigate(`/booking-confirmation/${result.bookingNumber}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create booking. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <div className="pt-20 pb-16">
        <div className="container max-w-3xl">
          {/* Header */}
          <div className="text-center py-8">
            <h1 className="text-3xl font-display font-bold mb-2">Book Your Detail</h1>
            <p className="text-muted-foreground text-sm">Complete the steps below to schedule your mobile detailing appointment.</p>
          </div>

          {/* Step Progress */}
          <div className="flex items-center justify-between mb-8 px-2">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                      step > s.id
                        ? "bg-primary border-primary text-primary-foreground"
                        : step === s.id
                        ? "border-primary text-primary bg-primary/10"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {step > s.id ? <Check className="w-4 h-4" /> : s.icon}
                  </div>
                  <span className={`text-xs mt-1 hidden sm:block ${step === s.id ? "text-primary font-medium" : "text-muted-foreground"}`}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 transition-all ${step > s.id ? "bg-primary" : "bg-border"}`} />
                )}
              </div>
            ))}
          </div>

          {/* Step Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="p-6 sm:p-8 rounded-2xl border border-border bg-card">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                  >
                    {step === 1 && <StepService data={bookingData} setData={updateData} />}
                    {step === 2 && <StepAddOns data={bookingData} setData={updateData} />}
                    {step === 3 && <StepVehicle data={bookingData} setData={updateData} />}
                    {step === 4 && <StepLocation data={bookingData} setData={updateData} />}
                    {step === 5 && <StepSchedule data={bookingData} setData={updateData} />}
                    {step === 6 && <StepDetails data={bookingData} setData={updateData} />}
                  </motion.div>
                </AnimatePresence>

                {/* Navigation */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
                  <Button
                    variant="outline"
                    onClick={() => setStep(step - 1)}
                    disabled={step === 1}
                    className="border-border"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>

                  {step < STEPS.length ? (
                    <Button
                      onClick={handleNext}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                    >
                      Continue
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSubmit}
                      disabled={createBooking.isPending}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8"
                    >
                      {createBooking.isPending ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Booking...</>
                      ) : (
                        <><Check className="w-4 h-4 mr-2" /> Confirm Booking</>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="p-5 rounded-2xl border border-border bg-card sticky top-24">
                <h3 className="font-display font-semibold mb-4">Order Summary</h3>
                {bookingData.packageName ? (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{bookingData.packageName}</span>
                      <span>${pricing.base.toFixed(2)}</span>
                    </div>
                    {bookingData.selectedAddOns.length > 0 && (
                      <>
                        {(addOnsData ?? [])
                          .filter((a) => bookingData.selectedAddOns.includes(a.id))
                          .map((a) => (
                            <div key={a.id} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{a.name}</span>
                              <span>+${Number(a.price).toFixed(2)}</span>
                            </div>
                          ))}
                      </>
                    )}
                    {pricing.travelFee > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Travel Fee</span>
                        <span>${pricing.travelFee.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax (8.25%)</span>
                      <span>${pricing.taxAmount.toFixed(2)}</span>
                    </div>
                    <div className="pt-3 border-t border-border flex justify-between font-semibold">
                      <span>Total</span>
                      <span className="text-primary">${pricing.total.toFixed(2)}</span>
                    </div>
                    {bookingData.appointmentDate && bookingData.appointmentTime && (
                      <div className="pt-3 border-t border-border text-xs text-muted-foreground">
                        <div className="font-medium text-foreground mb-1">Appointment</div>
                        <div>{new Date(`${bookingData.appointmentDate}T${bookingData.appointmentTime}`).toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Select a package to see pricing.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
