import { useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import {
  Search, Filter, ChevronLeft, Car, Calendar, MapPin, Phone,
  Mail, User, CheckCircle2, Clock, AlertCircle, Edit, Trash2,
  UserCheck, DollarSign, Camera, Star, ChevronRight, Plus, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "new", label: "New" },
  { value: "confirmed", label: "Confirmed" },
  { value: "assigned", label: "Assigned" },
  { value: "en_route", label: "En Route" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  confirmed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  assigned: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  en_route: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  in_progress: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  completed: "bg-green-500/15 text-green-400 border-green-500/20",
  cancelled: "bg-red-500/15 text-red-400 border-red-500/20",
  no_show: "bg-gray-500/15 text-gray-400 border-gray-500/20",
};

// ── Booking List ─────────────────────────────────────────────────────────────
export function AdminBookingsList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const { data, isLoading, refetch } = trpc.bookings.list.useQuery({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const bookings = data?.bookings ?? [];
  const total = data?.total ?? 0;

  return (
    <AdminLayout>
      <div className="p-3 sm:p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold">Bookings</h1>
            <p className="text-muted-foreground text-sm">{total} total bookings</p>
          </div>
          <Link href="/booking">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
              <Plus className="w-4 h-4 mr-2" /> New Booking
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search bookings..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pl-9 bg-input border-border"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            className="h-10 px-3 rounded-md border border-border bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : bookings.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No bookings found.</div>
          ) : (
            <div className="overflow-x-auto min-w-0"><div className="min-w-[600px]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-4 font-medium text-muted-foreground">Booking #</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Customer</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Vehicle</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Service</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Date</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Total</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-4 font-medium text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-4 font-mono text-xs text-muted-foreground">{b.bookingNumber}</td>
                      <td className="p-4">
                        <div className="font-medium">{b.customerFirstName} {b.customerLastName}</div>
                        <div className="text-xs text-muted-foreground">{b.customerPhone}</div>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {b.vehicleYear} {b.vehicleMake} {b.vehicleModel}
                      </td>
                      <td className="p-4 text-muted-foreground">{b.packageName ?? "—"}</td>
                      <td className="p-4 text-muted-foreground">
                        {new Date(b.appointmentDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="p-4 font-medium">${Number(b.totalAmount ?? 0).toFixed(2)}</td>
                      <td className="p-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[b.status] ?? ""}`}>
                          {b.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-4">
                        <Link href={`/admin/bookings/${b.id}`}>
                          <Button variant="ghost" size="sm" className="text-xs">
                            View <ChevronRight className="w-3 h-3 ml-1" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page === 0} className="border-border">
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={(page + 1) * PAGE_SIZE >= total} className="border-border">
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

// ── Booking Detail ────────────────────────────────────────────────────────────
export function AdminBookingDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const bookingId = parseInt(id ?? "0");
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");

  const { data: bookingData, refetch } = trpc.bookings.getById.useQuery(
    { id: bookingId },
    { enabled: !!bookingId }
  );
  const booking = bookingData?.booking;

  const updateStatus = trpc.bookings.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      setShowStatusModal(false);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const sendReview = trpc.crm.sendReviewRequest.useMutation({
    onSuccess: () => { toast.success("Review request sent!"); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  if (!booking) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-3 sm:p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/bookings")} className="text-muted-foreground">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-display font-bold">{booking.bookingNumber}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[booking.status] ?? ""}`}>
                {booking.status.replace("_", " ")}
              </span>
            </div>
            <p className="text-muted-foreground text-sm">
              {booking.customerFirstName} {booking.customerLastName} · {new Date(booking.appointmentDate).toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setNewStatus(booking.status); setShowStatusModal(true); }}
              className="border-border"
            >
              <Edit className="w-3 h-3 mr-1" /> Update Status
            </Button>
            {booking.status === "completed" && !booking.reviewRequestSent && (
              <Button
                size="sm"
                onClick={() => sendReview.mutate({ bookingId: booking.id, customerId: booking.customerId ?? undefined })}
                disabled={sendReview.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Star className="w-3 h-3 mr-1" /> Request Review
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-5">
            {/* Customer */}
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-4 flex items-center gap-2"><User className="w-4 h-4 text-primary" /> Customer</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Name</span><div className="font-medium mt-0.5">{booking.customerFirstName} {booking.customerLastName}</div></div>
                <div><span className="text-muted-foreground">Phone</span><div className="font-medium mt-0.5">{booking.customerPhone ?? "—"}</div></div>
                <div><span className="text-muted-foreground">Email</span><div className="font-medium mt-0.5">{booking.customerEmail ?? "—"}</div></div>
                <div><span className="text-muted-foreground">Source</span><div className="font-medium mt-0.5">{booking.howHeard ?? "—"}</div></div>
              </div>
            </div>

            {/* Vehicle */}
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-4 flex items-center gap-2"><Car className="w-4 h-4 text-primary" /> Vehicle</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Make / Model</span><div className="font-medium mt-0.5">{booking.vehicleYear} {booking.vehicleMake} {booking.vehicleModel}</div></div>
                <div><span className="text-muted-foreground">Color</span><div className="font-medium mt-0.5">{booking.vehicleColor ?? "—"}</div></div>
                <div><span className="text-muted-foreground">Type</span><div className="font-medium mt-0.5 capitalize">{booking.vehicleType ?? "—"}</div></div>
                <div><span className="text-muted-foreground">Plate</span><div className="font-medium mt-0.5">{booking.vehicleLicensePlate ?? "—"}</div></div>
              </div>
            </div>

            {/* Location */}
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-4 flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Service Location</h3>
              <div className="text-sm">
                <div className="font-medium">{booking.serviceAddress}</div>
                <div className="text-muted-foreground">{booking.serviceCity}{booking.serviceState ? `, ${booking.serviceState}` : ""} {booking.serviceZip}</div>
                {booking.gateInstructions && (
                  <div className="mt-2 p-3 rounded-lg bg-muted/30 text-muted-foreground text-xs">
                    <span className="font-medium text-foreground">Access:</span> {booking.gateInstructions}
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {booking.notes && (
              <div className="p-5 rounded-xl border border-border bg-card">
                <h3 className="font-semibold mb-3">Customer Notes</h3>
                <p className="text-sm text-muted-foreground">{booking.notes}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Service & Pricing */}
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-4">Service & Pricing</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{booking.packageName ?? "Custom"}</span>
                  <span>${Number(booking.subtotal ?? 0).toFixed(2)}</span>
                </div>
                {Number(booking.travelFee ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Travel Fee</span>
                    <span>${Number(booking.travelFee).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>${Number(booking.taxAmount ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border font-semibold">
                  <span>Total</span>
                  <span className="text-primary">${Number(booking.totalAmount ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment</span>
                  <span className={`capitalize ${booking.paymentStatus === "paid" ? "text-emerald-400" : "text-amber-400"}`}>
                    {booking.paymentStatus?.replace("_", " ")}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-3">Actions</h3>
              <div className="space-y-1.5">
                <Link href={`/admin/media?bookingId=${booking.id}`}>
                  <Button variant="ghost" size="sm" className="w-full justify-start text-xs">
                    <Camera className="w-3 h-3 mr-2" /> View Photos
                  </Button>
                </Link>
                <Link href={`/admin/invoices`}>
                  <Button variant="ghost" size="sm" className="w-full justify-start text-xs">
                    <DollarSign className="w-3 h-3 mr-2" /> View Invoice
                  </Button>
                </Link>
                {booking.customerId && (
                  <Link href={`/admin/crm/${booking.customerId}`}>
                    <Button variant="ghost" size="sm" className="w-full justify-start text-xs">
                      <UserCheck className="w-3 h-3 mr-2" /> Customer Profile
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Status Update Modal */}
        <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Update Booking Status</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>New Status</Label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-border bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {STATUS_OPTIONS.filter((s) => s.value !== "all").map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="Add a note about this status change..."
                  className="bg-input border-border resize-none"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setShowStatusModal(false)} className="border-border">Cancel</Button>
                <Button
                  onClick={() => updateStatus.mutate({ id: bookingId, status: newStatus as any, notes: statusNote })}
                  disabled={updateStatus.isPending}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {updateStatus.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Status"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
