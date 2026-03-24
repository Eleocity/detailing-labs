import { useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import {
  ChevronLeft, Loader2, CheckCircle2, Clock, AlertCircle,
  DollarSign, Send, Trash2, Plus, FileText, Phone, Mail,
  MapPin, Calendar, Edit3, Save, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";

const STATUS_COLORS: Record<string, string> = {
  draft:     "bg-gray-500/15 text-gray-400 border-gray-500/20",
  sent:      "bg-blue-500/15 text-blue-400 border-blue-500/20",
  paid:      "bg-green-500/15 text-green-400 border-green-500/20",
  overdue:   "bg-red-500/15 text-red-400 border-red-500/20",
  cancelled: "bg-gray-500/15 text-gray-400 border-gray-500/20",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  draft:     <FileText className="w-3 h-3" />,
  sent:      <Send className="w-3 h-3" />,
  paid:      <CheckCircle2 className="w-3 h-3" />,
  overdue:   <AlertCircle className="w-3 h-3" />,
  cancelled: <X className="w-3 h-3" />,
};

// ── Invoice List ─────────────────────────────────────────────────────────────
export function AdminInvoicesList() {
  const { data: invoices, isLoading, refetch } = trpc.invoices.list.useQuery({ limit: 50, offset: 0 });
  const updateStatus = trpc.invoices.updateStatus.useMutation({
    onSuccess: () => { toast.success("Invoice updated"); refetch(); },
    onError: (err) => toast.error(err.message),
  });
  const sendInvoice = trpc.invoices.send.useMutation({
    onSuccess: (d) => { toast.success(`Invoice sent to ${d.sentTo}`); refetch(); },
    onError: (err) => toast.error(err.message),
  });
  const createLink = trpc.payments.createPaymentLink.useMutation({
    onSuccess: (d) => { toast.success("Payment link created"); window.open(d.paymentUrl, "_blank"); refetch(); },
    onError: (err) => toast.error(err.message),
  });
  const markPaidReceipt = trpc.invoices.markPaidAndReceipt.useMutation({
    onSuccess: () => { toast.success("Marked paid + receipt sent"); refetch(); },
    onError: (err) => toast.error(err.message),
  });
  const deleteInv = trpc.invoices.delete.useMutation({
    onSuccess: () => { toast.success("Invoice deleted"); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const totals = {
    draft:   invoices?.filter(i => i.status === "draft").reduce((s, i)   => s + Number(i.totalAmount), 0) ?? 0,
    sent:    invoices?.filter(i => i.status === "sent").reduce((s, i)    => s + Number(i.totalAmount), 0) ?? 0,
    paid:    invoices?.filter(i => i.status === "paid").reduce((s, i)    => s + Number(i.totalAmount), 0) ?? 0,
    overdue: invoices?.filter(i => i.status === "overdue").reduce((s, i) => s + Number(i.totalAmount), 0) ?? 0,
  };

  return (
    <AdminLayout>
      <div className="p-3 sm:p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold">Invoices</h1>
            <p className="text-muted-foreground text-sm">{invoices?.length ?? 0} total</p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Paid",    value: totals.paid,    color: "text-emerald-400", icon: <CheckCircle2 className="w-4 h-4" /> },
            { label: "Sent",    value: totals.sent,    color: "text-blue-400",    icon: <Send className="w-4 h-4" /> },
            { label: "Draft",   value: totals.draft,   color: "text-gray-400",    icon: <FileText className="w-4 h-4" /> },
            { label: "Overdue", value: totals.overdue, color: "text-red-400",     icon: <AlertCircle className="w-4 h-4" /> },
          ].map(s => (
            <div key={s.label} className="p-4 rounded-xl border border-border bg-card">
              <div className={`flex items-center gap-2 ${s.color} mb-1`}>
                {s.icon}
                <span className="text-xs font-semibold">{s.label}</span>
              </div>
              <div className="text-xl font-display font-bold">${s.value.toFixed(2)}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : !invoices || invoices.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium mb-1">No invoices yet</p>
              <p className="text-muted-foreground/60 text-sm">Invoices are auto-created when you mark a booking as Completed.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-4 font-medium text-muted-foreground">Invoice</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Customer</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Date</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">Total</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-4">
                        <Link href={`/admin/invoices/${inv.id}`}>
                          <span className="font-mono text-xs text-primary hover:underline cursor-pointer">{inv.invoiceNumber}</span>
                        </Link>
                        <div className="text-xs text-muted-foreground mt-0.5">Booking #{inv.bookingId}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-sm">
                          {inv.customerFirstName && inv.customerLastName
                            ? `${inv.customerFirstName} ${inv.customerLastName}`
                            : `Customer #${inv.customerId ?? "—"}`}
                        </div>
                        <div className="text-xs text-muted-foreground">{inv.packageName ?? inv.serviceName ?? "—"}</div>
                      </td>
                      <td className="p-4 text-muted-foreground text-xs">
                        {new Date(inv.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="p-4 text-right font-semibold">${Number(inv.totalAmount).toFixed(2)}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[inv.status ?? "draft"]}`}>
                          {STATUS_ICONS[inv.status ?? "draft"]}
                          {inv.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Link href={`/admin/invoices/${inv.id}`}>
                            <Button size="sm" variant="ghost" className="text-xs h-7 px-2">View</Button>
                          </Link>
                          {inv.status !== "paid" && (
                            <Button size="sm" variant="ghost" className="text-xs h-7 px-2 text-emerald-400 hover:text-emerald-300"
                              onClick={() => { if (confirm("Mark paid and send receipt to customer?")) updateStatus.mutate({ id: inv.id, status: "paid" }); }}>
                              Mark Paid
                            </Button>
                          )}
                          {(inv.status === "draft" || inv.status === "sent") && (
                            <Button size="sm" variant="ghost" className="text-xs h-7 px-2 text-blue-400 hover:text-blue-300"
                              onClick={() => sendInvoice.mutate({ id: inv.id })}>
                              {inv.status === "sent" ? "Resend" : "Send"}
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="text-xs h-7 px-2 text-red-400 hover:text-red-300"
                            onClick={() => { if (confirm("Delete this invoice?")) deleteInv.mutate({ id: inv.id }); }}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

// ── Invoice Detail ────────────────────────────────────────────────────────────
export function AdminInvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [editing, setEditing] = useState(false);
  const [travelFee, setTravelFee] = useState("");
  const [taxRate, setTaxRate] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");

  const { data, isLoading, refetch } = trpc.invoices.getById.useQuery({ id: Number(id) });

  // Populate edit form when data loads
  const [initialized, setInitialized] = useState(false);
  if (data && !initialized) {
    setTravelFee(Number(data.invoice.travelFee ?? 0).toFixed(2));
    setTaxRate((Number(data.invoice.taxRate ?? 0) * 100).toFixed(2));
    setNotes(data.invoice.notes ?? "");
    setDueDate(data.invoice.dueDate ? new Date(data.invoice.dueDate).toISOString().split("T")[0] : "");
    setInitialized(true);
  }

  const updateStatus = trpc.invoices.updateStatus.useMutation({
    onSuccess: () => { toast.success("Status updated"); refetch(); },
    onError: (err) => toast.error(err.message),
  });
  const sendInvoice = trpc.invoices.send.useMutation({
    onSuccess: (d) => { toast.success(`Invoice sent to ${d.sentTo}`); refetch(); },
    onError: (err) => toast.error(err.message),
  });
  const createLink = trpc.payments.createPaymentLink.useMutation({
    onSuccess: (d) => { toast.success("Payment link created"); window.open(d.paymentUrl, "_blank"); refetch(); },
    onError: (err) => toast.error(err.message),
  });
  const markPaidReceipt = trpc.invoices.markPaidAndReceipt.useMutation({
    onSuccess: () => { toast.success("Marked paid + receipt sent"); refetch(); },
    onError: (err) => toast.error(err.message),
  });
  const update = trpc.invoices.update.useMutation({
    onSuccess: () => { toast.success("Invoice saved"); setEditing(false); refetch(); },
    onError: (err) => toast.error(err.message),
  });
  const deleteInv = trpc.invoices.delete.useMutation({
    onSuccess: () => { toast.success("Invoice deleted"); navigate("/admin/invoices"); },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return (
    <AdminLayout>
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    </AdminLayout>
  );

  if (!data) return (
    <AdminLayout>
      <div className="p-6 text-center text-muted-foreground">Invoice not found.</div>
    </AdminLayout>
  );

  const { invoice, booking } = data;
  const lineItems: { name: string; qty: number; price: number }[] = invoice.lineItems ? JSON.parse(invoice.lineItems) : [];
  const subtotal    = Number(invoice.subtotal);
  const travel      = Number(invoice.travelFee ?? 0);
  const tax         = Number(invoice.taxAmount ?? 0);
  const total       = Number(invoice.totalAmount);

  const handleSave = () => {
    update.mutate({
      id: invoice.id,
      travelFee: parseFloat(travelFee) || 0,
      taxRate:   (parseFloat(taxRate) || 0) / 100,
      notes:     notes || undefined,
      dueDate:   dueDate || undefined,
    });
  };

  return (
    <AdminLayout>
      <div className="p-3 sm:p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/admin/invoices">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <ChevronLeft className="w-4 h-4" /> Invoices
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-display font-bold font-mono">{invoice.invoiceNumber}</h1>
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[invoice.status ?? "draft"]}`}>
                  {STATUS_ICONS[invoice.status ?? "draft"]}
                  {invoice.status}
                </span>
              </div>
              <p className="text-muted-foreground text-xs mt-0.5">
                Created {new Date(invoice.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                {invoice.paidAt && ` · Paid ${new Date(invoice.paidAt).toLocaleDateString()}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {invoice.status !== "paid" && (
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5"
                onClick={() => markPaidReceipt.mutate({ id: invoice.id })}
                disabled={markPaidReceipt.isPending}>
                <CheckCircle2 className="w-3.5 h-3.5" /> Mark Paid + Send Receipt
              </Button>
            )}
            {(invoice.status === "draft" || invoice.status === "sent") && (
              <Button size="sm" variant="outline" className="gap-1.5 text-blue-400 border-blue-500/30"
                onClick={() => sendInvoice.mutate({ id: invoice.id })}
                disabled={sendInvoice.isPending}>
                <Send className="w-3.5 h-3.5" /> {invoice.status === "sent" ? "Resend Invoice" : "Send Invoice"}
              </Button>
            )}
            <Button size="sm" variant="outline" className="gap-1.5 text-violet-400 border-violet-500/30"
              onClick={() => createLink.mutate({ invoiceId: invoice.id })}
              disabled={createLink.isPending}>
              <DollarSign className="w-3.5 h-3.5" /> Square Checkout
            </Button>
            {invoice.status === "paid" && (
              <Button size="sm" variant="outline" className="gap-1.5"
                onClick={() => updateStatus.mutate({ id: invoice.id, status: "draft" })}>
                Reopen
              </Button>
            )}
            <Button size="sm" variant="ghost" className="gap-1.5 text-red-400 hover:text-red-300"
              onClick={() => { if (confirm("Delete this invoice?")) deleteInv.mutate({ id: invoice.id }); }}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* Left — invoice details */}
          <div className="lg:col-span-2 space-y-5">

            {/* Customer & booking info */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold text-sm mb-4 text-muted-foreground uppercase tracking-wide">Customer</h3>
              <div className="space-y-2.5">
                <div className="font-semibold text-base">
                  {booking?.customerFirstName} {booking?.customerLastName}
                </div>
                {booking?.customerPhone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                    <a href={`tel:${booking.customerPhone}`} className="hover:text-foreground">{booking.customerPhone}</a>
                  </div>
                )}
                {booking?.customerEmail && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                    <a href={`mailto:${booking.customerEmail}`} className="hover:text-foreground">{booking.customerEmail}</a>
                  </div>
                )}
                {booking?.serviceAddress && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>{booking.serviceAddress}{booking.serviceCity ? `, ${booking.serviceCity}` : ""}{booking.serviceState ? `, ${booking.serviceState}` : ""}</span>
                  </div>
                )}
                {booking?.appointmentDate && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{new Date(booking.appointmentDate).toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric" })}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Line items */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="p-5 border-b border-border">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Line Items</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left p-4 font-medium text-muted-foreground">Description</th>
                    <th className="text-center p-4 font-medium text-muted-foreground w-16">Qty</th>
                    <th className="text-right p-4 font-medium text-muted-foreground w-24">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lineItems.map((item, i) => (
                    <tr key={i}>
                      <td className="p-4 font-medium">{item.name}</td>
                      <td className="p-4 text-center text-muted-foreground">{item.qty}</td>
                      <td className="p-4 text-right font-semibold">${Number(item.price).toFixed(2)}</td>
                    </tr>
                  ))}
                  {lineItems.length === 0 && (
                    <tr><td colSpan={3} className="p-4 text-center text-muted-foreground text-xs">No line items</td></tr>
                  )}
                </tbody>
              </table>

              {/* Totals */}
              <div className="p-5 border-t border-border space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {travel > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Travel Fee</span>
                    <span>${travel.toFixed(2)}</span>
                  </div>
                )}
                {tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax ({(Number(invoice.taxRate ?? 0) * 100).toFixed(1)}%)</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base pt-2 border-t border-border">
                  <span>Total</span>
                  <span className="text-primary">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && !editing && (
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">Notes</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{invoice.notes}</p>
              </div>
            )}
          </div>

          {/* Right — edit panel */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm">Invoice Details</h3>
                {!editing ? (
                  <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs" onClick={() => setEditing(true)}>
                    <Edit3 className="w-3 h-3" /> Edit
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs" onClick={() => setEditing(false)}>
                    <X className="w-3 h-3" /> Cancel
                  </Button>
                )}
              </div>

              {editing ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Travel Fee ($)</Label>
                    <Input value={travelFee} onChange={e => setTravelFee(e.target.value)} className="h-9 bg-background/50" type="number" min="0" step="0.01" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tax Rate (%)</Label>
                    <Input value={taxRate} onChange={e => setTaxRate(e.target.value)} className="h-9 bg-background/50" type="number" min="0" max="100" step="0.1" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Due Date</Label>
                    <Input value={dueDate} onChange={e => setDueDate(e.target.value)} className="h-9 bg-background/50" type="date" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Notes</Label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)}
                      className="w-full h-20 rounded-md border border-border bg-background/50 p-2 text-xs resize-none outline-none focus:border-primary"
                      placeholder="Internal notes..." />
                  </div>
                  <Button className="w-full gap-1.5" size="sm" onClick={handleSave} disabled={update.isPending}>
                    {update.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save Changes
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Travel Fee</span>
                    <span>${Number(invoice.travelFee ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax Rate</span>
                    <span>{(Number(invoice.taxRate ?? 0) * 100).toFixed(1)}%</span>
                  </div>
                  {invoice.dueDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Due Date</span>
                      <span>{new Date(invoice.dueDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold pt-2 border-t border-border">
                    <span>Total</span>
                    <span className="text-primary">${total.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Change status */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold text-sm mb-3">Change Status</h3>
              <div className="space-y-2">
                <Button size="sm" className="w-full gap-1.5 bg-blue-600 hover:bg-blue-500 text-white mb-2"
              onClick={() => sendInvoice.mutate({ id: invoice.id })}
              disabled={sendInvoice.isPending}>
              <Send className="w-3.5 h-3.5" />
              {invoice.status === "sent" ? "Resend to Customer" : "Send to Customer"}
            </Button>
            <Button size="sm" variant="outline" className="w-full gap-1.5 text-violet-400 border-violet-500/30 mb-3"
              onClick={() => createLink.mutate({ invoiceId: invoice.id })}
              disabled={createLink.isPending}>
              <DollarSign className="w-3.5 h-3.5" /> Create Square Payment Link
            </Button>
            {invoice.status !== "paid" && (
              <Button size="sm" className="w-full gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white mb-3"
                onClick={() => markPaidReceipt.mutate({ id: invoice.id })}
                disabled={markPaidReceipt.isPending}>
                <CheckCircle2 className="w-3.5 h-3.5" /> Mark Paid + Receipt
              </Button>
            )}
            {(["draft", "sent", "paid", "overdue", "cancelled"] as const).map(s => (
                  <button key={s}
                    onClick={() => updateStatus.mutate({ id: invoice.id, status: s })}
                    disabled={invoice.status === s}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
                      invoice.status === s
                        ? `${STATUS_COLORS[s]} opacity-100`
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Link to booking */}
            {booking && (
              <Link href={`/admin/bookings/${booking.id}`}>
                <Button variant="outline" className="w-full gap-1.5 text-xs border-border">
                  View Booking #{booking.id}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
