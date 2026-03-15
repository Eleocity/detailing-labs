import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Users, Search, Shield, ShieldOff, Trash2, Crown,
  Mail, Calendar, LogIn, UserCheck
} from "lucide-react";

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const [confirmAction, setConfirmAction] = useState<{
    type: "promote" | "demote" | "delete";
    userId: number;
    userName: string;
  } | null>(null);

  const { data: users, isLoading, refetch } = trpc.users.list.useQuery();
  const utils = trpc.useUtils();

  const setRole = trpc.users.setRole.useMutation({
    onSuccess: (_, vars) => {
      toast.success(
        vars.role === "admin"
          ? "User promoted to Admin."
          : "User demoted to standard user."
      );
      utils.users.list.invalidate();
      setConfirmAction(null);
    },
    onError: (err) => {
      toast.error(err.message);
      setConfirmAction(null);
    },
  });

  const deleteUser = trpc.users.delete.useMutation({
    onSuccess: () => {
      toast.success("User removed.");
      utils.users.list.invalidate();
      setConfirmAction(null);
    },
    onError: (err) => {
      toast.error(err.message);
      setConfirmAction(null);
    },
  });

  const filtered = (users ?? []).filter((u) => {
    const q = search.toLowerCase();
    return (
      !q ||
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  });

  const adminCount = (users ?? []).filter((u) => u.role === "admin").length;
  const userCount = (users ?? []).filter((u) => u.role === "user").length;

  function handleConfirm() {
    if (!confirmAction) return;
    if (confirmAction.type === "delete") {
      deleteUser.mutate({ userId: confirmAction.userId });
    } else {
      setRole.mutate({
        userId: confirmAction.userId,
        role: confirmAction.type === "promote" ? "admin" : "user",
      });
    }
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold">User Management</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage who has access to the admin panel. Promote trusted team members to Admin.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Users className="w-3.5 h-3.5" /> Total Users
            </div>
            <div className="text-2xl font-bold">{users?.length ?? 0}</div>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Crown className="w-3.5 h-3.5 text-primary" /> Admins
            </div>
            <div className="text-2xl font-bold text-primary">{adminCount}</div>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <UserCheck className="w-3.5 h-3.5" /> Customers
            </div>
            <div className="text-2xl font-bold">{userCount}</div>
          </div>
        </div>

        {/* How it works */}
        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">How to give someone admin access</p>
          <p>
            Ask your team member to visit the site and sign in once. They will appear in this list
            as a standard user. You can then click <strong>Promote to Admin</strong> to grant them
            full access to the admin dashboard.
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-input border-border"
          />
        </div>

        {/* User List */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 rounded-xl border border-border bg-card animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No users found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((u) => {
              const isMe = u.id === currentUser?.id;
              const isAdmin = u.role === "admin";
              return (
                <div
                  key={u.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border bg-card transition-colors ${
                    isAdmin ? "border-primary/30" : "border-border"
                  }`}
                >
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    isAdmin ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                  }`}>
                    {u.name ? u.name.charAt(0).toUpperCase() : "?"}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">
                        {u.name || "Unnamed User"}
                      </span>
                      {isMe && (
                        <Badge variant="outline" className="text-xs border-primary/40 text-primary">
                          You
                        </Badge>
                      )}
                      <Badge
                        variant={isAdmin ? "default" : "secondary"}
                        className={`text-xs ${isAdmin ? "bg-primary/20 text-primary border-primary/30" : ""}`}
                      >
                        {isAdmin ? (
                          <><Crown className="w-3 h-3 mr-1" />Admin</>
                        ) : (
                          "Customer"
                        )}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                      {u.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {u.email}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <LogIn className="w-3 h-3" />
                        Last sign-in: {new Date(u.lastSignedIn).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Joined: {new Date(u.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  {!isMe && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isAdmin ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs border-border hover:border-destructive/40 hover:text-destructive"
                          onClick={() =>
                            setConfirmAction({ type: "demote", userId: u.id, userName: u.name || "this user" })
                          }
                        >
                          <ShieldOff className="w-3.5 h-3.5 mr-1" />
                          Remove Admin
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs border-primary/30 text-primary hover:bg-primary/10"
                          onClick={() =>
                            setConfirmAction({ type: "promote", userId: u.id, userName: u.name || "this user" })
                          }
                        >
                          <Shield className="w-3.5 h-3.5 mr-1" />
                          Promote to Admin
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          setConfirmAction({ type: "delete", userId: u.id, userName: u.name || "this user" })
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirm Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "promote" && "Promote to Admin?"}
              {confirmAction?.type === "demote" && "Remove Admin Access?"}
              {confirmAction?.type === "delete" && "Delete User?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "promote" &&
                `${confirmAction.userName} will gain full access to the admin dashboard, including bookings, CRM, invoices, and site settings.`}
              {confirmAction?.type === "demote" &&
                `${confirmAction.userName} will lose admin access and be reverted to a standard customer account.`}
              {confirmAction?.type === "delete" &&
                `This will permanently remove ${confirmAction.userName}'s account. This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={
                confirmAction?.type === "delete"
                  ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              }
            >
              {confirmAction?.type === "promote" && "Yes, Promote"}
              {confirmAction?.type === "demote" && "Yes, Remove Admin"}
              {confirmAction?.type === "delete" && "Yes, Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
