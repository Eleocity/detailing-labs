import { useState, useEffect, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { toast } from "sonner";
import {
  Globe, DollarSign, Phone, HelpCircle, Settings2, Package,
  Save, CheckCircle2, Loader2, ChevronDown, ChevronRight,
  Eye, EyeOff, RefreshCw, Star, Info,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type SavingState = "idle" | "saving" | "saved" | "error";

interface FieldDef {
  key: string;
  label: string;
  multiline?: boolean;
  hint?: string;
  placeholder?: string;
}

interface SectionDef {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  fields: FieldDef[];
}

// ─── All editable content sections ───────────────────────────────────────────
const SECTIONS: SectionDef[] = [
  {
    id: "hero",
    label: "Homepage Hero",
    icon: <Globe className="w-4 h-4" />,
    color: "text-purple-400",
    fields: [
      { key: "badge",              label: "Location Badge",        placeholder: "Mobile Detailing · Racine & Kenosha County, WI" },
      { key: "headline",           label: "Main Headline",         placeholder: "Professional Mobile Detailing.\nWe Bring Everything.", hint: "Supports <br /> for line breaks" },
      { key: "subheadline",        label: "Subheadline",           multiline: true, placeholder: "We carry our own water..." },
      { key: "cta_primary",        label: "Primary Button Text",   placeholder: "Book My Appointment" },
      { key: "cta_secondary",      label: "Secondary Link Text",   placeholder: "See packages & pricing" },
      { key: "trust_reviews",      label: "Trust — Reviews",       placeholder: "5.0 · Google Reviews" },
      { key: "trust_certified",    label: "Trust — Certification", placeholder: "Fully insured & self-contained" },
      { key: "trust_availability", label: "Trust — Hours",         placeholder: "Mon–Sat, 7am–7pm" },
    ],
  },
  {
    id: "about",
    label: "About / Stats",
    icon: <Star className="w-4 h-4" />,
    color: "text-blue-400",
    fields: [
      { key: "headline",          label: "Section Headline",      placeholder: "Not a Franchise. Not a Car Wash." },
      { key: "body",              label: "Body Text",             multiline: true, placeholder: "We built Detailing Labs around one problem..." },
      { key: "vehicles_detailed", label: "Stat — Vehicles",       placeholder: "150+" },
      { key: "years_experience",  label: "Stat — Years",          placeholder: "3+" },
      { key: "satisfaction_rate", label: "Stat — Satisfaction",   placeholder: "100%" },
      { key: "service_areas",     label: "Stat — Service Areas",  placeholder: "15+" },
    ],
  },
  {
    id: "contact",
    label: "Contact Info",
    icon: <Phone className="w-4 h-4" />,
    color: "text-green-400",
    fields: [
      { key: "phone",          label: "Phone Number",   placeholder: "(262) 260-9474" },
      { key: "email",          label: "Email Address",  placeholder: "hello@detailinglabswi.com" },
      { key: "address",        label: "City / Address", placeholder: "Southeast Wisconsin" },
      { key: "hours_weekday",  label: "Weekday Hours",  placeholder: "Mon–Sat: 7:00 AM – 7:00 PM" },
      { key: "hours_weekend",  label: "Sunday",         placeholder: "Sunday: Closed" },
    ],
  },
  {
    id: "business",
    label: "Business Settings",
    icon: <Settings2 className="w-4 h-4" />,
    color: "text-orange-400",
    fields: [
      { key: "name",                   label: "Business Name",       placeholder: "Detailing Labs" },
      { key: "tagline",                label: "Tagline",             placeholder: "Professional Mobile Detailing" },
      { key: "tax_rate",               label: "Tax Rate (decimal)",  placeholder: "0.055",  hint: "WI state sales tax = 0.055 (5.5%)" },
      { key: "travel_fee_base",        label: "Base Travel Fee ($)", placeholder: "0" },
      { key: "service_radius_miles",   label: "Service Radius (mi)", placeholder: "40" },
      { key: "booking_advance_hours",  label: "Min Booking Lead (hrs)", placeholder: "12", hint: "How far ahead customers must book" },
    ],
  },
];

// FAQ is handled separately since it's an array
const FAQ_SECTION_ID = "faq";

// ─── Auto-save hook ───────────────────────────────────────────────────────────
function useAutoSave(
  section: string,
  key: string,
  initialValue: string,
  onSave: (section: string, key: string, value: string) => Promise<void>
) {
  const [value, setValue] = useState(initialValue);
  const [state, setState] = useState<SavingState>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestValue = useRef(initialValue);

  // Sync when initial value changes (e.g. fresh fetch)
  useEffect(() => {
    setValue(initialValue);
    latestValue.current = initialValue;
  }, [initialValue]);

  const handleChange = useCallback((newValue: string) => {
    setValue(newValue);
    latestValue.current = newValue;
    setState("saving");

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        await onSave(section, key, latestValue.current);
        setState("saved");
        setTimeout(() => setState("idle"), 2000);
      } catch {
        setState("error");
      }
    }, 600);
  }, [section, key, onSave]);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  return { value, handleChange, state };
}

