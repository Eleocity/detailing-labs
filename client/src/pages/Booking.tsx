import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check, MapPin, Search, ChevronLeft, ChevronRight,
  Clock, Star, Loader2, Plus, Minus, X, RefreshCw, Car,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

// ─── Types ────────────────────────────────────────────────────────────────────
interface BookingData {
  serviceAddress: string;
  serviceCity: string;
  serviceState: string;
  serviceZip: string;
  vehicleType: string;
  packageId?: number;
  packageName?: string;
  packagePrice?: number;
  packageDuration?: number;
  addOnQty: Record<number, number>;
  appointmentDate: string;
  appointmentTime: string;
  gateInstructions: string;
  vehicleLocationDetails: string;
  specialRequests: string;
  petChildUse: string;
  vehicleCondition: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  vehicleColor: string;
  vehicleLicensePlate: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  howHeard: string;
  recurringInterval: string;
}

type Step =
  | "location"
  | "service_category"
  | "vehicle_type"
  | "package"
  | "addons"
  | "schedule"
  | "recurring"
  | "vehicle_info"
  | "contact";

const VEHICLE_TYPES = [
  { value: "coupe",       label: "Coupe",        emoji: "🏎️" },
  { value: "sedan",       label: "Sedan",         emoji: "🚗" },
  { value: "suv_5",       label: "SUV 5-Seat",    emoji: "🚙" },
  { value: "suv_6",       label: "SUV 6-Seat",    emoji: "🚙" },
  { value: "suv_7",       label: "SUV 7-Seat",    emoji: "🚙" },
  { value: "truck",       label: "Truck",         emoji: "🛻" },
  { value: "van",         label: "Van / Minivan", emoji: "🚐" },
  { value: "convertible", label: "Convertible",   emoji: "🚘" },
];

const RECURRING = [
  { interval: "14", label: "Every 14 Days",  save: 20 },
  { interval: "30", label: "Every 30 Days",  save: 10 },
  { interval: "60", label: "Every 60 Days",  save: 5  },
];

const HOW_HEARD = ["Google", "Instagram", "Facebook", "Referral", "Yelp", "Nextdoor", "Other"];

const FAKE_TECHS = [
  { name: "Jake T.",   rating: 4.9 },
  { name: "Maria V.",  rating: 4.9 },
  { name: "Devon K.",  rating: 4.8 },
];

function getAvailableDates() {
  const out: Date[] = [];
  const today = new Date();
  for (let i = 1; i <= 60; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (d.getDay() !== 0) out.push(d);
  }
  return out;
}

function getTimeSlots() {
  const out: { label: string; value: string }[] = [];
  for (let h = 7; h <= 17; h++) {
    for (const m of [0, 30]) {
      if (h === 17 && m > 0) break;
      const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
      out.push({ label: `${h12}:${m === 0 ? "00" : "30"} ${h >= 12 ? "PM" : "AM"}`, value: `${String(h).padStart(2, "0")}:${m === 0 ? "00" : "30"}` });
    }
  }
  return out;
}

const ALL_DATES = getAvailableDates();
const TIME_SLOTS = getTimeSlots();

// ─── Shared primitives ────────────────────────────────────────────────────────
function PageTitle({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-12 border-b border-border/60 relative px-12">
      <span className="text-sm font-semibold text-foreground">{title}</span>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );
}

function StickyBottom({ dateLabel, onNext, nextLabel = "Next", disabled = false, isPending = false }: {
  dateLabel?: string; onNext: () => void; nextLabel?: string; disabled?: boolean; isPending?: boolean;
}) {
  return (
    <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border/60 p-4 flex items-center gap-3">
      {dateLabel ? (
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="2"/><path d="M16 2v4M8 2v4M3 10h18" strokeWidth="2"/></svg>
          </div>
          <span className="text-xs text-muted-foreground truncate">{dateLabel}</span>
        </div>
      ) : <div className="flex-1" />}
      <button
        onClick={onNext}
        disabled={disabled || isPending}
        className="bg-primary/80 hover:bg-primary disabled:opacity-40 text-white font-semibold text-sm px-8 py-3 rounded-2xl transition-colors flex items-center gap-2 min-w-[100px] justify-center"
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : nextLabel}
      </button>
    </div>
  );
}

