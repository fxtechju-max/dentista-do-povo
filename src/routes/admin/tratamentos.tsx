import {
  readPreference,
  savePreference,
  subscribePreferences,
  refreshPreferences,
} from "@/lib/preferences";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Plus,
  Pencil,
  Trash2,
  Search,
  Clock,
  List,
  Square,
  Grid2x2,
  Grid3x3,
  Table2,
} from "lucide-react";
import { db } from "@/integrations/mysql/client";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/admin/labels";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

export const Route = createFileRoute("/admin/tratamentos")({
  component: Tratamentos,
});

type Treatment = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  duration_minutes: number | null;
  active: boolean;
};

const emptyForm = { name: "", description: "", price: "", duration_minutes: "", active: true };

type ViewMode = "lista" | "grande" | "medio" | "pequeno" | "completo";

const VIEW_OPTIONS: { id: ViewMode; label: string; icon: typeof List }[] = [
  { id: "lista", label: "Lista", icon: List },
  { id: "grande", label: "Grande", icon: Square },
  { id: "medio", label: "Médio", icon: Grid2x2 },
  { id: "pequeno", label: "Pequeno", icon: Grid3x3 },
  { id: "completo", label: "Completo", icon: Table2 },
];

function loadViewMode(): ViewMode {
  return readPreference("treatmentView") ?? "medio";
}

