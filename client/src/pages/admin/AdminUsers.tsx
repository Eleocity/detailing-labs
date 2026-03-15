import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Users, Search, Shield, ShieldOff, Trash2, Crown,
  Mail, Calendar, LogIn, UserCheck, Edit2, KeyRound,
  Copy, MoreHorizontal, X, Phone, Clock, RefreshCw,
  SortAsc, SortDesc, Filter, UserCircle,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

type SortField = "createdAt" | "lastSignedIn" | "name" | "email";
type SortDir = "asc" | "desc";
type RoleFilter = "all" | "admin" | "user";

type UserRow = {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: "admin" | "user";
  loginMethod: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
};

// ─── Edit Dialog ─────────────────────────────────────────────────────────────
function EditUserDialog({ user, open, onClose }: { user: UserRow; open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const { user: currentUser } = useAuth();
  const [name, setName] = useState(user.name ?? "");
  const [email, setEmail] = useState(user.email ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [role, setRole] = useState<"admin" | "user">(user.role);
  const isSelf = currentUser?.id === user.id;

  const updateMutation = trpc.users.update.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
      utils.users.stats.invalidate();
      toast.success("User updated.");
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="h-4 w-4 text-primary" /> Edit User
          </DialogTitle>
          <DialogDescription>
            Update profile and role for <span className="font-medium text-foreground">{user.name ?? user.email}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Full Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
          </div>
          <div className="space-y-1.5">
            <Label>Email Address</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" type="email" />
          </div>
          <div className="space-y-1.5">
            <Label>Phone Number</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 000-0000" type="tel" />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as "admin" | "user")} disabled={isSelf}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">
                  <span className="flex items-center gap-2"><UserCircle className="h-4 w-4" /> User</span>
                </SelectItem>
                <SelectItem value="admin">
                  <span className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Admin</span>
                </SelectItem>
              </SelectContent>
            </Select>
            {isSelf && <p className="text-xs text-muted-foreground">You cannot change your own role.</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => updateMutation.mutate({ userId: user.id, name, email, phone, role })} disabled={updateMutation.isPending}>
            {updateMutation.isPending && <RefreshCw className="h-4 w-4 animate-spin mr-2" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Reset Password Dialog ────────────────────────────────────────────────────
function ResetPasswordDialog({ user, open, onClose }: { user: UserRow; open: boolean; onClose: () => void }) {
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  const resetMutation = trpc.users.sendPasswordReset.useMutation({
    onSuccess: (data) => {
      setResetUrl(`${window.location.origin}/reset-password?token=${data.token}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleClose = () => { setResetUrl(null); onClose(); };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" /> Reset Password
          </DialogTitle>
          <DialogDescription>
            Generate a secure reset link for <span className="font-medium text-foreground">{user.name ?? user.email}</span>.
          </DialogDescription>
        </DialogHeader>
        {resetUrl ? (
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Share this link with the user. It expires in 24 hours.</p>
            <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
              <p className="text-xs font-mono text-foreground break-all flex-1">{resetUrl}</p>
              <Button size="sm" variant="ghost" className="flex-shrink-0 h-7 w-7 p-0"
                onClick={() => { navigator.clipboard.writeText(resetUrl); toast.success("Copied!"); }}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-2">
            This generates a secure one-time link valid for 24 hours that the user can use to set a new password.
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>{resetUrl ? "Close" : "Cancel"}</Button>
          {!resetUrl && (
            <Button onClick={() => resetMutation.mutate({ userId: user.id })} disabled={resetMutation.isPending}>
              {resetMutation.isPending && <RefreshCw className="h-4 w-4 animate-spin mr-2" />}
              Generate Link
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────
function UserDetailPanel({ user, isSelf, onEdit, onReset, onDelete, onClose }: {
  user: UserRow; isSelf: boolean;
  onEdit: () => void; onReset: () => void; onDelete: () => void; onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const setRoleMutation = trpc.users.setRole.useMutation({
    onSuccess: () => { utils.users.list.invalidate(); utils.users.stats.invalidate(); toast.success("Role updated."); },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-semibold">User Details</span>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Avatar + name */}
      <div className="px-4 py-5 flex flex-col items-center gap-3 border-b border-border">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary">
          {(user.name ?? user.email ?? "?").charAt(0).toUpperCase()}
        </div>
        <div className="text-center">
          <p className="font-semibold">{user.name ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
          <div className="mt-2 flex items-center justify-center gap-2 flex-wrap">
            {user.role === "admin" ? (
              <Badge className="bg-primary/20 text-primary border-primary/30 gap-1 text-xs">
                <Shield className="h-3 w-3" /> Admin
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground gap-1 text-xs">
                <UserCircle className="h-3 w-3" /> User
              </Badge>
            )}
            {isSelf && <Badge variant="outline" className="text-xs text-muted-foreground">You</Badge>}
          </div>
        </div>
      </div>

      {/* Meta */}
      <div className="p-4 space-y-2.5 flex-1 overflow-y-auto text-sm">
        {user.phone && (
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <Phone className="h-4 w-4 flex-shrink-0" /><span>{user.phone}</span>
          </div>
        )}
        <div className="flex items-center gap-2.5 text-muted-foreground">
          <Mail className="h-4 w-4 flex-shrink-0" /><span className="truncate">{user.email ?? "—"}</span>
        </div>
        <div className="flex items-center gap-2.5 text-muted-foreground">
          <Calendar className="h-4 w-4 flex-shrink-0" />
          <span>Joined {format(new Date(user.createdAt), "MMM d, yyyy")}</span>
        </div>
        <div className="flex items-center gap-2.5 text-muted-foreground">
          <Clock className="h-4 w-4 flex-shrink-0" />
          <span>Active {formatDistanceToNow(new Date(user.lastSignedIn), { addSuffix: true })}</span>
        </div>
        {user.loginMethod && (
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <LogIn className="h-4 w-4 flex-shrink-0" />
            <span className="capitalize">{user.loginMethod}</span>
          </div>
        )}

        <Separator className="my-1" />

        {/* Role toggle */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Assign Role</p>
          <div className="flex gap-2">
            <Button size="sm" variant={user.role === "user" ? "default" : "outline"}
              className="flex-1 h-8 text-xs"
              disabled={isSelf || user.role === "user" || setRoleMutation.isPending}
              onClick={() => setRoleMutation.mutate({ userId: user.id, role: "user" })}>
              <UserCircle className="h-3 w-3 mr-1" /> User
            </Button>
            <Button size="sm" variant={user.role === "admin" ? "default" : "outline"}
              className="flex-1 h-8 text-xs"
              disabled={isSelf || user.role === "admin" || setRoleMutation.isPending}
              onClick={() => setRoleMutation.mutate({ userId: user.id, role: "admin" })}>
              <Shield className="h-3 w-3 mr-1" /> Admin
            </Button>
          </div>
          {isSelf && <p className="text-xs text-muted-foreground">You cannot change your own role.</p>}
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-border space-y-2">
        <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={onEdit}>
          <Edit2 className="h-4 w-4" /> Edit Profile
        </Button>
        <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={onReset}>
          <KeyRound className="h-4 w-4" /> Generate Reset Link
        </Button>
        {!isSelf && (
          <Button variant="outline" size="sm"
            className="w-full justify-start gap-2 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={onDelete}>
            <Trash2 className="h-4 w-4" /> Delete Account
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [resetUser, setResetUser] = useState<UserRow | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null);

  const utils = trpc.useUtils();
  const { data: stats } = trpc.users.stats.useQuery();
  const { data: rawUsers, isLoading } = trpc.users.list.useQuery({
    search: search || undefined,
    role: roleFilter,
    sortBy,
    sortDir,
  });

  const setRoleMutation = trpc.users.setRole.useMutation({
    onSuccess: (_, vars) => {
      utils.users.list.invalidate();
      utils.users.stats.invalidate();
      toast.success(vars.role === "admin" ? "Promoted to Admin." : "Reverted to User.");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.users.delete.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
      utils.users.stats.invalidate();
      setDeleteUser(null);
      setSelectedUser(null);
      toast.success("User deleted.");
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleSort = (field: SortField) => {
    if (sortBy === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(field); setSortDir("asc"); }
  };

  const SortBtn = ({ field, label }: { field: SortField; label: string }) => (
    <button className="flex items-center gap-1 hover:text-foreground transition-colors text-left"
      onClick={() => toggleSort(field)}>
      {label}
      {sortBy === field && (sortDir === "asc"
        ? <SortAsc className="h-3 w-3 text-primary" />
        : <SortDesc className="h-3 w-3 text-primary" />)}
    </button>
  );

  const userList = rawUsers as UserRow[] | undefined;

  return (
    <AdminLayout>
      <div className="flex h-full">
        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <div className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-10 px-6 py-4">
            <h1 className="text-xl font-display font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> User Management
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage accounts, roles, and admin access
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: Users, label: "Total Users", value: stats?.total ?? 0, color: "bg-blue-500/10 text-blue-400" },
                { icon: Crown, label: "Admins", value: stats?.admins ?? 0, color: "bg-primary/10 text-primary" },
                { icon: UserCheck, label: "New (30d)", value: stats?.recentSignups ?? 0, color: "bg-green-500/10 text-green-400" },
                { icon: Clock, label: "Active (7d)", value: stats?.activeLastWeek ?? 0, color: "bg-orange-500/10 text-orange-400" },
              ].map(({ icon: Icon, label, value, color }) => (
                <Card key={label} className="bg-card/60 border-border/50">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xl font-bold font-display">{value}</p>
                      <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* How it works */}
            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">How to give someone admin access</p>
              <p>Ask your team member to register at <strong>/register</strong> and sign in once. They will appear here as a standard user. Click <strong>Promote to Admin</strong> (or use the role toggle in the detail panel) to grant them full dashboard access.</p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by name or email…" value={search}
                  onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as RoleFilter)}>
                <SelectTrigger className="w-36">
                  <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admins Only</SelectItem>
                  <SelectItem value="user">Users Only</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground ml-auto">
                {userList?.length ?? 0} result{(userList?.length ?? 0) !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Table */}
            <Card className="bg-card/60 border-border/50">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">
                        <SortBtn field="name" label="User" />
                      </th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden md:table-cell">Role</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden lg:table-cell">
                        <SortBtn field="lastSignedIn" label="Last Active" />
                      </th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden lg:table-cell">
                        <SortBtn field="createdAt" label="Joined" />
                      </th>
                      <th className="px-4 py-3 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
                              <div className="space-y-1">
                                <div className="h-3 w-28 bg-muted rounded animate-pulse" />
                                <div className="h-2 w-40 bg-muted rounded animate-pulse" />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell"><div className="h-5 w-16 bg-muted rounded animate-pulse" /></td>
                          <td className="px-4 py-3 hidden lg:table-cell"><div className="h-3 w-24 bg-muted rounded animate-pulse" /></td>
                          <td className="px-4 py-3 hidden lg:table-cell"><div className="h-3 w-20 bg-muted rounded animate-pulse" /></td>
                          <td className="px-4 py-3" />
                        </tr>
                      ))
                    ) : !userList?.length ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                          <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          <p>No users found</p>
                        </td>
                      </tr>
                    ) : (
                      userList.map((u) => {
                        const isSelf = currentUser?.id === u.id;
                        const isSelected = selectedUser?.id === u.id;
                        return (
                          <tr key={u.id}
                            className={`border-b border-border/50 cursor-pointer transition-colors hover:bg-muted/30 ${isSelected ? "bg-primary/5" : ""}`}
                            onClick={() => setSelectedUser(isSelected ? null : u)}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                                  {(u.name ?? u.email ?? "?").charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium truncate">
                                    {u.name ?? "—"}
                                    {isSelf && <span className="ml-2 text-xs text-muted-foreground font-normal">(you)</span>}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">
                              {u.role === "admin" ? (
                                <Badge className="bg-primary/20 text-primary border-primary/30 gap-1 text-xs">
                                  <Shield className="h-3 w-3" /> Admin
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground gap-1 text-xs">
                                  <UserCircle className="h-3 w-3" /> User
                                </Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                              {formatDistanceToNow(new Date(u.lastSignedIn), { addSuffix: true })}
                            </td>
                            <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                              {format(new Date(u.createdAt), "MMM d, yyyy")}
                            </td>
                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem onClick={() => setEditUser(u)}>
                                    <Edit2 className="h-4 w-4 mr-2" /> Edit Profile
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setResetUser(u)}>
                                    <KeyRound className="h-4 w-4 mr-2" /> Generate Reset Link
                                  </DropdownMenuItem>
                                  {!isSelf && (
                                    <>
                                      <DropdownMenuSeparator />
                                      {u.role === "user" ? (
                                        <DropdownMenuItem onClick={() => setRoleMutation.mutate({ userId: u.id, role: "admin" })}>
                                          <Shield className="h-4 w-4 mr-2 text-primary" /> Promote to Admin
                                        </DropdownMenuItem>
                                      ) : (
                                        <DropdownMenuItem onClick={() => setRoleMutation.mutate({ userId: u.id, role: "user" })}>
                                          <ShieldOff className="h-4 w-4 mr-2" /> Remove Admin
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem className="text-destructive focus:text-destructive"
                                        onClick={() => setDeleteUser(u)}>
                                        <Trash2 className="h-4 w-4 mr-2" /> Delete Account
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>

        {/* Detail panel */}
        {selectedUser && (
          <div className="w-72 border-l border-border bg-card/40 flex-shrink-0 hidden lg:flex flex-col">
            <UserDetailPanel
              user={selectedUser}
              isSelf={currentUser?.id === selectedUser.id}
              onEdit={() => setEditUser(selectedUser)}
              onReset={() => setResetUser(selectedUser)}
              onDelete={() => setDeleteUser(selectedUser)}
              onClose={() => setSelectedUser(null)}
            />
          </div>
        )}
      </div>

      {/* Edit dialog */}
      {editUser && <EditUserDialog user={editUser} open={!!editUser} onClose={() => setEditUser(null)} />}

      {/* Reset password dialog */}
      {resetUser && <ResetPasswordDialog user={resetUser} open={!!resetUser} onClose={() => setResetUser(null)} />}

      {/* Delete confirm */}
      <AlertDialog open={!!deleteUser} onOpenChange={(o) => !o && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{deleteUser?.name ?? deleteUser?.email}</strong>'s account. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => deleteUser && deleteMutation.mutate({ userId: deleteUser.id })}
            >
              {deleteMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
