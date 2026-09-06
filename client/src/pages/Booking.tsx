import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  MapPin,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Plus,
  Minus,
  X,
  CalendarDays,
  Camera,
  Trash2,
  Car,
  Sparkles,
  ArrowRight,
  Droplets,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import SEO from "@/components/SEO";
import { compressImage, isSupportedImageFile } from "@/lib/imageCompress";
import SmsConsentField from "@/components/SmsConsentField";
import {
  ADD_ONS as CENTRAL_ADD_ONS,
  PACKAGES as CENTRAL_PACKAGES,
  resolvePackagePrice,
  dbVehiclePricingFromPackageRow,
} from "@shared/services";
import { BRAND } from "@shared/brand";

// ─── Types ─────────────────────────────────────────────────────────────────
interface BookingData {
  serviceAddress: string;
  serviceCity: string;
  serviceState: string;
  serviceZip: string;
  vehicleType: string;
  vehicleCategory: "" | "sedan" | "suv" | "large";
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
  // Step 5 — structured vehicle-condition answers (see StepCondition)
  conditionPetHair: boolean;
  conditionStains: boolean;
  conditionOdors: boolean;
  conditionExcessiveTrash: boolean;
  conditionSand: boolean;
  conditionSalt: boolean;
  conditionPaint: "" | "good" | "fair" | "poor";
  conditionScratchesOxidation: boolean;
  conditionAftermarketParts: boolean;
  conditionBiohazards: boolean;
  conditionNotes: string;
  // Step 6 — photo upload (see StepPhotos)
  draftToken: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  vehicleColor: string;
  vehicleLicensePlate: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  smsConsent: boolean;
  howHeard: string;
  recurringInterval: string;
}

type Step =
  | "service_type"
  | "location"
  | "vehicle_info"
  | "package"
  | "addons"
  | "schedule"
  | "recurring"
  | "condition"
  | "photos"
  | "contact";
const STEPS: Step[] = [
  "service_type",
  "location",
  "vehicle_info",
  "package",
  "addons",
  "schedule",
  "recurring",
  "condition",
  "photos",
  "contact",
];

const VEHICLE_CATEGORIES = [
  { id: "sedan", label: "Sedan", sub: "Coupe", vehicleType: "sedan" },
  { id: "suv", label: "SUV", sub: "Small / Truck", vehicleType: "suv" },
  {
    id: "large",
    label: "Large SUV",
    sub: "Minivan / Full-size",
    vehicleType: "suv",
  },
] as const;
type VehicleCategoryId = (typeof VEHICLE_CATEGORIES)[number]["id"];

const HOW_HEARD = [
  "Google",
  "Instagram",
  "Facebook",
  "Referral",
  "Yelp",
  "Nextdoor",
  "Other",
];
const RECURRING = [
  { interval: "14", label: "Every 14 Days", save: 20 },
  { interval: "30", label: "Every 30 Days", save: 10 },
  { interval: "60", label: "Every 60 Days", save: 5 },
];
const MAX_QTY = 4;

// ─── Phone helpers ──────────────────────────────────────────────────────────
function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 10);
  if (!d.length) return "";
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}
function stripPhone(f: string): string {
  return f.replace(/\D/g, "");
}
function isPhoneComplete(f: string): boolean {
  return stripPhone(f).length === 10;
}