function Tratamentos() {
  const [items, setItems] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>(() => loadViewMode());
  useEffect(() => {
    const refresh = () => setViewMode(loadViewMode());
    const unsubscribe = subscribePreferences(refresh);
    void refreshPreferences().then(refresh);
    return unsubscribe;
  }, []);
  const [statusFilter, setStatusFilter] = useState<"todos" | "ativo" | "inativo">("todos");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Treatment | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Treatment | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await db
      .from("treatments")
      .select("id, name, description, price, duration_minutes, active")
      .order("name");
    setItems((data ?? []) as Treatment[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const min = priceMin.trim() ? Number(priceMin.replace(",", ".")) : null;
    const max = priceMax.trim() ? Number(priceMax.replace(",", ".")) : null;
    return items.filter((t) => {
      if (statusFilter === "ativo" && !t.active) return false;
      if (statusFilter === "inativo" && t.active) return false;
      if (min != null && (t.price == null || t.price < min)) return false;
      if (max != null && (t.price == null || t.price > max)) return false;
      if (q && !t.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, query, statusFilter, priceMin, priceMax]);

  const hasActiveFilters =
    !!query.trim() || statusFilter !== "todos" || !!priceMin.trim() || !!priceMax.trim();

  function changeView(mode: ViewMode) {
    setViewMode(mode);
    void savePreference({ key: "treatmentView", value: mode });
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(t: Treatment) {
    setEditing(t);
    setForm({
      name: t.name,
      description: t.description ?? "",
      price: t.price != null ? String(t.price) : "",
      duration_minutes: t.duration_minutes != null ? String(t.duration_minutes) : "",
      active: t.active,
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
      duration_minutes: form.duration_minutes.trim() ? Number(form.duration_minutes) : null,
      active: form.active,
    };
    if (editing) {
      await db.from("treatments").update(payload).eq("id", editing.id);
    } else {
      await db.from("treatments").insert(payload);
    }
    setSaving(false);
    setDialogOpen(false);
    load();
  }

  async function remove() {
    if (!deleteTarget) return;
    await db.from("treatments").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null);
    load();
  }

  return (
    <div className="animate-in fade-in duration-300">
      <PageHeader
        title="🦷 Tratamentos"
        description="Catálogo de procedimentos oferecidos pela clínica."
        action={
          <Button onClick={openCreate}>
            <Plus /> Novo tratamento
          </Button>
        }
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar tratamento..."
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="ativo">Ativos</SelectItem>
            <SelectItem value="inativo">Inativos</SelectItem>
          </SelectContent>
        </Select>
        <Input
          value={priceMin}
          onChange={(e) => setPriceMin(e.target.value)}
          placeholder="Preço mín."
          inputMode="decimal"
          className="w-28"
        />
        <Input
          value={priceMax}
          onChange={(e) => setPriceMax(e.target.value)}
          placeholder="Preço máx."
          inputMode="decimal"
          className="w-28"
        />
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQuery("");
              setStatusFilter("todos");
              setPriceMin("");
              setPriceMax("");
            }}
          >
            Limpar filtros
          </Button>
        )}
        <span className="text-sm text-muted-foreground">{filtered.length} tratamento(s)</span>
        <div className="ml-auto flex items-center gap-1 rounded-lg border border-border bg-background p-0.5">
          {VIEW_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => changeView(opt.id)}
              title={opt.label}
              aria-label={`Visualização ${opt.label}`}
              className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                viewMode === opt.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <opt.icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="col-span-full mt-4 rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Carregando...
        </p>
      ) : filtered.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-border bg-card">
          <EmptyState
            icon={Activity}
            title={
              hasActiveFilters
                ? "Nenhum tratamento encontrado."
                : "Nenhum tratamento cadastrado ainda."
            }
          />
        </div>
      ) : viewMode === "completo" ? (
        <div className="mt-4 rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => (
                <TableRow key={t.id} className="animate-in fade-in">
                  <TableCell className="font-semibold">{t.name}</TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">
                    {t.description || "—"}
                  </TableCell>
                  <TableCell>
                    {t.price != null ? formatCurrency(t.price) : "Sob consulta"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {t.duration_minutes != null ? `${t.duration_minutes} min` : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={t.active ? "default" : "secondary"}>
                      {t.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(t)}
                      aria-label="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(t)}
                      aria-label="Excluir"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : viewMode === "lista" ? (
        <div className="mt-4 space-y-2">
          {filtered.map((t) => (
            <div
              key={t.id}
              className="animate-in fade-in flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
            >
              <Badge variant={t.active ? "default" : "secondary"} className="shrink-0">
                {t.active ? "Ativo" : "Inativo"}
              </Badge>
              <p className="min-w-0 flex-1 truncate font-semibold">{t.name}</p>
              {t.duration_minutes != null && (
                <span className="hidden shrink-0 items-center gap-1 text-sm text-muted-foreground sm:flex">
                  <Clock className="h-3.5 w-3.5" /> {t.duration_minutes} min
                </span>
              )}
              <span className="shrink-0 font-semibold text-primary">
                {t.price != null ? formatCurrency(t.price) : "Sob consulta"}
              </span>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(t)} aria-label="Editar">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteTarget(t)}
                  aria-label="Excluir"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === "pequeno" ? (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {filtered.map((t) => (
            <button
              key={t.id}
              onClick={() => openEdit(t)}
              className="animate-in fade-in flex flex-col items-start gap-1 rounded-xl border border-border bg-card p-3 text-left transition-shadow hover:shadow-md"
            >
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${t.active ? "bg-emerald-500" : "bg-muted-foreground"}`}
              />
              <p className="line-clamp-2 w-full text-xs font-bold">{t.name}</p>
              <p className="text-xs font-semibold text-primary">
                {t.price != null ? formatCurrency(t.price) : "Consultar"}
              </p>
            </button>
          ))}
        </div>
      ) : (
        <div
          className={`mt-4 grid grid-cols-1 gap-4 ${
            viewMode === "grande" ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"
          }`}
        >
          {filtered.map((t) => (
            <div
              key={t.id}
              className={`animate-in fade-in flex flex-col gap-2 rounded-2xl border border-border bg-card ${
                viewMode === "grande" ? "p-7" : "p-5"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className={viewMode === "grande" ? "text-lg font-bold" : "font-bold"}>
                  {t.name}
                </p>
                <Badge variant={t.active ? "default" : "secondary"}>
                  {t.active ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              {t.description && (
                <p
                  className={`text-sm text-muted-foreground ${viewMode === "grande" ? "" : "line-clamp-2"}`}
                >
                  {t.description}
                </p>
              )}
              <div className="mt-1 flex items-center justify-between text-sm">
                <span
                  className={`font-semibold text-primary ${viewMode === "grande" ? "text-lg" : ""}`}
                >
                  {t.price != null ? formatCurrency(t.price) : "Sob consulta"}
                </span>
                {t.duration_minutes != null && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" /> {t.duration_minutes} min
                  </span>
                )}
              </div>
              <div className="mt-2 flex justify-end gap-1 border-t border-border pt-2">
                <Button variant="ghost" size="icon" onClick={() => openEdit(t)} aria-label="Editar">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteTarget(t)}
                  aria-label="Excluir"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar tratamento" : "Novo tratamento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="t-name">Nome</Label>
              <Input
                id="t-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Limpeza, Clareamento..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-desc">Descrição</Label>
              <Textarea
                id="t-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Detalhes do procedimento"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="t-price">Preço (R$)</Label>
                <Input
                  id="t-price"
                  inputMode="decimal"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t-duration">Duração (min)</Label>
                <Input
                  id="t-duration"
                  inputMode="numeric"
                  value={form.duration_minutes}
                  onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))}
                  placeholder="30"
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <Label htmlFor="t-active">Tratamento ativo</Label>
              <Switch
                id="t-active"
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
            <AlertDialogTitle>Excluir tratamento?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}" será removido do catálogo. Essa ação não pode ser desfeita.
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
