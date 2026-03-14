import { useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  Search, Plus, ChevronRight, ChevronLeft, Phone, Mail, MapPin,
  Car, Calendar, FileText, MessageSquare, CheckCircle2, Loader2,
  Tag, Star, Edit, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";

const CRM_STATUSES = [
  { value: "all", label: "All" },
  { value: "new_lead", label: "New Lead" },
  { value: "contacted", label: "Contacted" },
  { value: "quote_sent", label: "Quote Sent" },
  { value: "booked", label: "Booked" },
  { value: "active", label: "Active" },
  { value: "follow_up", label: "Follow Up" },
  { value: "vip", label: "VIP" },
  { value: "inactive", label: "Inactive" },
];

const STATUS_COLORS: Record<string, string> = {
  new_lead: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  contacted: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  quote_sent: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  booked: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  active: "bg-green-500/15 text-green-400 border-green-500/20",
  follow_up: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  vip: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  inactive: "bg-gray-500/15 text-gray-400 border-gray-500/20",
};

const NOTE_TYPE_ICONS: Record<string, any> = {
  note: FileText,
  call: Phone,
  email: Mail,
  sms: MessageSquare,
  task: CheckCircle2,
  reminder: Calendar,
};

// ── Customer List ─────────────────────────────────────────────────────────────
export function AdminCRMList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const PAGE_SIZE = 25;

  const { data, isLoading, refetch } = trpc.crm.listCustomers.useQuery({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const customers = data?.customers ?? [];
  const total = data?.total ?? 0;

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold">Customer CRM</h1>
            <p className="text-muted-foreground text-sm">{total} customers</p>
          </div>
          <Button onClick={() => setShowAddModal(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
            <Plus className="w-4 h-4 mr-2" /> Add Customer
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pl-9 bg-input border-border"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CRM_STATUSES.map((s) => (
              <button
                key={s.value}
                onClick={() => { setStatusFilter(s.value); setPage(0); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  statusFilter === s.value ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : customers.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No customers found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-4 font-medium text-muted-foreground">Customer</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Contact</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Location</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Lifetime Value</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Last Service</th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-4">
                        <div className="font-medium">{c.firstName} {c.lastName}</div>
                        {c.tags && <div className="text-xs text-muted-foreground mt-0.5">{c.tags}</div>}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        <div>{c.phone ?? "—"}</div>
                        <div className="text-xs">{c.email ?? "—"}</div>
                      </td>
                      <td className="p-4 text-muted-foreground text-xs">
                        {c.city ? `${c.city}, ${c.state ?? ""}` : "—"}
                      </td>
                      <td className="p-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[c.crmStatus ?? ""] ?? ""}`}>
                          {(c.crmStatus ?? "").replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-4 font-medium">${Number(c.lifetimeValue ?? 0).toFixed(0)}</td>
                      <td className="p-4 text-muted-foreground text-xs">
                        {c.lastServiceDate ? new Date(c.lastServiceDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                      </td>
                      <td className="p-4">
                        <a href={`/admin/crm/${c.id}`}>
                          <Button variant="ghost" size="sm" className="text-xs">
                            View <ChevronRight className="w-3 h-3 ml-1" />
                          </Button>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page === 0} className="border-border">Previous</Button>
              <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={(page + 1) * PAGE_SIZE >= total} className="border-border">Next</Button>
            </div>
          </div>
        )}

        <AddCustomerModal open={showAddModal} onClose={() => setShowAddModal(false)} onSuccess={() => { setShowAddModal(false); refetch(); }} />
      </div>
    </AdminLayout>
  );
}

// ── Customer Detail ───────────────────────────────────────────────────────────
export function AdminCRMDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const customerId = parseInt(id ?? "0");
  const [noteType, setNoteType] = useState<"note" | "call" | "email" | "sms" | "task" | "reminder">("note");
  const [noteContent, setNoteContent] = useState("");
  const [editStatus, setEditStatus] = useState<string | null>(null);

  const { data, refetch } = trpc.crm.getCustomer.useQuery({ id: customerId }, { enabled: !!customerId });

  const addNote = trpc.crm.addNote.useMutation({
    onSuccess: () => { toast.success("Note added"); setNoteContent(""); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const updateCustomer = trpc.crm.updateCustomer.useMutation({
    onSuccess: () => { toast.success("Status updated"); setEditStatus(null); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  if (!data) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      </AdminLayout>
    );
  }

  const { customer, vehicles, bookings, notes, photos } = data;

  return (
    <AdminLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/crm")} className="text-muted-foreground">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-display font-bold">{customer.firstName} {customer.lastName}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[customer.crmStatus ?? ""] ?? ""}`}>
                {(customer.crmStatus ?? "").replace("_", " ")}
              </span>
            </div>
            <p className="text-muted-foreground text-sm">Customer since {new Date(customer.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={editStatus ?? customer.crmStatus ?? ""}
              onChange={(e) => {
                setEditStatus(e.target.value);
                updateCustomer.mutate({ id: customerId, crmStatus: e.target.value as any });
              }}
              className="h-9 px-3 rounded-md border border-border bg-input text-foreground text-sm focus:outline-none"
            >
              {CRM_STATUSES.filter((s) => s.value !== "all").map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Activity & Notes */}
          <div className="lg:col-span-2 space-y-5">
            {/* Add Note */}
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-4">Add Activity</h3>
              <div className="flex gap-2 mb-3 flex-wrap">
                {(["note", "call", "email", "sms", "task"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setNoteType(t)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all capitalize ${
                      noteType === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <Textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder={`Add a ${noteType}...`}
                className="bg-input border-border resize-none mb-3"
                rows={3}
              />
              <Button
                size="sm"
                onClick={() => addNote.mutate({ customerId, type: noteType, content: noteContent })}
                disabled={!noteContent.trim() || addNote.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {addNote.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save Activity"}
              </Button>
            </div>

            {/* Activity Log */}
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-4">Activity Log ({notes.length})</h3>
              {notes.length === 0 ? (
                <p className="text-muted-foreground text-sm">No activity recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {notes.map((note) => {
                    const Icon = NOTE_TYPE_ICONS[note.type ?? "note"] ?? FileText;
                    return (
                      <div key={note.id} className="flex gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Icon className="w-3 h-3 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-medium capitalize">{note.type}</span>
                            <span className="text-xs text-muted-foreground">{new Date(note.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{note.content}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Booking History */}
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-4">Booking History ({bookings.length})</h3>
              {bookings.length === 0 ? (
                <p className="text-muted-foreground text-sm">No bookings yet.</p>
              ) : (
                <div className="space-y-2">
                  {bookings.map((b) => (
                    <a key={b.id} href={`/admin/bookings/${b.id}`}>
                      <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors cursor-pointer">
                        <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{b.packageName ?? "Custom Service"}</div>
                          <div className="text-xs text-muted-foreground">{new Date(b.appointmentDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">${Number(b.totalAmount ?? 0).toFixed(0)}</div>
                          <div className="text-xs text-muted-foreground capitalize">{b.status.replace("_", " ")}</div>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Customer Info */}
          <div className="space-y-5">
            {/* Contact Info */}
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-4">Contact Info</h3>
              <div className="space-y-3 text-sm">
                {customer.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>{customer.phone}</span>
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                )}
                {customer.city && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>{customer.city}{customer.state ? `, ${customer.state}` : ""}</span>
                  </div>
                )}
                {customer.source && (
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-muted-foreground">Source: {customer.source}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-4">Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Lifetime Value</span>
                  <span className="font-semibold text-primary">${Number(customer.lifetimeValue ?? 0).toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Bookings</span>
                  <span className="font-semibold">{bookings.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Vehicles</span>
                  <span className="font-semibold">{vehicles.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Photos</span>
                  <span className="font-semibold">{photos.length}</span>
                </div>
              </div>
            </div>

            {/* Vehicles */}
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-4">Vehicles ({vehicles.length})</h3>
              {vehicles.length === 0 ? (
                <p className="text-muted-foreground text-sm">No vehicles on file.</p>
              ) : (
                <div className="space-y-2">
                  {vehicles.map((v) => (
                    <div key={v.id} className="flex items-center gap-2 text-sm">
                      <Car className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>{v.year} {v.make} {v.model}</span>
                      {v.color && <span className="text-muted-foreground">· {v.color}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            {customer.notes && (
              <div className="p-5 rounded-xl border border-border bg-card">
                <h3 className="font-semibold mb-2">Notes</h3>
                <p className="text-sm text-muted-foreground">{customer.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

// ── Add Customer Modal ────────────────────────────────────────────────────────
function AddCustomerModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", city: "", state: "", notes: "" });
  const createCustomer = trpc.crm.createCustomer.useMutation({
    onSuccess: () => { toast.success("Customer added!"); onSuccess(); },
    onError: (err) => toast.error(err.message),
  });

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Customer</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>First Name *</Label>
            <Input value={form.firstName} onChange={(e) => update("firstName", e.target.value)} className="bg-input border-border" />
          </div>
          <div className="space-y-2">
            <Label>Last Name *</Label>
            <Input value={form.lastName} onChange={(e) => update("lastName", e.target.value)} className="bg-input border-border" />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} className="bg-input border-border" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={form.email} onChange={(e) => update("email", e.target.value)} className="bg-input border-border" />
          </div>
          <div className="space-y-2">
            <Label>City</Label>
            <Input value={form.city} onChange={(e) => update("city", e.target.value)} className="bg-input border-border" />
          </div>
          <div className="space-y-2">
            <Label>State</Label>
            <Input value={form.state} onChange={(e) => update("state", e.target.value)} className="bg-input border-border" maxLength={2} />
          </div>
          <div className="space-y-2 col-span-2">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} className="bg-input border-border resize-none" rows={2} />
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-2">
          <Button variant="outline" onClick={onClose} className="border-border">Cancel</Button>
          <Button
            onClick={() => createCustomer.mutate({ firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone, city: form.city, state: form.state, notes: form.notes })}
            disabled={!form.firstName || !form.lastName || createCustomer.isPending}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {createCustomer.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Customer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
