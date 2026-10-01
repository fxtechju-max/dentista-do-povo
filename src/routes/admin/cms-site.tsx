import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Globe,
  Plus,
  Pencil,
  Trash2,
  Search,
  GripVertical,
  Newspaper,
  ExternalLink,
  Images,
  Upload,
} from "lucide-react";
import { db, galleryPhotoUrl } from "@/integrations/mysql/client";
import { uploadGalleryPhoto, deleteGalleryPhoto } from "@/lib/gallery.functions";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { formatCurrency, slugify } from "@/lib/admin/labels";
import { BLOG_CATEGORIES } from "@/lib/blog-categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HomeContentTab } from "@/components/admin/cms/HomeContentTab";
import { LegalPagesTab } from "@/components/admin/cms/LegalPagesTab";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export const Route = createFileRoute("/admin/cms-site")({
  component: CmsSite,
});

function CmsSite() {
  return (
    <div className="animate-in fade-in duration-300">
      <PageHeader title="🌐 CMS Site" description="Gerencie tudo que aparece no site público." />

      <Tabs defaultValue="inicio" className="mt-4">
        <TabsList>
          <TabsTrigger value="inicio">🏠 Página inicial</TabsTrigger>
          <TabsTrigger value="servicos">🦷 Serviços</TabsTrigger>
          <TabsTrigger value="blog">📰 Blog</TabsTrigger>
          <TabsTrigger value="galeria">🖼️ Galeria</TabsTrigger>
          <TabsTrigger value="paginas">📄 Páginas</TabsTrigger>
        </TabsList>
        <TabsContent value="inicio" className="mt-4">
          <HomeContentTab />
        </TabsContent>
        <TabsContent value="servicos" className="mt-4">
          <ServicosTab />
        </TabsContent>
        <TabsContent value="blog" className="mt-4">
          <BlogTab />
        </TabsContent>
        <TabsContent value="galeria" className="mt-4">
          <GaleriaTab />
        </TabsContent>
        <TabsContent value="paginas" className="mt-4">
          <LegalPagesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type Service = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  active: boolean;
  sort_order: number;
};

const emptyServiceForm = { name: "", description: "", price: "", active: true };

function ServicosTab() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState(emptyServiceForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await db
      .from("services")
      .select("id, name, description, price, active, sort_order")
      .order("sort_order");
    setServices((data ?? []) as Service[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return services;
    return services.filter((s) => s.name.toLowerCase().includes(q));
  }, [services, query]);

  function openCreate() {
    setEditing(null);
    setForm(emptyServiceForm);
    setDialogOpen(true);
  }

  function openEdit(s: Service) {
    setEditing(s);
    setForm({
      name: s.name,
      description: s.description ?? "",
      price: s.price != null ? String(s.price) : "",
      active: s.active,
    });
    setDialogOpen(true);
  }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: form.price.trim() ? Number(form.price.replace(",", ".")) : null,
      active: form.active,
      ...(editing ? {} : { sort_order: services.length }),
    };
    if (editing) {
      await db.from("services").update(payload).eq("id", editing.id);
    } else {
      await db.from("services").insert(payload);
    }
    setSaving(false);
    setDialogOpen(false);
    load();
  }

  async function toggleActive(s: Service) {
    await db.from("services").update({ active: !s.active }).eq("id", s.id);
    load();
  }

  async function remove() {
    if (!deleteTarget) return;
    await db.from("services").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null);
    load();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar serviço..."
            className="pl-9"
          />
        </div>
        <Button onClick={openCreate}>
          <Plus /> Novo serviço
        </Button>
      </div>

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Carregando...
          </p>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card">
            <EmptyState icon={Globe} title="Nenhum serviço cadastrado ainda." />
          </div>
        ) : (
          filtered.map((s) => (
            <div
              key={s.id}
              className="animate-in fade-in flex items-center gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{s.name}</p>
                  <Badge variant={s.active ? "default" : "secondary"}>
                    {s.active ? "Visível" : "Oculto"}
                  </Badge>
                </div>
                {s.description && (
                  <p className="line-clamp-1 text-sm text-muted-foreground">{s.description}</p>
                )}
              </div>
              {s.price != null && (
                <span className="text-sm font-semibold">{formatCurrency(s.price)}</span>
              )}
              <Switch
                checked={s.active}
                onCheckedChange={() => toggleActive(s)}
                aria-label="Visível no site"
              />
              <Button variant="ghost" size="icon" onClick={() => openEdit(s)} aria-label="Editar">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteTarget(s)}
                aria-label="Excluir"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar serviço" : "Novo serviço"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="s-name">Nome</Label>
              <Input
                id="s-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Clareamento dental"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-desc">Descrição</Label>
              <Textarea
                id="s-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Texto exibido no site"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-price">Preço (R$)</Label>
              <Input
                id="s-price"
                inputMode="decimal"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                placeholder="Deixe em branco para 'sob consulta'"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <Label htmlFor="s-active">Visível no site</Label>
              <Switch
                id="s-active"
                checked={form.active}
                onCheckedChange={(active) => setForm((f) => ({ ...f, active }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={!form.name.trim() || saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir serviço?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}" deixará de aparecer no site. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type PostStatus = "rascunho" | "publicado";

type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  category: string;
  status: PostStatus;
  published_at: string | null;
  created_at: string;
};

const emptyPostForm = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  cover_image_url: "",
  category: BLOG_CATEGORIES[0] as string,
  status: "rascunho" as PostStatus,
  publish_at: "",
};

/** ISO → valor do campo datetime-local (hora local). */
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const isScheduled = (p: { status: string; published_at: string | null }) =>
  p.status === "publicado" && !!p.published_at && new Date(p.published_at).getTime() > Date.now();

function BlogTab() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PostStatus | "todos">("todos");
  const [categoryFilter, setCategoryFilter] = useState<string>("todas");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Post | null>(null);
  const [form, setForm] = useState(emptyPostForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await db
      .from("blog_posts")
      .select(
        "id, title, slug, excerpt, content, cover_image_url, category, status, published_at, created_at",
      )
      .order("created_at", { ascending: false });
    setPosts((data ?? []) as Post[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((p) => {
      if (statusFilter !== "todos" && p.status !== statusFilter) return false;
      if (categoryFilter !== "todas" && p.category !== categoryFilter) return false;
      if (q && !p.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [posts, query, statusFilter, categoryFilter]);

  function openCreate() {
    setEditing(null);
    setForm(emptyPostForm);
    setSlugTouched(false);
    setDialogOpen(true);
  }

  function openEdit(p: Post) {
    setEditing(p);
    setForm({
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt ?? "",
      content: p.content,
      cover_image_url: p.cover_image_url ?? "",
      category: p.category,
      status: p.status,
      publish_at: toLocalInput(p.published_at),
    });
    setSlugTouched(true);
    setDialogOpen(true);
  }

  async function save() {
    if (!form.title.trim() || !form.slug.trim() || !form.content.trim()) return;
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      slug: slugify(form.slug),
      excerpt: form.excerpt.trim() || null,
      content: form.content.trim(),
      cover_image_url: form.cover_image_url.trim() || null,
      category: form.category,
      status: form.status,
      published_at:
        form.status === "publicado"
          ? form.publish_at
            ? new Date(form.publish_at).toISOString()
            : (editing?.published_at ?? new Date().toISOString())
          : null,
    };
    if (editing) {
      await db.from("blog_posts").update(payload).eq("id", editing.id);
    } else {
      await db.from("blog_posts").insert(payload);
    }
    setSaving(false);
    setDialogOpen(false);
    load();
  }

  async function remove() {
    if (!deleteTarget) return;
    await db.from("blog_posts").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null);
    load();
  }

  const published = posts.filter((p) => p.status === "publicado").length;
  const scheduled = posts.filter(isScheduled);
  const nextScheduled = [...scheduled].sort((a, b) =>
    (a.published_at ?? "").localeCompare(b.published_at ?? ""),
  )[0];
  // Post "detalhado" = texto com pelo menos 300 palavras.
  const detailed = posts.filter((p) => p.content.trim().split(/\s+/).length >= 300).length;

  return (
    <div>
      {!loading && (
        <div className="mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {[
              {
                label: "Total de posts",
                value: posts.length,
                onClick: () => setStatusFilter("todos"),
              },
              {
                label: "Publicados",
                value: published,
                onClick: () => setStatusFilter("publicado"),
              },
              {
                label: "Rascunhos",
                value: posts.length - published,
                onClick: () => setStatusFilter("rascunho"),
              },
              { label: "Detalhados (300+ palavras)", value: detailed, onClick: undefined },
              {
                label: nextScheduled?.published_at
                  ? `Agendados · próximo ${new Date(nextScheduled.published_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`
                  : "Agendados",
                value: scheduled.length,
                onClick: undefined,
              },
            ].map((card) => (
              <button
                key={card.label}
                type="button"
                onClick={card.onClick}
                disabled={!card.onClick}
                className="rounded-2xl border border-border bg-card p-4 text-left transition-colors enabled:hover:border-primary enabled:hover:bg-accent"
              >
                <p className="text-2xl font-extrabold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {BLOG_CATEGORIES.map((c) => {
              const count = posts.filter((p) => p.category === c).length;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategoryFilter(categoryFilter === c ? "todas" : c)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    categoryFilter === c
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:bg-accent"
                  }`}
                >
                  {c} · {count}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por título..."
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="rascunho">Rascunho</SelectItem>
              <SelectItem value="publicado">Publicado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as categorias</SelectItem>
              {BLOG_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate}>
          <Plus /> Novo post
        </Button>
      </div>

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Carregando...
          </p>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card">
            <EmptyState icon={Newspaper} title="Nenhum post encontrado." />
          </div>
        ) : (
          filtered.map((p) => (
            <div
              key={p.id}
              className="animate-in fade-in flex items-center gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{p.title}</p>
                  {isScheduled(p) ? (
                    <Badge className="border-transparent bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300">
                      Agendado
                    </Badge>
                  ) : (
                    <Badge variant={p.status === "publicado" ? "default" : "secondary"}>
                      {p.status === "publicado" ? "Publicado" : "Rascunho"}
                    </Badge>
                  )}
                  <Badge variant="outline">{p.category}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  /blog/{p.slug} ·{" "}
                  {p.published_at
                    ? isScheduled(p)
                      ? `vai ao ar em ${new Date(p.published_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`
                      : new Date(p.published_at).toLocaleDateString("pt-BR")
                    : "ainda não publicado"}
                </p>
              </div>
              {p.status === "publicado" && (
                <Button variant="ghost" size="icon" asChild aria-label="Ver no site">
                  <Link to="/blog/$slug" params={{ slug: p.slug }} target="_blank">
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => openEdit(p)} aria-label="Editar">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteTarget(p)}
                aria-label="Excluir"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar post" : "Novo post"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-title">Título</Label>
              <Input
                id="p-title"
                value={form.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setForm((f) => ({ ...f, title, slug: slugTouched ? f.slug : slugify(title) }));
                }}
                placeholder="Título do post"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-slug">Link (slug)</Label>
              <Input
                id="p-slug"
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setForm((f) => ({ ...f, slug: e.target.value }));
                }}
                placeholder="titulo-do-post"
              />
              <p className="text-xs text-muted-foreground">
                /blog/{slugify(form.slug) || "titulo-do-post"}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-excerpt">Resumo</Label>
              <Textarea
                id="p-excerpt"
                value={form.excerpt}
                onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                placeholder="Aparece na listagem do blog"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-content">Conteúdo</Label>
              <Textarea
                id="p-content"
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                placeholder="Texto completo do post (separe parágrafos com uma linha em branco)"
                className="min-h-40"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-cover">Imagem de capa (URL)</Label>
              <Input
                id="p-cover"
                value={form.cover_image_url}
                onChange={(e) => setForm((f) => ({ ...f, cover_image_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select
                value={form.category}
                onValueChange={(category) => setForm((f) => ({ ...f, category }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BLOG_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(status) => setForm((f) => ({ ...f, status: status as PostStatus }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="publicado">Publicado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.status === "publicado" && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="post-publish-at">Data e hora de publicação</Label>
                <Input
                  id="post-publish-at"
                  type="datetime-local"
                  value={form.publish_at}
                  onChange={(e) => setForm((f) => ({ ...f, publish_at: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Vazio = publica agora. Data no futuro = o post fica agendado e aparece no site
                  sozinho nesse dia.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={save}
              disabled={!form.title.trim() || !form.slug.trim() || !form.content.trim() || saving}
            >
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir post?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type GalleryPhoto = {
  id: string;
  title: string | null;
  width: number;
  height: number;
  byte_size: number;
  created_at: string;
};

function GaleriaTab() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GalleryPhoto | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const { data } = await db
      .from("gallery_photos")
      .select("id, title, width, height, byte_size, created_at")
      .order("sort_order")
      .order("created_at", { ascending: false });
    setPhotos((data ?? []) as GalleryPhoto[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadError(null);
    setUploading(true);
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name.replace(/\.[^.]+$/, ""));
      const result = await uploadGalleryPhoto({ data: formData });
      if (result.error) {
        setUploadError(result.error.message);
        break;
      }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    load();
  }

  async function remove() {
    if (!deleteTarget) return;
    await deleteGalleryPhoto({ data: { id: deleteTarget.id } });
    setDeleteTarget(null);
    load();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-border bg-muted/30 p-5">
        <div>
          <p className="font-bold">Fotos da clínica</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Aparecem na galeria pública do site. Ajustamos automaticamente para até 1920px no lado
            maior, em alta qualidade — qualquer formato de imagem serve.
          </p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Upload className="h-4 w-4" /> {uploading ? "Enviando..." : "Enviar fotos"}
          </Button>
        </div>
      </div>
      {uploadError && <p className="mt-2 text-sm font-semibold text-destructive">{uploadError}</p>}

      <div className="mt-4">
        {loading ? (
          <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Carregando...
          </p>
        ) : photos.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card">
            <EmptyState icon={Images} title="Nenhuma foto na galeria ainda." />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="group relative aspect-square overflow-hidden rounded-2xl border border-border bg-muted"
              >
                <img
                  src={galleryPhotoUrl(photo.id)}
                  alt={photo.title ?? "Foto da clínica"}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 flex items-end justify-end bg-gradient-to-t from-black/50 via-transparent to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => setDeleteTarget(photo)}
                    aria-label="Excluir foto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir foto?</AlertDialogTitle>
            <AlertDialogDescription>
              Ela deixará de aparecer na galeria do site. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
