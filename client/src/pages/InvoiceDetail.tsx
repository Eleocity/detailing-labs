import { useParams } from "wouter";
import { Loader2, Printer, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-500/15 text-gray-400 border-gray-500/20",
  sent: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  paid: "bg-green-500/15 text-green-400 border-green-500/20",
  overdue: "bg-red-500/15 text-red-400 border-red-500/20",
  cancelled: "bg-gray-500/15 text-gray-400 border-gray-500/20",
};

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const invoiceId = parseInt(id ?? "0");

  const { data: invoiceData, isLoading } = trpc.invoices.getById.useQuery(
    { id: invoiceId },
    { enabled: !!invoiceId }
  );
  const invoice = invoiceData?.invoice;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SiteHeader />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
        <SiteFooter />
      </div>
    );
  }

  if (!isLoading && !invoice) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SiteHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Invoice not found.</p>
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const lineItems: { name: string; qty: number; price: number }[] = invoice!.lineItems
    ? JSON.parse(invoice!.lineItems)
    : [];

  const subtotal = Number(invoice!.subtotal);
  const travelFee = Number(invoice!.travelFee ?? 0);
  const taxAmount = Number(invoice!.taxAmount ?? 0);
  const total = Number(invoice!.totalAmount);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />
      <main className="flex-1 py-16 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Print button */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-display font-bold">Invoice</h1>
              <p className="text-muted-foreground text-sm font-mono">{invoice!.invoiceNumber}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs px-2 py-1 rounded-full border font-medium ${STATUS_COLORS[invoice!.status ?? "draft"] ?? ""}`}>
                {invoice!.status}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="border-border"
              >
                <Printer className="w-4 h-4 mr-2" /> Print
              </Button>
            </div>
          </div>

          {/* Invoice Card */}
          <div className="rounded-2xl border border-border bg-card p-8 print:border-none print:shadow-none">
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
              <div>
                <img
                  src="https://d2xsxph8kpxj0f.cloudfront.net/310519663425808543/7UUm3VYuvjMZWzXs65cJTQ/detailing-labs-logo-clean_f1e7bfe0.png"
                  alt="Detailing Labs"
                  className="h-14 w-auto object-contain"
                />
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <div className="font-medium text-foreground">Invoice #{invoice!.invoiceNumber}</div>
                <div>Date: {new Date(invoice!.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
                {invoice!.dueDate && (
                  <div>Due: {new Date(invoice!.dueDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-border mb-6" />

            {/* Line Items */}
            <div className="mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left pb-3 font-medium text-muted-foreground">Description</th>
                    <th className="text-center pb-3 font-medium text-muted-foreground w-16">Qty</th>
                    <th className="text-right pb-3 font-medium text-muted-foreground w-24">Price</th>
                    <th className="text-right pb-3 font-medium text-muted-foreground w-24">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {lineItems.map((item, i) => (
                    <tr key={i}>
                      <td className="py-3">{item.name}</td>
                      <td className="py-3 text-center text-muted-foreground">{item.qty}</td>
                      <td className="py-3 text-right text-muted-foreground">${Number(item.price).toFixed(2)}</td>
                      <td className="py-3 text-right font-medium">${(item.qty * item.price).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="border-t border-border pt-4">
              <div className="flex flex-col gap-2 max-w-xs ml-auto text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {travelFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Travel Fee</span>
                    <span>${travelFee.toFixed(2)}</span>
                  </div>
                )}
                {taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span>${taxAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-border font-bold text-base">
                  <span>Total</span>
                  <span className="text-primary">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Payment Status */}
            {invoice!.status === "paid" && (
              <div className="mt-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                <div>
                  <div className="font-medium text-green-400">Payment Received</div>
                  {invoice!.paidAt && (
                    <div className="text-xs text-muted-foreground">
                      Paid on {new Date(invoice!.paidAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {invoice!.status !== "paid" && invoice!.status !== "cancelled" && (
              <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
                <Clock className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <div>
                  <div className="font-medium text-amber-400">Payment Pending</div>
                  <div className="text-xs text-muted-foreground">Please contact us to arrange payment.</div>
                </div>
              </div>
            )}

            {/* Notes */}
            {invoice!.notes && (
              <div className="mt-6 pt-4 border-t border-border">
                <div className="text-xs text-muted-foreground font-medium mb-1">Notes</div>
                <p className="text-sm text-muted-foreground">{invoice!.notes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-border text-center text-xs text-muted-foreground">
              Thank you for choosing Detailing Labs — Premium Mobile Auto Detailing
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
