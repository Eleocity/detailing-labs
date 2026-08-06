import { useState } from "react";
import {
  Gift,
  Plus,
  Ban,
  CheckCircle2,
  Clock,
  DollarSign,
  Loader2,
  Copy,
  X,
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";

// ── Status config ─────────────────────────────────────────────────────────────

type GiftCardStatus = "active" | "redeemed" | "expired" | "cancelled";

const STATUS_STYLES: Record<GiftCardStatus, string> = {
  active: "bg-green-500/15 text-green-400 border-green-500/20",
  redeemed: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  expired: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  cancelled: "bg-red-500/15 text-red-400 border-red-500/20",
};

const STATUS_ICONS: Record<GiftCardStatus, React.ReactNode> = {
  active: <CheckCircle2 className="w-3 h-3" />,
  redeemed: <DollarSign className="w-3 h-3" />,
  expired: <Clock className="w-3 h-3" />,
  cancelled: <Ban className="w-3 h-3" />,
};

function StatusBadge({ status }: { status: string }) {
  const s = status as GiftCardStatus;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${
        STATUS_STYLES[s] ?? "bg-gray-500/15 text-gray-400 border-gray-500/20"
      }`}
    >
      {STATUS_ICONS[s]}
      {s}
    </span>
  );
}

// ── Issue dialog ──────────────────────────────────────────────────────────────

interface IssueDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function IssueDialog({ open, onClose, onSuccess }: IssueDialogProps) {
  const [purchaserName, setPurchaserName] = useState("");
  const [purchaserEmail, setPurchaserEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const issue = trpc.giftCards.issue.useMutation({
    onSuccess: () => {
      toast.success("Gift card issued successfully");
      onSuccess();
      handleClose();
    },
    onError: err => toast.error(err.message),
  });

  function handleClose() {
    setPurchaserName("");
    setPurchaserEmail("");
    setRecipientName("");
    setRecipientEmail("");
    setAmount("");
    setExpiresAt("");
    onClose();
  }

  function handleSubmit() {
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed < 5) {
      toast.error("Amount must be at least $5");
      return;
    }
    issue.mutate({
      purchaserName: purchaserName || undefined,
      purchaserEmail: purchaserEmail || undefined,
      recipientName: recipientName || undefined,
      recipientEmail: recipientEmail || undefined,
      initialBalance: parsed,
      expiresAt: expiresAt || undefined,
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={v => {
        if (!v) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-primary" />
            Issue Gift Card
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Purchaser */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Purchaser Name
              </label>
              <Input
                placeholder="Jane Smith"
                value={purchaserName}
                onChange={e => setPurchaserName(e.target.value)}
                className="h-9 bg-background/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Purchaser Email
              </label>
              <Input
                type="email"
                placeholder="jane@email.com"
                value={purchaserEmail}
                onChange={e => setPurchaserEmail(e.target.value)}
                className="h-9 bg-background/50"
              />
            </div>
          </div>

          {/* Recipient */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Recipient Name
              </label>
              <Input
                placeholder="John Doe"
                value={recipientName}
                onChange={e => setRecipientName(e.target.value)}
                className="h-9 bg-background/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Recipient Email
              </label>
              <Input
                type="email"
                placeholder="john@email.com"
                value={recipientEmail}
                onChange={e => setRecipientEmail(e.target.value)}
                className="h-9 bg-background/50"
              />
              <p className="text-xs text-muted-foreground/70">
                An email with the code will be sent to this address
              </p>
            </div>
          </div>

          {/* Amount + expiry */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Amount <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  type="number"
                  min={5}
                  step="1"
                  placeholder="50"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="h-9 bg-background/50 pl-7"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Expires At
              </label>
              <Input
                type="date"
                value={expiresAt}
                onChange={e => setExpiresAt(e.target.value)}
                className="h-9 bg-background/50"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={issue.isPending}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={issue.isPending}
            className="gap-1.5"
          >
            {issue.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Gift className="w-3.5 h-3.5" />
            )}
            Issue Gift Card
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminGiftCards() {
  const [issueOpen, setIssueOpen] = useState(false);
  const [voidConfirmId, setVoidConfirmId] = useState<number | null>(null);

  const {
    data: giftCards,
    isLoading,
    refetch,
  } = trpc.giftCards.adminList.useQuery();

  const voidCard = trpc.giftCards.adminVoid.useMutation({
    onSuccess: () => {
      toast.success("Gift card voided");
      setVoidConfirmId(null);
      refetch();
    },
    onError: err => toast.error(err.message),
  });

  function copyCode(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      toast.success("Copied!");
    });
  }

  // ── Derived stats ─────────────────────────────────────────────────────────

  const activeCards = giftCards?.filter(c => c.status === "active") ?? [];
  const totalIssued =
    giftCards?.reduce((sum, c) => sum + Number(c.initialBalance), 0) ?? 0;
  const outstandingBalance = activeCards.reduce(
    (sum, c) => sum + Number(c.currentBalance),
    0
  );

  const stats = [
    {
      label: "Active Cards",
      value: activeCards.length.toString(),
      icon: <Gift className="w-4 h-4" />,
      color: "text-green-400",
    },
    {
      label: "Total Value Issued",
      value: `$${totalIssued.toFixed(2)}`,
      icon: <DollarSign className="w-4 h-4" />,
      color: "text-blue-400",
    },
    {
      label: "Outstanding Balance",
      value: `$${outstandingBalance.toFixed(2)}`,
      icon: <Clock className="w-4 h-4" />,
      color: "text-amber-400",
    },
  ];

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Gift Cards</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {giftCards?.length ?? 0} total
            </p>
          </div>
          <Button
            onClick={() => setIssueOpen(true)}
            className="gap-2"
            size="sm"
          >
            <Plus className="w-4 h-4" />
            Issue Gift Card
          </Button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {stats.map(s => (
            <div
              key={s.label}
              className="p-4 rounded-xl border border-border bg-card"
            >
              <div className={`flex items-center gap-2 mb-1 ${s.color}`}>
                {s.icon}
                <span className="text-xs font-semibold">{s.label}</span>
              </div>
              <div className="text-xl font-display font-bold">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Gift cards table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : !giftCards || giftCards.length === 0 ? (
            <div className="p-12 text-center">
              <Gift className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium mb-1">
                No gift cards issued yet
              </p>
              <p className="text-muted-foreground/60 text-sm">
                Issue your first gift card to get started.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-4 font-medium text-muted-foreground">
                      Code
                    </th>
                    <th className="text-left p-4 font-medium text-muted-foreground">
                      Purchaser
                    </th>
                    <th className="text-left p-4 font-medium text-muted-foreground">
                      Recipient
                    </th>
                    <th className="text-right p-4 font-medium text-muted-foreground">
                      Initial
                    </th>
                    <th className="text-right p-4 font-medium text-muted-foreground">
                      Balance
                    </th>
                    <th className="text-left p-4 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="text-left p-4 font-medium text-muted-foreground">
                      Expires
                    </th>
                    <th className="text-left p-4 font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {giftCards.map(card => (
                    <>
                      <tr
                        key={card.id}
                        className="hover:bg-muted/20 transition-colors"
                      >
                        {/* Code */}
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs tracking-wider text-foreground">
                              {card.code}
                            </span>
                            <button
                              onClick={() => copyCode(card.code)}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                              title="Copy code"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {format(new Date(card.createdAt), "MMM d, yyyy")}
                          </div>
                        </td>

                        {/* Purchaser */}
                        <td className="p-4">
                          {card.purchaserName ? (
                            <>
                              <div className="font-medium text-sm">
                                {card.purchaserName}
                              </div>
                              {card.purchaserEmail && (
                                <div className="text-xs text-muted-foreground">
                                  {card.purchaserEmail}
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              —
                            </span>
                          )}
                        </td>

                        {/* Recipient */}
                        <td className="p-4">
                          {card.recipientName ? (
                            <>
                              <div className="font-medium text-sm">
                                {card.recipientName}
                              </div>
                              {card.recipientEmail && (
                                <div className="text-xs text-muted-foreground">
                                  {card.recipientEmail}
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              —
                            </span>
                          )}
                        </td>

                        {/* Initial balance */}
                        <td className="p-4 text-right font-semibold">
                          ${Number(card.initialBalance).toFixed(2)}
                        </td>

                        {/* Current balance */}
                        <td className="p-4 text-right">
                          <span
                            className={
                              Number(card.currentBalance) > 0
                                ? "font-semibold text-green-400"
                                : "text-muted-foreground"
                            }
                          >
                            ${Number(card.currentBalance).toFixed(2)}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="p-4">
                          <StatusBadge status={card.status} />
                        </td>

                        {/* Expires */}
                        <td className="p-4 text-muted-foreground text-xs">
                          {card.expiresAt
                            ? format(new Date(card.expiresAt), "MMM d, yyyy")
                            : "—"}
                        </td>

                        {/* Actions */}
                        <td className="p-4">
                          {card.status === "active" &&
                            (voidConfirmId === card.id ? null : (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs h-7 px-2 text-red-400 hover:text-red-300 gap-1"
                                onClick={() => setVoidConfirmId(card.id)}
                              >
                                <Ban className="w-3 h-3" />
                                Void
                              </Button>
                            ))}
                        </td>
                      </tr>

                      {/* Inline void confirmation row */}
                      {voidConfirmId === card.id && (
                        <tr key={`${card.id}-confirm`} className="bg-red-500/5">
                          <td colSpan={8} className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-red-400 font-medium">
                                Void gift card{" "}
                                <span className="font-mono">{card.code}</span>?
                                This cannot be undone.
                              </span>
                              <Button
                                size="sm"
                                className="h-7 px-3 text-xs bg-red-600 hover:bg-red-500 text-white gap-1"
                                onClick={() => voidCard.mutate({ id: card.id })}
                                disabled={voidCard.isPending}
                              >
                                {voidCard.isPending ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Ban className="w-3 h-3" />
                                )}
                                Confirm Void
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs gap-1"
                                onClick={() => setVoidConfirmId(null)}
                                disabled={voidCard.isPending}
                              >
                                <X className="w-3 h-3" />
                                Cancel
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <IssueDialog
        open={issueOpen}
        onClose={() => setIssueOpen(false)}
        onSuccess={() => refetch()}
      />
    </AdminLayout>
  );
}
