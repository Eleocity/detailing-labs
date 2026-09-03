import { useState } from "react";
import {
  Loader2,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Sparkles,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import AdminLayout from "@/components/AdminLayout";

// Single-tenant for now — see docs/formaops/ROADMAP.md. Every business row
// created so far (migration 0014's seed) is id 1.
const BUSINESS_ID = 1;

const STATUS_STYLES: Record<string, string> = {
  AWAITING_APPROVAL: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  APPROVED: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  EXECUTING: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  COMPLETED: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  FAILED: "text-destructive bg-destructive/10 border-destructive/30",
  REJECTED: "text-muted-foreground bg-muted border-border",
  CANCELLED: "text-muted-foreground bg-muted border-border",
  DRAFT: "text-muted-foreground bg-muted border-border",
};

export default function AdminChangeRequests() {
  const utils = trpc.useUtils();
  const { data: requests, isLoading } = trpc.formaops.changeRequests.list.useQuery({
    businessId: BUSINESS_ID,
  });
  const { data: packages } = trpc.bookings.getPackages.useQuery();

  const create = trpc.formaops.changeRequests.create.useMutation({
    onSuccess: () => {
      toast.success("Change request submitted — awaiting approval.");
      utils.formaops.changeRequests.list.invalidate();
    },
    onError: err => toast.error(err.message),
  });
  const approve = trpc.formaops.changeRequests.approve.useMutation({
    onSuccess: result => {
      toast.success(
        result.status === "COMPLETED"
          ? "Approved and applied."
          : `Approved — status: ${result.status}.`
      );
      utils.formaops.changeRequests.list.invalidate();
    },
    onError: err => toast.error(err.message),
  });
  const reject = trpc.formaops.changeRequests.reject.useMutation({
    onSuccess: () => {
      toast.success("Rejected.");
      utils.formaops.changeRequests.list.invalidate();
    },
    onError: err => toast.error(err.message),
  });

  // AI chat — talks to the same FormaOps Manager agent an SMS would reach
  // (server/formaops/agents/manager.ts). Proposing a change through it
  // shows up in "Awaiting Approval" below exactly like the manual forms.
  const [chatLog, setChatLog] = useState<
    { role: "user" | "assistant"; text: string }[]
  >([]);
  const [chatInput, setChatInput] = useState("");
  const chat = trpc.formaops.agent.chat.useMutation({
    onSuccess: result => {
      setChatLog(log => [...log, { role: "assistant", text: result.reply }]);
      utils.formaops.changeRequests.list.invalidate();
    },
    onError: err => {
      setChatLog(log => [...log, { role: "assistant", text: `Error: ${err.message}` }]);
    },
  });

  function sendChat() {
    const message = chatInput.trim();
    if (!message || chat.isPending) return;
    setChatLog(log => [...log, { role: "user", text: message }]);
    setChatInput("");
    chat.mutate({ businessId: BUSINESS_ID, message });
  }

  const [form, setForm] = useState<"pricing" | "hours" | "services">("pricing");

  // Pricing form state
  const [packageName, setPackageName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newPriceSuv, setNewPriceSuv] = useState("");
  const [newPriceLarge, setNewPriceLarge] = useState("");
  const [pricingWhy, setPricingWhy] = useState("");

  // Hours form state
  const [hoursField, setHoursField] = useState<"hours_weekday" | "hours_weekend">(
    "hours_weekday"
  );
  const [hoursValue, setHoursValue] = useState("");
  const [hoursWhy, setHoursWhy] = useState("");

  // Services form state (add/remove one included-feature line on a package)
  const [servicesPackageName, setServicesPackageName] = useState("");
  const [servicesAction, setServicesAction] = useState<"add" | "remove">("add");
  const [servicesItem, setServicesItem] = useState("");
  const [servicesWhy, setServicesWhy] = useState("");

  const selectedPackage = packages?.find(p => p.name === packageName);
  const selectedHasTiers = !!selectedPackage?.priceSedan;
  const selectedServicesPackage = packages?.find(p => p.name === servicesPackageName);
  const selectedServicesFeatures: string[] = selectedServicesPackage?.features
    ? JSON.parse(selectedServicesPackage.features)
    : [];

  function submitPricing() {
    if (!packageName || !newPrice || !pricingWhy) {
      toast.error("Package, new price, and a reason are all required.");
      return;
    }
    const proposedChange: Record<string, unknown> = {
      packageName,
      newPrice: Number(newPrice),
    };
    if (selectedHasTiers && newPriceSuv) proposedChange.newPriceSuv = Number(newPriceSuv);
    if (selectedHasTiers && newPriceLarge) proposedChange.newPriceLarge = Number(newPriceLarge);

    create.mutate(
      {
        businessId: BUSINESS_ID,
        source: "admin_dashboard",
        category: "pricing",
        originalRequest: pricingWhy,
        proposedChange,
      },
      {
        onSuccess: () => {
          setPackageName("");
          setNewPrice("");
          setNewPriceSuv("");
          setNewPriceLarge("");
          setPricingWhy("");
        },
      }
    );
  }

  function submitHours() {
    if (!hoursValue || !hoursWhy) {
      toast.error("A new value and a reason are both required.");
      return;
    }
    create.mutate(
      {
        businessId: BUSINESS_ID,
        source: "admin_dashboard",
        category: "hours",
        originalRequest: hoursWhy,
        proposedChange: { field: hoursField, newValue: hoursValue },
      },
      {
        onSuccess: () => {
          setHoursValue("");
          setHoursWhy("");
        },
      }
    );
  }

  function submitServices() {
    if (!servicesPackageName || !servicesItem || !servicesWhy) {
      toast.error("Package, item, and a reason are all required.");
      return;
    }
    create.mutate(
      {
        businessId: BUSINESS_ID,
        source: "admin_dashboard",
        category: "services",
        originalRequest: servicesWhy,
        proposedChange: {
          packageName: servicesPackageName,
          action: servicesAction,
          item: servicesItem,
        },
      },
      {
        onSuccess: () => {
          setServicesPackageName("");
          setServicesItem("");
          setServicesWhy("");
        },
      }
    );
  }

  const pending = (requests ?? []).filter(r => r.status === "AWAITING_APPROVAL");
  const resolved = (requests ?? []).filter(r => r.status !== "AWAITING_APPROVAL");

  return (
    <AdminLayout>
      <div className="p-3 sm:p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-display font-bold">Change Requests</h1>
          <p className="text-muted-foreground text-sm">
            Propose a pricing or hours change, then approve it to apply it live.
            Every change is logged in the audit trail.
          </p>
        </div>

        {/* AI chat */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="font-display font-semibold text-sm">Ask the AI</h2>
            <span className="text-xs text-muted-foreground">
              — same assistant a text message will reach, once SMS is wired up
            </span>
          </div>

          {chatLog.length > 0 && (
            <div className="mb-3 max-h-72 overflow-y-auto flex flex-col gap-2 pr-1">
              {chatLog.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-2 text-sm",
                    m.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {m.role === "assistant" && (
                    <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
                  )}
                  <div
                    className={cn(
                      "rounded-lg px-3 py-2 max-w-[85%] whitespace-pre-wrap",
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border"
                    )}
                  >
                    {m.text}
                  </div>
                  {m.role === "user" && (
                    <User className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                  )}
                </div>
              ))}
              {chat.isPending && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking…
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Input
              placeholder='e.g. "raise Full Showroom Reset to $270"'
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendChat();
                }
              }}
            />
            <Button
              onClick={sendChat}
              disabled={chat.isPending || !chatInput.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground flex-shrink-0"
            >
              {chat.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* New request form */}
        <div className="rounded-xl border border-border bg-card p-5 mb-8">
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setForm("pricing")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                form === "pricing"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              Pricing change
            </button>
            <button
              onClick={() => setForm("hours")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                form === "hours"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              Hours change
            </button>
            <button
              onClick={() => setForm("services")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                form === "services"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              Services change
            </button>
          </div>

          {form === "pricing" ? (
            <div className="grid gap-3">
              <Select value={packageName} onValueChange={setPackageName}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a package" />
                </SelectTrigger>
                <SelectContent>
                  {(packages ?? []).map(p => (
                    <SelectItem key={p.id} value={p.name}>
                      {p.name} — ${Number(p.price).toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  type="number"
                  placeholder={selectedHasTiers ? "New sedan price" : "New price"}
                  value={newPrice}
                  onChange={e => setNewPrice(e.target.value)}
                />
                {selectedHasTiers && (
                  <>
                    <Input
                      type="number"
                      placeholder="New SUV price (optional)"
                      value={newPriceSuv}
                      onChange={e => setNewPriceSuv(e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="New large-vehicle price (optional)"
                      value={newPriceLarge}
                      onChange={e => setNewPriceLarge(e.target.value)}
                    />
                  </>
                )}
              </div>
              {selectedHasTiers && (
                <p className="text-xs text-muted-foreground">
                  This package has vehicle-size pricing. Leave SUV/large blank to
                  change only the base (sedan) price.
                </p>
              )}

              <Textarea
                placeholder="Why is this changing? (required — kept in the audit log)"
                value={pricingWhy}
                onChange={e => setPricingWhy(e.target.value)}
                rows={2}
              />

              <Button
                onClick={submitPricing}
                disabled={create.isPending}
                className="w-fit bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {create.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Submit for approval
              </Button>
            </div>
          ) : form === "hours" ? (
            <div className="grid gap-3">
              <Select
                value={hoursField}
                onValueChange={v => setHoursField(v as "hours_weekday" | "hours_weekend")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hours_weekday">Weekday hours</SelectItem>
                  <SelectItem value="hours_weekend">Weekend hours</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder='New value, e.g. "Mon–Fri: 8:00 AM – 6:00 PM"'
                value={hoursValue}
                onChange={e => setHoursValue(e.target.value)}
              />

              <Textarea
                placeholder="Why is this changing? (required — kept in the audit log)"
                value={hoursWhy}
                onChange={e => setHoursWhy(e.target.value)}
                rows={2}
              />

              <Button
                onClick={submitHours}
                disabled={create.isPending}
                className="w-fit bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {create.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Submit for approval
              </Button>
            </div>
          ) : (
            <div className="grid gap-3">
              <Select value={servicesPackageName} onValueChange={setServicesPackageName}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a package" />
                </SelectTrigger>
                <SelectContent>
                  {(packages ?? []).map(p => (
                    <SelectItem key={p.id} value={p.name}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedServicesFeatures.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Currently included: {selectedServicesFeatures.join(" · ")}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-3">
                <Select
                  value={servicesAction}
                  onValueChange={v => setServicesAction(v as "add" | "remove")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">Add item</SelectItem>
                    <SelectItem value="remove">Remove item</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder='e.g. "Ceramic top coat"'
                  value={servicesItem}
                  onChange={e => setServicesItem(e.target.value)}
                />
              </div>

              <Textarea
                placeholder="Why is this changing? (required — kept in the audit log)"
                value={servicesWhy}
                onChange={e => setServicesWhy(e.target.value)}
                rows={2}
              />

              <Button
                onClick={submitServices}
                disabled={create.isPending}
                className="w-fit bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {create.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Submit for approval
              </Button>
            </div>
          )}
        </div>

        {/* Pending approval */}
        <div className="mb-8">
          <h2 className="font-display font-semibold mb-4">
            Awaiting Approval ({pending.length})
          </h2>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : pending.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-border bg-card">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">Nothing waiting on you.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
              {pending.map(r => (
                <div key={r.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium capitalize">
                          {r.category} change
                        </span>
                        <span
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                            STATUS_STYLES[r.status]
                          )}
                        >
                          {r.status.replace("_", " ")}
                        </span>
                        {r.riskLevel !== "GREEN" && (
                          <span className="flex items-center gap-1 text-[10px] text-amber-400">
                            <AlertTriangle className="w-3 h-3" />
                            {r.riskLevel} — needs {r.requiredApprovalRole}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{r.originalRequest}</p>
                      <pre className="mt-1 text-xs text-muted-foreground/70 whitespace-pre-wrap">
                        {JSON.stringify(r.proposedChange)}
                      </pre>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      onClick={() => approve.mutate({ id: r.id })}
                      disabled={approve.isPending || reject.isPending}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => reject.mutate({ id: r.id })}
                      disabled={approve.isPending || reject.isPending}
                      className="border-border text-xs"
                    >
                      <XCircle className="w-3 h-3 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* History */}
        {resolved.length > 0 && (
          <div>
            <h2 className="font-display font-semibold mb-4">History</h2>
            <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
              {resolved.map(r => (
                <div key={r.id} className="flex items-start gap-3 p-4">
                  <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium capitalize">
                        {r.category} change
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                          STATUS_STYLES[r.status]
                        )}
                      >
                        {r.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{r.originalRequest}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
