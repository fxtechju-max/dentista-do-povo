import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Activity, Plus, Pencil, Trash2, Search, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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

function Tratamentos() {
  const [items, setItems] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Treatment | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Treatment | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
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
    if (!q) return items;
    return items.filter((t) => t.name.toLowerCase().includes(q));
  }, [items, query]);

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
      await supabase.from("treatments").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("treatments").insert(payload);
    }
    setSaving(false);
    setDialogOpen(false);
    load();
  }

  async function remove() {
    if (!deleteTarget) return;
    await supabase.from("treatments").delete().eq("id", deleteTarget.id);
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

      <div className="mt-4 flex items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar tratamento..."
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground">{filtered.length} tratamento(s)</span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p className="col-span-full p-8 text-center text-sm text-muted-foreground">
            Carregando...
          </p>
        ) : filtered.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-border bg-card">
            <EmptyState
              icon={Activity}
              title={
                query ? "Nenhum tratamento encontrado." : "Nenhum tratamento cadastrado ainda."
              }
            />
          </div>
        ) : (
          filtered.map((t) => (
            <div
              key={t.id}
              className="animate-in fade-in flex flex-col gap-2 rounded-2xl border border-border bg-card p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold">{t.name}</p>
                <Badge variant={t.active ? "default" : "secondary"}>
                  {t.active ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              {t.description && (
                <p className="line-clamp-2 text-sm text-muted-foreground">{t.description}</p>
              )}
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="font-semibold text-primary">
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
          ))
        )}
      </div>

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
