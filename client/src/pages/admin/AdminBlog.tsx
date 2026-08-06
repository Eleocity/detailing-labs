import { useState, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  Search,
  X,
  Loader2,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

type PostStatus = "draft" | "published" | "archived";

interface PostFormState {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  status: PostStatus;
  featuredImage: string;
  seoTitle: string;
  seoDescription: string;
}

const EMPTY_FORM: PostFormState = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  status: "draft",
  featuredImage: "",
  seoTitle: "",
  seoDescription: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadgeClass(status: PostStatus): string {
  switch (status) {
    case "published":
      return "bg-green-500/15 text-green-400 border border-green-500/20";
    case "archived":
      return "bg-amber-500/15 text-amber-400 border border-amber-500/20";
    default:
      return "bg-gray-500/15 text-gray-400 border border-gray-500/20";
  }
}

function statusLabel(status: PostStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

// ─── Post Form Dialog ─────────────────────────────────────────────────────────

interface PostDialogProps {
  open: boolean;
  onClose: () => void;
  editingId: number | null;
}

function PostDialog({ open, onClose, editingId }: PostDialogProps) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState<PostFormState>(EMPTY_FORM);
  const [loadingPost, setLoadingPost] = useState(false);

  // Load existing post when editingId changes
  trpc.blog.adminGetById.useQuery(
    { id: editingId! },
    {
      enabled: open && editingId !== null,
      onSuccess: post => {
        setForm({
          title: post.title ?? "",
          slug: post.slug ?? "",
          excerpt: post.excerpt ?? "",
          content: post.content ?? "",
          status: (post.status as PostStatus) ?? "draft",
          featuredImage: post.featuredImage ?? "",
          seoTitle: post.seoTitle ?? "",
          seoDescription: post.seoDescription ?? "",
        });
        setLoadingPost(false);
      },
    }
  );

  const set = useCallback(
    (field: keyof PostFormState, value: string) =>
      setForm(prev => ({ ...prev, [field]: value })),
    []
  );

  const invalidateList = useCallback(() => {
    utils.blog.adminList.invalidate();
  }, [utils]);

  const createMutation = trpc.blog.create.useMutation({
    onSuccess: () => {
      invalidateList();
      toast.success("Post created successfully.");
      handleClose();
    },
    onError: err => toast.error(err.message),
  });

  const updateMutation = trpc.blog.update.useMutation({
    onSuccess: () => {
      invalidateList();
      toast.success("Post updated successfully.");
      handleClose();
    },
    onError: err => toast.error(err.message),
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  function handleClose() {
    setForm(EMPTY_FORM);
    onClose();
  }

  function handleSave() {
    if (!form.title.trim()) {
      toast.error("Title is required.");
      return;
    }

    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim() || undefined,
      excerpt: form.excerpt.trim() || undefined,
      content: form.content.trim() || undefined,
      status: form.status,
      featuredImage: form.featuredImage.trim() || undefined,
      seoTitle: form.seoTitle.trim() || undefined,
      seoDescription: form.seoDescription.trim() || undefined,
    };

    if (editingId !== null) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const isEditing = editingId !== null;

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display">
            {isEditing ? "Edit Post" : "New Post"}
          </DialogTitle>
        </DialogHeader>

        {loadingPost ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Title */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">
                Title <span className="text-red-400">*</span>
              </label>
              <Input
                placeholder="Post title"
                value={form.title}
                onChange={e => set("title", e.target.value)}
                className="bg-background border-border"
              />
            </div>

            {/* Slug */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">
                Slug
              </label>
              <Input
                placeholder="auto-generated-from-title"
                value={form.slug}
                onChange={e => set("slug", e.target.value)}
                className="bg-background border-border"
              />
              <p className="text-xs text-muted-foreground">
                Auto-generated from title if blank
              </p>
            </div>

            {/* Status */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">
                Status
              </label>
              <Select
                value={form.status}
                onValueChange={v => set("status", v as PostStatus)}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Excerpt */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">
                Excerpt
              </label>
              <Textarea
                placeholder="Short summary of the post…"
                value={form.excerpt}
                onChange={e => set("excerpt", e.target.value)}
                rows={3}
                className="bg-background border-border resize-none"
              />
            </div>

            {/* Content */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">
                Content{" "}
                <span className="text-xs text-muted-foreground font-normal">
                  (markdown supported)
                </span>
              </label>
              <Textarea
                placeholder="Write your post content here…"
                value={form.content}
                onChange={e => set("content", e.target.value)}
                rows={10}
                className="bg-background border-border resize-none font-mono text-sm"
              />
            </div>

            {/* Featured Image URL */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">
                Featured Image URL
              </label>
              <Input
                placeholder="https://example.com/image.jpg"
                value={form.featuredImage}
                onChange={e => set("featuredImage", e.target.value)}
                className="bg-background border-border"
              />
            </div>

            {/* SEO Title */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">
                SEO Title
              </label>
              <Input
                placeholder="SEO-optimized title"
                value={form.seoTitle}
                onChange={e => set("seoTitle", e.target.value)}
                className="bg-background border-border"
              />
            </div>

            {/* SEO Description */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">
                SEO Description
              </label>
              <Textarea
                placeholder="Meta description for search engines…"
                value={form.seoDescription}
                onChange={e => set("seoDescription", e.target.value)}
                rows={2}
                className="bg-background border-border resize-none"
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 pt-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSaving}
            className="border-border"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || loadingPost}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEditing ? "Save Changes" : "Create Post"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminBlog() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: posts = [], isLoading } = trpc.blog.adminList.useQuery();

  const deleteMutation = trpc.blog.delete.useMutation({
    onSuccess: () => {
      utils.blog.adminList.invalidate();
      toast.success("Post deleted.");
      setConfirmDeleteId(null);
    },
    onError: err => toast.error(err.message),
  });

  const filtered = posts.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() {
    setEditingId(null);
    setDialogOpen(true);
  }

  function openEdit(id: number) {
    setEditingId(id);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingId(null);
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-display font-bold">Blog Posts</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Manage your blog content and SEO.
            </p>
          </div>
          <Button
            onClick={openCreate}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Post
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search posts…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-8 bg-card border-border"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : posts.length === 0 ? (
          /* Empty state */
          <div className="rounded-xl border border-border bg-card flex flex-col items-center justify-center py-20 gap-4 text-center px-6">
            <BookOpen className="w-12 h-12 text-muted-foreground/40" />
            <div>
              <p className="font-display font-semibold text-lg">
                No blog posts yet
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                Share your detailing knowledge and attract new customers.
              </p>
            </div>
            <Button
              onClick={openCreate}
              className="bg-primary hover:bg-primary/90 text-primary-foreground mt-2"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create your first post
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-border bg-card flex flex-col items-center justify-center py-16 gap-2 text-center px-6">
            <Search className="w-8 h-8 text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">
              No posts match &ldquo;{search}&rdquo;
            </p>
            <button
              onClick={() => setSearch("")}
              className="text-primary text-sm hover:underline"
            >
              Clear search
            </button>
          </div>
        ) : (
          /* Posts list */
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="divide-y divide-border">
              {filtered.map(post => {
                const isConfirming = confirmDeleteId === post.id;
                return (
                  <div
                    key={post.id}
                    className="flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors"
                  >
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">
                          {post.title}
                        </span>
                        <Badge
                          className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusBadgeClass(
                            post.status as PostStatus
                          )}`}
                        >
                          {statusLabel(post.status as PostStatus)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        {post.publishedAt && (
                          <span>
                            Published{" "}
                            {format(new Date(post.publishedAt), "MMM d, yyyy")}
                          </span>
                        )}
                        <span>
                          Updated{" "}
                          {format(new Date(post.updatedAt), "MMM d, yyyy")}
                        </span>
                        {post.excerpt && (
                          <span className="truncate max-w-xs hidden sm:block">
                            {post.excerpt}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isConfirming ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            Are you sure?
                          </span>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 px-2 text-xs"
                            onClick={() =>
                              deleteMutation.mutate({ id: post.id })
                            }
                            disabled={deleteMutation.isPending}
                          >
                            {deleteMutation.isPending ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              "Confirm"
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs border-border"
                            onClick={() => setConfirmDeleteId(null)}
                            disabled={deleteMutation.isPending}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => openEdit(post.id)}
                            title="Edit post"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400"
                            onClick={() => setConfirmDeleteId(post.id)}
                            title="Delete post"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Stats footer when there are posts */}
        {posts.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {filtered.length} of {posts.length} post
            {posts.length !== 1 ? "s" : ""}
            {search && ` matching "${search}"`}
          </p>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <PostDialog
        open={dialogOpen}
        onClose={closeDialog}
        editingId={editingId}
      />
    </AdminLayout>
  );
}