// ─── Email helpers ──────────────────────────────────────────────────────────
function isEmailValid(email: string): boolean {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── Vehicle condition (Step 5) ─────────────────────────────────────────────
type ConditionBoolKey =
  | "conditionPetHair"
  | "conditionStains"
  | "conditionOdors"
  | "conditionExcessiveTrash"
  | "conditionSand"
  | "conditionSalt"
  | "conditionScratchesOxidation"
  | "conditionAftermarketParts"
  | "conditionBiohazards";

const CONDITION_QUESTIONS: {
  key: ConditionBoolKey;
  label: string;
  addOnHint?: string;
}[] = [
  { key: "conditionPetHair", label: "Pet hair" },
  { key: "conditionStains", label: "Stains" },
  { key: "conditionOdors", label: "Odors" },
  { key: "conditionExcessiveTrash", label: "Excessive trash" },
  { key: "conditionSand", label: "Sand" },
  { key: "conditionSalt", label: "Road salt" },
  { key: "conditionScratchesOxidation", label: "Scratches or oxidation" },
  {
    key: "conditionAftermarketParts",
    label: "Aftermarket parts / sensitive surfaces",
  },
];

/** Maps a checked condition question to add-on internalKeys worth recommending (see shared/services.ts ADD_ONS.suggestFor). */
const CONDITION_TO_SUGGEST_TAG: Partial<
  Record<ConditionBoolKey, "petHair" | "odor" | "stains">
> = {
  conditionPetHair: "petHair",
  conditionOdors: "odor",
  conditionStains: "stains",
};

function buildConditionSummary(data: BookingData): string {
  const flagged = CONDITION_QUESTIONS.filter(q => data[q.key]).map(
    q => q.label
  );
  const lines: string[] = [];
  if (flagged.length > 0)
    lines.push(`Vehicle condition flags: ${flagged.join(", ")}.`);
  if (data.conditionPaint)
    lines.push(`Paint condition: ${data.conditionPaint}.`);
  if (data.conditionBiohazards) {
    lines.push(
      "⚠ Customer indicated possible biohazard/unsafe material — requires review before scheduling, do not treat as a standard job."
    );
  }
  if (data.conditionNotes.trim())
    lines.push(`Additional notes: ${data.conditionNotes.trim()}`);
  return lines.join("\n");
}

// ─── Date/time helpers ──────────────────────────────────────────────────────
function getAvailableDates(): Date[] {
  const out: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 1; i <= 60; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (d.getDay() !== 0) out.push(d);
  }
  return out;
}
function getTimeSlots(): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  for (let h = 7; h <= 17; h++) {
    for (const m of [0, 30]) {
      if (h === 17 && m > 0) break;
      const period = h >= 12 ? "PM" : "AM";
      const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
      out.push({
        label: `${h12}:${m === 0 ? "00" : "30"} ${period}`,
        value: `${String(h).padStart(2, "0")}:${m === 0 ? "00" : "30"}`,
      });
    }
  }
  return out;
}
function formatDateLabel(isoDate: string, timeValue: string): string {
  const dateStr = new Date(isoDate + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  if (!timeValue) return dateStr;
  const [hStr, mStr] = timeValue.split(":");
  const h = parseInt(hStr, 10);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${dateStr} · ${h12}:${mStr} ${period}`;
}

const ALL_DATES = getAvailableDates();
const TIME_SLOTS = getTimeSlots();

// ─── Shared primitives ──────────────────────────────────────────────────────
function PageTitle({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-12 border-b border-border/60 px-12">
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
function StickyBottom({
  dateLabel,
  onNext,
  nextLabel = "Next",
  disabled = false,
  isPending = false,
}: {
  dateLabel?: string;
  onNext: () => void;
  nextLabel?: string;
  disabled?: boolean;
  isPending?: boolean;
}) {
  return (
    <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border/60 p-4 flex items-center gap-3">
      {dateLabel ? (
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
          </div>
          <span className="text-xs text-muted-foreground truncate">
            {dateLabel}
          </span>
        </div>
      ) : (
        <div className="flex-1" />
      )}
      <button
        onClick={onNext}
        disabled={disabled || isPending}
        className="bg-primary/80 hover:bg-primary disabled:opacity-40 text-white font-semibold text-sm px-8 py-3 rounded-2xl transition-colors flex items-center gap-2 min-w-[120px] justify-center"
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : nextLabel}
      </button>
    </div>
  );
}

// ─── Google Maps ────────────────────────────────────────────────────────────
const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
function LocationMap({
  address,
  onGeocode,
}: {
  address: string;
  onGeocode?: (p: {
    street: string;
    city: string;
    state: string;
    zip: string;
  }) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObj = useRef<any>(null);
  const markerObj = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!MAPS_KEY) return;
    const w = window as any;
    if (w.__gmaps === "ready") {
      setReady(true);
      return;
    }
    if (w.__gmaps === "loading") {
      const t = setInterval(() => {
        if (w.__gmaps === "ready") {
          setReady(true);
          clearInterval(t);
        }
      }, 150);
      return () => clearInterval(t);
    }
    w.__gmaps = "loading";
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&v=weekly`;
    s.async = true;
    s.onload = () => {
      w.__gmaps = "ready";
      setReady(true);
    };
    s.onerror = () => {
      w.__gmaps = "error";
      setError(true);
    };
    document.head.appendChild(s);
  }, []);
  useEffect(() => {
    if (!ready || !mapRef.current || mapObj.current) return;
    const g = (window as any).google;
    if (!g?.maps) return;
    mapObj.current = new g.maps.Map(mapRef.current, {
      center: { lat: 42.7261, lng: -87.7829 },
      zoom: 11,
      disableDefaultUI: true,
      gestureHandling: "cooperative",
      styles: [
        { elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#8892a4" }] },
        {
          featureType: "road",
          elementType: "geometry",
          stylers: [{ color: "#2d2d4e" }],
        },
        {
          featureType: "water",
          elementType: "geometry",
          stylers: [{ color: "#0e1626" }],
        },
        { featureType: "poi", stylers: [{ visibility: "off" }] },
      ],
    });
  }, [ready]);
  useEffect(() => {
    if (!ready || !mapObj.current) return;
    const g = (window as any).google;
    if (!g?.maps) return;
    const q = address.trim();
    if (!q) return;
    const t = setTimeout(() => {
      new g.maps.Geocoder().geocode(
        { address: q },
        (results: any, status: any) => {
          if (status !== "OK" || !results?.[0] || !mapObj.current) return;
          const loc = results[0].geometry.location;
          mapObj.current.panTo(loc);
          mapObj.current.setZoom(16);
          if (markerObj.current) markerObj.current.setMap(null);
          markerObj.current = new g.maps.Marker({
            map: mapObj.current,
            position: loc,
            animation: g.maps.Animation.DROP,
          });
          if (onGeocode) {
            const comps = results[0].address_components ?? [];
            const get = (t: string) =>
              comps.find((c: any) => c.types.includes(t))?.long_name ?? "";
            const getShort = (t: string) =>
              comps.find((c: any) => c.types.includes(t))?.short_name ?? "";
            onGeocode({
              street: [get("street_number"), get("route")]
                .filter(Boolean)
                .join(" "),
              city:
                get("locality") || get("sublocality") || get("neighborhood"),
              state: getShort("administrative_area_level_1"),
              zip: get("postal_code"),
            });
          }
        }
      );
    }, 700);
    return () => clearTimeout(t);
  }, [ready, address]);
  if (!MAPS_KEY || error)
    return (
      <div
        className="mx-5 rounded-2xl border border-border bg-muted/10 flex flex-col items-center justify-center gap-2 text-muted-foreground/40"
        style={{ height: 220 }}
      >
        <MapPin className="w-7 h-7" />
        <p className="text-xs">
          {error ? "Map unavailable" : "Enter your address above"}
        </p>
      </div>
    );
  return (
    <div
      className="mx-5 rounded-2xl border border-border overflow-hidden relative"
      style={{ height: 220 }}
    >
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
      {!ready && (
        <div className="absolute inset-0 bg-muted/20 flex items-center justify-center">
          <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      )}
    </div>
  );
}

