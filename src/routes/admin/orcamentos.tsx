import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Receipt, Plus, Pencil, Trash2, Search } from "lucide-react";
import { db } from "@/integrations/mysql/client";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import {
  BUDGET_STATUS_LABEL as STATUS_LABEL,
  BUDGET_STATUS_VARIANT as STATUS_VARIANT,
  type BudgetStatus,
  formatCurrency,
} from "@/lib/admin/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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

export const Route = createFileRoute("/admin/orcamentos")({
  component: Orcamentos,
});

type Budget = {
  id: string;
  patient_id: string;
  treatment: string;
  value: number;
  status: BudgetStatus;
  notes: string | null;
  created_at: string;
  patients: { name: string } | null;
};

type Patient = { id: string; name: string };

const emptyForm = {
  patient_id: "",
  treatment: "",
  value: "",
  status: "rascunho" as BudgetStatus,
  notes: "",
};

function Orcamentos() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<BudgetStatus | "todos">("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Budget | null>(null);

  async function load() {
    setLoading(true);
    const [{ data: budgetsData }, { data: patientsData }] = await Promise.all([
      db
        .from("budgets")
        .select("id, patient_id, treatment, value, status, notes, created_at, patients(name)")
        .order("created_at", { ascending: false }),
      db.from("patients").select("id, name").order("name"),
    ]);
    setBudgets((budgetsData ?? []) as unknown as Budget[]);
    setPatients((patientsData ?? []) as Patient[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return budgets.filter((b) => {
      if (statusFilter !== "todos" && b.status !== statusFilter) return false;
      if (
        q &&
        !(b.patients?.name.toLowerCase().includes(q) || b.treatment.toLowerCase().includes(q))
      ) {
        return false;
      }
      return true;
    });
  }, [budgets, query, statusFilter]);

  const totalApproved = useMemo(
    () => budgets.filter((b) => b.status === "aprovado").reduce((s, b) => s + Number(b.value), 0),
    [budgets],
  );

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(b: Budget) {
    setEditing(b);
    setForm({
      patient_id: b.patient_id,
      treatment: b.treatment,
      value: String(b.value),
      status: b.status,
      notes: b.notes ?? "",
    });
    setDialogOpen(true);
  }

  async function save() {
    if (!form.patient_id || !form.treatment.trim() || !form.value.trim()) return;
    setSaving(true);
    const payload = {
      patient_id: form.patient_id,
      treatment: form.treatment.trim(),
      value: Number(form.value.replace(",", ".")),
      status: form.status,
      notes: form.notes.trim() || null,
    };
    if (editing) {
      await db.from("budgets").update(payload).eq("id", editing.id);
    } else {
      await db.from("budgets").insert(payload);
    }
    setSaving(false);
    setDialogOpen(false);
    load();
  }

  async function remove() {
    if (!deleteTarget) return;
    await db.from("budgets").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null);
    load();
  }

  return (
    <div className="animate-in fade-in duration-300">
      <PageHeader
        title="🧾 Orçamentos"
        description={`Total aprovado: ${formatCurrency(totalApproved)}`}
        action={
          <Button onClick={openCreate} disabled={patients.length === 0}>
            <Plus /> Novo orçamento
          </Button>
        }
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar paciente ou tratamento..."
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
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filtered.length} orçamento(s)</span>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-card">
        {loading ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Carregando...</p>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Receipt} title="Nenhum orçamento encontrado." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paciente</TableHead>
                <TableHead>Tratamento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((b) => (
                <TableRow key={b.id} className="animate-in fade-in">
                  <TableCell className="font-semibold">{b.patients?.name ?? "—"}</TableCell>
                  <TableCell>{b.treatment}</TableCell>
                  <TableCell>{formatCurrency(Number(b.value))}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[b.status]}>{STATUS_LABEL[b.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(b)}
                      aria-label="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(b)}
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
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar orçamento" : "Novo orçamento"}</DialogTitle>
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
            <div className="space-y-1.5">
              <Label htmlFor="o-treatment">Tratamento</Label>
              <Input
                id="o-treatment"
                value={form.treatment}
                onChange={(e) => setForm((f) => ({ ...f, treatment: e.target.value }))}
                placeholder="Ex: Implante + coroa"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="o-value">Valor (R$)</Label>
                <Input
                  id="o-value"
                  inputMode="decimal"
                  value={form.value}
                  onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(status) =>
                    setForm((f) => ({ ...f, status: status as BudgetStatus }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABEL).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="o-notes">Observações</Label>
              <Textarea
                id="o-notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Condições de pagamento, detalhes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={save}
              disabled={!form.patient_id || !form.treatment.trim() || !form.value.trim() || saving}
            >
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir orçamento?</AlertDialogTitle>
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
