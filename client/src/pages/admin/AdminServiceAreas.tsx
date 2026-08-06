import { useState } from "react";
import {
  MapPin,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface ServiceAreaRow {
  id: number;
  name: string;
  zipCodes: string | null;
  travelFee: string;
  isActive: boolean | null;
}

function parseZips(raw: string | null): string[] {
  try {
    const parsed = JSON.parse(raw ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ── Create / Edit dialog ────────────────────────────────────────────────────

function ServiceAreaDialog({
  open,
  onClose,
  onSuccess,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editing: ServiceAreaRow | null;
}) {
  const [name, setName] = useState(editing?.name ?? "");
  const [zipText, setZipText] = useState(
    parseZips(editing?.zipCodes ?? null).join(", ")
  );
  const [travelFee, setTravelFee] = useState(
    editing ? Number(editing.travelFee).toString() : "0"
  );
  const [isActive, setIsActive] = useState(editing?.isActive ?? true);

  const create = trpc.bookings.adminCreateServiceArea.useMutation({
    onSuccess: () => {
      toast.success("Service area created");
      onSuccess();
      reset();
    },
    onError: err => toast.error(err.message),
  });
  const update = trpc.bookings.adminUpdateServiceArea.useMutation({
    onSuccess: () => {
      toast.success("Service area updated");
      onSuccess();
      reset();
    },
    onError: err => toast.error(err.message),
  });

  function reset() {
    setName("");
    setZipText("");
    setTravelFee("0");
    setIsActive(true);
    onClose();
  }

  function handleSubmit() {
    const zipCodes = Array.from(
      new Set(
        zipText
          .split(/[\s,]+/)
          .map(z => z.trim())
          .filter(Boolean)
      )
    );
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (zipCodes.length === 0) {
      toast.error("Enter at least one ZIP code");
      return;
    }
    const invalid = zipCodes.filter(z => !/^\d{5}$/.test(z));
    if (invalid.length > 0) {
      toast.error(`Invalid ZIP code(s): ${invalid.join(", ")}`);
      return;
    }
    const fee = parseFloat(travelFee || "0");
    if (isNaN(fee) || fee < 0) {
      toast.error("Travel fee must be 0 or more");
      return;
    }
    if (editing) {
      update.mutate({
        id: editing.id,
        name: name.trim(),
        zipCodes,
        travelFee: fee,
        isActive,
      });
    } else {
      create.mutate({ name: name.trim(), zipCodes, travelFee: fee, isActive });
    }
  }

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={v => !v && reset()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Service Area" : "New Service Area"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Name</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Primary Service Area"
              className="bg-input border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">ZIP Codes</Label>
            <Textarea
              value={zipText}
              onChange={e => setZipText(e.target.value)}
              placeholder="53177, 53403, 53105, 53108…"
              rows={3}
              className="bg-input border-border resize-none text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Separate with commas or spaces.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Travel Fee ($)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={travelFee}
              onChange={e => setTravelFee(e.target.value)}
              className="bg-input border-border"
            />
            <p className="text-[11px] text-muted-foreground">
              0 = included service area (no fee). Above 0 = travel-fee area.
            </p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
            <span className="text-sm">Active</span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={reset} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending} className="gap-2">
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {editing ? "Save Changes" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function AdminServiceAreas() {
  const {
    data: areas,
    isLoading,
    refetch,
  } = trpc.bookings.adminListServiceAreas.useQuery();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceAreaRow | null>(null);

  const del = trpc.bookings.adminDeleteServiceArea.useMutation({
    onSuccess: () => {
      toast.success("Service area deleted");
      refetch();
    },
    onError: err => toast.error(err.message),
  });

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Service Areas</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Controls what the booking wizard's ZIP-code check ({""}
              <code className="text-xs">checkServiceArea</code>) tells
              customers. No areas configured means every ZIP is flagged for
              manual review, not silently accepted.
            </p>
          </div>
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
            size="sm"
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Area
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : !areas || areas.length === 0 ? (
            <div className="p-12 text-center">
              <MapPin className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium mb-1">
                No service areas configured
              </p>
              <p className="text-muted-foreground/60 text-sm">
                Add your primary (no-fee) area and any travel-fee areas.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-4 font-medium text-muted-foreground">
                      Name
                    </th>
                    <th className="text-left p-4 font-medium text-muted-foreground">
                      ZIP Codes
                    </th>
                    <th className="text-right p-4 font-medium text-muted-foreground">
                      Travel Fee
                    </th>
                    <th className="text-left p-4 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="text-left p-4 font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {areas.map(area => {
                    const zips = parseZips(area.zipCodes);
                    return (
                      <tr
                        key={area.id}
                        className="hover:bg-muted/20 transition-colors"
                      >
                        <td className="p-4 font-medium">{area.name}</td>
                        <td className="p-4 text-muted-foreground max-w-xs">
                          <span className="line-clamp-2">
                            {zips.join(", ") || "—"}
                          </span>
                          <span className="text-[11px] text-muted-foreground/60 block mt-0.5">
                            {zips.length} ZIP{zips.length === 1 ? "" : "s"}
                          </span>
                        </td>
                        <td className="p-4 text-right font-mono text-xs">
                          {Number(area.travelFee) > 0
                            ? `$${Number(area.travelFee).toFixed(2)}`
                            : "Included"}
                        </td>
                        <td className="p-4">
                          {area.isActive ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-green-500/15 text-green-400 border-green-500/20">
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-gray-500/15 text-gray-400 border-gray-500/20">
                              <XCircle className="w-3 h-3" /> Inactive
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditing(area as ServiceAreaRow);
                                setDialogOpen(true);
                              }}
                              className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                              aria-label="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (
                                  confirm(
                                    `Delete "${area.name}"? This can't be undone.`
                                  )
                                ) {
                                  del.mutate({ id: area.id });
                                }
                              }}
                              className="w-8 h-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                              aria-label="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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

      <ServiceAreaDialog
        open={dialogOpen}
        editing={editing}
        onClose={() => setDialogOpen(false)}
        onSuccess={() => {
          setDialogOpen(false);
          refetch();
        }}
      />
    </AdminLayout>
  );
}
