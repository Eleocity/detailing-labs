import { useState } from "react";
import { RefreshCw, CheckCircle2, AlertCircle, Users, Briefcase, Package, Zap, ExternalLink, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";

export default function AdminUrable() {
  const { data: status, refetch: refetchStatus } = trpc.urable.status.useQuery();
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) => setLog(prev => [`${new Date().toLocaleTimeString()} — ${msg}`, ...prev.slice(0, 49)]);

  const syncCustomers = trpc.urable.syncAllCustomers.useMutation({
    onSuccess: (d) => { toast.success(`Synced ${d.synced}/${d.total} customers`); addLog(`Customers: ${d.synced} synced, ${d.failed} failed`); refetchStatus(); },
    onError: (e) => { toast.error(e.message); addLog(`Error: ${e.message}`); },
  });

  const syncPackages = trpc.urable.syncPackages.useMutation({
    onSuccess: (d) => { toast.success(`Synced ${d.synced} packages`); addLog(`Packages: ${d.synced}/${d.total} synced`); },
    onError: (e) => { toast.error(e.message); addLog(`Error: ${e.message}`); },
  });

  const isConfigured = status?.configured ?? false;
  const webhookUrl = "https://detailinglabswi.com/api/webhooks/urable";

  return (
    <AdminLayout>
      <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-display font-bold">Urable Integration</h1>
          <p className="text-muted-foreground text-sm mt-1">Sync customers, jobs, and packages between your site and Urable.</p>
        </div>

        {/* Status banner */}
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${isConfigured ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
          {isConfigured
            ? <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            : <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />}
          <div>
            <p className={`font-semibold text-sm ${isConfigured ? "text-emerald-300" : "text-amber-300"}`}>
              {isConfigured ? "Connected to Urable" : "Not configured"}
            </p>
            <p className="text-muted-foreground text-xs mt-0.5">
              {isConfigured
                ? "URABLE_API_KEY is set. New bookings sync automatically."
                : "Add URABLE_API_KEY to Railway → your app service → Variables to enable sync."}
            </p>
          </div>
        </div>

        {/* Setup instructions when not configured */}
        {!isConfigured && (
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold mb-4">Setup Instructions</h3>
            <ol className="space-y-3 text-sm text-muted-foreground">
              {[
                "Log into Urable → Settings → Integrations → copy your API Key",
                "Go to Railway → your app service → Variables tab",
                'Add variable: URABLE_API_KEY = your-api-key',
                "Redeploy — new bookings will sync automatically",
                "Come back here to run a one-time sync of existing customers",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Sync actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">Customers</p>
                <p className="text-xs text-muted-foreground">Sync all customers to Urable</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Finds or creates each customer in Urable by email. New bookings sync automatically — this is for existing customers.
            </p>
            <Button className="w-full gap-2" size="sm" onClick={() => syncCustomers.mutate()}
              disabled={!isConfigured || syncCustomers.isPending}>
              {syncCustomers.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Sync All Customers
            </Button>
          </div>

          <div className="p-5 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Package className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className="font-semibold text-sm">Packages & Services</p>
                <p className="text-xs text-muted-foreground">Sync your packages to Urable as Items</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Pushes all your detailing packages to Urable as service items so they appear in job creation.
            </p>
            <Button className="w-full gap-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10" size="sm" variant="outline"
              onClick={() => syncPackages.mutate()} disabled={!isConfigured || syncPackages.isPending}>
              {syncPackages.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Package className="w-3.5 h-3.5" />}
              Sync Packages
            </Button>
          </div>
        </div>

        {/* Auto-sync info */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">What Syncs Automatically</h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { label: "New booking submitted", desc: "Creates customer + job in Urable instantly", dir: "→ Urable", color: "text-primary" },
              { label: "Job status updated in Urable", desc: "Updates booking status on your site", dir: "← Urable", color: "text-sky-400" },
              { label: "Job paid in Urable", desc: "Marks booking payment status as paid", dir: "← Urable", color: "text-sky-400" },
              { label: "Customer updated in Urable", desc: "Syncs name/phone/email changes back", dir: "← Urable", color: "text-sky-400" },
            ].map(item => (
              <div key={item.label} className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/20 border border-border/50">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-foreground">{item.label}</span>
                    <span className={`text-[10px] font-bold ${item.color}`}>{item.dir}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Webhook config */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold text-sm mb-1">Urable Webhook URL</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Add this in Urable → Settings → Webhooks to enable two-way sync (job status updates, payments, customer changes).
          </p>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border font-mono text-xs break-all">
            <span className="flex-1 text-primary">{webhookUrl}</span>
            <button onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success("Copied"); }}
              className="flex-shrink-0 p-1.5 rounded hover:bg-muted/50 transition-colors">
              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
          <a href="https://app.urable.com/settings/integrations" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline mt-3">
            Open Urable Settings <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Sync log */}
        {log.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold text-sm mb-3">Sync Log</h3>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {log.map((entry, i) => (
                <p key={i} className="text-xs font-mono text-muted-foreground">{entry}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
