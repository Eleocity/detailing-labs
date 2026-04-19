import { useState, useMemo } from "react";
import { MapPin, Clock, Car, ChevronRight, Loader2, Route, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { MapView } from "@/components/Map";

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500/20 text-blue-300",
  confirmed: "bg-emerald-500/20 text-emerald-300",
  assigned: "bg-purple-500/20 text-purple-300",
  en_route: "bg-amber-500/20 text-amber-300",
  in_progress: "bg-orange-500/20 text-orange-300",
  completed: "bg-green-500/20 text-green-300",
};

export default function AdminRoutePlanner() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [mapReady, setMapReady] = useState(false);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);

  const from = useMemo(() => {
    const d = new Date(selectedDate + "T00:00:00");
    return d.toISOString();
  }, [selectedDate]);

  const to = useMemo(() => {
    const d = new Date(selectedDate + "T23:59:59");
    return d.toISOString();
  }, [selectedDate]);

  const { data, isLoading } = trpc.bookings.list.useQuery({
    dateFrom: from,
    dateTo: to,
    limit: 100,
    offset: 0,
  });

  const bookings = useMemo(() =>
    (data?.bookings ?? []).sort((a, b) =>
      new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime()
    ), [data]);

  const handleMapReady = (map: google.maps.Map) => {
    setMapInstance(map);
    setMapReady(true);
  };

  // Plot markers when map is ready and bookings change
  useMemo(() => {
    if (!mapInstance || !mapReady) return;

    // Clear old markers
    markers.forEach((m) => m.setMap(null));

    if (bookings.length === 0) return;

    const geocoder = new google.maps.Geocoder();
    const bounds = new google.maps.LatLngBounds();
    const newMarkers: google.maps.Marker[] = [];

    bookings.forEach((b, idx) => {
      const address = `${b.serviceAddress}, ${b.serviceCity ?? ""}, ${b.serviceState ?? ""}`;
      geocoder.geocode({ address }, (results, status) => {
        if (status === "OK" && results?.[0]) {
          const pos = results[0].geometry.location;
          bounds.extend(pos);

          const marker = new google.maps.Marker({
            position: pos,
            map: mapInstance,
            label: {
              text: String(idx + 1),
              color: "white",
              fontWeight: "bold",
              fontSize: "12px",
            },
            title: `${b.customerFirstName} ${b.customerLastName} - ${b.serviceAddress}`,
          });

          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div style="font-family: sans-serif; padding: 4px;">
                <strong>${b.customerFirstName} ${b.customerLastName}</strong><br/>
                ${b.serviceAddress}<br/>
                ${new Date(b.appointmentDate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}<br/>
                <em>${b.packageName ?? "Custom Service"}</em>
              </div>
            `,
          });

          marker.addListener("click", () => {
            infoWindow.open(mapInstance, marker);
          });

          newMarkers.push(marker);

          if (newMarkers.length === bookings.length) {
            mapInstance.fitBounds(bounds);
            setMarkers(newMarkers);
          }
        }
      });
    });
  }, [mapInstance, mapReady, bookings]);

  const totalDuration = bookings.reduce((sum, b) => sum + (b.duration ?? 120), 0);
  const totalRevenue = bookings.reduce((sum, b) => sum + Number(b.totalAmount ?? 0), 0);

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold">Route Planner</h1>
            <p className="text-muted-foreground text-sm">Visualize and optimize daily appointment routes</p>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-9 px-3 rounded-md border border-border bg-input text-foreground text-sm focus:outline-none"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-xl border border-border bg-card">
            <div className="text-xl font-display font-bold text-primary">{bookings.length}</div>
            <div className="text-xs text-muted-foreground">Appointments</div>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card">
            <div className="text-xl font-display font-bold">{Math.round(totalDuration / 60)}h {totalDuration % 60}m</div>
            <div className="text-xs text-muted-foreground">Total Service Time</div>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card">
            <div className="text-xl font-display font-bold text-primary">${totalRevenue.toFixed(0)}</div>
            <div className="text-xs text-muted-foreground">Total Revenue</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Appointment List */}
          <div className="lg:col-span-2 space-y-3">
            <h2 className="font-display font-semibold">
              {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </h2>

            {isLoading ? (
              <div className="flex items-center justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
            ) : bookings.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-border bg-card">
                <Route className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">No appointments on this day.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {bookings.map((b, idx) => (
                  <a key={b.id} href={`/admin/bookings/${b.id}`}>
                    <div className="flex gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/40 transition-all cursor-pointer">
                      <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground flex-shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-sm">{b.customerFirstName} {b.customerLastName}</div>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${STATUS_COLORS[b.status] ?? ""}`}>
                            {b.status === "pending_review" ? "⏳ Pending Review" : b.status.replace(/_/g, " ")}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Clock className="w-3 h-3" />
                          {new Date(b.appointmentDate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          <span className="mx-1">·</span>
                          {b.duration}min
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">{b.serviceAddress}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Car className="w-3 h-3" />
                          {b.vehicleYear} {b.vehicleMake} {b.vehicleModel}
                          {b.packageName && <span className="ml-1">· {b.packageName}</span>}
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Map */}
          <div className="lg:col-span-3 rounded-xl border border-border overflow-hidden" style={{ minHeight: "500px" }}>
            {import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? (
              <MapView
                onMapReady={handleMapReady}
                className="w-full h-full min-h-[500px]"
              />
            ) : (
              <div className="w-full min-h-[500px] flex flex-col items-center justify-center gap-3 bg-muted/20 text-muted-foreground">
                <MapPin className="w-8 h-8 opacity-30" />
                <p className="text-sm font-medium">Map unavailable</p>
                <p className="text-xs text-center max-w-xs">Add <code className="bg-muted px-1 rounded">VITE_GOOGLE_MAPS_API_KEY</code> to your Railway environment variables to enable the map.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
