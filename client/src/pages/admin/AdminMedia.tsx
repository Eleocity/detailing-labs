import { useState, useRef } from "react";
import { Camera, Upload, Loader2, Trash2, X, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";

const LABEL_COLORS: Record<string, string> = {
  before: "bg-red-500/15 text-red-400 border-red-500/20",
  after: "bg-green-500/15 text-green-400 border-green-500/20",
  progress: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  damage: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  other: "bg-gray-500/15 text-gray-400 border-gray-500/20",
};

export default function AdminMedia() {
  const [bookingIdFilter, setBookingIdFilter] = useState("");
  const [customerIdFilter, setCustomerIdFilter] = useState("");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadLabel, setUploadLabel] = useState<"before" | "after" | "progress" | "damage" | "completed" | "other">("progress");
  const [uploadCaption, setUploadCaption] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bookingId = bookingIdFilter ? parseInt(bookingIdFilter) : undefined;
  const customerId = customerIdFilter ? parseInt(customerIdFilter) : undefined;

  const { data: mediaByBooking, refetch: refetchBooking } = trpc.media.listByBooking.useQuery(
    { bookingId: bookingId! },
    { enabled: !!bookingId }
  );

  const { data: mediaByCustomer, refetch: refetchCustomer } = trpc.media.listByCustomer.useQuery(
    { customerId: customerId! },
    { enabled: !!customerId }
  );

  const uploadMedia = trpc.media.upload.useMutation({
    onSuccess: () => {
      toast.success("Photo uploaded!");
      setUploading(false);
      setUploadCaption("");
      if (bookingId) refetchBooking();
      if (customerId) refetchCustomer();
    },
    onError: (err) => { toast.error(err.message); setUploading(false); },
  });

  const deleteMedia = trpc.media.delete.useMutation({
    onSuccess: () => {
      toast.success("Photo deleted");
      if (bookingId) refetchBooking();
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
      await uploadMedia.mutateAsync({
        bookingId,
        customerId,
        label: uploadLabel,
        caption: uploadCaption || undefined,
        fileBase64: base64,
        fileName: file.name,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const mediaItems = bookingId ? (mediaByBooking ?? []) : customerId ? (mediaByCustomer ?? []) : [];

  return (
    <AdminLayout>
      <div className="p-3 sm:p-6 max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-display font-bold">Photo Gallery</h1>
            <p className="text-muted-foreground text-sm">Before/after and progress photos</p>
          </div>
        </div>

        {/* Filters & Upload */}
        <div className="p-5 rounded-xl border border-border bg-card mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Filter by Booking ID</label>
              <input
                type="number"
                placeholder="Booking ID"
                value={bookingIdFilter}
                onChange={(e) => { setBookingIdFilter(e.target.value); setCustomerIdFilter(""); }}
                className="h-9 px-3 rounded-md border border-border bg-input text-foreground text-sm focus:outline-none w-36"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Filter by Customer ID</label>
              <input
                type="number"
                placeholder="Customer ID"
                value={customerIdFilter}
                onChange={(e) => { setCustomerIdFilter(e.target.value); setBookingIdFilter(""); }}
                className="h-9 px-3 rounded-md border border-border bg-input text-foreground text-sm focus:outline-none w-36"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Photo Type</label>
              <select
                value={uploadLabel}
                onChange={(e) => setUploadLabel(e.target.value as any)}
                className="h-9 px-3 rounded-md border border-border bg-input text-foreground text-sm focus:outline-none"
              >
                {["before", "after", "progress", "damage", "completed", "other"].map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-32">
              <label className="text-xs text-muted-foreground mb-1 block">Caption (optional)</label>
              <input
                type="text"
                placeholder="Add a caption..."
                value={uploadCaption}
                onChange={(e) => setUploadCaption(e.target.value)}
                className="h-9 px-3 rounded-md border border-border bg-input text-foreground text-sm focus:outline-none w-full"
              />
            </div>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || (!bookingId && !customerId)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
              Upload Photo
            </Button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>
          {!bookingId && !customerId && (
            <p className="text-xs text-muted-foreground mt-3">Enter a Booking ID or Customer ID to view and upload photos.</p>
          )}
        </div>

        {/* Gallery Grid */}
        {(bookingId || customerId) && (
          <>
            {mediaItems.length === 0 ? (
              <div className="p-12 text-center rounded-xl border border-border bg-card">
                <Camera className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No photos yet. Upload the first one!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {mediaItems.map((item) => (
                  <div key={item.id} className="group relative rounded-xl overflow-hidden border border-border bg-card aspect-square">
                    <img
                      src={item.url}
                      alt={item.caption ?? item.label ?? "Photo"}
                      className="w-full h-full object-cover"
                    />
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={() => setLightboxUrl(item.url)}
                        className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                      >
                        <ZoomIn className="w-4 h-4 text-white" />
                      </button>
                      <button
                        onClick={() => deleteMedia.mutate({ id: item.id })}
                        className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center hover:bg-red-500/30 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-300" />
                      </button>
                    </div>
                    {/* Label badge */}
                    <div className="absolute top-2 left-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${LABEL_COLORS[item.label ?? "other"] ?? ""}`}>
                        {item.label}
                      </span>
                    </div>
                    {item.caption && (
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                        <p className="text-white text-xs truncate">{item.caption}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Lightbox */}
        <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
          <DialogContent className="max-w-4xl bg-black border-border p-2">
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
            {lightboxUrl && (
              <img src={lightboxUrl} alt="Photo" className="w-full h-auto max-h-[80vh] object-contain rounded-lg" />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
