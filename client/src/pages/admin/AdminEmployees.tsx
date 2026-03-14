import { useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  Plus, ChevronLeft, Phone, Mail, Loader2, Edit, User, Calendar, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  manager: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  detailer: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/15 text-green-400 border-green-500/20",
  inactive: "bg-gray-500/15 text-gray-400 border-gray-500/20",
  on_leave: "bg-amber-500/15 text-amber-400 border-amber-500/20",
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function AdminEmployeesList() {
  const [showAddModal, setShowAddModal] = useState(false);
  const { data: employees, isLoading, refetch } = trpc.employees.list.useQuery();

  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold">Employees</h1>
            <p className="text-muted-foreground text-sm">{employees?.length ?? 0} team members</p>
          </div>
          <Button onClick={() => setShowAddModal(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
            <Plus className="w-4 h-4 mr-2" /> Add Employee
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(employees ?? []).map((emp) => {
              const skills = emp.skills ? JSON.parse(emp.skills) : [];
              return (
                <a key={emp.id} href={`/admin/employees/${emp.id}`}>
                  <div className="p-5 rounded-xl border border-border bg-card hover:border-primary/40 transition-all cursor-pointer">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center font-display font-bold text-primary">
                        {emp.firstName[0]}{emp.lastName[0]}
                      </div>
                      <div className="flex gap-1.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ROLE_COLORS[emp.role] ?? ""}`}>
                          {emp.role}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[emp.status ?? ""] ?? ""}`}>
                          {emp.status?.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                    <div className="font-semibold">{emp.firstName} {emp.lastName}</div>
                    {emp.phone && <div className="text-xs text-muted-foreground mt-0.5">{emp.phone}</div>}
                    {skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {skills.slice(0, 3).map((s: string) => (
                          <span key={s} className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{s}</span>
                        ))}
                        {skills.length > 3 && <span className="text-xs text-muted-foreground">+{skills.length - 3}</span>}
                      </div>
                    )}
                  </div>
                </a>
              );
            })}
          </div>
        )}

        <AddEmployeeModal open={showAddModal} onClose={() => setShowAddModal(false)} onSuccess={() => { setShowAddModal(false); refetch(); }} />
      </div>
    </AdminLayout>
  );
}

export function AdminEmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const empId = parseInt(id ?? "0");
  const [showAvailModal, setShowAvailModal] = useState(false);
  const [availability, setAvailability] = useState<{ dayOfWeek: number; startTime: string; endTime: string; isAvailable: boolean }[]>(
    DAYS.map((_, i) => ({ dayOfWeek: i, startTime: "09:00", endTime: "17:00", isAvailable: i >= 1 && i <= 5 }))
  );

  const { data, refetch } = trpc.employees.get.useQuery({ id: empId }, { enabled: !!empId });

  const setAvail = trpc.employees.setAvailability.useMutation({
    onSuccess: () => { toast.success("Availability saved"); setShowAvailModal(false); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const updateEmployee = trpc.employees.update.useMutation({
    onSuccess: () => { toast.success("Updated"); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  if (!data) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      </AdminLayout>
    );
  }

  const { employee, availability: savedAvail, assignments } = data;
  const skills = employee.skills ? JSON.parse(employee.skills) : [];

  return (
    <AdminLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/employees")} className="text-muted-foreground">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-display font-bold">{employee.firstName} {employee.lastName}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ROLE_COLORS[employee.role] ?? ""}`}>{employee.role}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[employee.status ?? ""] ?? ""}`}>{employee.status?.replace("_", " ")}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <select
              defaultValue={employee.status ?? "active"}
              onChange={(e) => updateEmployee.mutate({ id: empId, status: e.target.value as any })}
              className="h-9 px-3 rounded-md border border-border bg-input text-foreground text-sm focus:outline-none"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="on_leave">On Leave</option>
            </select>
            <Button size="sm" onClick={() => setShowAvailModal(true)} variant="outline" className="border-border">
              <Calendar className="w-3 h-3 mr-1" /> Availability
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            {/* Contact */}
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-4">Contact Info</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {employee.phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-primary" />{employee.phone}</div>}
                {employee.email && <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-primary" />{employee.email}</div>}
              </div>
            </div>

            {/* Recent Assignments */}
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-4">Recent Jobs ({assignments.length})</h3>
              {assignments.length === 0 ? (
                <p className="text-muted-foreground text-sm">No assignments yet.</p>
              ) : (
                <div className="space-y-2">
                  {assignments.slice(0, 10).map(({ assignment, booking }) => (
                    <div key={assignment.id} className="flex items-center gap-3 p-3 rounded-lg border border-border text-sm">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                      <div className="flex-1">
                        <div className="font-medium">{booking?.customerFirstName} {booking?.customerLastName}</div>
                        <div className="text-xs text-muted-foreground">{booking?.packageName ?? "Custom"}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {booking?.appointmentDate ? new Date(booking.appointmentDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Skills */}
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-3">Skills</h3>
              {skills.length === 0 ? (
                <p className="text-muted-foreground text-sm">No skills listed.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((s: string) => (
                    <span key={s} className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">{s}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Availability Summary */}
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-3">Weekly Availability</h3>
              <div className="space-y-1.5">
                {DAYS.map((day, i) => {
                  const avail = savedAvail.find((a) => a.dayOfWeek === i);
                  return (
                    <div key={day} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground w-8">{day}</span>
                      {avail?.isAvailable ? (
                        <span className="text-emerald-400">{avail.startTime} – {avail.endTime}</span>
                      ) : (
                        <span className="text-muted-foreground">Off</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {employee.notes && (
              <div className="p-5 rounded-xl border border-border bg-card">
                <h3 className="font-semibold mb-2">Notes</h3>
                <p className="text-sm text-muted-foreground">{employee.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Availability Modal */}
        <Dialog open={showAvailModal} onOpenChange={setShowAvailModal}>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader><DialogTitle>Set Availability</DialogTitle></DialogHeader>
            <div className="space-y-3">
              {DAYS.map((day, i) => {
                const avail = availability[i];
                return (
                  <div key={day} className="flex items-center gap-3">
                    <div className="w-10 text-sm font-medium">{day}</div>
                    <input
                      type="checkbox"
                      checked={avail?.isAvailable ?? false}
                      onChange={(e) => setAvailability((prev) => prev.map((a) => a.dayOfWeek === i ? { ...a, isAvailable: e.target.checked } : a))}
                      className="accent-primary"
                    />
                    {avail?.isAvailable && (
                      <>
                        <Input
                          type="time"
                          value={avail.startTime}
                          onChange={(e) => setAvailability((prev) => prev.map((a) => a.dayOfWeek === i ? { ...a, startTime: e.target.value } : a))}
                          className="h-8 text-xs bg-input border-border w-28"
                        />
                        <span className="text-muted-foreground text-xs">to</span>
                        <Input
                          type="time"
                          value={avail.endTime}
                          onChange={(e) => setAvailability((prev) => prev.map((a) => a.dayOfWeek === i ? { ...a, endTime: e.target.value } : a))}
                          className="h-8 text-xs bg-input border-border w-28"
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3 justify-end mt-4">
              <Button variant="outline" onClick={() => setShowAvailModal(false)} className="border-border">Cancel</Button>
              <Button
                onClick={() => setAvail.mutate({ employeeId: empId, availability })}
                disabled={setAvail.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {setAvail.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

function AddEmployeeModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", role: "detailer" as const, notes: "" });
  const create = trpc.employees.create.useMutation({
    onSuccess: () => { toast.success("Employee added!"); onSuccess(); },
    onError: (err) => toast.error(err.message),
  });
  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader><DialogTitle>Add Employee</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label>First Name *</Label><Input value={form.firstName} onChange={(e) => update("firstName", e.target.value)} className="bg-input border-border" /></div>
          <div className="space-y-2"><Label>Last Name *</Label><Input value={form.lastName} onChange={(e) => update("lastName", e.target.value)} className="bg-input border-border" /></div>
          <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => update("phone", e.target.value)} className="bg-input border-border" /></div>
          <div className="space-y-2"><Label>Email</Label><Input value={form.email} onChange={(e) => update("email", e.target.value)} className="bg-input border-border" /></div>
          <div className="space-y-2 col-span-2">
            <Label>Role</Label>
            <select value={form.role} onChange={(e) => update("role", e.target.value)} className="w-full h-10 px-3 rounded-md border border-border bg-input text-foreground text-sm focus:outline-none">
              <option value="detailer">Detailer</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="space-y-2 col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} className="bg-input border-border resize-none" rows={2} /></div>
        </div>
        <div className="flex gap-3 justify-end mt-2">
          <Button variant="outline" onClick={onClose} className="border-border">Cancel</Button>
          <Button
            onClick={() => create.mutate({ firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone, role: form.role, notes: form.notes })}
            disabled={!form.firstName || !form.lastName || create.isPending}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Employee"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
