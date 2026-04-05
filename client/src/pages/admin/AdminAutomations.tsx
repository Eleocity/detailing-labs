import { useState } from "react";
import {
  Mail, ToggleLeft, ToggleRight, Play, RefreshCw, Plus,
  CheckCircle2, XCircle, Clock, AlertCircle, ChevronDown,
  Send, Loader2, Trash2, Pencil, X, Info, Zap, Eye,
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "automations" | "custom" | "logs";

const TRIGGER_OPTIONS = [
  { value: "days_before_appointment", label: "Before appointment" },
  { value: "days_after_booking_created", label: "After booking is created" },
  { value: "days_after_completed", label: "After job is completed" },
  { value: "days_since_last_booking", label: "Since customer's last booking" },
];

const UNIT_OPTIONS = [
  { value: "hours", label: "Hours" },
  { value: "days",  label: "Days"  },
];

const MERGE_TAGS = [
  { tag: "{{firstName}}",      desc: "Customer's first name" },
  { tag: "{{fullName}}",       desc: "Customer's full name" },
  { tag: "{{bookingNumber}}",  desc: "Booking reference number" },
  { tag: "{{packageName}}",    desc: "Service / package name" },
  { tag: "{{appointmentDate}}",desc: "Appointment date (formatted)" },
  { tag: "{{vehicle}}",        desc: "Year Make Model" },
  { tag: "{{serviceAddress}}", desc: "Service location" },
  { tag: "{{totalAmount}}",    desc: "Total price (e.g. $229.00)" },
  { tag: "{{bookingUrl}}",     desc: "Link to their booking confirmation" },
  { tag: "{{unsubscribeUrl}}", desc: "Unsubscribe link" },
];

const BUILT_IN_META: Record<string, { when: string; desc: string; color: string }> = {
  appointment_reminder_24h: {
    when: "24h before appointment",
    desc: "Reminds the customer of their upcoming appointment with date, time, address, and a quick checklist.",
    color: "blue",
  },
  appointment_reminder_2h: {
    when: "2h before appointment",
    desc: "Final reminder that we're arriving soon. Tells them to make sure the vehicle is accessible.",
    color: "blue",
  },
  review_request: {
    when: "~2h after job completed",
    desc: "Asks for a Google review while the experience is fresh. Includes a direct link to your review page.",
    color: "yellow",
  },
  win_back_90d: {
    when: "90 days since last booking",
    desc: "Re-engages customers who haven't booked in 3 months with a reminder of what a full detail includes.",
    color: "purple",
  },
  coating_anniversary: {
    when: "1 year after ceramic coating",
    desc: "Reminds coating customers that annual maintenance keeps their coating performing at its best.",
    color: "amber",
  },
};

const COLOR_MAP: Record<string, string> = {
  blue:   "text-blue-400 bg-blue-500/10 border-blue-500/20",
  yellow: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  amber:  "text-amber-400 bg-amber-500/10 border-amber-500/20",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === "sent")    return <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400"><CheckCircle2 className="w-2.5 h-2.5" />Sent</span>;
  if (status === "skipped") return <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted/30 border border-border text-muted-foreground"><XCircle className="w-2.5 h-2.5" />Skipped</span>;
  return <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400"><AlertCircle className="w-2.5 h-2.5" />Error</span>;
}