// ─── Save indicator ───────────────────────────────────────────────────────────
function SaveIndicator({ state }: { state: SavingState }) {
  if (state === "idle") return null;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium transition-all ${
      state === "saving" ? "text-muted-foreground" :
      state === "saved"  ? "text-green-500" :
      "text-destructive"
    }`}>
      {state === "saving" && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
      {state === "saved"  && <CheckCircle2 className="w-2.5 h-2.5" />}
      {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : "Error"}
    </span>
  );
}

// ─── Single field row ─────────────────────────────────────────────────────────
function FieldRow({
  field,
  initialValue,
  onSave,
}: {
  field: FieldDef;
  initialValue: string;
  onSave: (section: string, key: string, value: string) => Promise<void>;
}) {
  // We extract section from the onSave closure; pass section+key when calling
  const { value, handleChange, state } = useAutoSave(
    "", // section filled by parent via closure
    field.key,
    initialValue,
    onSave
  );

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-medium text-foreground">{field.label}</label>
        <SaveIndicator state={state} />
      </div>
      {field.hint && <p className="text-[10px] text-muted-foreground">{field.hint}</p>}
      {field.multiline ? (
        <textarea
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={field.placeholder}
          rows={4}
          className="w-full px-3 py-2 rounded-lg border border-border bg-input text-foreground text-sm resize-none focus:outline-none focus:border-primary/60 transition-colors placeholder:text-muted-foreground/50"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={field.placeholder}
          className="w-full px-3 py-2 rounded-lg border border-border bg-input text-foreground text-sm focus:outline-none focus:border-primary/60 transition-colors placeholder:text-muted-foreground/50"
        />
      )}
    </div>
  );
}

// ─── Field row with section context baked in ──────────────────────────────────
function SectionFieldRow({
  section,
  field,
  initialValue,
  onSave,
}: {
  section: string;
  field: FieldDef;
  initialValue: string;
  onSave: (section: string, key: string, value: string) => Promise<void>;
}) {
  const boundSave = useCallback(
    (_s: string, key: string, value: string) => onSave(section, key, value),
    [section, onSave]
  );
  return <FieldRow field={field} initialValue={initialValue} onSave={boundSave} />;
}

// ─── Collapsible section panel ────────────────────────────────────────────────
function SectionPanel({
  section,
  contentMap,
  onSave,
  defaultOpen,
}: {
  section: SectionDef;
  contentMap: Record<string, string>;
  onSave: (section: string, key: string, value: string) => Promise<void>;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 bg-card hover:bg-card/80 transition-colors text-left"
      >
        <span className={section.color}>{section.icon}</span>
        <span className="font-semibold text-sm flex-1">{section.label}</span>
        <span className="text-xs text-muted-foreground">{section.fields.length} fields</span>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-5 py-4 bg-background border-t border-border space-y-5">
          {section.fields.map((field) => (
            <SectionFieldRow
              key={field.key}
              section={section.id}
              field={field}
              initialValue={contentMap[field.key] ?? ""}
              onSave={onSave}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── FAQ Editor ───────────────────────────────────────────────────────────────
function FAQEditor({
  contentMap,
  onSave,
}: {
  contentMap: Record<string, string>;
  onSave: (section: string, key: string, value: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  // Build FAQ pairs from keys: item_1_q / item_1_a
  const indices = [...new Set(
    Object.keys(contentMap)
      .filter(k => k.startsWith("item_"))
      .map(k => k.split("_")[1])
  )].sort();

  const faqs = indices.length > 0
    ? indices.map(i => ({ q: contentMap[`item_${i}_q`] ?? "", a: contentMap[`item_${i}_a`] ?? "" }))
    : [
        { q: "Do you need access to water or power at my location?", a: "No. We carry everything — our own water tank and generator." },
        { q: "What if I'm not home during the appointment?",         a: "Most clients aren't. As long as we can access the vehicle, we'll handle it." },
        { q: "How long does a detail take?",                         a: "~2 hrs for exterior or interior alone. Full Showroom Reset is 3–4 hrs. The Lab Grade Detail is 6–8 hrs." },
        { q: "Do you service my area?",                              a: "We cover Racine County, Kenosha County, and the greater Milwaukee metro." },
        { q: "What if I'm not happy with the result?",              a: "Tell us and we'll come back and make it right, no charge." },
      ];

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 bg-card hover:bg-card/80 transition-colors text-left"
      >
        <span className="text-yellow-400"><HelpCircle className="w-4 h-4" /></span>
        <span className="font-semibold text-sm flex-1">FAQ Questions</span>
        <span className="text-xs text-muted-foreground">{faqs.length} questions</span>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-5 py-4 bg-background border-t border-border space-y-6">
          {faqs.map((faq, i) => (
            <div key={i} className="space-y-3 pb-5 border-b border-border/60 last:border-0 last:pb-0">
              <p className="text-xs font-bold text-primary uppercase tracking-wider">FAQ #{i + 1}</p>
              <SectionFieldRow
                section={FAQ_SECTION_ID}
                field={{ key: `item_${i + 1}_q`, label: "Question", placeholder: "Enter question…" }}
                initialValue={faq.q}
                onSave={onSave}
              />
              <SectionFieldRow
                section={FAQ_SECTION_ID}
                field={{ key: `item_${i + 1}_a`, label: "Answer", placeholder: "Enter answer…", multiline: true }}
                initialValue={faq.a}
                onSave={onSave}
              />
            </div>
          ))}
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Info className="w-3 h-3" />
            To add/remove FAQ items, contact your developer. Changes save automatically.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Packages Editor ──────────────────────────────────────────────────────────
function PackagesEditor() {
  const utils = trpc.useUtils();
  const { data: pkgs, isLoading } = trpc.content.getPackages.useQuery();
  const upsert = trpc.content.upsertPackage.useMutation({
    onSuccess: () => { utils.content.getPackages.invalidate(); toast.success("Package saved"); },
    onError:   () => toast.error("Failed to save package"),
  });
  const deletePkg = trpc.content.deletePackage.useMutation({
    onSuccess: () => { utils.content.getPackages.invalidate(); toast.success("Package deactivated"); },
  });

  const [open, setOpen] = useState(false);
  const [editPkg, setEditPkg] = useState<null | {
    id?: number; name: string; description: string; price: string;
    duration: number; features: string; isPopular: boolean; isActive: boolean; sortOrder: number;
  }>(null);

  const featuresText = (j: string | null) => {
    try { return (JSON.parse(j ?? "[]") as string[]).join("\n"); } catch { return j ?? ""; }
  };

  const [open2, setOpen2] = useState(false);

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 bg-card hover:bg-card/80 transition-colors text-left"
      >
        <span className="text-primary"><DollarSign className="w-4 h-4" /></span>
        <span className="font-semibold text-sm flex-1">Service Packages</span>
        <span className="text-xs text-muted-foreground">{pkgs?.length ?? 0} packages</span>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-5 py-4 bg-background border-t border-border space-y-3">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading packages…
            </div>
          ) : (
            <>
              {pkgs?.map((pkg) => (
                <div key={pkg.id} className={`p-4 rounded-xl border bg-card ${!pkg.isActive ? "opacity-50" : ""}`}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="font-semibold text-sm">{pkg.name}</p>
                      <p className="text-xs text-muted-foreground">${Number(pkg.price).toFixed(2)} · {Math.round(pkg.duration / 60)}h</p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      {pkg.isPopular && <span className="text-[10px] bg-primary/15 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-semibold">Popular</span>}
                      <button
                        onClick={() => setEditPkg({ id: pkg.id, name: pkg.name, description: pkg.description ?? "", price: String(pkg.price), duration: pkg.duration, features: pkg.features ?? "[]", isPopular: pkg.isPopular ?? false, isActive: pkg.isActive ?? true, sortOrder: pkg.sortOrder ?? 0 })}
                        className="text-xs text-primary hover:underline"
                      >Edit</button>
                      <button
                        onClick={() => deletePkg.mutate({ id: pkg.id })}
                        className="text-xs text-destructive hover:underline"
                      >Disable</button>
                    </div>
                  </div>
                  {pkg.description && <p className="text-xs text-muted-foreground line-clamp-2">{pkg.description}</p>}
                </div>
              ))}
              <button
                onClick={() => setEditPkg({ name: "", description: "", price: "0.00", duration: 120, features: "[]", isPopular: false, isActive: true, sortOrder: 0 })}
                className="w-full py-2.5 rounded-xl border-2 border-dashed border-border hover:border-primary/40 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                + Add Package
              </button>
            </>
          )}

          {/* Inline edit form */}
          {editPkg && (
            <div className="mt-2 p-5 rounded-xl border-2 border-primary/30 bg-primary/5 space-y-4">
              <p className="text-sm font-bold">{editPkg.id ? "Edit Package" : "New Package"}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-medium">Package Name</label>
                  <input value={editPkg.name} onChange={(e) => setEditPkg(p => p && ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-input text-sm focus:outline-none focus:border-primary/60" />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-medium">Description</label>
                  <textarea value={editPkg.description} onChange={(e) => setEditPkg(p => p && ({ ...p, description: e.target.value }))}
                    rows={2} className="w-full px-3 py-2 rounded-lg border border-border bg-input text-sm resize-none focus:outline-none focus:border-primary/60" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Price ($)</label>
                  <input type="number" step="0.01" value={editPkg.price} onChange={(e) => setEditPkg(p => p && ({ ...p, price: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-input text-sm focus:outline-none focus:border-primary/60" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Duration (min)</label>
                  <input type="number" value={editPkg.duration} onChange={(e) => setEditPkg(p => p && ({ ...p, duration: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-input text-sm focus:outline-none focus:border-primary/60" />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-medium">Features (one per line)</label>
                  <textarea
                    value={featuresText(editPkg.features)}
                    onChange={(e) => setEditPkg(p => p && ({ ...p, features: JSON.stringify(e.target.value.split("\n").map(s => s.trim()).filter(Boolean)) }))}
                    rows={5} placeholder="Signature hand wash&#10;Wheel & tire deep clean&#10;…"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-input text-sm font-mono resize-none focus:outline-none focus:border-primary/60" />
                </div>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={editPkg.isPopular} onChange={(e) => setEditPkg(p => p && ({ ...p, isPopular: e.target.checked }))} className="accent-primary" />
                  Mark as Popular
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={editPkg.isActive} onChange={(e) => setEditPkg(p => p && ({ ...p, isActive: e.target.checked }))} className="accent-primary" />
                  Active
                </label>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { if (editPkg) upsert.mutate(editPkg); setEditPkg(null); }}
                  disabled={upsert.isPending}
                  className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {upsert.isPending ? "Saving…" : "Save Package"}
                </button>
                <button onClick={() => setEditPkg(null)} className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Add-ons Editor ───────────────────────────────────────────────────────────
function AddOnsEditor() {
  const utils = trpc.useUtils();
  const { data: addons, isLoading } = trpc.content.getAddOns.useQuery();
  const upsert = trpc.content.upsertAddOn.useMutation({
    onSuccess: () => { utils.content.getAddOns.invalidate(); toast.success("Add-on saved"); setEditAddon(null); },
    onError:   () => toast.error("Failed to save add-on"),
  });
  const deleteAddon = trpc.content.deleteAddOn.useMutation({
    onSuccess: () => { utils.content.getAddOns.invalidate(); toast.success("Add-on deactivated"); },
  });

  const [open, setOpen] = useState(false);
  const [editAddon, setEditAddon] = useState<null | {
    id?: number; name: string; description: string; price: string; duration: number; isActive: boolean; sortOrder: number;
  }>(null);

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 bg-card hover:bg-card/80 transition-colors text-left"
      >
        <span className="text-teal-400"><Package className="w-4 h-4" /></span>
        <span className="font-semibold text-sm flex-1">Add-On Services</span>
        <span className="text-xs text-muted-foreground">{addons?.length ?? 0} add-ons</span>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-5 py-4 bg-background border-t border-border space-y-3">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading add-ons…
            </div>
          ) : (
            <>
              {addons?.map((ao) => (
                <div key={ao.id} className={`flex items-center gap-3 p-3 rounded-xl border bg-card ${!ao.isActive ? "opacity-50" : ""}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ao.name}</p>
                    <p className="text-xs text-muted-foreground">+${Number(ao.price).toFixed(2)}</p>
                  </div>
                  <button onClick={() => setEditAddon({ id: ao.id, name: ao.name, description: ao.description ?? "", price: String(ao.price), duration: ao.duration ?? 0, isActive: ao.isActive ?? true, sortOrder: ao.sortOrder ?? 0 })}
                    className="text-xs text-primary hover:underline flex-shrink-0">Edit</button>
                  <button onClick={() => deleteAddon.mutate({ id: ao.id })}
                    className="text-xs text-destructive hover:underline flex-shrink-0">Disable</button>
                </div>
              ))}
              <button
                onClick={() => setEditAddon({ name: "", description: "", price: "0.00", duration: 0, isActive: true, sortOrder: 0 })}
                className="w-full py-2.5 rounded-xl border-2 border-dashed border-border hover:border-primary/40 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                + Add Add-On
              </button>
            </>
          )}
          {editAddon && (
            <div className="mt-2 p-5 rounded-xl border-2 border-primary/30 bg-primary/5 space-y-4">
              <p className="text-sm font-bold">{editAddon.id ? "Edit Add-On" : "New Add-On"}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-medium">Add-On Name</label>
                  <input value={editAddon.name} onChange={(e) => setEditAddon(a => a && ({ ...a, name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-input text-sm focus:outline-none focus:border-primary/60" />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-medium">Description</label>
                  <input value={editAddon.description} onChange={(e) => setEditAddon(a => a && ({ ...a, description: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-input text-sm focus:outline-none focus:border-primary/60" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Price ($)</label>
                  <input type="number" step="0.01" value={editAddon.price} onChange={(e) => setEditAddon(a => a && ({ ...a, price: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-input text-sm focus:outline-none focus:border-primary/60" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Extra Duration (min)</label>
                  <input type="number" value={editAddon.duration} onChange={(e) => setEditAddon(a => a && ({ ...a, duration: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-input text-sm focus:outline-none focus:border-primary/60" />
                </div>
                <label className="flex items-center gap-2 text-xs cursor-pointer col-span-2">
                  <input type="checkbox" checked={editAddon.isActive} onChange={(e) => setEditAddon(a => a && ({ ...a, isActive: e.target.checked }))} className="accent-primary" />
                  Active
                </label>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => editAddon && upsert.mutate(editAddon)}
                  disabled={upsert.isPending}
                  className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {upsert.isPending ? "Saving…" : "Save Add-On"}
                </button>
                <button onClick={() => setEditAddon(null)} className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Live Preview ─────────────────────────────────────────────────────────────
function LivePreview({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  const [key, setKey] = useState(0);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Live Preview</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setKey(k => k + 1)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button onClick={onToggle} className="text-muted-foreground hover:text-foreground transition-colors">
            <EyeOff className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <iframe
          key={key}
          src="/"
          className="w-full h-full border-0"
          title="Site Preview"
        />
      </div>
    </div>
  );
}

// ─── Global save status bar ───────────────────────────────────────────────────
function StatusBar({ lastSaved }: { lastSaved: Date | null }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-card border-b border-border text-xs text-muted-foreground">
      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
      <span>Auto-saving · Changes go live within seconds</span>
      {lastSaved && (
        <span className="ml-auto">Last saved: {lastSaved.toLocaleTimeString()}</span>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminSiteEditor() {
  const utils = trpc.useUtils();
  const { data: allContent, isLoading } = trpc.content.getSiteContent.useQuery({});
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [previewVisible, setPreviewVisible] = useState(true);

  // Build a nested map: section → key → value
  const contentMap: Record<string, Record<string, string>> = {};
  for (const row of allContent ?? []) {
    if (!contentMap[row.section]) contentMap[row.section] = {};
    contentMap[row.section][row.key] = row.value ?? "";
  }

  // Single save function used by all fields
  const save = useCallback(async (section: string, key: string, value: string) => {
    await utils.client.content.upsertSiteContent.mutate({ section, key, value });
    // Invalidate so any other components using this data reflect the change
    utils.content.getSiteContent.invalidate();
    setLastSaved(new Date());
  }, [utils]);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading site content…</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex flex-col h-[calc(100vh-64px)]">

        {/* Header */}
        <div className="px-5 py-4 border-b border-border bg-background flex-shrink-0">
          <h1 className="text-xl font-display font-bold text-foreground">Site Content Editor</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Every change saves automatically as you type. No save button needed.
          </p>
        </div>

        <StatusBar lastSaved={lastSaved} />

        {/* Split layout */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left panel — editor */}
          <div className={`flex flex-col overflow-y-auto border-r border-border transition-all ${previewVisible ? "w-[420px] flex-shrink-0" : "flex-1"}`}>
            <div className="p-4 space-y-3">

              {/* Preview toggle (mobile / when preview hidden) */}
              {!previewVisible && (
                <button
                  onClick={() => setPreviewVisible(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border bg-card text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                >
                  <Eye className="w-4 h-4" /> Show Preview
                </button>
              )}

              {/* Section panels */}
              {SECTIONS.map((section, i) => (
                <SectionPanel
                  key={section.id}
                  section={section}
                  contentMap={contentMap[section.id] ?? {}}
                  onSave={save}
                  defaultOpen={i === 0}
                />
              ))}

              <FAQEditor
                contentMap={contentMap[FAQ_SECTION_ID] ?? {}}
                onSave={save}
              />

              <PackagesEditor />
              <AddOnsEditor />

              <div className="h-8" />
            </div>
          </div>

          {/* Right panel — live preview */}
          {previewVisible && (
            <div className="flex-1 overflow-hidden">
              <LivePreview visible={previewVisible} onToggle={() => setPreviewVisible(false)} />
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