// ─── Step: Service Type ─────────────────────────────────────────────────────
// Only offers paths the business actually supports today: instant-priced
// mobile detailing, or a specialty request (ceramic/paint correction/other)
// that needs an inspection and can't be instant-priced. Drop-off/in-shop
// service isn't offered, so it isn't shown as an option — see the brief's
// "only show options actually supported by the business configuration".
function StepServiceType({ onSelectMobile }: { onSelectMobile: () => void }) {
  return (
    <div>
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-display font-bold mb-1">
          Let's Get Started
        </h1>
        <p className="text-sm text-muted-foreground">
          What are you looking to book?
        </p>
      </div>
      <div className="px-5 py-2 flex flex-col gap-3">
        <button
          type="button"
          onClick={onSelectMobile}
          className="w-full text-left rounded-2xl border-2 border-border bg-card hover:border-primary/50 p-5 transition-all active:scale-[0.99]"
        >
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <Car className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-display font-bold text-base mb-1">
                Mobile Detailing
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Exterior, interior, or full-service packages with transparent,
                instant pricing. We come to you.
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
          </div>
        </button>

        <div className="rounded-2xl border-2 border-border bg-card p-5">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-display font-bold text-base mb-1">
                Ceramic Coating, Paint Correction, or Something Else
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                These are quoted after we see your vehicle's condition — not
                instantly priced. Request a quote and we'll follow up.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Link href="/ceramic-coatings">
              <span className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-border hover:border-primary/40 text-sm font-medium cursor-pointer">
                Ceramic Coating{" "}
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </span>
            </Link>
            <Link href="/paint-correction">
              <span className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-border hover:border-primary/40 text-sm font-medium cursor-pointer">
                Paint Correction{" "}
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </span>
            </Link>
            <Link href="/contact">
              <span className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-border hover:border-primary/40 text-sm font-medium cursor-pointer">
                Something Else — Contact Us{" "}
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </span>
            </Link>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">
            Prefer to talk it through? Call or text {BRAND.phone}.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Step: Location ─────────────────────────────────────────────────────────
function StepLocation({
  data,
  onUpdate,
  onNext,
}: {
  data: BookingData;
  onUpdate: (d: Partial<BookingData>) => void;
  onNext: () => void;
}) {
  const handleGeocode = (parts: {
    street: string;
    city: string;
    state: string;
    zip: string;
  }) => {
    onUpdate({
      serviceAddress: parts.street || data.serviceAddress,
      serviceCity: parts.city,
      serviceState: parts.state,
      serviceZip: parts.zip,
    });
  };
  const addressReady =
    data.serviceAddress.trim().length >= 5 &&
    data.serviceCity.trim().length > 0;

  const { data: areaCheck, isFetching: areaChecking } =
    trpc.bookings.checkServiceArea.useQuery(
      { zip: data.serviceZip },
      { enabled: data.serviceZip.length === 5 }
    );
  const outsideArea = areaCheck?.classification === "outside_area";

  return (
    <div className="flex flex-col min-h-screen">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-display font-bold mb-1">
          Book an Appointment
        </h1>
        <p className="text-sm text-muted-foreground">
          Where should we come to detail your vehicle?
        </p>
      </div>
      <div className="px-5 mb-4">
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl border border-border bg-card text-xs text-muted-foreground">
          <Droplets className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <span>
            <span className="font-semibold text-foreground">
              Mobile service requirements:{" "}
            </span>
            {BRAND.mobileRequirements.full}
          </span>
        </div>
      </div>
      <div className="px-5 mb-4">
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-border focus-within:border-primary transition-colors bg-card">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            placeholder="Enter your full address"
            value={data.serviceAddress}
            onChange={e =>
              onUpdate({
                serviceAddress: e.target.value,
                serviceCity: "",
                serviceState: "",
                serviceZip: "",
              })
            }
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            autoComplete="street-address"
          />
          {data.serviceAddress && (
            <button
              onClick={() =>
                onUpdate({
                  serviceAddress: "",
                  serviceCity: "",
                  serviceState: "",
                  serviceZip: "",
                })
              }
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
        </div>
      </div>
      <LocationMap address={data.serviceAddress} onGeocode={handleGeocode} />
      {data.serviceCity && (
        <div className="px-5 pt-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/8 border border-primary/20 text-xs text-primary">
            <Check className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="font-medium">
              {data.serviceAddress}
              {data.serviceCity ? `, ${data.serviceCity}` : ""}
              {data.serviceState ? `, ${data.serviceState}` : ""}{" "}
              {data.serviceZip}
            </span>
          </div>
        </div>
      )}
      {/* Manual fallback when Maps can't geocode */}
      {data.serviceAddress.length > 5 && !data.serviceCity && (
        <div className="px-5 pt-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            Please confirm your city and ZIP:
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-3">
              <Input
                placeholder="City *"
                value={data.serviceCity}
                onChange={e => onUpdate({ serviceCity: e.target.value })}
                className="bg-input border-border text-sm"
              />
            </div>
            <Input
              placeholder="State"
              value={data.serviceState}
              onChange={e =>
                onUpdate({ serviceState: e.target.value.toUpperCase() })
              }
              maxLength={2}
              className="bg-input border-border text-sm uppercase"
            />
            <div className="col-span-2">
              <Input
                placeholder="ZIP Code"
                value={data.serviceZip}
                onChange={e =>
                  onUpdate({
                    serviceZip: e.target.value.replace(/\D/g, "").slice(0, 5),
                  })
                }
                className="bg-input border-border text-sm"
              />
            </div>
          </div>
        </div>
      )}
      {data.serviceZip.length === 5 && areaCheck && (
        <div className="px-5 pt-3">
          <div
            className={`flex items-start gap-2 px-3 py-2.5 rounded-xl border text-xs ${
              areaCheck.classification === "included"
                ? "bg-primary/8 border-primary/20 text-primary"
                : areaCheck.classification === "travel_fee"
                  ? "bg-amber-500/8 border-amber-500/20 text-amber-500"
                  : areaCheck.classification === "outside_area"
                    ? "bg-red-500/8 border-red-500/20 text-red-400"
                    : "bg-muted/20 border-border text-muted-foreground"
            }`}
          >
            <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>{areaCheck.message}</span>
          </div>
        </div>
      )}
      <StickyBottom
        onNext={onNext}
        nextLabel={outsideArea ? "Contact Us Instead" : "Next"}
        disabled={!addressReady || areaChecking || outsideArea}
      />
    </div>
  );
}

// ─── Step: Package ──────────────────────────────────────────────────────────
function StepPackage({
  data,
  onSelect,
}: {
  data: BookingData;
  onSelect: (pkg: any) => void;
}) {
  const { data: rawPackages, isLoading } = trpc.bookings.getPackages.useQuery();
  // Quote-only services (ceramic coating, paint correction) never appear as
  // an instantly-bookable package — StepServiceType already routed anyone
  // needing those to a dedicated quote request instead of this wizard.
  const quoteOnlyNames = new Set(
    CENTRAL_PACKAGES.filter(p => p.requiresQuote).map(p => p.name)
  );
  const packages = (rawPackages ?? []).filter(p => !quoteOnlyNames.has(p.name));
  const categoryLabel = VEHICLE_CATEGORIES.find(
    c => c.id === data.vehicleCategory
  )?.label;
  return (
    <div>
      <PageTitle title="Choose Your Service" />
      {categoryLabel && (
        <p className="px-5 pt-3 text-xs text-muted-foreground">
          Pricing shown for your{" "}
          <span className="text-primary font-medium">{categoryLabel}</span>.
        </p>
      )}
      {isLoading ? (
        <Spinner />
      ) : (
        <div className="px-4 py-4 flex flex-col gap-3">
          {(packages ?? []).map(pkg => {
            const features: string[] = pkg.features
              ? (() => {
                  try {
                    return JSON.parse(pkg.features);
                  } catch {
                    return [];
                  }
                })()
              : [];
            const isSel = data.packageId === pkg.id;
            const price = resolvePackagePrice(
              pkg.name,
              Number(pkg.price),
              data.vehicleCategory,
              dbVehiclePricingFromPackageRow(pkg)
            );
            const hrs = Math.floor(pkg.duration / 60);
            const mins = pkg.duration % 60;
            const durationLabel =
              hrs > 0 ? `${hrs}h${mins > 0 ? ` ${mins}m` : ""}` : `${mins}m`;
            return (
              <button
                key={pkg.id}
                onClick={() => onSelect({ ...pkg, resolvedPrice: price })}
                className={cn(
                  "w-full text-left rounded-2xl border-2 overflow-hidden transition-all active:scale-[0.99]",
                  isSel
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/50"
                )}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-display font-bold text-base text-foreground">
                          {pkg.name}
                        </span>
                        {pkg.isPopular && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-white">
                            Best Value
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="text-lg font-display font-bold text-primary">
                          {data.vehicleCategory ? "$" : "From $"}
                          {price.toFixed(2)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {durationLabel}
                        </span>
                      </div>
                    </div>
                    <div
                      className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all",
                        isSel ? "bg-primary border-primary" : "border-border"
                      )}
                    >
                      {isSel && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                  </div>
                  {pkg.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                      {pkg.description}
                    </p>
                  )}
                  {features.length > 0 && (
                    <div className="flex flex-wrap gap-x-3 gap-y-1 pt-3 border-t border-border/50">
                      {features.slice(0, 5).map(f => (
                        <span
                          key={f}
                          className="flex items-center gap-1 text-[11px] text-muted-foreground"
                        >
                          <Check className="w-2.5 h-2.5 text-primary flex-shrink-0" />
                          {f}
                        </span>
                      ))}
                      {features.length > 5 && (
                        <span className="text-[11px] text-primary">
                          +{features.length - 5} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Step: Add-Ons ──────────────────────────────────────────────────────────
function StepAddOns({
  data,
  onUpdate,
  onNext,
}: {
  data: BookingData;
  onUpdate: (d: Partial<BookingData>) => void;
  onNext: () => void;
}) {
  const { data: addOns, isLoading } = trpc.bookings.getAddOns.useQuery();
  const setQty = (id: number, qty: number) =>
    onUpdate({
      addOnQty: { ...data.addOnQty, [id]: Math.min(MAX_QTY, Math.max(0, qty)) },
    });
  const totalAddOns = Object.entries(data.addOnQty).reduce((s, [id, q]) => {
    const ao = (addOns ?? []).find(a => a.id === Number(id));
    return s + (ao ? Number(ao.price) * q : 0);
  }, 0);
  const total = (data.packagePrice ?? 0) + totalAddOns;
  return (
    <div>
      <PageTitle title={data.packageName ?? "Add-Ons"} />
      {isLoading ? (
        <Spinner />
      ) : (addOns ?? []).length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-muted-foreground">
          No add-ons available.
        </div>
      ) : (
        <div className="divide-y divide-border/60">
          {(addOns ?? []).map(ao => {
            const qty = data.addOnQty[ao.id] ?? 0;
            const dur = ao.duration ?? 0;
            const durLabel =
              dur > 0
                ? ` · +${Math.floor(dur / 60) > 0 ? `${Math.floor(dur / 60)}h ` : ""}${dur % 60 > 0 ? `${dur % 60}m` : ""}  `
                : "";
            return (
              <div key={ao.id} className="flex items-center gap-3 px-4 py-3.5">
                <div className="w-10 h-10 rounded-xl bg-primary/8 border border-primary/15 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">✨</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground leading-tight">
                    {ao.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    +${Number(ao.price).toFixed(2)}
                    {durLabel}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button
                    onClick={() => setQty(ao.id, qty - 1)}
                    disabled={qty === 0}
                    className="w-8 h-8 rounded-full border-2 border-border flex items-center justify-center text-muted-foreground hover:border-destructive hover:text-destructive transition-colors disabled:opacity-30"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-sm font-bold w-4 text-center tabular-nums">
                    {qty}
                  </span>
                  <button
                    onClick={() => setQty(ao.id, qty + 1)}
                    disabled={qty >= MAX_QTY}
                    className="w-8 h-8 rounded-full border-2 border-primary flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-colors disabled:opacity-30"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border/60 p-4">
        <button
          onClick={onNext}
          className="w-full bg-primary/80 hover:bg-primary text-white font-semibold py-3.5 rounded-2xl text-sm transition-colors"
        >
          {totalAddOns > 0
            ? `Continue · $${total.toFixed(2)}`
            : "Continue — No Add-Ons"}
        </button>
      </div>
    </div>
  );
}

// ─── Step: Schedule ─────────────────────────────────────────────────────────
function StepSchedule({
  data,
  onUpdate,
  onNext,
}: {
  data: BookingData;
  onUpdate: (d: Partial<BookingData>) => void;
  onNext: () => void;
}) {
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const firstAvailableMonth = useMemo(() => {
    const f = ALL_DATES[0];
    return f ? new Date(f.getFullYear(), f.getMonth(), 1) : new Date();
  }, []);
  const [viewMonth, setViewMonth] = useState(firstAvailableMonth);
  const isEarliestMonth = viewMonth.getTime() === firstAvailableMonth.getTime();
  const monthDates = useMemo(() => {
    const year = viewMonth.getFullYear(),
      month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const blanks = firstDay === 0 ? 6 : firstDay - 1;
    const cells: (Date | null)[] = Array(blanks).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    return cells;
  }, [viewMonth]);
  const availableSet = new Set(
    ALL_DATES.map(d => d.toISOString().split("T")[0])
  );
  const dateLabel =
    data.appointmentDate && data.appointmentTime
      ? formatDateLabel(data.appointmentDate, data.appointmentTime)
      : data.appointmentDate
        ? new Date(data.appointmentDate + "T12:00:00").toLocaleDateString(
            "en-US",
            { weekday: "short", month: "short", day: "numeric" }
          )
        : undefined;
  return (
    <div>
      <PageTitle title="Select Date & Time" />

      {/* Package summary pill */}
      {data.packageName && (
        <div className="mx-4 mt-3 p-2.5 rounded-xl border border-border bg-card flex items-center gap-2.5">
          <div className="text-base">💎</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-primary leading-tight">
              {data.packageName}
            </p>
            <p className="text-[11px] text-muted-foreground">
              ${data.packagePrice?.toFixed(2)}
              {data.packageDuration
                ? ` · ${Math.floor(data.packageDuration / 60)}h${data.packageDuration % 60 > 0 ? ` ${data.packageDuration % 60}m` : ""}`
                : ""}
            </p>
          </div>
        </div>
      )}

      {/* Compact calendar */}
      <div className="mx-4 mt-3 p-3 rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() =>
              setViewMonth(
                new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1)
              )
            }
            disabled={isEarliestMonth}
            className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-primary">
              {viewMonth.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </p>
            <button
              onClick={() => {
                const e = ALL_DATES[0];
                if (e) {
                  onUpdate({
                    appointmentDate: e.toISOString().split("T")[0],
                    appointmentTime: "",
                  });
                  setViewMonth(new Date(e.getFullYear(), e.getMonth(), 1));
                }
              }}
              className="text-[10px] font-medium text-primary/70 hover:text-primary border border-primary/20 hover:border-primary/50 rounded-full px-2 py-0.5 transition-colors whitespace-nowrap"
            >
              Earliest
            </button>
          </div>
          <button
            onClick={() =>
              setViewMonth(
                new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1)
              )
            }
            className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <div
              key={i}
              className="text-center text-[10px] font-medium text-muted-foreground/60 pb-1"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Date cells — fixed h-8, no aspect-square */}
        <div className="grid grid-cols-7 gap-0.5">
          {monthDates.map((d, i) => {
            if (!d) return <div key={i} />;
            const str = d.toISOString().split("T")[0];
            const isPast = d < todayStart;
            const isAvail = availableSet.has(str) && !isPast;
            const isSel = data.appointmentDate === str;
            return (
              <button
                key={str}
                disabled={!isAvail}
                onClick={() =>
                  onUpdate({ appointmentDate: str, appointmentTime: "" })
                }
                className={cn(
                  "h-8 flex items-center justify-center text-xs font-medium rounded-lg transition-all",
                  isPast
                    ? "text-muted-foreground/25 cursor-not-allowed"
                    : isSel
                      ? "bg-primary text-white shadow-sm"
                      : isAvail
                        ? "text-primary hover:bg-primary/10 cursor-pointer"
                        : "text-muted-foreground/30 cursor-not-allowed"
                )}
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time slots — compact 3-column grid */}
      <AnimatePresence>
        {data.appointmentDate && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            className="mx-4 mt-3"
          >
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              {new Date(data.appointmentDate + "T12:00:00").toLocaleDateString(
                "en-US",
                { weekday: "long", month: "long", day: "numeric" }
              )}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {TIME_SLOTS.map(slot => {
                const isSel = data.appointmentTime === slot.value;
                return (
                  <button
                    key={slot.value}
                    onClick={() => onUpdate({ appointmentTime: slot.value })}
                    className={cn(
                      "py-2.5 rounded-xl border-2 text-center transition-all",
                      isSel
                        ? "border-primary bg-primary/8 text-primary"
                        : "border-border bg-card hover:border-primary/40"
                    )}
                  >
                    <span
                      className={cn(
                        "text-xs font-semibold",
                        isSel ? "text-primary" : "text-foreground"
                      )}
                    >
                      {slot.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-4" />
      <StickyBottom
        dateLabel={dateLabel}
        onNext={onNext}
        disabled={!data.appointmentDate || !data.appointmentTime}
      />
    </div>
  );
}

// ─── Step: Recurring ────────────────────────────────────────────────────────
function StepRecurring({
  data,
  onUpdate,
  onNext,
  onSkip,
}: {
  data: BookingData;
  onUpdate: (d: Partial<BookingData>) => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const basePrice = data.packagePrice ?? 0;
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
        <div>
          <h2 className="text-xl font-display font-bold">
            Schedule Automatically
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Save on every visit — skip anytime
          </p>
        </div>
        <button onClick={onSkip} className="text-sm text-primary font-medium">
          Skip
        </button>
      </div>
      <div className="flex-1 px-5 py-4 flex flex-col gap-3">
        {RECURRING.map(opt => {
          const discounted = basePrice * (1 - opt.save / 100);
          const isSel = data.recurringInterval === opt.interval;
          return (
            <button
              key={opt.interval}
              onClick={() =>
                onUpdate({ recurringInterval: isSel ? "" : opt.interval })
              }
              className={cn(
                "w-full text-left p-4 rounded-2xl border-2 transition-all",
                isSel
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/40"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-foreground">
                  {opt.label}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
                    Save {opt.save}%
                  </span>
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                      isSel ? "border-primary bg-primary" : "border-border"
                    )}
                  >
                    {isSel && <Check className="w-3 h-3 text-white" />}
                  </div>
                </div>
              </div>
              <p className="text-base font-bold text-foreground">
                ${discounted.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">per visit</p>
            </button>
          );
        })}
      </div>
      <div className="px-5 pb-6 flex flex-col gap-3">
        <button
          onClick={onSkip}
          className="w-full py-3.5 rounded-2xl border border-border bg-muted/20 text-sm font-semibold text-foreground hover:bg-muted/40 transition-colors"
        >
          No Thanks — One-Time Only
        </button>
        <button
          onClick={onNext}
          className="w-full bg-primary/80 hover:bg-primary text-white font-semibold py-3.5 rounded-2xl text-sm transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

// ─── Step: Vehicle Info ──────────────────────────────────────────────────────
function StepVehicleInfo({
  data,
  onUpdate,
  onNext,
}: {
  data: BookingData;
  onUpdate: (d: Partial<BookingData>) => void;
  onNext: () => void;
}) {
  const dateLabel = data.appointmentDate
    ? formatDateLabel(data.appointmentDate, data.appointmentTime)
    : undefined;
  const currentYear = new Date().getFullYear();
  const yearNum = parseInt(data.vehicleYear, 10);
  const yearValid =
    data.vehicleYear.length === 4 &&
    !isNaN(yearNum) &&
    yearNum >= 1950 &&
    yearNum <= currentYear + 1;
  return (
    <div>
      <PageTitle title="Vehicle Information" />
      <div className="px-5 py-4 space-y-5">
        <div className="space-y-3">
          <Label className="text-sm text-primary font-semibold">
            Vehicle Size <span className="text-destructive">*</span>
          </Label>
          <p className="text-xs text-muted-foreground -mt-2">
            Package pricing depends on vehicle size — this determines what
            you'll be quoted on the next step.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {VEHICLE_CATEGORIES.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() =>
                  onUpdate({
                    vehicleCategory: opt.id,
                    vehicleType: opt.vehicleType,
                  })
                }
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-3 px-2 rounded-xl border-2 transition-all text-center",
                  data.vehicleCategory === opt.id
                    ? "border-primary bg-primary/10 shadow-sm shadow-primary/20"
                    : "border-border bg-background hover:border-primary/50 hover:bg-primary/4"
                )}
              >
                <span
                  className={cn(
                    "text-sm font-bold leading-tight",
                    data.vehicleCategory === opt.id
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {opt.label}
                </span>
                <span
                  className={cn(
                    "text-[11px] leading-tight",
                    data.vehicleCategory === opt.id
                      ? "text-primary/70"
                      : "text-muted-foreground/60"
                  )}
                >
                  {opt.sub}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <Label className="text-sm text-primary font-semibold">
            Vehicle Details
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">
                Year <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder={String(currentYear)}
                value={data.vehicleYear}
                onChange={e =>
                  onUpdate({
                    vehicleYear: e.target.value.replace(/\D/g, "").slice(0, 4),
                  })
                }
                inputMode="numeric"
                maxLength={4}
                className={cn(
                  "bg-input border-border",
                  data.vehicleYear.length === 4 &&
                    !yearValid &&
                    "border-destructive/60"
                )}
              />
              {data.vehicleYear.length === 4 && !yearValid && (
                <p className="text-xs text-destructive">Enter a valid year</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Make <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="BMW"
                value={data.vehicleMake}
                onChange={e => onUpdate({ vehicleMake: e.target.value })}
                className="bg-input border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Model <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="M4 Competition"
                value={data.vehicleModel}
                onChange={e => onUpdate({ vehicleModel: e.target.value })}
                className="bg-input border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Color</Label>
              <Input
                placeholder="Midnight Blue"
                value={data.vehicleColor}
                onChange={e => onUpdate({ vehicleColor: e.target.value })}
                className="bg-input border-border"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">
                License Plate{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Input
                placeholder="ABC-1234"
                value={data.vehicleLicensePlate}
                onChange={e =>
                  onUpdate({
                    vehicleLicensePlate: e.target.value.toUpperCase(),
                  })
                }
                className="bg-input border-border"
              />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-sm text-primary font-semibold">
            Access Instructions{" "}
            <span className="text-muted-foreground font-normal text-xs">
              (optional)
            </span>
          </Label>
          <Textarea
            placeholder="Gate code, building access, parking spot, or any notes to find you"
            value={data.gateInstructions}
            onChange={e => onUpdate({ gateInstructions: e.target.value })}
            rows={3}
            className="bg-input border-border resize-none text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm text-primary font-semibold">
            Vehicle Location{" "}
            <span className="text-muted-foreground font-normal text-xs">
              (optional)
            </span>
          </Label>
          <Textarea
            placeholder="Will the vehicle be in a shaded or covered area? Helps us prepare for heat or sun exposure."
            value={data.vehicleLocationDetails}
            onChange={e => onUpdate({ vehicleLocationDetails: e.target.value })}
            rows={2}
            className="bg-input border-border resize-none text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm text-primary font-semibold">
            Anything Else?{" "}
            <span className="text-muted-foreground font-normal text-xs">
              (optional)
            </span>
          </Label>
          <Textarea
            placeholder="Anything not covered by the vehicle-condition questions on the next step…"
            value={data.specialRequests}
            onChange={e => onUpdate({ specialRequests: e.target.value })}
            rows={3}
            className="bg-input border-border resize-none text-sm"
          />
        </div>
      </div>
      <StickyBottom
        dateLabel={dateLabel}
        onNext={onNext}
        disabled={
          !data.vehicleCategory ||
          !data.vehicleMake.trim() ||
          !data.vehicleModel.trim() ||
          !yearValid
        }
      />
    </div>
  );
}

// ─── Step: Vehicle Condition ────────────────────────────────────────────────
function StepCondition({
  data,
  onUpdate,
  onNext,
  onGoToAddOns,
}: {
  data: BookingData;
  onUpdate: (d: Partial<BookingData>) => void;
  onNext: () => void;
  onGoToAddOns: () => void;
}) {
  const dateLabel = data.appointmentDate
    ? formatDateLabel(data.appointmentDate, data.appointmentTime)
    : undefined;
  const toggle = (key: ConditionBoolKey) =>
    onUpdate({ [key]: !data[key] } as Partial<BookingData>);

  const suggestedTags = new Set(
    CONDITION_QUESTIONS.map(q => q.key)
      .filter(key => data[key])
      .map(key => CONDITION_TO_SUGGEST_TAG[key])
      .filter((t): t is "petHair" | "odor" | "stains" => !!t)
  );
  const recommendedAddOns = CENTRAL_ADD_ONS.filter(
    a => a.isActive && a.suggestFor?.some(tag => suggestedTags.has(tag as any))
  );

  return (
    <div>
      <PageTitle title="Vehicle Condition" />
      <div className="px-5 py-4 space-y-5">
        <p className="text-xs text-muted-foreground leading-relaxed">
          A few quick questions so we bring the right supplies and can quote
          accurately — none of these change your price automatically.
        </p>

        <div className="space-y-2">
          <Label className="text-sm text-primary font-semibold">
            Does any of this apply?
          </Label>
          <div className="flex flex-wrap gap-2">
            {CONDITION_QUESTIONS.map(q => (
              <button
                key={q.key}
                type="button"
                onClick={() => toggle(q.key)}
                className={cn(
                  "px-3 py-1.5 rounded-full border text-xs font-medium transition-all",
                  data[q.key]
                    ? "border-primary bg-primary text-white"
                    : "border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        {recommendedAddOns.length > 0 && (
          <div className="p-4 rounded-xl border border-primary/25 bg-primary/5 space-y-2">
            <p className="text-xs font-semibold text-primary">
              Based on your answers, you may want:
            </p>
            <ul className="space-y-1">
              {recommendedAddOns.map(a => (
                <li
                  key={a.internalKey}
                  className="text-xs text-muted-foreground flex items-center justify-between"
                >
                  <span>{a.name}</span>
                  <span className="text-primary font-medium">
                    ${a.price.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={onGoToAddOns}
              className="text-xs font-semibold text-primary hover:underline"
            >
              ← Go back and add these
            </button>
            <p className="text-[11px] text-muted-foreground">
              We won't add anything automatically — this is just so you don't
              get a surprise at the door.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-sm text-primary font-semibold">
            Overall paint condition
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {(["good", "fair", "poor"] as const).map(level => (
              <button
                key={level}
                type="button"
                onClick={() =>
                  onUpdate({
                    conditionPaint: data.conditionPaint === level ? "" : level,
                  })
                }
                className={cn(
                  "py-2.5 rounded-xl border-2 text-sm font-medium capitalize transition-all",
                  data.conditionPaint === level
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card cursor-pointer">
            <input
              type="checkbox"
              checked={data.conditionBiohazards}
              onChange={() =>
                onUpdate({ conditionBiohazards: !data.conditionBiohazards })
              }
              className="mt-0.5 w-4 h-4 accent-primary flex-shrink-0"
            />
            <span className="text-xs text-muted-foreground leading-relaxed">
              The vehicle has biohazards or unsafe materials (bodily fluids,
              mold, sharp debris, chemical spills, etc.)
            </span>
          </label>
          {data.conditionBiohazards && (
            <div className="px-4 py-3 rounded-xl border border-amber-500/25 bg-amber-500/8 text-xs text-amber-500 leading-relaxed">
              Thanks for flagging this — jobs like this need a quick review
              before we can confirm scheduling. We'll reach out to discuss safe
              handling and next steps rather than auto-confirming a time.
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-sm text-primary font-semibold">
            Anything else about the vehicle's condition?{" "}
            <span className="text-muted-foreground font-normal text-xs">
              (optional)
            </span>
          </Label>
          <Textarea
            placeholder="Existing damage, last professional clean, anything we should see coming…"
            value={data.conditionNotes}
            onChange={e => onUpdate({ conditionNotes: e.target.value })}
            rows={3}
            className="bg-input border-border resize-none text-sm"
          />
        </div>
      </div>
      <StickyBottom dateLabel={dateLabel} onNext={onNext} />
    </div>
  );
}

// ─── Step: Photos ───────────────────────────────────────────────────────────
const MAX_DRAFT_PHOTOS = 6;
const MAX_PRECOMPRESS_BYTES = 20 * 1024 * 1024; // 20MB — generous, compression happens before upload

function StepPhotos({
  data,
  onUpdate,
  onNext,
}: {
  data: BookingData;
  onUpdate: (d: Partial<BookingData>) => void;
  onNext: () => void;
}) {
  const dateLabel = data.appointmentDate
    ? formatDateLabel(data.appointmentDate, data.appointmentTime)
    : undefined;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCount, setUploadingCount] = useState(0);
  const utils = trpc.useUtils();

  const createDraft = trpc.bookings.createDraft.useMutation();
  const uploadPhoto = trpc.bookings.uploadDraftPhoto.useMutation();
  const deletePhoto = trpc.bookings.deleteDraftPhoto.useMutation();
  const { data: photos = [] } = trpc.bookings.listDraftPhotos.useQuery(
    { token: data.draftToken },
    { enabled: !!data.draftToken }
  );

  // Lazily create a draft the first time this step is reached.
  useEffect(() => {
    if (data.draftToken || createDraft.isPending) return;
    createDraft.mutate(undefined, {
      onSuccess: result => onUpdate({ draftToken: result.token }),
      onError: () => {
        // Non-fatal — the customer can still submit without photos.
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.draftToken]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !data.draftToken) return;
    const remaining = MAX_DRAFT_PHOTOS - photos.length;
    if (remaining <= 0) {
      toast.error(`You can upload up to ${MAX_DRAFT_PHOTOS} photos.`);
      return;
    }
    const toProcess = Array.from(files).slice(0, remaining);

    for (const file of toProcess) {
      if (!isSupportedImageFile(file)) {
        toast.error(
          `${file.name}: only JPEG, PNG, or WebP photos are supported.`
        );
        continue;
      }
      if (file.size > MAX_PRECOMPRESS_BYTES) {
        toast.error(`${file.name}: file is too large.`);
        continue;
      }
      setUploadingCount(c => c + 1);
      try {
        const compressed = await compressImage(file);
        await uploadPhoto.mutateAsync({
          token: data.draftToken,
          fileBase64: compressed.base64,
          fileName: file.name,
          mimeType: compressed.mimeType,
        });
        utils.bookings.listDraftPhotos.invalidate({ token: data.draftToken });
      } catch (err: any) {
        toast.error(err?.message || `Couldn't upload ${file.name}.`);
      } finally {
        setUploadingCount(c => c - 1);
      }
    }
  };

  const removePhoto = async (mediaId: number) => {
    if (!data.draftToken) return;
    await deletePhoto.mutateAsync({ token: data.draftToken, mediaId });
    utils.bookings.listDraftPhotos.invalidate({ token: data.draftToken });
  };

  return (
    <div>
      <PageTitle title="Add Photos" />
      <div className="px-5 py-4 space-y-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Optional, but a few photos help us prep and quote accurately —
          especially for stains, damage, or heavy buildup. Up to{" "}
          {MAX_DRAFT_PHOTOS} photos.
        </p>

        <div className="grid grid-cols-3 gap-2">
          {photos.map(photo => (
            <div
              key={photo.id}
              className="relative aspect-square rounded-xl overflow-hidden border border-border bg-muted/20 group"
            >
              <img
                src={photo.url}
                alt={photo.caption ?? "Uploaded photo"}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removePhoto(photo.id)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove photo"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          {Array.from({ length: uploadingCount }).map((_, i) => (
            <div
              key={`uploading-${i}`}
              className="aspect-square rounded-xl border border-border bg-muted/10 flex items-center justify-center"
            >
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
          ))}
          {photos.length + uploadingCount < MAX_DRAFT_PHOTOS && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!data.draftToken}
              className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:text-primary transition-colors disabled:opacity-40"
            >
              <Camera className="w-5 h-5" />
              <span className="text-[10px] font-medium">Add Photo</span>
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={e => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {!data.draftToken && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Setting up photo
            upload…
          </div>
        )}
      </div>
      <StickyBottom
        dateLabel={dateLabel}
        onNext={onNext}
        nextLabel={photos.length > 0 ? "Next" : "Skip Photos"}
      />
    </div>
  );
}

// ─── Step: Contact ──────────────────────────────────────────────────────────
function StepContact({
  data,
  onUpdate,
  onSubmit,
  isPending,
}: {
  data: BookingData;
  onUpdate: (d: Partial<BookingData>) => void;
  onSubmit: () => void;
  isPending: boolean;
}) {
  const [emailTouched, setEmailTouched] = useState(false);
  const dateLabel = data.appointmentDate
    ? formatDateLabel(data.appointmentDate, data.appointmentTime)
    : undefined;
  const emailError =
    emailTouched && data.email && !isEmailValid(data.email)
      ? "Enter a valid email address"
      : null;
  const canSubmit =
    data.firstName.trim().length > 0 &&
    data.lastName.trim().length > 0 &&
    isPhoneComplete(data.phone) &&
    (!data.email || isEmailValid(data.email));
  return (
    <div>
      <PageTitle title="Your Details" />
      <div className="px-5 py-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              First Name <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="First"
              value={data.firstName}
              onChange={e => onUpdate({ firstName: e.target.value })}
              autoComplete="given-name"
              className="bg-input border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Last Name <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="Last"
              value={data.lastName}
              onChange={e => onUpdate({ lastName: e.target.value })}
              autoComplete="family-name"
              className="bg-input border-border"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">
            Phone <span className="text-destructive">*</span>
          </Label>
          <Input
            placeholder="(262) 000-0000"
            value={data.phone}
            onChange={e => onUpdate({ phone: formatPhone(e.target.value) })}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={14}
            className={cn(
              "bg-input border-border",
              data.phone &&
                !isPhoneComplete(data.phone) &&
                "border-destructive/60"
            )}
          />
          {data.phone && !isPhoneComplete(data.phone) && (
            <p className="text-xs text-destructive">
              Enter a 10-digit phone number
            </p>
          )}
        </div>
        <SmsConsentField
          id="booking-sms-consent"
          checked={data.smsConsent}
          onChange={v => onUpdate({ smsConsent: v })}
        />
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">
            Email{" "}
            <span className="text-muted-foreground font-normal">
              (booking confirmation sent here)
            </span>
          </Label>
          <Input
            placeholder="you@example.com"
            value={data.email}
            onChange={e => onUpdate({ email: e.target.value })}
            onBlur={() => setEmailTouched(true)}
            type="text"
            inputMode="email"
            autoComplete="email"
            className={cn(
              "bg-input border-border",
              emailError && "border-destructive/60"
            )}
          />
          {emailError && (
            <p className="text-xs text-destructive">{emailError}</p>
          )}
          {!data.email && !emailTouched && (
            <p className="text-xs text-muted-foreground">
              Recommended — we'll send your booking confirmation here
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium">
            How did you hear about us?
          </Label>
          <div className="flex flex-wrap gap-2">
            {HOW_HEARD.map(h => (
              <button
                key={h}
                onClick={() =>
                  onUpdate({ howHeard: data.howHeard === h ? "" : h })
                }
                className={cn(
                  "px-3 py-1.5 rounded-full border text-xs font-medium transition-all",
                  data.howHeard === h
                    ? "border-primary bg-primary text-white"
                    : "border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                {h}
              </button>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          By submitting this booking you agree to our cancellation policy. We
          require 24-hour notice for any rescheduling or cancellations.
        </p>
      </div>
      <StickyBottom
        dateLabel={dateLabel}
        onNext={onSubmit}
        nextLabel="Confirm Booking"
        disabled={!canSubmit}
        isPending={isPending}
      />
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function Booking() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("service_type");
  const [history, setHistory] = useState<Step[]>([]);
  const [data, setData] = useState<BookingData>({
    serviceAddress: "",
    serviceCity: "",
    serviceState: "WI",
    serviceZip: "",
    vehicleType: "",
    vehicleCategory: "",
    addOnQty: {},
    appointmentDate: "",
    appointmentTime: "",
    gateInstructions: "",
    vehicleLocationDetails: "",
    specialRequests: "",
    conditionPetHair: false,
    conditionStains: false,
    conditionOdors: false,
    conditionExcessiveTrash: false,
    conditionSand: false,
    conditionSalt: false,
    conditionPaint: "",
    conditionScratchesOxidation: false,
    conditionAftermarketParts: false,
    conditionBiohazards: false,
    conditionNotes: "",
    draftToken: "",
    vehicleMake: "",
    vehicleModel: "",
    vehicleYear: "",
    vehicleColor: "",
    vehicleLicensePlate: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    smsConsent: false,
    howHeard: "",
    recurringInterval: "",
  });

  const { data: addOnsData = [] } = trpc.bookings.getAddOns.useQuery();
  const { data: siteContent } = trpc.content.getSiteContent.useQuery({
    section: "business",
  });
  const createBooking = trpc.bookings.create.useMutation();

  const taxRate = useMemo(() => {
    const raw = siteContent?.find(r => r.key === "tax_rate")?.value;
    const v = raw ? parseFloat(raw) : NaN;
    return isNaN(v) ? 0.0825 : v;
  }, [siteContent]);

  const update = (partial: Partial<BookingData>) =>
    setData(p => ({ ...p, ...partial }));
  const goTo = (next: Step) => {
    setHistory(h => [...h, step]);
    setStep(next);
    window.scrollTo(0, 0);
  };
  const goBack = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory(h => h.slice(0, -1));
      setStep(prev);
      window.scrollTo(0, 0);
    } else navigate("/");
  };

  const submit = async () => {
    if (!data.firstName.trim() || !data.lastName.trim()) {
      toast.error("Please enter your name.");
      return;
    }
    if (!isPhoneComplete(data.phone)) {
      toast.error("Please enter a valid 10-digit phone number.");
      return;
    }
    if (data.email && !isEmailValid(data.email)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    const dt = new Date(`${data.appointmentDate}T${data.appointmentTime}:00`);
    // Expand add-on IDs by quantity for proper line item tracking
    const addOnIds: number[] = [];
    Object.entries(data.addOnQty).forEach(([id, q]) => {
      for (let i = 0; i < q; i++) addOnIds.push(Number(id));
    });
    const addOnTotal = Object.entries(data.addOnQty).reduce((s, [id, q]) => {
      const ao = addOnsData.find(a => a.id === Number(id));
      return s + (ao ? Number(ao.price) * q : 0);
    }, 0);
    const subtotal = (data.packagePrice ?? 0) + addOnTotal;
    const taxAmount = subtotal * taxRate;
    try {
      const result = await createBooking.mutateAsync({
        customerFirstName: data.firstName.trim(),
        customerLastName: data.lastName.trim(),
        customerEmail: data.email.trim() || undefined,
        customerPhone: stripPhone(data.phone),
        smsConsent: data.smsConsent,
        vehicleMake: data.vehicleMake.trim(),
        vehicleModel: data.vehicleModel.trim(),
        vehicleYear: parseInt(data.vehicleYear, 10),
        vehicleColor: data.vehicleColor.trim() || undefined,
        vehicleType: data.vehicleType || undefined,
        vehicleLicensePlate: data.vehicleLicensePlate.trim() || undefined,
        packageId: data.packageId,
        packageName: data.packageName,
        addOnIds: addOnIds.length > 0 ? addOnIds : undefined,
        appointmentDate: dt.toISOString(),
        duration: data.packageDuration,
        serviceAddress: data.serviceAddress.trim(),
        serviceCity: data.serviceCity.trim() || undefined,
        serviceState: data.serviceState.trim() || undefined,
        serviceZip: data.serviceZip.trim() || undefined,
        gateInstructions: data.gateInstructions.trim() || undefined,
        subtotal,
        travelFee: 0,
        taxAmount,
        totalAmount: subtotal + taxAmount,
        notes:
          [data.specialRequests, data.vehicleLocationDetails]
            .map(s => s.trim())
            .filter(Boolean)
            .join("\n\n") || undefined,
        conditionSummary: buildConditionSummary(data) || undefined,
        draftToken: data.draftToken || undefined,
        howHeard: data.howHeard || undefined,
      });
      navigate(`/book/confirmation/${result.bookingNumber}`);
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong. Please try again.");
    }
  };

  const progressPct = ((STEPS.indexOf(step) + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO
        title="Book Mobile Detailing"
        description="Schedule your mobile auto detailing appointment online. Choose your service, pick a date, and we'll come to you. Takes less than 2 minutes."
        canonical={BRAND.booking.primaryPath}
        noindex={false}
      />
      <div className="sticky top-0 z-50 flex items-center justify-between px-4 h-12 bg-background border-b border-border/60">
        <button
          onClick={goBack}
          className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 mx-4 h-1 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300 rounded-full"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <Link href="/login">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-xs font-bold text-primary">G</span>
          </div>
        </Link>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="flex-1 flex flex-col"
        >
          {step === "service_type" && (
            <StepServiceType onSelectMobile={() => goTo("location")} />
          )}
          {step === "location" && (
            <StepLocation
              data={data}
              onUpdate={update}
              onNext={() => goTo("vehicle_info")}
            />
          )}
          {step === "vehicle_info" && (
            <StepVehicleInfo
              data={data}
              onUpdate={update}
              onNext={() => goTo("package")}
            />
          )}
          {step === "package" && (
            <StepPackage
              data={data}
              onSelect={pkg => {
                update({
                  packageId: pkg.id,
                  packageName: pkg.name,
                  packagePrice: pkg.resolvedPrice ?? Number(pkg.price),
                  packageDuration: pkg.duration,
                });
                goTo("addons");
              }}
            />
          )}
          {step === "addons" && (
            <StepAddOns
              data={data}
              onUpdate={update}
              onNext={() => goTo("schedule")}
            />
          )}
          {step === "schedule" && (
            <StepSchedule
              data={data}
              onUpdate={update}
              onNext={() => goTo("recurring")}
            />
          )}
          {step === "recurring" && (
            <StepRecurring
              data={data}
              onUpdate={update}
              onNext={() => goTo("condition")}
              onSkip={() => {
                update({ recurringInterval: "" });
                goTo("condition");
              }}
            />
          )}
          {step === "condition" && (
            <StepCondition
              data={data}
              onUpdate={update}
              onNext={() => goTo("photos")}
              onGoToAddOns={() => goTo("addons")}
            />
          )}
          {step === "photos" && (
            <StepPhotos
              data={data}
              onUpdate={update}
              onNext={() => goTo("contact")}
            />
          )}
          {step === "contact" && (
            <StepContact
              data={data}
              onUpdate={update}
              onSubmit={submit}
              isPending={createBooking.isPending}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