// ─── Step: Location ───────────────────────────────────────────────────────────
function StepLocation({ data, onUpdate, onNext }: { data: BookingData; onUpdate: (d: Partial<BookingData>) => void; onNext: () => void }) {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-display font-bold mb-1">Book an Appointment</h1>
        <p className="text-sm text-muted-foreground">Where should we come to detail your vehicle?</p>
      </div>

      <div className="px-5 mb-4">
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-border focus-within:border-primary transition-colors bg-card">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            placeholder="Enter the street number and full address"
            value={data.serviceAddress}
            onChange={(e) => onUpdate({ serviceAddress: e.target.value })}
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
          {data.serviceAddress && (
            <button onClick={() => onUpdate({ serviceAddress: "" })} className="text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
          <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
        </div>
      </div>

      {/* Map */}
      <div className="mx-5 flex-1 min-h-[300px] rounded-2xl border border-border overflow-hidden relative bg-muted/10">
        <div className="absolute inset-0"
          style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 47px,hsl(var(--border)/0.4) 48px),repeating-linear-gradient(90deg,transparent,transparent 47px,hsl(var(--border)/0.4) 48px)" }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-14 flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-destructive shadow-lg flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-white" />
              </div>
              <div className="w-0.5 h-4 bg-destructive" />
            </div>
          </div>
        </div>
        <div className="absolute bottom-3 left-3 text-[10px] text-muted-foreground/60 font-medium">fieldd</div>
      </div>

      <div className="px-5 pt-4 grid grid-cols-2 gap-3 pb-2">
        <div className="col-span-2 space-y-1.5">
          <Label className="text-xs font-medium">City <span className="text-destructive">*</span></Label>
          <Input placeholder="Nashville" value={data.serviceCity} onChange={(e) => onUpdate({ serviceCity: e.target.value })} className="bg-input border-border" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">State</Label>
          <Input placeholder="TN" value={data.serviceState} onChange={(e) => onUpdate({ serviceState: e.target.value })} maxLength={2} className="bg-input border-border" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">ZIP <span className="text-destructive">*</span></Label>
          <Input placeholder="37201" value={data.serviceZip} onChange={(e) => onUpdate({ serviceZip: e.target.value })} className="bg-input border-border" />
        </div>
      </div>

      <StickyBottom onNext={onNext} nextLabel="Next" disabled={!data.serviceAddress || !data.serviceCity || !data.serviceZip} />
    </div>
  );
}

