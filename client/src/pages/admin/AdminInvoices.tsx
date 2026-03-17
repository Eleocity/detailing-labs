import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { ChevronLeft, Loader2, CheckCircle2, Clock, AlertCircle, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-500/15 text-gray-400 border-gray-500/20",
  sent: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  paid: "bg-green-500/15 text-green-400 border-green-500/20",
  overdue: "bg-red-500/15 text-red-400 border-red-500/20",
  cancelled: "bg-gray-500/15 text-gray-400 border-gray-500/20",
};

export function AdminInvoicesList() {
  const { data: invoices, isLoading, refetch } = trpc.invoices.list.useQuery({ limit: 50, offset: 0 });
  const updateStatus = trpc.invoices.updateStatus.useMutation({
    onSuccess: () => { toast.success("Invoice updated"); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  return (
    <AdminLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold">Invoices</h1>
            <p className="text-muted-foreground text-sm">{invoices?.length ?? 0} invoices</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : !invoices || invoices.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No invoices yet. Invoices are created automatically when bookings are completed.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-4 font-medium text-muted-foreground">Invoice #</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Customer</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Date</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Total</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoices.map((inv) => {
                    const lineItems = inv.lineItems ? JSON.parse(inv.lineItems) : [];
                    return (
                      <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-4 font-mono text-xs text-muted-foreground">{inv.invoiceNumber}</td>
                        <td className="p-4">
                          <div className="font-medium">
                            {inv.customerFirstName && inv.customerLastName
                              ? `${inv.customerFirstName} ${inv.customerLastName}`
                              : `Customer #${inv.customerId ?? "—"}`}
                          </div>
                          <div className="text-xs text-muted-foreground">{inv.packageName ?? inv.serviceName ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">Booking #{inv.bookingId}</div>
                        </td>
                        <td className="p-4 text-muted-foreground text-xs">
                          {new Date(inv.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td className="p-4 font-semibold">${Number(inv.totalAmount).toFixed(2)}</td>
                        <td className="p-4">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[inv.status ?? "draft"] ?? ""}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-1">
                            {inv.status !== "paid" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs text-emerald-400 hover:text-emerald-300"
                                onClick={() => updateStatus.mutate({ id: inv.id, status: "paid" })}
                              >
                                Mark Paid
                              </Button>
                            )}
                            {inv.status === "draft" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs"
                                onClick={() => updateStatus.mutate({ id: inv.id, status: "sent" })}
                              >
                                Send
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
