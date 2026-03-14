import { useState } from "react";
import { Star, Send, CheckCircle2, Loader2, Mail, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";

export default function AdminReviews() {
  const { data, isLoading } = trpc.bookings.list.useQuery({
    status: "completed",
    limit: 100,
    offset: 0,
  });

  const sendReview = trpc.crm.sendReviewRequest.useMutation({
    onSuccess: () => toast.success("Review request sent!"),
    onError: (err) => toast.error(err.message),
  });

  const completedBookings = data?.bookings ?? [];
  const pendingReview = completedBookings.filter((b) => !b.reviewRequestSent);
  const sentReview = completedBookings.filter((b) => b.reviewRequestSent);

  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-display font-bold">Review Requests</h1>
          <p className="text-muted-foreground text-sm">Automate post-service review requests to build your reputation.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          <div className="p-5 rounded-xl border border-border bg-card">
            <div className="text-2xl font-display font-bold text-primary">{completedBookings.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Completed Jobs</div>
          </div>
          <div className="p-5 rounded-xl border border-border bg-card">
            <div className="text-2xl font-display font-bold text-amber-400">{pendingReview.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Pending Review Request</div>
          </div>
          <div className="p-5 rounded-xl border border-border bg-card">
            <div className="text-2xl font-display font-bold text-emerald-400">{sentReview.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Requests Sent</div>
          </div>
        </div>

        {/* Pending Review Requests */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold">Pending Review Requests ({pendingReview.length})</h2>
            {pendingReview.length > 0 && (
              <Button
                size="sm"
                onClick={() => {
                  pendingReview.forEach((b) => {
                    sendReview.mutate({ bookingId: b.id, customerId: b.customerId ?? undefined });
                  });
                }}
                disabled={sendReview.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
              >
                <Send className="w-3 h-3 mr-1" /> Send All
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : pendingReview.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-border bg-card">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">All completed bookings have review requests sent!</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="divide-y divide-border">
                {pendingReview.map((b) => (
                  <div key={b.id} className="flex items-center gap-4 p-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{b.customerFirstName} {b.customerLastName}</div>
                      <div className="text-xs text-muted-foreground">
                        {b.packageName ?? "Custom"} · {new Date(b.appointmentDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                      <div className="text-xs text-muted-foreground">{b.customerEmail ?? b.customerPhone ?? "No contact info"}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-border text-xs"
                        onClick={() => sendReview.mutate({ bookingId: b.id, customerId: b.customerId ?? undefined, channel: "email" })}
                        disabled={sendReview.isPending || !b.customerEmail}
                      >
                        <Mail className="w-3 h-3 mr-1" /> Email
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-border text-xs"
                        onClick={() => sendReview.mutate({ bookingId: b.id, customerId: b.customerId ?? undefined, channel: "sms" })}
                        disabled={sendReview.isPending || !b.customerPhone}
                      >
                        <MessageSquare className="w-3 h-3 mr-1" /> SMS
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sent Reviews */}
        {sentReview.length > 0 && (
          <div>
            <h2 className="font-display font-semibold mb-4">Requests Sent ({sentReview.length})</h2>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="divide-y divide-border">
                {sentReview.map((b) => (
                  <div key={b.id} className="flex items-center gap-4 p-4">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{b.customerFirstName} {b.customerLastName}</div>
                      <div className="text-xs text-muted-foreground">
                        {b.packageName ?? "Custom"} · {new Date(b.appointmentDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                    </div>
                    <span className="text-xs text-emerald-400 font-medium">Sent</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Review Links Info */}
        <div className="mt-8 p-5 rounded-xl border border-primary/20 bg-primary/5">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Star className="w-4 h-4 text-primary" /> Review Platform Links
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            Configure your review platform links to include in automated messages. Review requests are tracked and can be followed up automatically.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            {["Google Business", "Yelp", "Facebook"].map((platform) => (
              <div key={platform} className="p-3 rounded-lg border border-border bg-card">
                <div className="font-medium mb-1">{platform}</div>
                <div className="text-xs text-muted-foreground">Configure in Settings</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
