import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Pencil, Plus, Trash2, Save, Globe, DollarSign,
  MessageSquare, Phone, HelpCircle, Settings2, Star, Package
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function useContentMap(data: { section: string; key: string; value: string | null }[] | undefined) {
  const map: Record<string, Record<string, string>> = {};
  if (!data) return map;
  for (const row of data) {
    if (!map[row.section]) map[row.section] = {};
    map[row.section][row.key] = row.value ?? "";
  }
  return map;
}

// ─── Section Editor (generic key/value form) ──────────────────────────────────
function SectionEditor({
  section,
  fields,
  contentMap,
  onSave,
  isSaving,
}: {
  section: string;
  fields: { key: string; label: string; multiline?: boolean; hint?: string }[];
  contentMap: Record<string, Record<string, string>>;
  onSave: (items: { section: string; key: string; value: string }[]) => void;
  isSaving: boolean;
}) {
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const initial: Record<string, string> = {};
    for (const f of fields) {
      initial[f.key] = contentMap[section]?.[f.key] ?? "";
    }
    setValues(initial);
  }, [contentMap, section]);

  const handleSave = () => {
    const items = fields.map((f) => ({ section, key: f.key, value: values[f.key] ?? "" }));
    onSave(items);
  };

  return (
    <div className="space-y-5">
      {fields.map((f) => (
        <div key={f.key} className="space-y-1.5">
          <Label className="text-sm font-medium text-foreground">{f.label}</Label>
          {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
          {f.multiline ? (
            <Textarea
              value={values[f.key] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              rows={4}
              className="bg-background/50 border-border/60 resize-none"
            />
          ) : (
            <Input
              value={values[f.key] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              className="bg-background/50 border-border/60"
            />
          )}
        </div>
      ))}
      <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary/90">
        <Save className="h-4 w-4 mr-2" />
        {isSaving ? "Saving…" : "Save Changes"}
      </Button>
    </div>
  );
}

// ─── FAQ Editor ───────────────────────────────────────────────────────────────
function FAQEditor({
  contentMap,
  onSave,
  isSaving,
}: {
  contentMap: Record<string, Record<string, string>>;
  onSave: (items: { section: string; key: string; value: string }[]) => void;
  isSaving: boolean;
}) {
  const faqSection = contentMap["faq"] ?? {};
  // Build FAQ pairs from keys like item_1_q / item_1_a
  const indicesSet = Object.keys(faqSection)
    .filter((k) => k.startsWith("item_"))
    .map((k) => k.split("_")[1]);
  const indices = indicesSet.filter((v, i, a) => a.indexOf(v) === i).sort();

  const [faqs, setFaqs] = useState<{ q: string; a: string }[]>([]);

  useEffect(() => {
    const loaded = indices.map((i) => ({
      q: faqSection[`item_${i}_q`] ?? "",
      a: faqSection[`item_${i}_a`] ?? "",
    }));
    if (loaded.length === 0) {
      setFaqs([{ q: "", a: "" }]);
    } else {
      setFaqs(loaded);
    }
  }, [contentMap]);

  const handleSave = () => {
    const items: { section: string; key: string; value: string }[] = [];
    faqs.forEach((faq, i) => {
      items.push({ section: "faq", key: `item_${i + 1}_q`, value: faq.q });
      items.push({ section: "faq", key: `item_${i + 1}_a`, value: faq.a });
    });
    onSave(items);
  };

  return (
    <div className="space-y-4">
      {faqs.map((faq, i) => (
        <Card key={i} className="bg-card/50 border-border/60">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">FAQ #{i + 1}</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive h-7 px-2"
                onClick={() => setFaqs((f) => f.filter((_, j) => j !== i))}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Question</Label>
              <Input
                value={faq.q}
                onChange={(e) => setFaqs((f) => f.map((x, j) => j === i ? { ...x, q: e.target.value } : x))}
                placeholder="Enter question…"
                className="bg-background/50 border-border/60"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Answer</Label>
              <Textarea
                value={faq.a}
                onChange={(e) => setFaqs((f) => f.map((x, j) => j === i ? { ...x, a: e.target.value } : x))}
                placeholder="Enter answer…"
                rows={3}
                className="bg-background/50 border-border/60 resize-none"
              />
            </div>
          </CardContent>
        </Card>
      ))}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => setFaqs((f) => [...f, { q: "", a: "" }])}
          className="border-border/60"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add FAQ
        </Button>
        <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary/90">
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving…" : "Save FAQs"}
        </Button>
      </div>
    </div>
  );
}

// ─── Package Editor ───────────────────────────────────────────────────────────
function PackageEditor() {
  const utils = trpc.useUtils();
  const { data: pkgs, isLoading } = trpc.content.getPackages.useQuery();
  const upsert = trpc.content.upsertPackage.useMutation({
    onSuccess: () => { utils.content.getPackages.invalidate(); toast.success("Package saved"); setEditPkg(null); },
    onError: () => toast.error("Failed to save package"),
  });
  const deletePkg = trpc.content.deletePackage.useMutation({
    onSuccess: () => { utils.content.getPackages.invalidate(); toast.success("Package deactivated"); },
  });

  const [editPkg, setEditPkg] = useState<null | {
    id?: number; name: string; description: string; price: string;
    duration: number; features: string; isPopular: boolean; isActive: boolean; sortOrder: number;
  }>(null);

  const openNew = () => setEditPkg({ name: "", description: "", price: "0.00", duration: 120, features: "[]", isPopular: false, isActive: true, sortOrder: 0 });
  const openEdit = (p: NonNullable<typeof pkgs>[number]) => setEditPkg({
    id: p.id, name: p.name, description: p.description ?? "", price: String(p.price),
    duration: p.duration, features: p.features ?? "[]", isPopular: p.isPopular ?? false,
    isActive: p.isActive ?? true, sortOrder: p.sortOrder ?? 0,
  });

  const handleSave = () => {
    if (!editPkg) return;
    // Parse features from newline-separated text to JSON
    let featuresJson = editPkg.features;
    try { JSON.parse(featuresJson); } catch {
      featuresJson = JSON.stringify(editPkg.features.split("\n").map((s) => s.trim()).filter(Boolean));
    }
    upsert.mutate({ ...editPkg, features: featuresJson });
  };

  const featuresDisplay = (featuresJson: string | null) => {
    try { return (JSON.parse(featuresJson ?? "[]") as string[]).slice(0, 3).join(", "); } catch { return ""; }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Manage your service packages. Changes reflect immediately in the booking form.</p>
        <Button onClick={openNew} className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" /> Add Package
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">Loading packages…</div>
      ) : (
        <div className="space-y-3">
          {pkgs?.map((p) => (
            <Card key={p.id} className={`bg-card/50 border-border/60 ${!p.isActive ? "opacity-50" : ""}`}>
              <CardContent className="py-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-foreground">{p.name}</span>
                    {p.isPopular && <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">Popular</Badge>}
                    {!p.isActive && <Badge variant="outline" className="text-xs text-muted-foreground">Inactive</Badge>}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">{featuresDisplay(p.features)}</div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="text-lg font-bold text-primary">${Number(p.price).toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">{Math.round(p.duration / 60)}h</div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(p)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => deletePkg.mutate({ id: p.id })}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editPkg} onOpenChange={(o) => !o && setEditPkg(null)}>
        <DialogContent className="max-w-lg bg-card border-border/60 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editPkg?.id ? "Edit Package" : "New Package"}</DialogTitle>
          </DialogHeader>
          {editPkg && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Package Name</Label>
                <Input value={editPkg.name} onChange={(e) => setEditPkg((p) => p && ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea value={editPkg.description} onChange={(e) => setEditPkg((p) => p && ({ ...p, description: e.target.value }))} rows={3} className="resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Price ($)</Label>
                  <Input type="number" step="0.01" value={editPkg.price} onChange={(e) => setEditPkg((p) => p && ({ ...p, price: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Duration (minutes)</Label>
                  <Input type="number" value={editPkg.duration} onChange={(e) => setEditPkg((p) => p && ({ ...p, duration: Number(e.target.value) }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Features (one per line)</Label>
                <Textarea
                  value={(() => { try { return (JSON.parse(editPkg.features) as string[]).join("\n"); } catch { return editPkg.features; } })()}
                  onChange={(e) => setEditPkg((p) => p && ({ ...p, features: JSON.stringify(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean)) }))}
                  rows={5}
                  placeholder={"Exterior hand wash & dry\nWheel & tire cleaning\nWindow cleaning"}
                  className="resize-none font-mono text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Switch checked={editPkg.isPopular} onCheckedChange={(v) => setEditPkg((p) => p && ({ ...p, isPopular: v }))} />
                  <Label>Mark as Popular</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={editPkg.isActive} onCheckedChange={(v) => setEditPkg((p) => p && ({ ...p, isActive: v }))} />
                  <Label>Active</Label>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Sort Order</Label>
                <Input type="number" value={editPkg.sortOrder} onChange={(e) => setEditPkg((p) => p && ({ ...p, sortOrder: Number(e.target.value) }))} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPkg(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={upsert.isPending} className="bg-primary hover:bg-primary/90">
              {upsert.isPending ? "Saving…" : "Save Package"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Add-On Editor ────────────────────────────────────────────────────────────
function AddOnEditor() {
  const utils = trpc.useUtils();
  const { data: addons, isLoading } = trpc.content.getAddOns.useQuery();
  const upsert = trpc.content.upsertAddOn.useMutation({
    onSuccess: () => { utils.content.getAddOns.invalidate(); toast.success("Add-on saved"); setEditAddon(null); },
    onError: () => toast.error("Failed to save add-on"),
  });
  const deleteAddon = trpc.content.deleteAddOn.useMutation({
    onSuccess: () => { utils.content.getAddOns.invalidate(); toast.success("Add-on deactivated"); },
  });

  const [editAddon, setEditAddon] = useState<null | {
    id?: number; name: string; description: string; price: string; duration: number; isActive: boolean; sortOrder: number;
  }>(null);

  const openNew = () => setEditAddon({ name: "", description: "", price: "0.00", duration: 0, isActive: true, sortOrder: 0 });
  const openEdit = (a: NonNullable<typeof addons>[number]) => setEditAddon({
    id: a.id, name: a.name, description: a.description ?? "", price: String(a.price),
    duration: a.duration ?? 0, isActive: a.isActive ?? true, sortOrder: a.sortOrder ?? 0,
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Manage optional add-ons customers can select during booking.</p>
        <Button onClick={openNew} className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" /> Add Add-On
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">Loading add-ons…</div>
      ) : (
        <div className="space-y-3">
          {addons?.map((a) => (
            <Card key={a.id} className={`bg-card/50 border-border/60 ${!a.isActive ? "opacity-50" : ""}`}>
              <CardContent className="py-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-foreground">{a.name}</span>
                    {!a.isActive && <Badge variant="outline" className="text-xs text-muted-foreground">Inactive</Badge>}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">{a.description}</div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="text-lg font-bold text-primary">+${Number(a.price).toFixed(2)}</div>
                    {(a.duration ?? 0) > 0 && <div className="text-xs text-muted-foreground">+{a.duration} min</div>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(a)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => deleteAddon.mutate({ id: a.id })}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editAddon} onOpenChange={(o) => !o && setEditAddon(null)}>
        <DialogContent className="max-w-md bg-card border-border/60">
          <DialogHeader>
            <DialogTitle>{editAddon?.id ? "Edit Add-On" : "New Add-On"}</DialogTitle>
          </DialogHeader>
          {editAddon && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Add-On Name</Label>
                <Input value={editAddon.name} onChange={(e) => setEditAddon((a) => a && ({ ...a, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea value={editAddon.description} onChange={(e) => setEditAddon((a) => a && ({ ...a, description: e.target.value }))} rows={2} className="resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Price ($)</Label>
                  <Input type="number" step="0.01" value={editAddon.price} onChange={(e) => setEditAddon((a) => a && ({ ...a, price: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Extra Duration (min)</Label>
                  <Input type="number" value={editAddon.duration} onChange={(e) => setEditAddon((a) => a && ({ ...a, duration: Number(e.target.value) }))} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editAddon.isActive} onCheckedChange={(v) => setEditAddon((a) => a && ({ ...a, isActive: v }))} />
                <Label>Active</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditAddon(null)}>Cancel</Button>
            <Button onClick={() => editAddon && upsert.mutate(editAddon)} disabled={upsert.isPending} className="bg-primary hover:bg-primary/90">
              {upsert.isPending ? "Saving…" : "Save Add-On"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminSiteEditor() {
  const { data: allContent, isLoading } = trpc.content.getSiteContent.useQuery({});
  const bulkUpsert = trpc.content.bulkUpsertSiteContent.useMutation({
    onSuccess: (res) => toast.success(`Saved ${res.count} field${res.count !== 1 ? "s" : ""}`),
    onError: () => toast.error("Failed to save changes"),
  });

  const contentMap = useContentMap(allContent);

  const handleSave = (items: { section: string; key: string; value: string }[]) => {
    bulkUpsert.mutate(items);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64 text-muted-foreground">Loading site content…</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Site Content Editor</h1>
          <p className="text-muted-foreground mt-1">
            Edit your website text, pricing, and FAQs. All changes go live immediately on your public site and booking form.
          </p>
        </div>

        <Tabs defaultValue="pricing" className="space-y-6">
          <TabsList className="bg-card/50 border border-border/60 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="pricing" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-white">
              <DollarSign className="h-3.5 w-3.5" /> Pricing
            </TabsTrigger>
            <TabsTrigger value="addons" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-white">
              <Package className="h-3.5 w-3.5" /> Add-Ons
            </TabsTrigger>
            <TabsTrigger value="hero" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-white">
              <Globe className="h-3.5 w-3.5" /> Hero
            </TabsTrigger>
            <TabsTrigger value="about" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-white">
              <Star className="h-3.5 w-3.5" /> About
            </TabsTrigger>
            <TabsTrigger value="contact" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-white">
              <Phone className="h-3.5 w-3.5" /> Contact
            </TabsTrigger>
            <TabsTrigger value="faq" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-white">
              <HelpCircle className="h-3.5 w-3.5" /> FAQs
            </TabsTrigger>
            <TabsTrigger value="business" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-white">
              <Settings2 className="h-3.5 w-3.5" /> Business
            </TabsTrigger>
          </TabsList>

          {/* ── Pricing ── */}
          <TabsContent value="pricing">
            <Card className="bg-card/50 border-border/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary" /> Service Packages</CardTitle>
                <CardDescription>Edit package names, descriptions, prices, durations, and features. Prices update immediately in the booking form.</CardDescription>
              </CardHeader>
              <CardContent><PackageEditor /></CardContent>
            </Card>
          </TabsContent>

          {/* ── Add-Ons ── */}
          <TabsContent value="addons">
            <Card className="bg-card/50 border-border/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5 text-primary" /> Add-On Services</CardTitle>
                <CardDescription>Manage optional services customers can add to their booking.</CardDescription>
              </CardHeader>
              <CardContent><AddOnEditor /></CardContent>
            </Card>
          </TabsContent>

          {/* ── Hero ── */}
          <TabsContent value="hero">
            <Card className="bg-card/50 border-border/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5 text-primary" /> Homepage Hero</CardTitle>
                <CardDescription>Edit the main headline, subtext, and trust badges shown on your homepage.</CardDescription>
              </CardHeader>
              <CardContent>
                <SectionEditor
                  section="hero"
                  fields={[
                    { key: "badge", label: "Badge Text", hint: "Small label above the headline (e.g. PREMIUM MOBILE DETAILING)" },
                    { key: "headline", label: "Main Headline", hint: "The large bold text visitors see first" },
                    { key: "subheadline", label: "Subheadline / Description", multiline: true },
                    { key: "cta_primary", label: "Primary Button Text" },
                    { key: "cta_secondary", label: "Secondary Button Text" },
                    { key: "trust_reviews", label: "Trust Badge — Reviews" },
                    { key: "trust_certified", label: "Trust Badge — Certification" },
                    { key: "trust_availability", label: "Trust Badge — Availability" },
                  ]}
                  contentMap={contentMap}
                  onSave={handleSave}
                  isSaving={bulkUpsert.isPending}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── About ── */}
          <TabsContent value="about">
            <Card className="bg-card/50 border-border/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Star className="h-5 w-5 text-primary" /> About Section</CardTitle>
                <CardDescription>Edit the about/stats section shown on the homepage and About page.</CardDescription>
              </CardHeader>
              <CardContent>
                <SectionEditor
                  section="about"
                  fields={[
                    { key: "headline", label: "Section Headline" },
                    { key: "body", label: "Body Text", multiline: true },
                    { key: "years_experience", label: "Stat — Years of Experience", hint: 'e.g. "8+"' },
                    { key: "vehicles_detailed", label: "Stat — Vehicles Detailed", hint: 'e.g. "2,500+"' },
                    { key: "satisfaction_rate", label: "Stat — Satisfaction Rate", hint: 'e.g. "99%"' },
                    { key: "service_areas", label: "Stat — Service Areas", hint: 'e.g. "15+"' },
                  ]}
                  contentMap={contentMap}
                  onSave={handleSave}
                  isSaving={bulkUpsert.isPending}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Contact ── */}
          <TabsContent value="contact">
            <Card className="bg-card/50 border-border/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Phone className="h-5 w-5 text-primary" /> Contact Information</CardTitle>
                <CardDescription>Update your phone number, email, address, and business hours shown across the site.</CardDescription>
              </CardHeader>
              <CardContent>
                <SectionEditor
                  section="contact"
                  fields={[
                    { key: "phone", label: "Phone Number" },
                    { key: "email", label: "Email Address" },
                    { key: "address", label: "City / Address" },
                    { key: "hours_weekday", label: "Weekday Hours", hint: 'e.g. "Mon–Fri: 7:00 AM – 7:00 PM"' },
                    { key: "hours_weekend", label: "Weekend Hours", hint: 'e.g. "Sat–Sun: 8:00 AM – 5:00 PM"' },
                  ]}
                  contentMap={contentMap}
                  onSave={handleSave}
                  isSaving={bulkUpsert.isPending}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── FAQ ── */}
          <TabsContent value="faq">
            <Card className="bg-card/50 border-border/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><HelpCircle className="h-5 w-5 text-primary" /> Frequently Asked Questions</CardTitle>
                <CardDescription>Add, edit, or remove FAQ items shown on the FAQ page.</CardDescription>
              </CardHeader>
              <CardContent>
                <FAQEditor contentMap={contentMap} onSave={handleSave} isSaving={bulkUpsert.isPending} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Business Settings ── */}
          <TabsContent value="business">
            <Card className="bg-card/50 border-border/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5 text-primary" /> Business Settings</CardTitle>
                <CardDescription>Configure tax rate, travel fees, service radius, and booking rules that affect pricing calculations.</CardDescription>
              </CardHeader>
              <CardContent>
                <SectionEditor
                  section="business"
                  fields={[
                    { key: "name", label: "Business Name" },
                    { key: "tagline", label: "Business Tagline" },
                    { key: "tax_rate", label: "Tax Rate", hint: 'Decimal format, e.g. "0.0825" for 8.25%' },
                    { key: "travel_fee_base", label: "Base Travel Fee ($)", hint: 'Flat fee added to all bookings, e.g. "0" for none' },
                    { key: "service_radius_miles", label: "Service Radius (miles)" },
                    { key: "booking_advance_hours", label: "Minimum Booking Lead Time (hours)", hint: 'How many hours in advance a customer must book' },
                  ]}
                  contentMap={contentMap}
                  onSave={handleSave}
                  isSaving={bulkUpsert.isPending}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