function TabButton({ label, active, onClick, count }: { label: string; active: boolean; onClick: () => void; count?: number }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
        active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
      }`}
    >
      {label}
      {count !== undefined && (
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Custom Automation Form ───────────────────────────────────────────────────

function CustomAutomationForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    name:         initial?.name         ?? "",
    triggerType:  initial?.triggerType  ?? "days_after_booking_created",
    triggerValue: initial?.triggerValue ?? 1,
    triggerUnit:  initial?.triggerUnit  ?? "days",
    subject:      initial?.subject      ?? "",
    body:         initial?.body         ?? "",
    enabled:      initial?.enabled      ?? true,
  });
  const [showTags, setShowTags] = useState(false);

  const insertTag = (tag: string) => {
    setForm(f => ({ ...f, body: f.body + tag }));
  };

  const triggerLabel = TRIGGER_OPTIONS.find(t => t.value === form.triggerType)?.label ?? "";

  return (
    <div className="border border-primary/30 rounded-2xl bg-primary/5 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-primary/20">
        <p className="font-semibold text-sm text-foreground">{initial ? "Edit Automation" : "New Custom Automation"}</p>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors"><X className="w-4 h-4" /></button>
      </div>

      <div className="p-5 space-y-4">
        {/* Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">Automation Name</label>
          <input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Post-Detail Upsell, Seasonal Promo"
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-input text-sm focus:outline-none focus:border-primary/60 transition-colors"
          />
        </div>

        {/* Trigger */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">When to send</label>
          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              value={form.triggerValue}
              onChange={e => setForm(f => ({ ...f, triggerValue: Number(e.target.value) }))}
              className="w-20 px-3 py-2.5 rounded-xl border border-border bg-input text-sm focus:outline-none focus:border-primary/60 text-center"
            />
            <select
              value={form.triggerUnit}
              onChange={e => setForm(f => ({ ...f, triggerUnit: e.target.value }))}
              className="px-3 py-2.5 rounded-xl border border-border bg-input text-sm focus:outline-none focus:border-primary/60"
            >
              {UNIT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select
              value={form.triggerType}
              onChange={e => setForm(f => ({ ...f, triggerType: e.target.value }))}
              className="flex-1 px-3 py-2.5 rounded-xl border border-border bg-input text-sm focus:outline-none focus:border-primary/60"
            >
              {TRIGGER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Info className="w-3 h-3" />
            Fires {form.triggerValue} {form.triggerUnit} {triggerLabel}
          </p>
        </div>

        {/* Subject */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">Email Subject</label>
          <input
            value={form.subject}
            onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
            placeholder="e.g. {{firstName}}, your car is ready for its next detail"
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-input text-sm focus:outline-none focus:border-primary/60 transition-colors"
          />
        </div>

        {/* Body */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-foreground">Email Body</label>
            <button
              onClick={() => setShowTags(s => !s)}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Zap className="w-3 h-3" /> Merge tags
            </button>
          </div>

          {showTags && (
            <div className="p-3 rounded-xl border border-border bg-muted/20 mb-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Click to insert</p>
              <div className="flex flex-wrap gap-1.5">
                {MERGE_TAGS.map(t => (
                  <button
                    key={t.tag}
                    onClick={() => insertTag(t.tag)}
                    title={t.desc}
                    className="text-[11px] font-mono px-2 py-1 rounded-lg border border-primary/30 bg-primary/8 text-primary hover:bg-primary/15 transition-colors"
                  >
                    {t.tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          <textarea
            value={form.body}
            onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
            placeholder={`Hi {{firstName}},\n\nWe recently completed your {{packageName}} and wanted to follow up...\n\n— Detailing Labs`}
            rows={8}
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-input text-sm font-mono resize-none focus:outline-none focus:border-primary/60 transition-colors leading-relaxed"
          />
          <p className="text-[10px] text-muted-foreground">Plain text with merge tags. New lines become line breaks in the email.</p>
        </div>

        {/* Enabled */}
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            onClick={() => setForm(f => ({ ...f, enabled: !f.enabled }))}
            className={`w-10 h-6 rounded-full transition-colors flex items-center ${form.enabled ? "bg-primary" : "bg-muted"}`}
          >
            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform mx-1 ${form.enabled ? "translate-x-4" : "translate-x-0"}`} />
          </div>
          <span className="text-sm font-medium text-foreground">{form.enabled ? "Active" : "Paused"}</span>
        </label>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.name || !form.subject || !form.body}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 transition-colors"
          >
            {saving ? "Saving…" : (initial ? "Save Changes" : "Create Automation")}
          </button>
          <button onClick={onCancel} className="px-4 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminAutomations() {
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<Tab>("automations");
  const [logFilter, setLogFilter] = useState<string | undefined>();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [expandedBuiltIn, setExpandedBuiltIn] = useState<string | null>(null);

  const { data: stats } = trpc.automations.getStats.useQuery();
  const { data: settings, isLoading: settingsLoading } = trpc.automations.getSettings.useQuery();
  const { data: customs, isLoading: customsLoading } = trpc.customAutomations.list.useQuery();
  const { data: logs, isLoading: logsLoading, refetch: refetchLogs } = trpc.automations.getLogs.useQuery({ limit: 100, type: logFilter });

  const toggle = trpc.automations.toggle.useMutation({
    onSuccess: () => { utils.automations.getSettings.invalidate(); toast.success("Updated"); },
  });

  const triggerNow = trpc.automations.triggerNow.useMutation({
    onSuccess: (d) => {
      toast.success(d.message);
      setTimeout(() => { refetchLogs(); utils.automations.getStats.invalidate(); }, 5000);
    },
  });

  const createCustom = trpc.customAutomations.create.useMutation({
    onSuccess: () => { utils.customAutomations.list.invalidate(); setCreating(false); toast.success("Automation created"); },
    onError:   () => toast.error("Failed to create"),
  });

  const updateCustom = trpc.customAutomations.update.useMutation({
    onSuccess: () => { utils.customAutomations.list.invalidate(); setEditing(null); toast.success("Automation updated"); },
    onError:   () => toast.error("Failed to update"),
  });

  const deleteCustom = trpc.customAutomations.delete.useMutation({
    onSuccess: () => { utils.customAutomations.list.invalidate(); toast.success("Deleted"); },
    onError:   () => toast.error("Failed to delete"),
  });

  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl mx-auto">

        {/* Page header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold">Email Automations</h1>
            <p className="text-sm text-muted-foreground mt-1">Emails fire automatically. Every send checks your unsubscribe list first.</p>
          </div>
          <button
            onClick={() => triggerNow.mutate()}
            disabled={triggerNow.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-primary/40 bg-primary/8 text-primary text-sm font-semibold hover:bg-primary/15 transition-colors disabled:opacity-50 flex-shrink-0"
          >
            {triggerNow.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Running…</> : <><Play className="w-4 h-4" />Run Now</>}
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "This week",  value: stats?.sent7d  ?? "—" },
            { label: "This month", value: stats?.sent30d ?? "—" },
            { label: "All time",   value: stats?.sentAll ?? "—" },
          ].map(s => (
            <div key={s.label} className="p-4 rounded-xl border border-border bg-card text-center">
              <p className="text-2xl font-display font-bold text-primary">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-border pb-2">
          <TabButton label="Built-in"   active={tab === "automations"} onClick={() => setTab("automations")} count={settings?.length} />
          <TabButton label="Custom"     active={tab === "custom"}      onClick={() => setTab("custom")}      count={customs?.length} />
          <TabButton label="Send Log"   active={tab === "logs"}        onClick={() => setTab("logs")}        count={logs?.length} />
        </div>

        {/* ── TAB: Built-in ─────────────────────────────────────── */}
        {tab === "automations" && (
          <div className="space-y-3">
            {settingsLoading ? (
              Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 rounded-xl border border-border bg-card animate-pulse" />)
            ) : settings?.map(s => {
              const meta = BUILT_IN_META[s.type];
              const isOpen = expandedBuiltIn === s.type;
              const colorCls = meta ? COLOR_MAP[meta.color] : COLOR_MAP.purple;

              return (
                <div key={s.type} className={`rounded-xl border bg-card overflow-hidden transition-opacity ${!s.enabled ? "opacity-50" : ""}`}>
                  <div className="flex items-center gap-4 p-4">
                    {/* Type badge */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center ${colorCls}`}>
                      <Mail className="w-4 h-4" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground">{s.label}</p>
                      {meta && (
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3 flex-shrink-0" /> {meta.when}
                        </p>
                      )}
                    </div>

                    {/* Sent count */}
                    <div className="text-right flex-shrink-0 mr-1">
                      <p className="text-sm font-bold">{s.sent30d}</p>
                      <p className="text-[10px] text-muted-foreground">sent / 30d</p>
                    </div>

                    {/* Toggle */}
                    <button
                      onClick={() => toggle.mutate({ type: s.type, enabled: !s.enabled })}
                      disabled={toggle.isPending}
                      className={`flex-shrink-0 transition-colors ${s.enabled ? "text-primary" : "text-muted-foreground/30"}`}
                      title={s.enabled ? "Disable" : "Enable"}
                    >
                      {s.enabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                    </button>

                    {/* Expand */}
                    <button
                      onClick={() => setExpandedBuiltIn(isOpen ? null : s.type)}
                      className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                  </div>

                  {isOpen && meta && (
                    <div className="px-5 pb-4 pt-0 border-t border-border/40">
                      <p className="text-sm text-muted-foreground leading-relaxed mt-3">{meta.desc}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── TAB: Custom ───────────────────────────────────────── */}
        {tab === "custom" && (
          <div className="space-y-3">
            {!creating && !editing && (
              <button
                onClick={() => setCreating(true)}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/4 text-sm font-medium text-muted-foreground hover:text-primary transition-all"
              >
                <Plus className="w-4 h-4" /> Create Custom Automation
              </button>
            )}

            {creating && (
              <CustomAutomationForm
                onSave={(d) => createCustom.mutate(d)}
                onCancel={() => setCreating(false)}
                saving={createCustom.isPending}
              />
            )}

            {customsLoading ? (
              Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-16 rounded-xl border border-border bg-card animate-pulse" />)
            ) : customs?.length === 0 && !creating ? (
              <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-2xl">
                <Zap className="w-8 h-8 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground font-medium">No custom automations yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Create one above to get started</p>
              </div>
            ) : customs?.map(c => (
              editing?.id === c.id ? (
                <CustomAutomationForm
                  key={c.id}
                  initial={editing}
                  onSave={(d) => updateCustom.mutate({ id: c.id, ...d })}
                  onCancel={() => setEditing(null)}
                  saving={updateCustom.isPending}
                />
              ) : (
                <div key={c.id} className={`rounded-xl border bg-card overflow-hidden ${!c.enabled ? "opacity-50" : ""}`}>
                  <div className="flex items-center gap-4 p-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg border border-purple-500/20 bg-purple-500/10 flex items-center justify-center text-purple-400">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground">{c.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {c.triggerValue} {c.triggerUnit} {TRIGGER_OPTIONS.find(t => t.value === c.triggerType)?.label}
                        {" · "}{c.sent30d} sent / 30d
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => updateCustom.mutate({ id: c.id, enabled: !c.enabled })}
                        className={`transition-colors ${c.enabled ? "text-primary" : "text-muted-foreground/30"}`}
                      >
                        {c.enabled ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
                      </button>
                      <button onClick={() => setEditing(c)} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { if (confirm(`Delete "${c.name}"?`)) deleteCustom.mutate({ id: c.id }); }}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            ))}
          </div>
        )}

        {/* ── TAB: Logs ─────────────────────────────────────────── */}
        {tab === "logs" && (
          <div>
            <div className="flex items-center justify-between mb-3 gap-3">
              <div className="flex items-center gap-2">
                <select
                  value={logFilter ?? ""}
                  onChange={e => setLogFilter(e.target.value || undefined)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-border bg-input text-foreground focus:outline-none"
                >
                  <option value="">All automations</option>
                  {settings?.map(s => <option key={s.type} value={s.type}>{s.label}</option>)}
                  <option value="custom">Custom automations</option>
                </select>
              </div>
              <button onClick={() => refetchLogs()} className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors" title="Refresh">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="rounded-xl border border-border overflow-hidden">
              {logsLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                </div>
              ) : !logs?.length ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Send className="w-8 h-8 text-muted-foreground/20 mb-3" />
                  <p className="text-sm text-muted-foreground">No emails sent yet</p>
                  <p className="text-xs text-muted-foreground/50 mt-1">Automations run every 15 minutes</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/20 border-b border-border">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Automation</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Recipient</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Status</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Sent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(log => (
                      <tr key={log.id} className="border-b border-border/40 last:border-0 hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-xs font-medium text-foreground">{log.label}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-muted-foreground font-mono truncate max-w-[180px]">{log.email}</p>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={log.status} /></td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-muted-foreground">
                            {new Date(log.sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}{" "}
                            {new Date(log.sentAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {(logs?.length ?? 0) >= 100 && <p className="text-xs text-muted-foreground text-center mt-2">Showing last 100 entries</p>}
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
