import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Plus, Pencil, Trash2, Search, Sparkles } from "lucide-react";
import { db } from "@/integrations/supabase/client";
import { draftPrescription } from "@/lib/admin/functions";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export const Route = createFileRoute("/admin/receitas")({
  component: Receitas,
});

type Prescription = {
  id: string;
  patient_id: string;
  medication: string;
  instructions: string | null;
  issued_at: string;
  patients: { name: string } | null;
};

type Patient = { id: string; name: string };

const emptyForm = { patient_id: "", medication: "", instructions: "" };

function Receitas() {
  const [items, setItems] = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [patientFilter, setPatientFilter] = useState("todos");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Prescription | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Prescription | null>(null);
  const [aiNotes, setAiNotes] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [{ data: itemsData }, { data: patientsData }] = await Promise.all([
      db
        .from("prescriptions")
        .select("id, patient_id, medication, instructions, issued_at, patients(name)")
        .order("issued_at", { ascending: false }),
      db.from("patients").select("id, name").order("name"),
    ]);
    setItems((itemsData ?? []) as unknown as Prescription[]);
    setPatients((patientsData ?? []) as Patient[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const from = dateFrom ? new Date(dateFrom).getTime() : null;
    const to = dateTo ? new Date(dateTo).setHours(23, 59, 59, 999) : null;
    return items.filter((i) => {
      if (patientFilter !== "todos" && i.patient_id !== patientFilter) return false;
      const reference = new Date(i.issued_at).getTime();
      if (from != null && reference < from) return false;
      if (to != null && reference > to) return false;
      if (
        q &&
        !(i.patients?.name.toLowerCase().includes(q) || i.medication.toLowerCase().includes(q))
      ) {
        return false;
      }
      return true;
    });
  }, [items, query, patientFilter, dateFrom, dateTo]);

  const hasActiveFilters = !!query.trim() || patientFilter !== "todos" || !!dateFrom || !!dateTo;

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setAiNotes("");
    setAiError(null);
    setDialogOpen(true);
  }

  function openEdit(item: Prescription) {
    setEditing(item);
    setForm({
      patient_id: item.patient_id,
      medication: item.medication,
      instructions: item.instructions ?? "",
    });
    setDialogOpen(true);
  }

  async function save() {
    if (!form.patient_id || !form.medication.trim()) return;
    setSaving(true);
    const payload = {
      patient_id: form.patient_id,
      medication: form.medication.trim(),
      instructions: form.instructions.trim() || null,
    };
    if (editing) {
      await db.from("prescriptions").update(payload).eq("id", editing.id);
      await db
        .from("documents")
        .update({ title: `Receita: ${form.medication.trim()}` })
        .eq("prescription_id", editing.id);
    } else {
      const { data: rx } = await db.from("prescriptions").insert(payload).select("id").single();
      if (rx) {
        await db.from("documents").insert({
          patient_id: form.patient_id,
          prescription_id: rx.id,
          title: `Receita: ${form.medication.trim()}`,
          category: "Receita",
        });
      }
    }
    setSaving(false);
    setDialogOpen(false);
    load();
  }

  async function remove() {
    if (!deleteTarget) return;
    await db.from("prescriptions").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null);
    load();
  }

  async function suggestWithAI() {
    const patientName = patients.find((p) => p.id === form.patient_id)?.name;
    if (!patientName || !aiNotes.trim() || aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const result = await draftPrescription({
        data: { patientName, notes: aiNotes.trim() },
      });
      setForm((f) => ({ ...f, medication: result.medication, instructions: result.instructions }));
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Não foi possível gerar a sugestão.");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="animate-in fade-in duration-300">
      <PageHeader
        title="💊 Receitas"
        description="Prescrições emitidas para os pacientes."
        action={
          <Button onClick={openCreate} disabled={patients.length === 0}>
            <Plus /> Nova receita
          </Button>
        }
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar paciente ou medicação..."
            className="pl-9"
          />
        </div>
        <Select value={patientFilter} onValueChange={setPatientFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Todos os pacientes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os pacientes</SelectItem>
            {patients.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-40"
          aria-label="Data inicial"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-40"
          aria-label="Data final"
        />
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQuery("");
              setPatientFilter("todos");
              setDateFrom("");
              setDateTo("");
            }}
          >
            Limpar filtros
          </Button>
        )}
        <span className="text-sm text-muted-foreground">{filtered.length} receita(s)</span>
      </div>

      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Carregando...
          </p>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card">
            <EmptyState icon={ClipboardList} title="Nenhuma receita encontrada." />
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="animate-in fade-in flex items-start justify-between gap-4 rounded-2xl border border-border bg-card p-5"
            >
              <div className="min-w-0">
                <p className="font-bold">{item.medication}</p>
                <p className="text-sm text-muted-foreground">
                  {item.patients?.name ?? "—"} ·{" "}
                  {new Date(item.issued_at).toLocaleDateString("pt-BR")}
                </p>
                {item.instructions && (
                  <p className="mt-2 whitespace-pre-line text-sm text-foreground">
                    {item.instructions}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEdit(item)}
                  aria-label="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteTarget(item)}
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
            <DialogTitle>{editing ? "Editar receita" : "Nova receita"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Paciente</Label>
              <Select
                value={form.patient_id}
                onValueChange={(patient_id) => setForm((f) => ({ ...f, patient_id }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o paciente" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 rounded-lg border border-dashed border-border p-3">
              <Label htmlFor="r-ai-notes">Sugerir com IA (rascunho para revisar)</Label>
              <div className="flex gap-2">
                <Input
                  id="r-ai-notes"
                  value={aiNotes}
                  onChange={(e) => setAiNotes(e.target.value)}
                  placeholder="Ex: dor pós-extração, sem alergias conhecidas"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={suggestWithAI}
                  disabled={!form.patient_id || !aiNotes.trim() || aiLoading}
                >
                  <Sparkles className={aiLoading ? "animate-pulse" : undefined} />
                  {aiLoading ? "Gerando..." : "Sugerir"}
                </Button>
              </div>
              {aiError && <p className="text-xs font-semibold text-destructive">{aiError}</p>}
              <p className="text-xs text-muted-foreground">
                A IA só rascunha o texto — confira e ajuste antes de salvar a receita.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-medication">Medicação</Label>
              <Input
                id="r-medication"
                value={form.medication}
                onChange={(e) => setForm((f) => ({ ...f, medication: e.target.value }))}
                placeholder="Ex: Amoxicilina 500mg"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-instructions">Instruções</Label>
              <Textarea
                id="r-instructions"
                value={form.instructions}
                onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
                placeholder="Posologia, duração do tratamento..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={!form.patient_id || !form.medication.trim() || saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir receita?</AlertDialogTitle>
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
