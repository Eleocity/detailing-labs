import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  ChevronLeft, ChevronRight, Calendar, Clock, MapPin, Car, Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";

type ViewMode = "day" | "week" | "month";

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500/20 border-blue-500/40 text-blue-300",
  confirmed: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
  assigned: "bg-purple-500/20 border-purple-500/40 text-purple-300",
  en_route: "bg-amber-500/20 border-amber-500/40 text-amber-300",
  in_progress: "bg-orange-500/20 border-orange-500/40 text-orange-300",
  completed: "bg-green-500/20 border-green-500/40 text-green-300",
  cancelled: "bg-red-500/20 border-red-500/40 text-red-300",
};

function getDayRange(date: Date): { from: Date; to: Date } {
  const from = new Date(date);
  from.setHours(0, 0, 0, 0);
  const to = new Date(date);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

function getWeekRange(date: Date): { from: Date; to: Date } {
  const from = new Date(date);
  from.setDate(date.getDate() - date.getDay());
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(from.getDate() + 6);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

function getMonthRange(date: Date): { from: Date; to: Date } {
  const from = new Date(date.getFullYear(), date.getMonth(), 1);
  const to = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { from, to };
}

export default function AdminSchedule() {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());

  const range = useMemo(() => {
    if (viewMode === "day") return getDayRange(currentDate);
    if (viewMode === "week") return getWeekRange(currentDate);
    return getMonthRange(currentDate);
  }, [viewMode, currentDate]);

  const { data } = trpc.bookings.list.useQuery({
    dateFrom: range.from.toISOString(),
    dateTo: range.to.toISOString(),
    limit: 200,
    offset: 0,
  });

  const bookings = data?.bookings ?? [];

  const navigate = (dir: 1 | -1) => {
    const d = new Date(currentDate);
    if (viewMode === "day") d.setDate(d.getDate() + dir);
    else if (viewMode === "week") d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  };

  const getTitle = () => {
    if (viewMode === "day") {
      return currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    }
    if (viewMode === "week") {
      const { from, to } = range;
      return `${from.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${to.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  // Group bookings by date
  const bookingsByDate = useMemo(() => {
    const map: Record<string, typeof bookings> = {};
    bookings.forEach((b) => {
      const key = new Date(b.appointmentDate).toISOString().split("T")[0];
      if (!map[key]) map[key] = [];
      map[key].push(b);
    });
    return map;
  }, [bookings]);

  // Week days
  const weekDays = useMemo(() => {
    if (viewMode !== "week") return [];
    const days = [];
    const start = new Date(range.from);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  }, [viewMode, range]);

  // Month grid
  const monthGrid = useMemo(() => {
    if (viewMode !== "month") return [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const grid: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) grid.push(null);
    for (let d = 1; d <= daysInMonth; d++) grid.push(new Date(year, month, d));
    return grid;
  }, [viewMode, currentDate]);

  const BookingCard = ({ booking }: { booking: (typeof bookings)[0] }) => (
    <Link href={`/admin/bookings/${booking.id}`}>
      <div className={`p-2 rounded-lg border text-xs cursor-pointer hover:opacity-80 transition-opacity mb-1 ${STATUS_COLORS[booking.status] ?? "bg-muted border-border"}`}>
        <div className="font-medium truncate">{booking.customerFirstName} {booking.customerLastName}</div>
        <div className="opacity-70 truncate flex items-center gap-1 mt-0.5">
          <Clock className="w-2.5 h-2.5" />
          {new Date(booking.appointmentDate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          {booking.packageName && <span className="ml-1">· {booking.packageName}</span>}
        </div>
      </div>
    </Link>
  );

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 w-8 p-0">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-lg font-display font-bold min-w-48 text-center">{getTitle()}</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate(1)} className="h-8 w-8 p-0">
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} className="border-border text-xs">
              Today
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {(["day", "week", "month"] as ViewMode[]).map((mode) => (
              <Button
                key={mode}
                variant={viewMode === mode ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode(mode)}
                className={viewMode === mode ? "bg-primary text-primary-foreground" : "border-border capitalize"}
              >
                {mode}
              </Button>
            ))}
            <Link href="/booking">
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground ml-2">
                <Plus className="w-3 h-3 mr-1" /> New
              </Button>
            </Link>
          </div>
        </div>

        {/* Day View */}
        {viewMode === "day" && (
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold mb-4">{bookings.length} appointment{bookings.length !== 1 ? "s" : ""}</h3>
            {bookings.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No appointments scheduled for this day.</p>
            ) : (
              <div className="space-y-3">
                {bookings
                  .sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime())
                  .map((b) => (
                    <Link key={b.id} href={`/admin/bookings/${b.id}`}>
                      <div className={`p-4 rounded-xl border cursor-pointer hover:opacity-80 transition-opacity ${STATUS_COLORS[b.status] ?? "bg-muted border-border"}`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-semibold">{b.customerFirstName} {b.customerLastName}</div>
                            <div className="text-xs opacity-70 mt-0.5">{b.vehicleYear} {b.vehicleMake} {b.vehicleModel}</div>
                          </div>
                          <div className="text-right text-xs">
                            <div className="font-medium">{new Date(b.appointmentDate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</div>
                            <div className="opacity-70">{b.duration}min</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs opacity-70">
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{b.serviceAddress}</span>
                          <span className="flex items-center gap-1"><Car className="w-3 h-3" />{b.packageName ?? "Custom"}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Week View */}
        {viewMode === "week" && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="grid grid-cols-7 border-b border-border">
              {weekDays.map((day) => {
                const isToday = day.toDateString() === new Date().toDateString();
                return (
                  <div key={day.toISOString()} className={`p-3 text-center border-r border-border last:border-r-0 ${isToday ? "bg-primary/10" : ""}`}>
                    <div className="text-xs text-muted-foreground">{day.toLocaleDateString("en-US", { weekday: "short" })}</div>
                    <div className={`text-lg font-display font-bold mt-0.5 ${isToday ? "text-primary" : ""}`}>{day.getDate()}</div>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-7 min-h-48">
              {weekDays.map((day) => {
                const key = day.toISOString().split("T")[0];
                const dayBookings = bookingsByDate[key] ?? [];
                const isToday = day.toDateString() === new Date().toDateString();
                return (
                  <div key={key} className={`p-2 border-r border-border last:border-r-0 min-h-32 ${isToday ? "bg-primary/5" : ""}`}>
                    {dayBookings
                      .sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime())
                      .map((b) => <BookingCard key={b.id} booking={b} />)}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Month View */}
        {viewMode === "month" && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="grid grid-cols-7 border-b border-border">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="p-3 text-center text-xs font-medium text-muted-foreground border-r border-border last:border-r-0">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {monthGrid.map((day, i) => {
                if (!day) return <div key={`empty-${i}`} className="p-2 border-r border-b border-border last:border-r-0 min-h-24 bg-muted/10" />;
                const key = day.toISOString().split("T")[0];
                const dayBookings = bookingsByDate[key] ?? [];
                const isToday = day.toDateString() === new Date().toDateString();
                return (
                  <div key={key} className={`p-2 border-r border-b border-border last:border-r-0 min-h-24 ${isToday ? "bg-primary/5" : ""}`}>
                    <div className={`text-xs font-medium mb-1 ${isToday ? "text-primary" : "text-muted-foreground"}`}>{day.getDate()}</div>
                    {dayBookings.slice(0, 2).map((b) => <BookingCard key={b.id} booking={b} />)}
                    {dayBookings.length > 2 && (
                      <div className="text-xs text-muted-foreground">+{dayBookings.length - 2} more</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
