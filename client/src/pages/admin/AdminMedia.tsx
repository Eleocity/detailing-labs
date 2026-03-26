import { useState, useRef, useEffect } from "react";
import { Camera, Upload, Loader2, Trash2, X, ZoomIn, Search, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";

const LABEL_COLORS: Record<string, string> = {
  before:    "bg-red-500/15 text-red-400 border-red-500/20",
  after:     "bg-green-500/15 text-green-400 border-green-500/20",
  progress:  "bg-blue-500/15 text-blue-400 border-blue-500/20",
  damage:    "bg-orange-500/15 text-orange-400 border-orange-500/20",
  completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  other:     "bg-gray-500/15 text-gray-400 border-gray-500/20",
};

type LinkMode = "booking" | "customer" | "none";

function SearchDropdown<T extends { id: number; label: string; sub?: string }>({
  placeholder, options, value, onChange, loading, onSearch,
}: {
  placeholder: string; options: T[]; value: T | null;
  onChange: (v: T | null) => void; loading?: boolean; onSearch: (q: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => { setOpen((o) => !o); if (!open) onSearch(""); }}
        className="flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-input text-foreground text-sm cursor-pointer hover:border-primary/50 transition-colors min-w-56"
      >
        {value ? (
          <>
            <span className="flex-1 truncate text-foreground text-sm">{value.label}</span>
            <button onClick={(e) => { e.stopPropagation(); onChange(null); setQuery(""); onSearch(""); }} className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <>
            <span className="flex-1 text-muted-foreground truncate">{placeholder}</span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          </>
        )}
      </div>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <input autoFocus value={query}
              onChange={(e) => { setQuery(e.target.value); onSearch(e.target.value); }}
              placeholder="Search..."
              className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground" />
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          </div>
          <div className="max-h-52 overflow-y-auto">
            {options.length === 0 ? (
              <div className="px-4 py-3 text-xs text-muted-foreground">{loading ? "Searching…" : "No results"}</div>
            ) : options.map((opt) => (
              <button key={opt.id} onClick={() => { onChange(opt); setQuery(""); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-primary/5 transition-colors text-left">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{opt.label}</p>
                  {opt.sub && <p className="text-xs text-muted-foreground truncate">{opt.sub}</p>}
                </div>
                {value?.id === opt.id && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminMedia() {
  const [linkMode, setLinkMode] = useState<LinkMode>("booking");
  const [selectedBooking, setSelectedBooking] = useState<{ id: number; label: string; sub?: string } | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: number; label: string; sub?: string } | null>(null);
  const [bookingSearch, setBookingSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadLabel, setUploadLabel] = useState<"before"|"after"|"progress"|"damage"|"completed"|"other">("progress");
  const [uploadCaption, setUploadCaption] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: bookingResults, isFetching: bookingsFetching } = trpc.bookings.list.useQuery({ search: bookingSearch, limit: 20 });
  const { data: customerResults, isFetching: customersFetching } = trpc.crm.listCustomers.useQuery({ search: customerSearch, limit: 20 });

  const bookingId  = linkMode === "booking"  ? selectedBooking?.id  : undefined;
  const customerId = linkMode === "customer" ? selectedCustomer?.id : undefined;

  const { data: mediaByBooking,  refetch: refetchBooking  } = trpc.media.listByBooking.useQuery({ bookingId: bookingId! }, { enabled: !!bookingId });
  const { data: mediaByCustomer, refetch: refetchCustomer } = trpc.media.listByCustomer.useQuery({ customerId: customerId! }, { enabled: !!customerId });

  const uploadMedia = trpc.media.upload.useMutation({
    onSuccess: () => {
      toast.success("Photo uploaded!");
      setUploading(false);
      setUploadCaption("");
      if (bookingId)  refetchBooking();
      if (customerId) refetchCustomer();
    },
    onError: (err) => { toast.error(err.message); setUploading(false); },
  });

  const deleteMedia = trpc.media.delete.useMutation({
    onSuccess: () => {
      toast.success("Photo deleted");
      if (bookingId)  refetchBooking();
      if (customerId) refetchCustomer();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("File too large. Max 10MB."); return; }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      await uploadMedia.mutateAsync({ bookingId, customerId, label: uploadLabel, caption: uploadCaption || undefined, fileBase64: base64, fileName: file.name, mimeType: file.type });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const bookingOptions = (bookingResults?.bookings ?? []).map((b) => ({
    id: b.id,
    label: `${b.customerFirstName} ${b.customerLastName}`,
    sub: `${b.bookingNumber} · ${b.packageName ?? b.serviceName ?? "Booking"} · ${new Date(b.appointmentDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
  }));

  const customerOptions = (customerResults?.customers ?? []).map((c) => ({
    id: c.id,
    label: `${c.firstName} ${c.lastName}`,
    sub: [c.email, c.phone].filter(Boolean).join(" · "),
  }));

  const mediaItems = bookingId ? (mediaByBooking ?? []) : customerId ? (mediaByCustomer ?? []) : [];
  const hasTarget = !!bookingId || !!customerId || linkMode === "none";

  return (
    <AdminLayout>
      <div className="p-3 sm:p-6 max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-display font-bold">Photo Gallery</h1>
            <p className="text-muted-foreground text-sm">Before/after and progress photos</p>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-border bg-card mb-6 space-y-4">
          {/* Link mode toggle */}
          <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-lg w-fit">
            {(["booking", "customer", "none"] as LinkMode[]).map((m) => (
              <button key={m} onClick={() => { setLinkMode(m); setSelectedBooking(null); setSelectedCustomer(null); }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${linkMode === m ? "bg-card text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"}`}>
                {m === "none" ? "No Link" : `By ${m}`}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-4">
            {linkMode === "booking" && (
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Booking</label>
                <SearchDropdown placeholder="Search bookings…" options={bookingOptions} value={selectedBooking} onChange={setSelectedBooking} loading={bookingsFetching} onSearch={setBookingSearch} />
              </div>
            )}
            {linkMode === "customer" && (
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Customer</label>
                <SearchDropdown placeholder="Search customers…" options={customerOptions} value={selectedCustomer} onChange={setSelectedCustomer} loading={customersFetching} onSearch={setCustomerSearch} />
              </div>
            )}
            {linkMode === "none" && (
              <p className="text-xs text-muted-foreground self-center">Photos will be uploaded without a booking or customer link.</p>
            )}

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Photo Type</label>
              <select value={uploadLabel} onChange={(e) => setUploadLabel(e.target.value as any)}
                className="h-9 px-3 rounded-md border border-border bg-input text-foreground text-sm focus:outline-none">
                {["before","after","progress","damage","completed","other"].map((l) => (
                  <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-40">
              <label className="text-xs text-muted-foreground mb-1.5 block">Caption (optional)</label>
              <input type="text" placeholder="Add a caption…" value={uploadCaption} onChange={(e) => setUploadCaption(e.target.value)}
                className="h-9 px-3 rounded-md border border-border bg-input text-foreground text-sm focus:outline-none w-full" />
            </div>

            <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
              Upload Photo
            </Button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>
        </div>

        {hasTarget ? (
          mediaItems.length === 0 ? (
            <div className="p-12 text-center rounded-xl border border-border bg-card">
              <Camera className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No photos yet. Upload the first one!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {mediaItems.map((item) => (
                <div key={item.id} className="group relative rounded-xl overflow-hidden border border-border bg-card aspect-square">
                  <img src={item.url} alt={item.caption ?? item.label ?? "Photo"} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button onClick={() => setLightboxUrl(item.url)} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
                      <ZoomIn className="w-4 h-4 text-white" />
                    </button>
                    <button onClick={() => deleteMedia.mutate({ id: item.id })} className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center hover:bg-red-500/30 transition-colors">
                      <Trash2 className="w-4 h-4 text-red-300" />
                    </button>
                  </div>
                  <div className="absolute top-2 left-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${LABEL_COLORS[item.label ?? "other"] ?? ""}`}>{item.label}</span>
                  </div>
                  {item.caption && (
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                      <p className="text-white text-xs truncate">{item.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="p-12 text-center rounded-xl border border-dashed border-border">
            <Camera className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {linkMode === "booking" ? "Select a booking above to view its photos" : "Select a customer above to view their photos"}
            </p>
          </div>
        )}

        <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
          <DialogContent className="max-w-4xl bg-black border-border p-2">
            <button onClick={() => setLightboxUrl(null)} className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors">
              <X className="w-4 h-4 text-white" />
            </button>
            {lightboxUrl && <img src={lightboxUrl} alt="Photo" className="w-full h-auto max-h-[80vh] object-contain rounded-lg" />}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
