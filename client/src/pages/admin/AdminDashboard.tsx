import { useMemo } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Calendar, DollarSign, Users, TrendingUp, Clock, CheckCircle2,
  AlertCircle, ChevronRight, Car, Star, Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";

function StatCard({ label, value, icon: Icon, trend, alert = false }: {
  label: string; value: string | number; icon: any; trend?: string; alert?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-xl border bg-card ${alert && Number(value) > 0 ? "border-yellow-500/40 bg-yellow-500/5" : "border-border"}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${alert && Number(value) > 0 ? "bg-yellow-500/15" : "bg-primary/10"}`}>
          <Icon className={`w-4 h-4 ${alert && Number(value) > 0 ? "text-yellow-400" : "text-primary"}`} />
        </div>
        {trend && <span className="text-xs text-emerald-500 font-medium">{trend}</span>}
        {alert && Number(value) > 0 && (
          <span className="text-xs font-bold text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full">Action needed</span>
        )}
      </div>
      <div className={`text-2xl font-display font-bold mb-0.5 ${alert && Number(value) > 0 ? "text-yellow-400" : ""}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </motion.div>
  );
}

export default function AdminDashboard() {
  const { data: bookingsData } = trpc.bookings.list.useQuery({ limit: 100, offset: 0 });
  const { data: customersData } = trpc.crm.listCustomers.useQuery({ limit: 100, offset: 0 });

  const stats = useMemo(() => {
    const bookings = bookingsData?.bookings ?? [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const todayBookings = bookings.filter((b) => {
      const d = new Date(b.appointmentDate);
      return d >= today && d <= todayEnd;
    });

    const thisMonth = bookings.filter((b) => {
      const d = new Date(b.appointmentDate);
      return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    });

    const revenue = thisMonth
      .filter((b) => b.status === "completed")
      .reduce((sum, b) => sum + Number(b.totalAmount ?? 0), 0);

    const pendingReview = bookings.filter((b) => b.status === "pending_review").length;
    const pending = bookings.filter((b) => b.status === "pending_review" || b.status === "new" || b.status === "confirmed").length;
    const completed = bookings.filter((b) => b.status === "completed").length;

    return {
      todayCount: todayBookings.length,
      monthlyRevenue: revenue,
      totalCustomers: customersData?.total ?? 0,
      pendingReview,
      pendingBookings: pending,
      completedBookings: completed,
    };
  }, [bookingsData, customersData]);

  const recentBookings = (bookingsData?.bookings ?? []).slice(0, 8);

  const statusColors: Record<string, string> = {
    pending_review: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    new:            "bg-blue-500/15 text-blue-400 border-blue-500/20",
    confirmed:      "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    assigned:       "bg-purple-500/15 text-purple-400 border-purple-500/20",
    en_route:       "bg-amber-500/15 text-amber-400 border-amber-500/20",
    in_progress:    "bg-orange-500/15 text-orange-400 border-orange-500/20",
    completed:      "bg-green-500/15 text-green-400 border-green-500/20",
    cancelled:      "bg-red-500/15 text-red-400 border-red-500/20",
    declined:       "bg-red-900/20 text-red-400 border-red-900/30",
    no_show:        "bg-gray-500/15 text-gray-400 border-gray-500/20",
  };

  return (
    <AdminLayout>
      <div className="p-3 sm:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold">Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <Link href="/booking">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
              <Plus className="w-4 h-4 mr-2" />
              New Booking
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard label="Today's Appointments" value={stats.todayCount} icon={Calendar} />
          <StatCard label="Monthly Revenue" value={`$${stats.monthlyRevenue.toFixed(0)}`} icon={DollarSign} trend="+12%" />
          <StatCard label="Total Customers" value={stats.totalCustomers} icon={Users} />
          <StatCard label="Needs Review" value={stats.pendingReview} icon={Clock} alert={stats.pendingReview > 0} />
        </div>

        {/* Recent Bookings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between p-5 border-b border-border">
                <h2 className="font-display font-semibold">Recent Bookings</h2>
                <Link href="/admin/bookings">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-xs">
                    View all <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
              <div className="divide-y divide-border">
                {recentBookings.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">No bookings yet</div>
                ) : (
                  recentBookings.map((booking) => (
                    <Link key={booking.id} href={`/admin/bookings/${booking.id}`}>
                      <div className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors cursor-pointer">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Car className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {booking.customerFirstName} {booking.customerLastName}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {booking.vehicleYear} {booking.vehicleMake} {booking.vehicleModel} · {booking.packageName ?? "Custom"}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xs text-muted-foreground mb-1">
                            {new Date(booking.appointmentDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColors[booking.status] ?? ""}`}>
                            {booking.status === "pending_review" ? "⏳ Pending Review" : booking.status.replace(/_/g, " ")}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="font-display font-semibold mb-4">Quick Actions</h2>
              <div className="space-y-2">
                {[
                  { label: "View Schedule", href: "/admin/schedule", icon: Calendar },
                  { label: "Manage Bookings", href: "/admin/bookings", icon: CheckCircle2 },
                  { label: "Customer CRM", href: "/admin/crm", icon: Users },
                  { label: "Route Planner", href: "/admin/route-planner", icon: Car },
                  { label: "Invoices", href: "/admin/invoices", icon: DollarSign },
                  { label: "Review Requests", href: "/admin/reviews", icon: Star },
                ].map((action) => (
                  <Link key={action.href} href={action.href}>
                    <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group">
                      <action.icon className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-sm font-medium group-hover:text-primary transition-colors">{action.label}</span>
                      <ChevronRight className="w-3 h-3 text-muted-foreground ml-auto" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Status Summary */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="font-display font-semibold mb-4">Booking Status</h2>
              <div className="space-y-2">
                {[
                  { label: "Completed", value: stats.completedBookings, color: "bg-emerald-500" },
                  { label: "Pending", value: stats.pendingBookings, color: "bg-amber-500" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${item.color}`} />
                    <span className="text-sm text-muted-foreground flex-1">{item.label}</span>
                    <span className="text-sm font-semibold">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
