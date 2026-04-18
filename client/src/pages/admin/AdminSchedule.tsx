import { useState, useMemo } from "react";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight, Clock, MapPin, Car, Plus, Calendar, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useMobile";

type ViewMode = "agenda" | "week" | "month";

const STATUS_COLORS: Record<string, string> = {
  pending_review: "bg-yellow-500/20 border-yellow-500/40 text-yellow-300",
  new:            "bg-blue-500/20 border-blue-500/40 text-blue-300",
  confirmed:      "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
  assigned:       "bg-purple-500/20 border-purple-500/40 text-purple-300",
  en_route:       "bg-amber-500/20 border-amber-500/40 text-amber-300",
  in_progress:    "bg-orange-500/20 border-orange-500/40 text-orange-300",
  completed:      "bg-green-500/20 border-green-500/40 text-green-300",
  cancelled:      "bg-red-500/20 border-red-500/40 text-red-300",
  declined:       "bg-red-900/20 border-red-900/40 text-red-400",
};

function getWeekRange(date: Date) {
  const from = new Date(date);
  from.setDate(date.getDate() - date.getDay());
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(from.getDate() + 6);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

function getMonthRange(date: Date) {
  return {
    from: new Date(date.getFullYear(), date.getMonth(), 1),
    to:   new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999),
  };
}

