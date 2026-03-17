import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import {
  Search, Plus, ChevronRight, ChevronLeft, Phone, Mail, MapPin,
  Car, Calendar, FileText, MessageSquare, CheckCircle2, Loader2,
  Star, Edit, User, Copy, Check, X,
  StickyNote, PhoneCall, Send, AlarmClock, ClipboardList,
  TrendingUp, DollarSign, Wrench, Hash,
  AlertCircle, UserPlus, Shield, KeyRound, Trash2, RefreshCw,
  UserX, Crown, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────
type CrmStatus = "new_lead" | "contacted" | "quote_sent" | "booked" | "active" | "follow_up" | "vip" | "inactive";
type NoteType = "note" | "call" | "email" | "sms" | "task" | "reminder";

// ─── Constants ────────────────────────────────────────────────────────────────
const CRM_STATUSES: { value: CrmStatus | "all"; label: string }[] = [
  { value: "all",        label: "All Clients" },
  { value: "new_lead",   label: "New Lead" },
  { value: "contacted",  label: "Contacted" },
  { value: "quote_sent", label: "Quote Sent" },
  { value: "booked",     label: "Booked" },
  { value: "active",     label: "Active" },
  { value: "follow_up",  label: "Follow-Up" },
  { value: "vip",        label: "VIP" },
  { value: "inactive",   label: "Inactive" },
];

const STATUS_META: Record<string, { label: string; dot: string; pill: string }> = {
  new_lead:   { label: "New Lead",   dot: "bg-blue-500",    pill: "bg-blue-500/12 text-blue-400 border-blue-500/25" },
  contacted:  { label: "Contacted",  dot: "bg-violet-500",  pill: "bg-violet-500/12 text-violet-400 border-violet-500/25" },
  quote_sent: { label: "Quote Sent", dot: "bg-amber-500",   pill: "bg-amber-500/12 text-amber-400 border-amber-500/25" },
  booked:     { label: "Booked",     dot: "bg-emerald-500", pill: "bg-emerald-500/12 text-emerald-400 border-emerald-500/25" },
  active:     { label: "Active",     dot: "bg-green-500",   pill: "bg-green-500/12 text-green-400 border-green-500/25" },
  follow_up:  { label: "Follow-Up",  dot: "bg-orange-500",  pill: "bg-orange-500/12 text-orange-400 border-orange-500/25" },
  vip:        { label: "VIP",        dot: "bg-yellow-400",  pill: "bg-yellow-500/12 text-yellow-400 border-yellow-500/25" },
  inactive:   { label: "Inactive",   dot: "bg-zinc-500",    pill: "bg-zinc-500/12 text-zinc-400 border-zinc-500/25" },
};

const NOTE_META: Record<NoteType, { label: string; icon: React.ElementType; color: string }> = {
  note:     { label: "Note",     icon: StickyNote,    color: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20" },
  call:     { label: "Call",     icon: PhoneCall,     color: "text-green-400 bg-green-500/10 border-green-500/20" },
  email:    { label: "Email",    icon: Mail,          color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  sms:      { label: "SMS",      icon: MessageSquare, color: "text-violet-400 bg-violet-500/10 border-violet-500/20" },
  task:     { label: "Task",     icon: ClipboardList, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  reminder: { label: "Reminder", icon: AlarmClock,    color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
};

const BOOKING_STATUS_PILL: Record<string, string> = {
  new:         "bg-blue-500/12 text-blue-400 border-blue-500/25",
  confirmed:   "bg-emerald-500/12 text-emerald-400 border-emerald-500/25",
  assigned:    "bg-violet-500/12 text-violet-400 border-violet-500/25",
  en_route:    "bg-amber-500/12 text-amber-400 border-amber-500/25",
  in_progress: "bg-orange-500/12 text-orange-400 border-orange-500/25",
  completed:   "bg-green-500/12 text-green-400 border-green-500/25",
  cancelled:   "bg-zinc-500/12 text-zinc-400 border-zinc-500/25",
};

const LEAD_SOURCES = ["Google", "Instagram", "Facebook", "Referral", "Walk-in", "TikTok", "Yelp", "Other"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function initials(name: string) {
  return name.trim().split(/\s+/).map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function avatarGradient(id: number) {
  const g = [
    "from-violet-600 to-violet-900",
    "from-purple-600 to-purple-900",
    "from-indigo-600 to-indigo-900",
    "from-blue-600 to-blue-900",
    "from-cyan-700 to-cyan-900",
  ];
  return g[id % g.length];
}

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status];
  if (!m) return null;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full border tracking-wide", m.pill)}>
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", m.dot)} />
      {m.label}
    </span>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}
      className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-muted-foreground hover:text-primary"
    >
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

// ─── Add Customer Dialog ──────────────────────────────────────────────────────
function AddCustomerDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", city: "", state: "", source: "", crmStatus: "new_lead" as CrmStatus });
  const mut = trpc.crm.createCustomer.useMutation({
    onSuccess: () => { toast.success("Customer added"); onSuccess(); onClose(); setForm({ firstName: "", lastName: "", email: "", phone: "", city: "", state: "", source: "", crmStatus: "new_lead" }); },
    onError: e => toast.error(e.message),
  });
  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value }));
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md bg-card border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display"><UserPlus className="w-4 h-4 text-primary" />Add New Customer</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-1">
          <div className="space-y-1"><Label className="text-xs">First Name *</Label><Input value={form.firstName} onChange={f("firstName")} placeholder="First" className="h-9 bg-background/50 border-border/50" /></div>
          <div className="space-y-1"><Label className="text-xs">Last Name *</Label><Input value={form.lastName} onChange={f("lastName")} placeholder="Last" className="h-9 bg-background/50 border-border/50" /></div>
          <div className="space-y-1"><Label className="text-xs">Phone</Label><Input value={form.phone} onChange={f("phone")} placeholder="(615) 000-0000" className="h-9 bg-background/50 border-border/50" /></div>
          <div className="space-y-1"><Label className="text-xs">Email</Label><Input value={form.email} onChange={f("email")} placeholder="email@example.com" className="h-9 bg-background/50 border-border/50" /></div>
          <div className="space-y-1"><Label className="text-xs">City</Label><Input value={form.city} onChange={f("city")} placeholder="Nashville" className="h-9 bg-background/50 border-border/50" /></div>
          <div className="space-y-1"><Label className="text-xs">State</Label><Input value={form.state} onChange={f("state")} placeholder="TN" className="h-9 bg-background/50 border-border/50" /></div>
          <div className="space-y-1">
            <Label className="text-xs">Lead Source</Label>
            <Select value={form.source} onValueChange={v => setForm(p => ({ ...p, source: v }))}>
              <SelectTrigger className="h-9 bg-background/50 border-border/50"><SelectValue placeholder="Source…" /></SelectTrigger>
              <SelectContent>{LEAD_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={form.crmStatus} onValueChange={v => setForm(p => ({ ...p, crmStatus: v as CrmStatus }))}>
              <SelectTrigger className="h-9 bg-background/50 border-border/50"><SelectValue /></SelectTrigger>
              <SelectContent>{CRM_STATUSES.filter(s => s.value !== "all").map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="border-border/50">Cancel</Button>
          <Button onClick={() => mut.mutate(form as any)} disabled={!form.firstName || !form.lastName || mut.isPending} className="bg-primary hover:bg-primary/90">
            {mut.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Adding…</> : "Add Customer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Vehicle Dialog ───────────────────────────────────────────────────────
function AddVehicleDialog({ customerId, open, onClose, onSuccess }: { customerId: number; open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ make: "", model: "", year: new Date().getFullYear(), color: "", vehicleType: "sedan", licensePlate: "", notes: "" });
  const mut = trpc.crm.addVehicle.useMutation({
    onSuccess: () => { toast.success("Vehicle added"); onSuccess(); onClose(); },
    onError: e => toast.error(e.message),
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
          <div className="space-y-1"><Label className="text-xs">Model *</Label><Input value={form.model} onChange={f("model")} placeholder="M3 Competition" className="h-9 bg-background/50 border-border/50" /></div>
          <div className="space-y-1"><Label className="text-xs">Color</Label><Input value={form.color} onChange={f("color")} placeholder="Tanzanite Blue" className="h-9 bg-background/50 border-border/50" /></div>
          <div className="space-y-1">
            <Label className="text-xs">Type</Label>
            <Select value={form.vehicleType} onValueChange={v => setForm(p => ({ ...p, vehicleType: v }))}>
              <SelectTrigger className="h-9 bg-background/50 border-border/50"><SelectValue /></SelectTrigger>
              <SelectContent>{["sedan","suv","truck","van","coupe","convertible","wagon","other"].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label className="text-xs">License Plate</Label><Input value={form.licensePlate} onChange={f("licensePlate")} placeholder="ABC-1234" className="h-9 bg-background/50 border-border/50" /></div>
          <div className="col-span-2 space-y-1"><Label className="text-xs">Notes</Label><Textarea value={form.notes} onChange={f("notes")} rows={2} placeholder="Coating, PPF notes…" className="resize-none bg-background/50 border-border/50 text-sm" /></div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="border-border/50">Cancel</Button>
          <Button onClick={() => mut.mutate({ customerId, ...form } as any)} disabled={!form.make || !form.model || mut.isPending} className="bg-primary hover:bg-primary/90">
            {mut.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Adding…</> : "Add Vehicle"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  CUSTOMER LIST
// ════════════════════════════════════════════════════════════════════════════
export function AdminCRMList() {
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage]                 = useState(0);
  const [showAdd, setShowAdd]           = useState(false);
  const [, setLocation]                 = useLocation();
  const PAGE_SIZE = 25;

  const { data, isLoading, refetch } = trpc.crm.listCustomers.useQuery({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const customers = data?.customers ?? [];
  const total     = data?.total ?? 0;
  const pages     = Math.ceil(total / PAGE_SIZE);

  return (
    <AdminLayout>
      <div className="flex flex-col" style={{ minHeight: "calc(100vh - 56px)" }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <div>
            <h1 className="text-xl font-display font-bold tracking-tight">Customers</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{total.toLocaleString()} total clients</p>
          </div>
          <Button onClick={() => setShowAdd(true)} className="bg-primary hover:bg-primary/90 h-9 text-sm font-semibold gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Customer
          </Button>
        </div>

        {/* ── Filters ── */}
        <div className="px-6 py-3 border-b border-border/40 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-52 max-w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search name, phone, email…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              className="pl-9 h-9 bg-background/50 border-border/50 text-sm"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex gap-1 flex-wrap">
            {CRM_STATUSES.map(s => (
              <button
                key={s.value}
                onClick={() => { setStatusFilter(s.value); setPage(0); }}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-all border",
                  statusFilter === s.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground bg-transparent"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Table ── */}
        <div className="flex-1 overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-48"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
              <User className="w-8 h-8 opacity-25" />
              <p className="text-sm">No customers found</p>
              <Button size="sm" variant="outline" onClick={() => { setSearch(""); setStatusFilter("all"); }} className="text-xs border-border/50">Clear filters</Button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/40 bg-muted/20 sticky top-0 z-10">
                  {["Customer", "Contact", "Location", "Status", "Lifetime Value", "Last Service", "Source", ""].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground first:pl-6 last:w-8">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {customers.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => setLocation(`/admin/crm/${c.id}`)}
                    className="hover:bg-muted/20 transition-colors cursor-pointer group"
                  >
                    {/* Customer */}
                    <td className="pl-6 pr-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold text-white bg-gradient-to-br", avatarGradient(c.id))}>
                          {initials(`${c.firstName} ${c.lastName}`)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-foreground flex items-center gap-1 truncate">
                            {c.firstName} {c.lastName}
                            {c.crmStatus === "vip" && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 flex-shrink-0" />}
                          </div>
                          {c.tags && (
                            <div className="flex gap-1 mt-0.5 flex-wrap">
                              {c.tags.split(",").filter(Boolean).map(t => (
                                <span key={t} className="text-[10px] px-1.5 rounded bg-primary/10 text-primary/80 border border-primary/20 font-medium leading-4">
                                  {t.trim()}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                        {c.phone && <span className="flex items-center gap-1.5"><Phone className="w-3 h-3 flex-shrink-0" />{c.phone}</span>}
                        {c.email && <span className="flex items-center gap-1.5 max-w-[160px] truncate"><Mail className="w-3 h-3 flex-shrink-0" />{c.email}</span>}
                      </div>
                    </td>

                    {/* Location */}
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {c.city ? `${c.city}${c.state ? `, ${c.state}` : ""}` : "—"}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3"><StatusBadge status={c.crmStatus ?? "new_lead"} /></td>

                    {/* LTV */}
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-foreground">${Number(c.lifetimeValue ?? 0).toLocaleString()}</span>
                    </td>

                    {/* Last service */}
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {c.lastServiceDate ? format(new Date(c.lastServiceDate), "MMM d, yyyy") : "—"}
                    </td>

                    {/* Source */}
                    <td className="px-4 py-3">
                      {c.source && (
                        <span className="text-xs px-2 py-0.5 rounded bg-muted/50 text-muted-foreground border border-border/50">
                          {c.source}
                        </span>
                      )}
                    </td>

                    <td className="pr-4 py-3">
                      <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Pagination ── */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-border/40 bg-background/50 flex-shrink-0">
            <p className="text-xs text-muted-foreground">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex items-center gap-1.5">
              <Button size="sm" variant="outline" onClick={() => setPage(p => p - 1)} disabled={page === 0} className="h-7 w-7 p-0 border-border/50"><ChevronLeft className="w-3.5 h-3.5" /></Button>
              {Array.from({ length: Math.min(5, pages) }, (_, i) => Math.max(0, page - 2) + i).filter(p => p < pages).map(p => (
                <Button key={p} size="sm" variant={p === page ? "default" : "outline"} onClick={() => setPage(p)}
                  className={cn("h-7 w-7 p-0 text-xs", p === page ? "bg-primary" : "border-border/50")}>{p + 1}</Button>
              ))}
              <Button size="sm" variant="outline" onClick={() => setPage(p => p + 1)} disabled={page >= pages - 1} className="h-7 w-7 p-0 border-border/50"><ChevronRight className="w-3.5 h-3.5" /></Button>
            </div>
          </div>
        )}
      </div>

      <AddCustomerDialog open={showAdd} onClose={() => setShowAdd(false)} onSuccess={refetch} />
    </AdminLayout>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  CUSTOMER DETAIL
// ════════════════════════════════════════════════════════════════════════════
type Tab = "overview" | "jobs" | "vehicles" | "invoices" | "activity" | "account";

export function AdminCRMDetail() {
  const { id }        = useParams<{ id: string }>();
  const [, setLoc]    = useLocation();
  const cid           = Number(id);
  const utils         = trpc.useUtils();

  const [tab, setTab]             = useState<Tab>("overview");
  const [editOpen, setEditOpen]   = useState(false);
  const [addVeh, setAddVeh]       = useState(false);
  const [noteText, setNoteText]   = useState("");
  const [noteType, setNoteType]   = useState<NoteType>("note");
  const [editForm, setEditForm]   = useState<Record<string, string>>({});

  const { data, isLoading, refetch } = trpc.crm.getCustomer.useQuery({ id: cid });

  const updateMut = trpc.crm.updateCustomer.useMutation({
    onSuccess: () => { toast.success("Customer updated"); setEditOpen(false); utils.crm.getCustomer.invalidate({ id: cid }); },
    onError: e => toast.error(e.message),
  });
  const addNoteMut = trpc.crm.addNote.useMutation({
    onSuccess: () => { toast.success("Logged"); setNoteText(""); utils.crm.getCustomer.invalidate({ id: cid }); },
    onError: e => toast.error(e.message),
  });
  const completeMut = trpc.crm.completeNote.useMutation({
    onSuccess: () => utils.crm.getCustomer.invalidate({ id: cid }),
  });

  useEffect(() => {
    if (data?.customer) {
      const c = data.customer;
      setEditForm({
        firstName: c.firstName, lastName: c.lastName,
        phone: c.phone ?? "", email: c.email ?? "",
        address: c.address ?? "", city: c.city ?? "",
        state: c.state ?? "", zip: c.zip ?? "",
        source: c.source ?? "", tags: c.tags ?? "",
        notes: c.notes ?? "", crmStatus: c.crmStatus ?? "new_lead",
      });
    }
  }, [data?.customer]);

  if (isLoading) {
    return <AdminLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div></AdminLayout>;
  }
  if (!data?.customer) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
          <AlertCircle className="w-8 h-8 opacity-30" />
          <p className="text-sm">Customer not found</p>
          <Button variant="outline" size="sm" onClick={() => setLoc("/admin/crm")} className="border-border/50">← Back to CRM</Button>
        </div>
      </AdminLayout>
    );
  }

  const { customer: c, vehicles: vehs, bookings: bks, notes: nts } = data;
  const fullName    = `${c.firstName} ${c.lastName}`;
  const ltv         = Number(c.lifetimeValue ?? 0);
  const completed   = bks.filter(b => b.status === "completed");
  const avgTicket   = completed.length ? ltv / completed.length : 0;

  const TABS: { id: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: "overview",  label: "Overview",  icon: User },
    { id: "jobs",      label: "Jobs",      icon: Wrench,        badge: bks.length || undefined },
    { id: "vehicles",  label: "Vehicles",  icon: Car,           badge: vehs.length || undefined },
    { id: "invoices",  label: "Invoices",  icon: FileText },
    { id: "activity",  label: "Activity",  icon: MessageSquare, badge: nts.length || undefined },
    { id: "account",   label: "Account",   icon: Shield },
  ];

  return (
    <AdminLayout>
      <div className="flex flex-col" style={{ minHeight: "calc(100vh - 56px)" }}>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 px-6 py-2.5 border-b border-border/40 bg-background/50">
          <button onClick={() => setLoc("/admin/crm")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" /> Customers
          </button>
          <span className="text-muted-foreground/40 text-xs">/</span>
          <span className="text-xs font-medium text-foreground">{fullName}</span>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ─────────────────────────────────────────────
              LEFT SIDEBAR
          ───────────────────────────────────────────── */}
          <aside className="w-72 flex-shrink-0 border-r border-border/40 overflow-y-auto flex flex-col">

            {/* Avatar + name */}
            <div className="px-6 pt-6 pb-5 border-b border-border/30 text-center">
              <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white bg-gradient-to-br mx-auto mb-3 ring-[3px] ring-background shadow-xl",
                avatarGradient(c.id)
              )}>
                {initials(fullName)}
              </div>
              <div className="font-display font-bold text-base text-foreground">{fullName}</div>
              {c.crmStatus === "vip" && (
                <div className="flex items-center justify-center gap-1 mt-0.5">
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  <span className="text-xs text-yellow-400 font-semibold">VIP Client</span>
                </div>
              )}
              <div className="mt-2 flex justify-center"><StatusBadge status={c.crmStatus ?? "new_lead"} /></div>
              <p className="text-[11px] text-muted-foreground mt-2">Client since {format(new Date(c.createdAt), "MMM yyyy")}</p>
            </div>

            {/* Quick actions */}
            <div className="px-4 py-4 border-b border-border/30 flex flex-col gap-2">
              <Button className="w-full h-8 text-xs bg-primary hover:bg-primary/90 gap-1.5 font-semibold" onClick={() => setLoc("/booking")}>
                <Plus className="w-3 h-3" /> New Booking
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="h-8 text-xs border-border/50 gap-1" onClick={() => setTab("activity")}>
                  <StickyNote className="w-3 h-3" /> Log Note
                </Button>
                <Button variant="outline" className="h-8 text-xs border-border/50 gap-1">
                  <Send className="w-3 h-3" /> Message
                </Button>
              </div>
            </div>

            {/* Contact */}
            <div className="px-4 py-4 border-b border-border/30 space-y-2.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Contact</p>
              {c.phone ? (
                <div className="flex items-center gap-2.5 group">
                  <div className="w-6 h-6 rounded bg-muted/60 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-3 h-3 text-muted-foreground" />
                  </div>
                  <span className="text-sm text-foreground flex-1">{c.phone}</span>
                  <CopyBtn text={c.phone} />
                </div>
              ) : null}
              {c.email ? (
                <div className="flex items-center gap-2.5 group">
                  <div className="w-6 h-6 rounded bg-muted/60 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-3 h-3 text-muted-foreground" />
                  </div>
                  <span className="text-sm text-foreground flex-1 truncate">{c.email}</span>
                  <CopyBtn text={c.email} />
                </div>
              ) : null}
              {(c.city || c.address) ? (
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded bg-muted/60 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin className="w-3 h-3 text-muted-foreground" />
                  </div>
                  <div className="text-sm text-foreground leading-snug">
                    {c.address && <div>{c.address}</div>}
                    {c.city && <div>{c.city}{c.state ? `, ${c.state}` : ""}{c.zip ? ` ${c.zip}` : ""}</div>}
                  </div>
                </div>
              ) : null}
              {!c.phone && !c.email && !c.city && <p className="text-xs text-muted-foreground/60 italic">No contact info</p>}
            </div>

            {/* Tags */}
            {c.tags && (
              <div className="px-4 py-4 border-b border-border/30">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {c.tags.split(",").filter(Boolean).map(t => (
                    <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary/90 border border-primary/20 font-medium">
                      {t.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Details */}
            <div className="px-4 py-4 border-b border-border/30 space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Details</p>
              {[
                { k: "Lead Source",    v: c.source },
                { k: "Review Status",  v: (c.reviewRequestStatus ?? "not_sent").replace(/_/g, " ") },
                { k: "Last Updated",   v: formatDistanceToNow(new Date(c.updatedAt), { addSuffix: true }) },
              ].map(({ k, v }) => v ? (
                <div key={k} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-medium text-foreground capitalize">{v}</span>
                </div>
              ) : null)}
            </div>

            {/* Notes preview */}
            {c.notes && (
              <div className="px-4 py-4 border-b border-border/30">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Notes</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{c.notes}</p>
              </div>
            )}

            {/* Edit btn */}
            <div className="px-4 py-4 mt-auto">
              <Button variant="outline" className="w-full h-8 text-xs border-border/50 gap-1.5" onClick={() => setEditOpen(true)}>
                <Edit className="w-3 h-3" /> Edit Customer
              </Button>
            </div>
          </aside>

          {/* ─────────────────────────────────────────────
              RIGHT — Stats + Tabs + Content
          ───────────────────────────────────────────── */}
          <main className="flex-1 min-w-0 flex flex-col overflow-hidden">

            {/* Stat strip */}
            <div className="grid grid-cols-4 border-b border-border/40 flex-shrink-0">
              {[
                { label: "Total Spent",  value: `$${ltv.toLocaleString()}`,                              icon: DollarSign,  color: "text-primary",        ring: "bg-primary/10" },
                { label: "Jobs",         value: bks.length,                                               icon: Wrench,      color: "text-emerald-400",    ring: "bg-emerald-500/10" },
                { label: "Avg Ticket",   value: avgTicket > 0 ? `$${Math.round(avgTicket).toLocaleString()}` : "—", icon: TrendingUp, color: "text-amber-400", ring: "bg-amber-500/10" },
                { label: "Vehicles",     value: vehs.length,                                              icon: Car,         color: "text-violet-400",     ring: "bg-violet-500/10" },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-3 px-5 py-4 border-r border-border/30 last:border-r-0">
                  <div className={cn("p-2 rounded-lg flex-shrink-0", s.ring)}>
                    <s.icon className={cn("w-4 h-4", s.color)} />
                  </div>
                  <div>
                    <div className="text-lg font-display font-bold text-foreground leading-none">{s.value}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tab bar */}
            <div className="flex border-b border-border/40 px-5 bg-background/20 flex-shrink-0">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-1 py-3 text-xs font-medium border-b-2 mr-5 transition-colors whitespace-nowrap",
                    tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/50"
                  )}>
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                  {t.badge != null && (
                    <span className={cn("text-[10px] font-semibold px-1.5 rounded-full leading-4",
                      tab === t.id ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
                      {t.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto p-6">

              {/* ── OVERVIEW ── */}
              {tab === "overview" && (
                <div className="space-y-6 max-w-3xl">

                  {/* Recent jobs */}
                  <section>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-display font-semibold">Recent Jobs</h3>
                      <button onClick={() => setTab("jobs")} className="text-xs text-primary hover:underline">View all →</button>
                    </div>
                    {bks.length === 0 ? (
                      <EmptyState icon={Wrench} text="No bookings yet." action={{ label: "Create Booking", onClick: () => setLoc("/booking") }} />
                    ) : (
                      <div className="rounded-xl border border-border/40 overflow-hidden divide-y divide-border/25">
                        {bks.slice(0, 5).map(b => (
                          <div key={b.id} onClick={() => setLoc(`/admin/bookings/${b.id}`)}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors cursor-pointer">
                            <div className="w-2 h-2 rounded-full bg-primary/50 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-foreground truncate">{b.packageName ?? "Custom Service"}</div>
                              <div className="text-xs text-muted-foreground">{b.vehicleYear} {b.vehicleMake} {b.vehicleModel} · {format(new Date(b.appointmentDate), "MMM d, yyyy")}</div>
                            </div>
                            <span className={cn("text-[11px] px-2 py-0.5 rounded-full border font-semibold flex-shrink-0", BOOKING_STATUS_PILL[b.status] ?? "")}>
                              {b.status.replace("_", " ")}
                            </span>
                            <span className="text-sm font-semibold text-foreground flex-shrink-0">${Number(b.totalAmount ?? 0).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Vehicles */}
                  <section>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-display font-semibold">Vehicles</h3>
                      <button onClick={() => setTab("vehicles")} className="text-xs text-primary hover:underline">View all →</button>
                    </div>
                    {vehs.length === 0 ? (
                      <EmptyState icon={Car} text="No vehicles on file." action={{ label: "+ Add Vehicle", onClick: () => setAddVeh(true) }} />
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {vehs.map(v => <VehicleCard key={v.id} v={v} />)}
                      </div>
                    )}
                  </section>

                  {/* Activity preview */}
                  {nts.length > 0 && (
                    <section>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-display font-semibold">Recent Activity</h3>
                        <button onClick={() => setTab("activity")} className="text-xs text-primary hover:underline">View all →</button>
                      </div>
                      <div className="space-y-2">
                        {nts.slice(0, 3).map(n => <NoteRow key={n.id} n={n} onComplete={() => completeMut.mutate({ id: n.id })} />)}
                      </div>
                    </section>
                  )}
                </div>
              )}

              {/* ── JOBS ── */}
              {tab === "jobs" && (
                <div className="max-w-4xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-display font-semibold">Booking History ({bks.length})</h3>
                    <Button size="sm" className="bg-primary hover:bg-primary/90 h-8 text-xs gap-1" onClick={() => setLoc("/booking")}>
                      <Plus className="w-3 h-3" /> New Booking
                    </Button>
                  </div>
                  {bks.length === 0 ? (
                    <EmptyState icon={Wrench} text="No bookings on record." />
                  ) : (
                    <div className="rounded-xl border border-border/40 overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border/40 bg-muted/20">
                            {["Date", "Service", "Vehicle", "Status", "Amount"].map(h => (
                              <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/25">
                          {bks.map(b => (
                            <tr key={b.id} onClick={() => setLoc(`/admin/bookings/${b.id}`)} className="hover:bg-muted/20 transition-colors cursor-pointer">
                              <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{format(new Date(b.appointmentDate), "MMM d, yyyy")}</td>
                              <td className="px-4 py-3 text-sm font-medium text-foreground max-w-[200px] truncate">{b.packageName ?? "Custom"}</td>
                              <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{b.vehicleYear} {b.vehicleMake} {b.vehicleModel}</td>
                              <td className="px-4 py-3">
                                <span className={cn("text-[11px] px-2 py-0.5 rounded-full border font-semibold", BOOKING_STATUS_PILL[b.status] ?? "")}>{b.status.replace("_", " ")}</span>
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-foreground">${Number(b.totalAmount ?? 0).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="border-t border-border/40 bg-muted/10">
                          <tr>
                            <td colSpan={4} className="px-4 py-2 text-xs font-semibold text-muted-foreground text-right">Lifetime Value</td>
                            <td className="px-4 py-2 text-sm font-bold text-primary">${ltv.toLocaleString()}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── VEHICLES ── */}
              {tab === "vehicles" && (
                <div className="max-w-3xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-display font-semibold">Vehicles on File ({vehs.length})</h3>
                    <Button size="sm" variant="outline" className="border-border/50 h-8 text-xs gap-1" onClick={() => setAddVeh(true)}>
                      <Plus className="w-3 h-3" /> Add Vehicle
                    </Button>
                  </div>
                  {vehs.length === 0 ? (
                    <EmptyState icon={Car} text="No vehicles on file yet." action={{ label: "Add First Vehicle", onClick: () => setAddVeh(true) }} />
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {vehs.map(v => <VehicleCard key={v.id} v={v} large />)}
                    </div>
                  )}
                </div>
              )}

              {/* ── INVOICES ── */}
              {tab === "invoices" && (
                <div className="max-w-4xl">
                  <h3 className="text-sm font-display font-semibold mb-4">Invoice History</h3>
                  {bks.length === 0 ? (
                    <EmptyState icon={FileText} text="No invoices on record." />
                  ) : (
                    <div className="rounded-xl border border-border/40 overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border/40 bg-muted/20">
                            {["Booking #", "Service", "Date", "Status", "Amount"].map(h => (
                              <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/25">
                          {bks.map(b => (
                            <tr key={b.id} onClick={() => setLoc(`/admin/bookings/${b.id}`)} className="hover:bg-muted/20 transition-colors cursor-pointer">
                              <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">{b.bookingNumber}</td>
                              <td className="px-4 py-3 text-sm text-foreground max-w-[180px] truncate">{b.packageName ?? "Custom"}</td>
                              <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{format(new Date(b.appointmentDate), "MMM d, yyyy")}</td>
                              <td className="px-4 py-3">
                                <span className={cn("text-[11px] px-2 py-0.5 rounded-full border font-semibold", BOOKING_STATUS_PILL[b.status] ?? "")}>{b.status.replace("_", " ")}</span>
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-foreground">${Number(b.totalAmount ?? 0).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="border-t border-border/40 bg-muted/10">
                          <tr>
                            <td colSpan={4} className="px-4 py-2 text-xs font-semibold text-muted-foreground text-right">Lifetime Value</td>
                            <td className="px-4 py-2 text-sm font-bold text-primary">${ltv.toLocaleString()}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── ACTIVITY ── */}

              {/* ── ACCOUNT ── */}
              {tab === "account" && (
                <AccountControls cid={cid} customer={c} refetch={refetch} />
              )}

              {tab === "activity" && (
                <div className="max-w-2xl space-y-5">

                  {/* Log form */}
                  <div className="rounded-xl border border-border/40 p-4 bg-muted/10">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">Log Activity</p>

                    {/* Type pills */}
                    <div className="flex gap-1.5 mb-3 flex-wrap">
                      {(Object.keys(NOTE_META) as NoteType[]).map(t => {
                        const m = NOTE_META[t];
                        const I = m.icon;
                        return (
                          <button key={t} onClick={() => setNoteType(t)}
                            className={cn(
                              "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all font-medium",
                              noteType === t ? "bg-primary text-primary-foreground border-primary" : "border-border/50 text-muted-foreground hover:border-primary/40"
                            )}>
                            <I className="w-3 h-3" />
                            {m.label}
                          </button>
                        );
                      })}
                    </div>

                    <Textarea
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      placeholder={`Add a ${NOTE_META[noteType].label.toLowerCase()}…`}
                      rows={3}
                      className="resize-none bg-background/50 border-border/50 text-sm mb-3"
                    />
                    <div className="flex justify-end">
                      <Button size="sm" onClick={() => addNoteMut.mutate({ customerId: cid, type: noteType, content: noteText })}
                        disabled={!noteText.trim() || addNoteMut.isPending}
                        className="bg-primary hover:bg-primary/90 h-8 text-xs gap-1.5">
                        {addNoteMut.isPending ? <><Loader2 className="w-3 h-3 animate-spin" />Saving…</> : <><Send className="w-3 h-3" />Log {NOTE_META[noteType].label}</>}
                      </Button>
                    </div>
                  </div>

                  {/* Feed */}
                  {nts.length === 0 ? (
                    <EmptyState icon={MessageSquare} text="No activity logged yet." />
                  ) : (
                    <div className="space-y-2">
                      {nts.map(n => <NoteRow key={n.id} n={n} onComplete={() => completeMut.mutate({ id: n.id })} />)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={v => !v && setEditOpen(false)}>
        <DialogContent className="max-w-lg bg-card border-border/50 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display"><Edit className="w-4 h-4 text-primary" />Edit — {fullName}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-1">
            {[
              { k:"firstName", label:"First Name", span:false },
              { k:"lastName",  label:"Last Name",  span:false },
              { k:"phone",     label:"Phone",      span:false },
              { k:"email",     label:"Email",      span:false },
              { k:"address",   label:"Address",    span:true  },
              { k:"city",      label:"City",       span:false },
              { k:"state",     label:"State",      span:false },
              { k:"zip",       label:"ZIP",        span:false },
              { k:"tags",      label:"Tags (comma-separated)", span:true },
            ].map(f => (
              <div key={f.k} className={cn("space-y-1", f.span ? "col-span-2" : "")}>
                <Label className="text-xs">{f.label}</Label>
                <Input value={editForm[f.k] ?? ""} onChange={e => setEditForm(p => ({ ...p, [f.k]: e.target.value }))} className="h-9 bg-background/50 border-border/50" />
              </div>
            ))}
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={editForm.crmStatus} onValueChange={v => setEditForm(p => ({ ...p, crmStatus: v }))}>
                <SelectTrigger className="h-9 bg-background/50 border-border/50"><SelectValue /></SelectTrigger>
                <SelectContent>{CRM_STATUSES.filter(s => s.value !== "all").map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Lead Source</Label>
              <Select value={editForm.source} onValueChange={v => setEditForm(p => ({ ...p, source: v }))}>
                <SelectTrigger className="h-9 bg-background/50 border-border/50"><SelectValue placeholder="Source" /></SelectTrigger>
                <SelectContent>{LEAD_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Internal Notes</Label>
              <Textarea value={editForm.notes ?? ""} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} rows={3} className="resize-none bg-background/50 border-border/50 text-sm" placeholder="Private notes…" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} className="border-border/50">Cancel</Button>
            <Button onClick={() => updateMut.mutate({ id: cid, ...editForm as any })} disabled={updateMut.isPending} className="bg-primary hover:bg-primary/90">
              {updateMut.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Saving…</> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddVehicleDialog customerId={cid} open={addVeh} onClose={() => setAddVeh(false)} onSuccess={refetch} />
    </AdminLayout>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  ACCOUNT CONTROLS (admin view of a customer account)
// ────────────────────────────────────────────────────────────────────────────
function AccountControls({ cid, customer, refetch }: { cid: number; customer: any; refetch: () => void }) {
  const utils = trpc.useUtils();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput]             = useState("");

  // Find the linked user account (if the customer has one)
  const { data: usersData }  = trpc.users.list.useQuery(undefined);
  const linkedUser = (usersData ?? []).find((u: any) => u.email === customer.email);

  // Mutations
  const setRoleMut = trpc.users.update.useMutation({
    onSuccess: () => { toast.success("Role updated"); utils.users.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const resetMut = trpc.users.sendPasswordReset.useMutation({
    onSuccess: (data) => {
      if (data.emailSent) {
        toast.success("Password reset email sent!");
      } else {
        toast.success("Reset link generated (copy manually)");
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = trpc.users.delete.useMutation({
    onSuccess: () => { toast.success("User account deleted"); setShowDeleteConfirm(false); refetch(); utils.users.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const updateStatusMut = trpc.crm.updateCustomer.useMutation({
    onSuccess: () => { toast.success("Status updated"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const fullName = `${customer.firstName} ${customer.lastName}`;

  return (
    <div className="max-w-2xl space-y-5">

      {/* CRM Status */}
      <div className="rounded-xl border border-border/40 bg-muted/5 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-display font-semibold">CRM Status</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(["new_lead","contacted","quote_sent","booked","active","follow_up","vip","inactive"] as const).map(s => (
            <button
              key={s}
              onClick={() => updateStatusMut.mutate({ id: cid, crmStatus: s })}
              className={cn(
                "py-2 px-3 rounded-lg border text-xs font-medium text-left transition-all capitalize",
                customer.crmStatus === s
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              {s === "vip" ? "⭐ VIP" : s.replace(/_/g, " ")}
              {customer.crmStatus === s && <Check className="w-3 h-3 inline ml-1.5" />}
            </button>
          ))}
        </div>
      </div>

      {/* Linked User Account */}
      <div className="rounded-xl border border-border/40 bg-muted/5 p-5">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-display font-semibold">User Account</h3>
        </div>

        {!customer.email ? (
          <p className="text-sm text-muted-foreground">No email on file — customer cannot have a login account.</p>
        ) : !linkedUser ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/8 border border-amber-500/20">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <p className="text-xs text-amber-300">No login account found for <span className="font-semibold">{customer.email}</span>. The customer has never registered.</p>
            </div>
            <p className="text-xs text-muted-foreground">The customer can create an account at <span className="text-primary">/register</span> using this email address, or you can send them an invitation.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Account overview */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
              <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                {linkedUser.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground">{linkedUser.name ?? "—"}</div>
                <div className="text-xs text-muted-foreground">{linkedUser.email}</div>
              </div>
              <span className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize",
                linkedUser.role === "admin"    ? "bg-amber-500/12 text-amber-400 border-amber-500/25" :
                linkedUser.role === "employee" ? "bg-violet-500/12 text-violet-400 border-violet-500/25" :
                                                 "bg-green-500/12 text-green-400 border-green-500/25"
              )}>
                {linkedUser.role}
              </span>
            </div>

            {/* Role management */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Role</p>
              <div className="flex gap-2">
                {(["user","employee","admin"] as const).map(role => (
                  <button
                    key={role}
                    disabled={linkedUser.role === role || setRoleMut.isPending}
                    onClick={() => setRoleMut.mutate({ userId: linkedUser.id, role: role as any })}
                    className={cn(
                      "flex-1 py-2 rounded-lg border text-xs font-semibold capitalize transition-all",
                      linkedUser.role === role
                        ? "border-primary bg-primary text-white"
                        : "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground disabled:opacity-40"
                    )}
                  >
                    {role === "admin" ? "🛡️ Admin" : role === "employee" ? "🔧 Employee" : "👤 Customer"}
                  </button>
                ))}
              </div>
              {linkedUser.role === "admin" && (
                <p className="text-[11px] text-amber-400 mt-1.5 flex items-center gap-1">
                  <Crown className="w-3 h-3" /> This customer has admin access to the dashboard.
                </p>
              )}
            </div>

            {/* Account actions */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Actions</p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => resetMut.mutate({ userId: linkedUser.id, origin: window.location.origin })}
                  disabled={resetMut.isPending}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-background/50 hover:border-primary/40 transition-colors text-left disabled:opacity-50"
                >
                  {resetMut.isPending ? <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" /> : <KeyRound className="w-4 h-4 text-primary flex-shrink-0" />}
                  <div>
                    <div className="text-sm font-medium text-foreground">Send Password Reset</div>
                    <div className="text-xs text-muted-foreground">Email a one-time reset link to {linkedUser.email}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                </button>

                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-3 p-3 rounded-lg border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-colors text-left"
                >
                  <Trash2 className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-red-400">Delete User Account</div>
                    <div className="text-xs text-muted-foreground">Permanently removes login access. Customer CRM data is kept.</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Last signed in */}
            {linkedUser.lastSignedIn && (
              <p className="text-xs text-muted-foreground">
                Last signed in {formatDistanceToNow(new Date(linkedUser.lastSignedIn), { addSuffix: true })}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Review request */}
      <div className="rounded-xl border border-border/40 bg-muted/5 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-display font-semibold">Review Request</h3>
        </div>
        <div className="flex items-center justify-between text-sm mb-3">
          <span className="text-muted-foreground">Current Status</span>
          <span className="capitalize font-medium text-foreground">{(customer.reviewRequestStatus ?? "not_sent").replace(/_/g, " ")}</span>
        </div>
        <button
          onClick={() => updateStatusMut.mutate({ id: cid, reviewRequestStatus: "sent" } as any)}
          disabled={updateStatusMut.isPending}
          className="w-full py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold hover:bg-amber-500/15 transition-colors"
        >
          Mark Review Request Sent
        </button>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={v => !v && setShowDeleteConfirm(false)}>
        <DialogContent className="max-w-md bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-destructive">
              <Trash2 className="w-4 h-4" /> Delete User Account
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              This will permanently delete the login account for <span className="font-semibold text-foreground">{fullName}</span>. Their CRM profile and booking history will be kept.
            </p>
            <div className="p-3 rounded-lg bg-destructive/8 border border-destructive/20">
              <p className="text-xs text-destructive font-medium">Type <span className="font-mono font-bold">{customer.email}</span> to confirm.</p>
            </div>
            <Input
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
              placeholder={customer.email ?? ""}
              className="bg-background/50 border-border/50 font-mono text-sm"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowDeleteConfirm(false); setDeleteInput(""); }} className="border-border/50">Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteInput !== customer.email || deleteMut.isPending}
              onClick={() => linkedUser && deleteMut.mutate({ userId: linkedUser.id })}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteMut.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Deleting…</> : "Delete Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


// ─── Shared sub-components ────────────────────────────────────────────────────

function EmptyState({ icon: Icon, text, action }: { icon: React.ElementType; text: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="rounded-xl border border-dashed border-border/50 p-10 flex flex-col items-center gap-2 text-muted-foreground">
      <Icon className="w-7 h-7 opacity-25" />
      <p className="text-sm">{text}</p>
      {action && (
        <button onClick={action.onClick} className="text-xs text-primary hover:underline mt-1">{action.label}</button>
      )}
    </div>
  );
}

function VehicleCard({ v, large }: { v: any; large?: boolean }) {
  return (
    <div className="rounded-xl border border-border/40 p-4 hover:border-primary/30 transition-all">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
          <Car className="w-4.5 h-4.5 text-primary" style={{ width: 18, height: 18 }} />
        </div>
        <div className="min-w-0">
          <div className="font-display font-bold text-foreground text-sm truncate">{v.year} {v.make} {v.model}</div>
          <div className="text-xs text-muted-foreground capitalize">{v.color}{v.vehicleType ? ` · ${v.vehicleType}` : ""}</div>
        </div>
      </div>
      {v.licensePlate && (
        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
          <Hash className="w-3 h-3" />{v.licensePlate}
        </div>
      )}
      {large && v.notes && (
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed border-t border-border/30 pt-2">{v.notes}</p>
      )}
    </div>
  );
}

function NoteRow({ n, onComplete }: { n: any; onComplete: () => void }) {
  const meta = NOTE_META[n.type as NoteType] ?? NOTE_META.note;
  const Icon = meta.icon;
  return (
    <div className={cn(
      "flex gap-3 items-start p-3.5 rounded-xl border transition-colors",
      n.isCompleted ? "border-border/20 bg-muted/5 opacity-55" : "border-border/40 bg-muted/10 hover:border-border/60"
    )}>
      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border mt-0.5", meta.color)}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("text-sm leading-relaxed", n.isCompleted ? "line-through text-muted-foreground" : "text-foreground")}>
            {n.content}
          </p>
          {!n.isCompleted && (n.type === "task" || n.type === "reminder") && (
            <button onClick={onComplete}
              className="flex-shrink-0 w-5 h-5 rounded border-2 border-muted-foreground/25 hover:border-green-500 hover:bg-green-500/10 transition-colors flex items-center justify-center mt-0.5 group">
              <Check className="w-3 h-3 text-transparent group-hover:text-green-500 transition-colors" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <span className={cn("text-[10px] font-semibold px-1.5 rounded border capitalize leading-4", meta.color)}>{meta.label}</span>
          <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</span>
          {n.isCompleted && <span className="text-[10px] text-green-500 font-semibold">✓ Done</span>}
        </div>
      </div>
    </div>
  );
}
