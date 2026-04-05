import { useState } from "react";
import { motion } from "framer-motion";
import {
  Mail, ToggleLeft, ToggleRight, Play, RefreshCw,
  CheckCircle2, XCircle, Clock, AlertCircle, ChevronDown,
  Send, BarChart3, Loader2,
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

const TYPE_DESCRIPTIONS: Record<string, { when: string; purpose: string }> = {
  appointment_reminder_24h: {
    when:    "24 hours before appointment",
    purpose: "Reminds the customer of their upcoming appointment, confirms the address and time, and tells them what to expect.",
  },
  appointment_reminder_2h: {
    when:    "2 hours before appointment",
    purpose: "Final reminder with quick checklist — make sure vehicle is accessible, no hookups needed.",
  },
  review_request: {
    when:    "~2 hours after job marked completed",
    purpose: "Asks the customer for a Google review while the experience is fresh. Includes a link to your review page.",
  },
  win_back_90d: {
    when:    "90 days since last completed booking",
    purpose: "Re-engages customers who haven't booked in 3 months with a reminder of what's included in a full detail.",
  },
  coating_anniversary: {
    when:    "~1 year after ceramic coating booking",
    purpose: "Reminds coating customers that annual maintenance helps preserve their coating's performance.",
  },
};

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="p-5 rounded-xl border border-border bg-card">
      <p className="text-2xl font-display font-bold text-primary">{value}</p>
      <p className="text-sm font-medium text-foreground mt-0.5">{label}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    sent:    "bg-green-500/10 text-green-400 border-green-500/20",
    skipped: "bg-muted/30 text-muted-foreground border-border",
    error:   "bg-red-500/10 text-red-400 border-red-500/20",
  };
  const icons: Record<string, React.ReactNode> = {
    sent:    <CheckCircle2 className="w-3 h-3" />,
    skipped: <XCircle className="w-3 h-3" />,
    error:   <AlertCircle className="w-3 h-3" />,
  };
  const cls = styles[status] ?? styles.skipped;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cls}`}>
      {icons[status]}
      {status}
    </span>
  );
}

export default function AdminAutomations() {
  const utils = trpc.useUtils();
  const [filterType, setFilterType] = useState<string | undefined>();
  const [expandedType, setExpandedType] = useState<string | null>(null);

  const { data: stats, isLoading: statsLoading } = trpc.automations.getStats.useQuery();
  const { data: settings, isLoading: settingsLoading } = trpc.automations.getSettings.useQuery();
  const { data: logs, isLoading: logsLoading, refetch: refetchLogs } = trpc.automations.getLogs.useQuery({
    limit: 100,
    type: filterType,
  });

  const toggle = trpc.automations.toggle.useMutation({
    onSuccess: () => { utils.automations.getSettings.invalidate(); toast.success("Updated"); },
    onError:   () => toast.error("Failed to update"),
  });

  const triggerNow = trpc.automations.triggerNow.useMutation({
    onSuccess: (d) => { toast.success(d.message); setTimeout(() => { refetchLogs(); utils.automations.getStats.invalidate(); }, 5000); },
    onError:   () => toast.error("Failed to trigger"),
  });

  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold">Email Automations</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Emails fire automatically based on booking activity. All emails respect unsubscribes.
            </p>
          </div>
          <button
            onClick={() => triggerNow.mutate()}
            disabled={triggerNow.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-primary/40 bg-primary/8 text-primary text-sm font-semibold hover:bg-primary/15 transition-colors disabled:opacity-50"
          >
            {triggerNow.isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Running…</>
              : <><Play className="w-4 h-4" /> Run Now</>
            }
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {statsLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl border border-border bg-card animate-pulse" />
            ))
          ) : (
            <>
              <StatCard label="Sent this week"   value={stats?.sent7d  ?? 0} />
              <StatCard label="Sent this month"  value={stats?.sent30d ?? 0} />
              <StatCard label="All time"         value={stats?.sentAll ?? 0} />
            </>
          )}
        </div>

        {/* Automation toggles */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Automations</h2>
          <div className="space-y-2">
            {settingsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl border border-border bg-card animate-pulse" />
              ))
            ) : (
              settings?.map((s) => {
                const desc = TYPE_DESCRIPTIONS[s.type];
                const isExpanded = expandedType === s.type;
                return (
                  <motion.div
                    key={s.type}
                    initial="hidden" animate="visible" variants={fadeUp}
                    className={`rounded-xl border bg-card overflow-hidden transition-all ${s.enabled ? "border-border" : "border-border/50 opacity-60"}`}
                  >
                    <div className="flex items-center gap-4 p-4">
                      {/* Toggle */}
                      <button
                        onClick={() => toggle.mutate({ type: s.type, enabled: !s.enabled })}
                        disabled={toggle.isPending}
                        className={`flex-shrink-0 transition-colors ${s.enabled ? "text-primary" : "text-muted-foreground/40"}`}
                        title={s.enabled ? "Click to disable" : "Click to enable"}
                      >
                        {s.enabled
                          ? <ToggleRight className="w-8 h-8" />
                          : <ToggleLeft  className="w-8 h-8" />
                        }
                      </button>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm">{s.label}</p>
                          {!s.enabled && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">Disabled</span>
                          )}
                        </div>
                        {desc && (
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {desc.when}
                          </p>
                        )}
                      </div>

                      {/* Stats + expand */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-bold text-foreground">{s.sent30d}</p>
                          <p className="text-[10px] text-muted-foreground">sent / 30d</p>
                        </div>
                        <button
                          onClick={() => setExpandedType(isExpanded ? null : s.type)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </button>
                      </div>
                    </div>

                    {/* Expanded description */}
                    {isExpanded && desc && (
                      <div className="px-4 pb-4 pt-0 border-t border-border/40">
                        <p className="text-sm text-muted-foreground leading-relaxed mt-3">{desc.purpose}</p>
                        <button
                          onClick={() => { setFilterType(s.type); setExpandedType(null); }}
                          className="mt-3 text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          <BarChart3 className="w-3 h-3" /> View logs for this automation →
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* Log */}
        <div>
          <div className="flex items-center justify-between mb-3 gap-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Send Log</h2>
            <div className="flex items-center gap-2">
              <select
                value={filterType ?? ""}
                onChange={(e) => setFilterType(e.target.value || undefined)}
                className="text-xs px-3 py-1.5 rounded-lg border border-border bg-input text-foreground focus:outline-none"
              >
                <option value="">All automations</option>
                {settings?.map(s => (
                  <option key={s.type} value={s.type}>{s.label}</option>
                ))}
              </select>
              <button
                onClick={() => refetchLogs()}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            {logsLoading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading logs…
              </div>
            ) : !logs?.length ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Send className="w-8 h-8 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No emails sent yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Automations run every 15 minutes</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Automation</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">To</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-border/50 last:border-0 hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium text-foreground">{log.label}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-muted-foreground font-mono truncate max-w-[180px]">{log.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={log.status} />
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          {" "}
                          {new Date(log.sentAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {(logs?.length ?? 0) >= 100 && (
            <p className="text-xs text-muted-foreground text-center mt-2">Showing last 100 entries</p>
          )}
        </div>

      </div>
    </AdminLayout>
  );
}