function getAgendaRange(date: Date) {
  const from = new Date(date);
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(from.getDate() + 30);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

export default function AdminSchedule() {
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<ViewMode>("agenda");
  const [currentDate, setCurrentDate] = useState(new Date());

  const range = useMemo(() => {
    if (viewMode === "week")   return getWeekRange(currentDate);
    if (viewMode === "month")  return getMonthRange(currentDate);
    return getAgendaRange(currentDate);
  }, [viewMode, currentDate]);

  const { data } = trpc.bookings.list.useQuery({
    dateFrom: range.from.toISOString(),
    dateTo:   range.to.toISOString(),
    limit: 200, offset: 0,
  });

  const bookings = data?.bookings ?? [];

  const navigate = (dir: 1 | -1) => {
    const d = new Date(currentDate);
    if (viewMode === "agenda") d.setDate(d.getDate() + dir * 7);
    else if (viewMode === "week")  d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  };

  const title = useMemo(() => {
    if (viewMode === "month") return currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (viewMode === "week") {
      const { from, to } = getWeekRange(currentDate);
      return `${from.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${to.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    const { from, to } = getAgendaRange(currentDate);
    return `${from.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${to.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  }, [viewMode, currentDate]);

  const bookingsByDate = useMemo(() => {
    const map: Record<string, typeof bookings> = {};
    bookings.forEach((b) => {
      const key = new Date(b.appointmentDate).toISOString().split("T")[0];
      if (!map[key]) map[key] = [];
      map[key].push(b);
    });
    return map;
  }, [bookings]);

  const weekDays = useMemo(() => {
    if (viewMode !== "week") return [];
    const days: Date[] = [];
    const start = new Date(getWeekRange(currentDate).from);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  }, [viewMode, currentDate]);

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

  // Agenda: group next 30 days that have bookings
  const agendaDays = useMemo(() => {
    if (viewMode !== "agenda") return [];
    const { from, to } = getAgendaRange(currentDate);
    const days: Date[] = [];
    const cur = new Date(from);
    while (cur <= to) {
      const key = cur.toISOString().split("T")[0];
      if (bookingsByDate[key]?.length) days.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  }, [viewMode, currentDate, bookingsByDate]);

  const BookingPill = ({ booking }: { booking: (typeof bookings)[0] }) => (
    <Link href={`/admin/bookings/${booking.id}`}>
      <div className={cn("p-1.5 rounded border text-[11px] cursor-pointer hover:opacity-80 transition-opacity mb-1 leading-tight", STATUS_COLORS[booking.status] ?? "bg-muted border-border")}>
        <div className="font-semibold truncate">{booking.customerFirstName} {booking.customerLastName}</div>
        <div className="opacity-70 truncate">{new Date(booking.appointmentDate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</div>
      </div>
    </Link>
  );

  return (
    <AdminLayout>
      <div className="p-3 sm:p-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-display font-bold min-w-0 truncate max-w-[180px] sm:max-w-none">{title}</span>
            <button onClick={() => navigate(1)} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={() => setCurrentDate(new Date())} className="h-8 px-3 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors">Today</button>
          </div>

          <div className="flex items-center gap-2">
            {/* View toggles */}
            <div className="flex rounded-lg border border-border overflow-hidden">
              {(["agenda", "week", "month"] as ViewMode[]).map((m) => (
                <button key={m} onClick={() => setViewMode(m)}
                  className={cn("px-3 h-8 text-xs font-medium capitalize transition-colors border-r border-border last:border-r-0",
                    viewMode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
                  {m === "agenda" ? <List className="w-3.5 h-3.5" /> : m}
                </button>
              ))}
            </div>
            <Link href="/booking">
              <button className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1">
                <Plus className="w-3 h-3" /> New
              </button>
            </Link>
          </div>
        </div>

        {/* ── AGENDA VIEW (default on mobile) ── */}
        {viewMode === "agenda" && (
          <div>
            {bookings.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-12 text-center">
                <Calendar className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No appointments in the next 30 days.</p>
                <Link href="/booking">
                  <button className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">Book Now</button>
                </Link>
              </div>
            ) : agendaDays.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground text-sm">
                No appointments scheduled.
              </div>
            ) : (
              <div className="space-y-4">
                {agendaDays.map((day) => {
                  const key = day.toISOString().split("T")[0];
                  const dayBookings = (bookingsByDate[key] ?? []).sort((a, b) =>
                    new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime()
                  );
                  const isToday = day.toDateString() === new Date().toDateString();
                  return (
                    <div key={key}>
                      {/* Date header */}
                      <div className={cn("flex items-center gap-3 mb-2")}>
                        <div className={cn("w-9 h-9 rounded-xl flex flex-col items-center justify-center flex-shrink-0 text-center",
                          isToday ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>
                          <span className="text-[10px] font-medium leading-none opacity-70">{day.toLocaleDateString("en-US", { weekday: "short" })}</span>
                          <span className="text-sm font-bold leading-none mt-0.5">{day.getDate()}</span>
                        </div>
                        <div>
                          <span className={cn("text-sm font-semibold", isToday && "text-primary")}>
                            {isToday ? "Today" : day.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                          </span>
                          <span className="text-xs text-muted-foreground ml-2">{dayBookings.length} appointment{dayBookings.length !== 1 ? "s" : ""}</span>
                        </div>
                      </div>

                      {/* Booking cards */}
                      <div className="space-y-2 ml-12">
                        {dayBookings.map((b) => (
                          <Link key={b.id} href={`/admin/bookings/${b.id}`}>
                            <div className={cn("p-3.5 rounded-xl border cursor-pointer hover:opacity-80 transition-opacity", STATUS_COLORS[b.status] ?? "bg-muted border-border")}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-sm leading-none mb-1">{b.customerFirstName} {b.customerLastName}</div>
                                  <div className="text-xs opacity-75 flex items-center gap-1">
                                    <Car className="w-3 h-3 flex-shrink-0" />
                                    {b.vehicleYear} {b.vehicleMake} {b.vehicleModel}
                                  </div>
                                  {b.serviceAddress && (
                                    <div className="text-xs opacity-75 flex items-center gap-1 mt-0.5">
                                      <MapPin className="w-3 h-3 flex-shrink-0" />
                                      <span className="truncate">{b.serviceAddress}</span>
                                    </div>
                                  )}
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <div className="text-sm font-bold flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(b.appointmentDate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                                  </div>
                                  {b.packageName && <div className="text-[11px] opacity-70 mt-0.5 max-w-[100px] truncate text-right">{b.packageName}</div>}
                                  {b.totalAmount && <div className="text-xs font-semibold mt-0.5">${Number(b.totalAmount).toFixed(0)}</div>}
                                </div>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── WEEK VIEW ── */}
        {viewMode === "week" && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="grid grid-cols-7 border-b border-border">
              {weekDays.map((day) => {
                const isToday = day.toDateString() === new Date().toDateString();
                return (
                  <div key={day.toISOString()} className={cn("p-2 text-center border-r border-border last:border-r-0", isToday && "bg-primary/10")}>
                    <div className="text-[10px] text-muted-foreground">{day.toLocaleDateString("en-US", { weekday: "short" })}</div>
                    <div className={cn("text-base font-display font-bold mt-0.5", isToday && "text-primary")}>{day.getDate()}</div>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-7 min-h-48">
              {weekDays.map((day) => {
                const key = day.toISOString().split("T")[0];
                const dayBookings = (bookingsByDate[key] ?? []).sort((a, b) =>
                  new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime()
                );
                const isToday = day.toDateString() === new Date().toDateString();
                return (
                  <div key={key} className={cn("p-1 border-r border-border last:border-r-0 min-h-32", isToday && "bg-primary/5")}>
                    {dayBookings.map((b) => <BookingPill key={b.id} booking={b} />)}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── MONTH VIEW ── */}
        {viewMode === "month" && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="grid grid-cols-7 border-b border-border">
              {["S","M","T","W","T","F","S"].map((d, i) => (
                <div key={i} className="p-2 text-center text-[10px] font-semibold text-muted-foreground border-r border-border last:border-r-0">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {monthGrid.map((day, i) => {
                if (!day) return <div key={`e-${i}`} className="border-r border-b border-border last:border-r-0 min-h-14 sm:min-h-20 bg-muted/5" />;
                const key = day.toISOString().split("T")[0];
                const dayBookings = bookingsByDate[key] ?? [];
                const isToday = day.toDateString() === new Date().toDateString();
                return (
                  <div key={key} className={cn("p-1 border-r border-b border-border last:border-r-0 min-h-14 sm:min-h-20", isToday && "bg-primary/5")}>
                    <div className={cn("text-[11px] font-semibold mb-1 w-5 h-5 flex items-center justify-center rounded-full",
                      isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
                      {day.getDate()}
                    </div>
                    {/* On mobile show dots, on sm+ show pills */}
                    <div className="hidden sm:block">
                      {dayBookings.slice(0, 2).map((b) => <BookingPill key={b.id} booking={b} />)}
                      {dayBookings.length > 2 && <div className="text-[10px] text-muted-foreground">+{dayBookings.length - 2}</div>}
                    </div>
                    <div className="sm:hidden flex flex-wrap gap-0.5 mt-0.5">
                      {dayBookings.slice(0, 3).map((b) => (
                        <div key={b.id} className={cn("w-1.5 h-1.5 rounded-full", STATUS_COLORS[b.status]?.includes("blue") ? "bg-blue-400" : STATUS_COLORS[b.status]?.includes("emerald") ? "bg-emerald-400" : STATUS_COLORS[b.status]?.includes("green") ? "bg-green-400" : "bg-primary")} />
                      ))}
                    </div>
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