// ─── Step: Service Category ───────────────────────────────────────────────────
function StepServiceCategory({ onSelect, breadcrumb }: { onSelect: (pkg: any) => void; breadcrumb: string[] }) {
  const { data: packages, isLoading } = trpc.bookings.getPackages.useQuery();

  return (
    <div>
      <PageTitle title="Select Service" />
      <Breadcrumb items={breadcrumb} />
      {isLoading ? <Spinner /> : (
        <div className="px-4 py-3 grid grid-cols-2 gap-3">
          {(packages ?? []).map((pkg) => (
            <button key={pkg.id} onClick={() => onSelect(pkg)}
              className="flex flex-col rounded-2xl border border-border bg-card hover:border-primary/60 transition-all overflow-hidden text-left active:scale-[0.98] shadow-sm">
              <div className="h-28 bg-gradient-to-br from-muted/40 to-muted/10 flex items-center justify-center">
                <span className="text-5xl">🚗</span>
              </div>
              <div className="p-3 pb-4">
                <p className="text-xs font-bold text-primary leading-snug mb-1">{pkg.name}</p>
                <p className="text-[11px] text-muted-foreground">View Options</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Step: Vehicle Type ───────────────────────────────────────────────────────
function StepVehicleType({ data, onSelect, breadcrumb }: { data: BookingData; onSelect: (v: string) => void; breadcrumb: string[] }) {
  return (
    <div>
      <PageTitle title="Select Service" />
      <Breadcrumb items={breadcrumb} />
      <div className="px-4 py-3 grid grid-cols-2 gap-3">
        {VEHICLE_TYPES.map((vt) => {
          const isSel = data.vehicleType === vt.value;
          return (
            <button key={vt.value} onClick={() => onSelect(vt.value)}
              className={cn(
                "flex flex-col rounded-2xl border overflow-hidden text-left transition-all active:scale-[0.98] shadow-sm",
                isSel ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
              )}>
              <div className="h-28 bg-gradient-to-br from-muted/30 to-transparent flex items-center justify-center relative">
                <span className="text-5xl">{vt.emoji}</span>
                {isSel && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
              <div className="p-3 pb-4">
                <p className={cn("text-xs font-bold leading-snug mb-1", isSel ? "text-primary" : "text-foreground")}>{vt.label}</p>
                <p className="text-[11px] text-muted-foreground">View Options</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step: Package ────────────────────────────────────────────────────────────
function StepPackage({ data, onSelect, breadcrumb }: { data: BookingData; onSelect: (pkg: any) => void; breadcrumb: string[] }) {
  const { data: packages, isLoading } = trpc.bookings.getPackages.useQuery();
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div>
      <PageTitle title="Select Service" />
      <Breadcrumb items={breadcrumb} />
      {isLoading ? <Spinner /> : (
        <div className="px-4 py-3 flex flex-col gap-3">
          {(packages ?? []).map((pkg) => {
            const features: string[] = pkg.features ? JSON.parse(pkg.features) : [];
            const isSel = data.packageId === pkg.id;
            const isExp = expanded === pkg.id;
            const hrs = Math.floor(pkg.duration / 60);
            const mins = pkg.duration % 60;
            return (
              <div key={pkg.id}
                className={cn("rounded-2xl border overflow-hidden shadow-sm transition-all", isSel ? "border-primary bg-primary/5" : "border-border bg-card")}>
                {/* Header row */}
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-muted/40 flex items-center justify-center flex-shrink-0 text-2xl">🚗</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-primary mb-0.5">{pkg.name}</p>
                      <p className="text-xs text-muted-foreground">${Number(pkg.price).toFixed(2)} · {hrs}h{mins > 0 ? ` ${mins}m` : ""}</p>
                      {pkg.description && (
                        <p className={cn("text-xs text-muted-foreground mt-1 leading-relaxed", !isExp && "line-clamp-2")}>{pkg.description}</p>
                      )}
                      {pkg.description && pkg.description.length > 80 && (
                        <button onClick={() => setExpanded(isExp ? null : pkg.id)} className="text-xs text-primary font-semibold mt-1">
                          {isExp ? "Show Less" : "Show More"}
                        </button>
                      )}
                    </div>
                    {/* Qty controls */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <button onClick={() => isSel && onSelect(null)}
                        className="w-8 h-8 rounded-full border-2 border-border flex items-center justify-center text-muted-foreground hover:border-destructive hover:text-destructive transition-colors">
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-sm font-bold w-4 text-center">{isSel ? "1" : "0"}</span>
                      <button onClick={() => onSelect(pkg)}
                        className="w-8 h-8 rounded-full border-2 border-primary flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-colors">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sticky add button */}
      {data.packageId && data.packagePrice && (
        <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border/60 p-4">
          <button
            onClick={() => { /* advance handled by parent */ }}
            className="w-full bg-primary/80 hover:bg-primary text-white font-semibold py-3.5 rounded-2xl text-sm transition-colors">
            Add 1 · ${data.packagePrice.toFixed(2)}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Step: Add-Ons ────────────────────────────────────────────────────────────
function StepAddOns({ data, onUpdate, onNext, breadcrumb }: {
  data: BookingData; onUpdate: (d: Partial<BookingData>) => void; onNext: () => void; breadcrumb: string[];
}) {
  const { data: addOns, isLoading } = trpc.bookings.getAddOns.useQuery();

  const setQty = (id: number, qty: number) => {
    onUpdate({ addOnQty: { ...data.addOnQty, [id]: Math.max(0, qty) } });
  };

  const totalAddOns = Object.entries(data.addOnQty).reduce((s, [id, q]) => {
    const ao = (addOns ?? []).find((a) => a.id === Number(id));
    return s + (ao ? Number(ao.price) * q : 0);
  }, 0);

  const basePrice = data.packagePrice ?? 0;
  const total = basePrice + totalAddOns;

  return (
    <div>
      <PageTitle title={data.packageName ?? "Add-Ons"} />
      <Breadcrumb items={breadcrumb} />

      {isLoading ? <Spinner /> : (
        <div>
          {/* Exterior upgrades */}
          <SectionHeader label="Exterior Upgrades" />
          <div className="divide-y divide-border/60">
            {(addOns ?? []).filter((_, i) => i % 2 === 0).map((ao) => {
              const qty = data.addOnQty[ao.id] ?? 0;
              return <AddOnRow key={ao.id} ao={ao} qty={qty} onQty={(q) => setQty(ao.id, q)} />;
            })}
          </div>

          {/* Interior upgrades */}
          <SectionHeader label="Interior Upgrades" />
          <div className="divide-y divide-border/60">
            {(addOns ?? []).filter((_, i) => i % 2 === 1).map((ao) => {
              const qty = data.addOnQty[ao.id] ?? 0;
              return <AddOnRow key={ao.id} ao={ao} qty={qty} onQty={(q) => setQty(ao.id, q)} />;
            })}
          </div>
        </div>
      )}

      <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border/60 p-4">
        <button onClick={onNext}
          className="w-full bg-primary/80 hover:bg-primary text-white font-semibold py-3.5 rounded-2xl text-sm transition-colors">
          Add 1 · ${total.toFixed(2)}
        </button>
      </div>
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return <div className="px-4 py-2 bg-muted/20 border-y border-border/60"><p className="text-xs font-semibold text-foreground">{label}</p></div>;
}

function AddOnRow({ ao, qty, onQty }: { ao: any; qty: number; onQty: (q: number) => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="w-10 h-10 rounded-xl bg-muted/40 flex items-center justify-center flex-shrink-0 text-xl">✨</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-primary leading-tight">{ao.name}</p>
        <p className="text-xs text-muted-foreground">${Number(ao.price).toFixed(2)}{ao.duration > 0 ? ` · ${Math.floor(ao.duration / 60) > 0 ? `${Math.floor(ao.duration / 60)} h ` : ""}${ao.duration % 60 > 0 ? `${ao.duration % 60} min` : ""}` : ""}</p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <button onClick={() => onQty(qty - 1)}
          className="w-8 h-8 rounded-full border-2 border-border flex items-center justify-center text-muted-foreground hover:border-destructive hover:text-destructive transition-colors">
          <Minus className="w-3.5 h-3.5" />
        </button>
        <span className="text-sm font-bold w-4 text-center">{qty}</span>
        <button onClick={() => onQty(qty + 1)}
          className="w-8 h-8 rounded-full border-2 border-primary flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-colors">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Step: Schedule ───────────────────────────────────────────────────────────
function StepSchedule({ data, onUpdate, onNext }: { data: BookingData; onUpdate: (d: Partial<BookingData>) => void; onNext: () => void }) {
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const monthDates = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = Array(firstDay === 0 ? 6 : firstDay - 1).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    return cells;
  }, [viewMonth]);

  const availableSet = new Set(ALL_DATES.map((d) => d.toISOString().split("T")[0]));
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const selectedTech = FAKE_TECHS[0];
  const dateLabel = data.appointmentDate && data.appointmentTime
    ? (() => {
        const d = new Date(`${data.appointmentDate}T${data.appointmentTime}`);
        return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) + " · " + data.appointmentTime.replace(":00", ":00").replace(/(\d+):(\d+)/, (_, h, m) => `${parseInt(h) > 12 ? parseInt(h) - 12 : h}:${m}${parseInt(h) >= 12 ? "am" : "am"}`);
      })()
    : undefined;

  return (
    <div>
      <PageTitle title="Select Date & Time" />

      {/* Package summary */}
      {data.packageName && (
        <div className="mx-4 mt-3 p-3 rounded-2xl border border-border bg-card flex items-center gap-3">
          <div className="text-lg">💎</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-primary">{data.packageName}</p>
            <p className="text-xs text-muted-foreground">${data.packagePrice?.toFixed(2)} · {data.packageDuration ? `${Math.floor(data.packageDuration / 60)} hour` : ""}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-muted/30 flex items-center justify-center text-xs font-bold text-center leading-tight text-foreground">
            <span className="text-[10px]">Inside<br />&amp; Out</span>
          </div>
        </div>
      )}

      {/* Calendar */}
      <div className="mx-4 mt-3 p-4 rounded-2xl border border-border bg-card">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <p className="text-sm font-bold text-primary">
            {viewMonth.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).replace(/\d+,/, "")}
          </p>
          <button onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {["Mo","Tu","We","Th","Fr","Sa","Su"].map((d) => (
            <div key={d} className="text-center text-[11px] font-medium text-muted-foreground py-1">{d}</div>
          ))}
        </div>

        {/* Date grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {monthDates.map((d, i) => {
            if (!d) return <div key={i} />;
            const str = d.toISOString().split("T")[0];
            const isPast = d < today;
            const isAvail = availableSet.has(str) && !isPast;
            const isSel = data.appointmentDate === str;
            const isToday = str === today.toISOString().split("T")[0];
            return (
              <button key={str} disabled={!isAvail}
                onClick={() => onUpdate({ appointmentDate: str, appointmentTime: "" })}
                className={cn(
                  "aspect-square flex items-center justify-center text-sm font-medium rounded-xl transition-all",
                  isPast ? "text-muted-foreground/30 cursor-not-allowed" :
                  isSel ? "bg-primary text-white" :
                  isAvail ? "text-primary hover:bg-primary/10 cursor-pointer" :
                  "text-muted-foreground/40 cursor-not-allowed"
                )}>
                {d.getDate()}
              </button>
            );
          })}
        </div>

        {/* Earliest button */}
        <div className="mt-3 flex justify-center">
          <button
            onClick={() => {
              const earliest = ALL_DATES[0];
              if (earliest) onUpdate({ appointmentDate: earliest.toISOString().split("T")[0] });
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-border text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors">
            <Search className="w-3 h-3" /> Earliest
          </button>
        </div>
      </div>

      {/* Time slots — shown after date selected */}
      <AnimatePresence>
        {data.appointmentDate && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-4 mt-3 flex flex-col gap-2">
            {TIME_SLOTS.map((slot) => {
              const isSel = data.appointmentTime === slot.value;
              return (
                <button key={slot.value} onClick={() => onUpdate({ appointmentTime: slot.value })}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-2xl border-2 transition-all",
                    isSel ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
                  )}>
                  <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
                    <span className="text-lg">💎</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className={cn("text-sm font-bold", isSel ? "text-primary" : "text-foreground")}>{slot.label}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {selectedTech.name} <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {selectedTech.rating}
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center">
                    {isSel ? <div className="w-3 h-3 rounded-full bg-primary" /> : null}
                  </div>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-24" />
      <StickyBottom
        dateLabel={dateLabel ?? (data.appointmentDate ? new Date(data.appointmentDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : undefined)}
        onNext={onNext}
        disabled={!data.appointmentDate || !data.appointmentTime}
      />
    </div>
  );
}

// ─── Step: Recurring ─────────────────────────────────────────────────────────
function StepRecurring({ data, onUpdate, onNext, onSkip }: {
  data: BookingData; onUpdate: (d: Partial<BookingData>) => void; onNext: () => void; onSkip: () => void;
}) {
  const basePrice = data.packagePrice ?? 0;

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
        <h2 className="text-xl font-display font-bold">Schedule again automatically</h2>
        <button onClick={onSkip} className="text-sm text-primary font-medium">Close</button>
      </div>

      <div className="flex-1 px-5 py-4 flex flex-col gap-3">
        {RECURRING.map((opt) => {
          const discounted = basePrice * (1 - opt.save / 100);
          const isSel = data.recurringInterval === opt.interval;
          return (
            <button key={opt.interval} onClick={() => onUpdate({ recurringInterval: isSel ? "" : opt.interval })}
              className={cn(
                "w-full text-left p-4 rounded-2xl border-2 transition-all",
                isSel ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
              )}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-foreground">{opt.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">Save {opt.save}%</span>
                  <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all", isSel ? "border-primary bg-primary" : "border-border")}>
                    {isSel && <Check className="w-3 h-3 text-white" />}
                  </div>
                </div>
              </div>
              <p className="text-base font-bold text-foreground">${discounted.toFixed(2)}</p>
            </button>
          );
        })}

        {/* Custom */}
        <div className="p-4 rounded-2xl border-2 border-border bg-card">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-foreground">Custom</span>
            <div className="flex items-center gap-2">
              <select className="text-xs bg-background border border-border rounded-lg px-2 py-1 text-foreground">
                <option>Every Week</option>
                <option>Every 2 Weeks</option>
                <option>Every Month</option>
              </select>
              <div className="w-5 h-5 rounded-full border-2 border-border" />
            </div>
          </div>
          <p className="text-base font-bold text-foreground">${basePrice.toFixed(2)}</p>
        </div>
      </div>

      <div className="px-5 pb-4">
        <button onClick={onSkip}
          className="w-full py-3.5 rounded-2xl border border-border bg-muted/20 text-sm font-semibold text-foreground hover:bg-muted/40 transition-colors mb-3">
          No Thanks
        </button>
      </div>

      <StickyBottom onNext={onNext} nextLabel="Next" />
    </div>
  );
}

// ─── Step: Vehicle Info ───────────────────────────────────────────────────────
function StepVehicleInfo({ data, onUpdate, onNext }: { data: BookingData; onUpdate: (d: Partial<BookingData>) => void; onNext: () => void }) {
  const dateLabel = data.appointmentDate
    ? new Date(data.appointmentDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) +
      (data.appointmentTime ? ` · ${data.appointmentTime}` : "")
    : undefined;

  return (
    <div>
      <PageTitle title="Vehicle information" />

      <div className="px-5 py-4 space-y-5">
        {/* Vehicle details */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5">
            <Label className="text-sm text-primary font-semibold">Vehicle Details</Label>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Year <span className="text-destructive">*</span></Label>
            <Input placeholder="2022" value={data.vehicleYear} onChange={(e) => onUpdate({ vehicleYear: e.target.value })} type="number" className="bg-input border-border" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Make <span className="text-destructive">*</span></Label>
            <Input placeholder="BMW" value={data.vehicleMake} onChange={(e) => onUpdate({ vehicleMake: e.target.value })} className="bg-input border-border" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Model <span className="text-destructive">*</span></Label>
            <Input placeholder="M4" value={data.vehicleModel} onChange={(e) => onUpdate({ vehicleModel: e.target.value })} className="bg-input border-border" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Color</Label>
            <Input placeholder="Midnight Blue" value={data.vehicleColor} onChange={(e) => onUpdate({ vehicleColor: e.target.value })} className="bg-input border-border" />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs">License Plate</Label>
            <Input placeholder="Optional" value={data.vehicleLicensePlate} onChange={(e) => onUpdate({ vehicleLicensePlate: e.target.value })} className="bg-input border-border" />
          </div>
        </div>

        {/* Access */}
        <div className="space-y-2">
          <Label className="text-sm text-primary font-semibold">Access</Label>
          <Textarea placeholder="Describe how to access your home" value={data.gateInstructions} onChange={(e) => onUpdate({ gateInstructions: e.target.value })} rows={3} className="bg-input border-border resize-none text-sm" />
        </div>

        {/* Vehicle location */}
        <div className="space-y-2">
          <Label className="text-sm text-primary font-semibold">Vehicle Location Details</Label>
          <Textarea placeholder="Will the vehicle be in a shaded or covered area during the appointment? (This helps us prepare for heat or sun exposure.)" value={data.vehicleLocationDetails} onChange={(e) => onUpdate({ vehicleLocationDetails: e.target.value })} rows={3} className="bg-input border-border resize-none text-sm" />
        </div>

        {/* Special requests */}
        <div className="space-y-2">
          <Label className="text-sm text-primary font-semibold">Special Requests or Problem Areas</Label>
          <Textarea placeholder="Are there any specific concerns or areas you'd like us to focus on? (Pet hair, stains, scratches, odors, etc.)" value={data.specialRequests} onChange={(e) => onUpdate({ specialRequests: e.target.value })} rows={3} className="bg-input border-border resize-none text-sm" />
        </div>

        {/* Pet / child */}
        <div className="space-y-2">
          <Label className="text-sm text-primary font-semibold">Pet or Child Use</Label>
          <Textarea placeholder="Is this vehicle regularly used to transport pets or young children? (This helps us prepare for specific cleaning needs.)" value={data.petChildUse} onChange={(e) => onUpdate({ petChildUse: e.target.value })} rows={3} className="bg-input border-border resize-none text-sm" />
        </div>

        {/* Vehicle condition */}
        <div className="space-y-2">
          <Label className="text-sm text-primary font-semibold">Vehicle Condition</Label>
          <Textarea placeholder="When was the last time your vehicle was professionally detailed or cleaned? (This helps us estimate the time and products needed.)" value={data.vehicleCondition} onChange={(e) => onUpdate({ vehicleCondition: e.target.value })} rows={3} className="bg-input border-border resize-none text-sm" />
        </div>
      </div>

      <StickyBottom
        dateLabel={dateLabel}
        onNext={onNext}
        disabled={!data.vehicleMake || !data.vehicleModel || !data.vehicleYear}
      />
    </div>
  );
}

// ─── Step: Contact ────────────────────────────────────────────────────────────
function StepContact({ data, onUpdate, onSubmit, isPending }: {
  data: BookingData; onUpdate: (d: Partial<BookingData>) => void; onSubmit: () => void; isPending: boolean;
}) {
  const dateLabel = data.appointmentDate
    ? new Date(data.appointmentDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) + (data.appointmentTime ? ` · ${data.appointmentTime}` : "")
    : undefined;

  return (
    <div>
      <PageTitle title="Your Details" />
      <div className="px-5 py-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">First Name <span className="text-destructive">*</span></Label>
            <Input placeholder="First" value={data.firstName} onChange={(e) => onUpdate({ firstName: e.target.value })} className="bg-input border-border" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Last Name <span className="text-destructive">*</span></Label>
            <Input placeholder="Last" value={data.lastName} onChange={(e) => onUpdate({ lastName: e.target.value })} className="bg-input border-border" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Phone <span className="text-destructive">*</span></Label>
          <Input placeholder="(615) 000-0000" value={data.phone} onChange={(e) => onUpdate({ phone: e.target.value })} type="tel" className="bg-input border-border" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Email <span className="text-muted-foreground font-normal">(confirmation)</span></Label>
          <Input placeholder="you@example.com" value={data.email} onChange={(e) => onUpdate({ email: e.target.value })} type="email" className="bg-input border-border" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium">How did you hear about us?</Label>
          <div className="flex flex-wrap gap-2">
            {HOW_HEARD.map((h) => (
              <button key={h} onClick={() => onUpdate({ howHeard: h })}
                className={cn("px-3 py-1.5 rounded-full border text-xs font-medium transition-all",
                  data.howHeard === h ? "border-primary bg-primary text-white" : "border-border text-muted-foreground hover:border-primary/50")}>
                {h}
              </button>
            ))}
          </div>
        </div>
      </div>

      <StickyBottom
        dateLabel={dateLabel}
        onNext={onSubmit}
        nextLabel="Confirm Booking"
        disabled={!data.firstName || !data.lastName || !data.phone}
        isPending={isPending}
      />
    </div>
  );
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────
function Breadcrumb({ items }: { items: string[] }) {
  return (
    <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border/60">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />}
          <span className={cn("text-xs font-medium", i === items.length - 1 ? "text-foreground" : "text-primary")}>{item}</span>
        </span>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Booking() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("location");
  const [history, setHistory] = useState<Step[]>([]);
  const [data, setData] = useState<BookingData>({
    serviceAddress: "", serviceCity: "", serviceState: "TN", serviceZip: "",
    vehicleType: "",
    addOnQty: {},
    appointmentDate: "", appointmentTime: "",
    gateInstructions: "", vehicleLocationDetails: "", specialRequests: "", petChildUse: "", vehicleCondition: "",
    vehicleMake: "", vehicleModel: "", vehicleYear: "", vehicleColor: "", vehicleLicensePlate: "",
    firstName: "", lastName: "", email: "", phone: "", howHeard: "",
    recurringInterval: "",
  });

  const { data: addOnsData = [] } = trpc.bookings.getAddOns.useQuery();
  const { data: siteContent } = trpc.content.getSiteContent.useQuery({ section: "business" });
  const createBooking = trpc.bookings.create.useMutation();

  const taxRate = useMemo(() => {
    const raw = siteContent?.find((r) => r.key === "tax_rate")?.value;
    const v = raw ? parseFloat(raw) : NaN;
    return isNaN(v) ? 0.0825 : v;
  }, [siteContent]);

  const update = (partial: Partial<BookingData>) => setData((p) => ({ ...p, ...partial }));

  const goTo = (next: Step) => {
    setHistory((h) => [...h, step]);
    setStep(next);
    window.scrollTo(0, 0);
  };

  const goBack = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory((h) => h.slice(0, -1));
      setStep(prev);
      window.scrollTo(0, 0);
    } else {
      navigate("/");
    }
  };

  const submit = async () => {
    if (!data.firstName || !data.lastName || !data.phone) { toast.error("Please fill in your name and phone."); return; }
    const dt = new Date(`${data.appointmentDate}T${data.appointmentTime}:00`);
    const addOnIds = Object.entries(data.addOnQty).filter(([, q]) => q > 0).map(([id]) => Number(id));
    const addOnTotal = addOnIds.reduce((s, id) => {
      const ao = addOnsData.find((a) => a.id === id);
      return s + (ao ? Number(ao.price) * (data.addOnQty[id] ?? 0) : 0);
    }, 0);
    const subtotal = (data.packagePrice ?? 0) + addOnTotal;
    const taxAmount = subtotal * taxRate;
    try {
      const result = await createBooking.mutateAsync({
        customerFirstName: data.firstName,
        customerLastName: data.lastName,
        customerEmail: data.email || undefined,
        customerPhone: data.phone,
        vehicleMake: data.vehicleMake,
        vehicleModel: data.vehicleModel,
        vehicleYear: parseInt(data.vehicleYear) || new Date().getFullYear(),
        vehicleColor: data.vehicleColor,
        vehicleType: data.vehicleType,
        vehicleLicensePlate: data.vehicleLicensePlate,
        packageId: data.packageId,
        packageName: data.packageName,
        addOnIds,
        appointmentDate: dt.toISOString(),
        duration: data.packageDuration,
        serviceAddress: data.serviceAddress,
        serviceCity: data.serviceCity,
        serviceState: data.serviceState,
        serviceZip: data.serviceZip,
        gateInstructions: data.gateInstructions,
        subtotal,
        travelFee: 0,
        taxAmount,
        totalAmount: subtotal + taxAmount,
        notes: [data.specialRequests, data.petChildUse, data.vehicleCondition, data.vehicleLocationDetails].filter(Boolean).join("\n\n"),
        howHeard: data.howHeard,
      });
      navigate(`/booking/confirmation/${result.bookingNumber}`);
    } catch (err: any) {
      toast.error(err.message || "Something went wrong. Please try again.");
    }
  };

  const breadcrumb = useMemo(() => {
    const crumbs = ["Services"];
    if (data.packageName) crumbs.push(data.packageName);
    if (data.vehicleType) crumbs.push(VEHICLE_TYPES.find((v) => v.value === data.vehicleType)?.label ?? data.vehicleType);
    return crumbs;
  }, [data.packageName, data.vehicleType]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top nav bar */}
      <div className="sticky top-0 z-50 flex items-center justify-between px-4 h-12 bg-background border-b border-border/60">
        <button onClick={goBack} className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        {/* Progress bar */}
        <div className="flex-1 mx-4 h-1 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300 rounded-full"
            style={{ width: `${(["location","service_category","vehicle_type","package","addons","schedule","recurring","vehicle_info","contact"].indexOf(step) + 1) / 9 * 100}%` }}
          />
        </div>
        <Link href="/login">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-xs font-bold text-primary">G</span>
          </div>
        </Link>
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18, ease: "easeOut" }} className="flex-1 flex flex-col">
          {step === "location" && <StepLocation data={data} onUpdate={update} onNext={() => goTo("service_category")} />}
          {step === "service_category" && <StepServiceCategory breadcrumb={["Services"]} onSelect={(pkg) => { update({ packageId: pkg.id, packageName: pkg.name, packagePrice: Number(pkg.price), packageDuration: pkg.duration }); goTo("vehicle_type"); }} />}
          {step === "vehicle_type" && <StepVehicleType data={data} breadcrumb={breadcrumb.slice(0, 2)} onSelect={(v) => { update({ vehicleType: v }); goTo("package"); }} />}
          {step === "package" && <StepPackage data={data} breadcrumb={breadcrumb} onSelect={(pkg) => { if (pkg) { update({ packageId: pkg.id, packageName: pkg.name, packagePrice: Number(pkg.price), packageDuration: pkg.duration }); goTo("addons"); } }} />}
          {step === "addons" && <StepAddOns data={data} onUpdate={update} onNext={() => goTo("schedule")} breadcrumb={breadcrumb} />}
          {step === "schedule" && <StepSchedule data={data} onUpdate={update} onNext={() => goTo("recurring")} />}
          {step === "recurring" && <StepRecurring data={data} onUpdate={update} onNext={() => goTo("vehicle_info")} onSkip={() => { update({ recurringInterval: "" }); goTo("vehicle_info"); }} />}
          {step === "vehicle_info" && <StepVehicleInfo data={data} onUpdate={update} onNext={() => goTo("contact")} />}
          {step === "contact" && <StepContact data={data} onUpdate={update} onSubmit={submit} isPending={createBooking.isPending} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
