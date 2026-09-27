import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Plus, Pencil, Trash2, Search, CheckCircle2 } from "lucide-react";
import { db } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import {
  FINANCE_ENTRY_TYPE_LABEL,
  FINANCE_ENTRY_TYPE_VARIANT,
  FINANCE_ENTRY_CATEGORIES,
  PAYMENT_STATUS_LABEL as STATUS_LABEL,
  PAYMENT_STATUS_VARIANT as STATUS_VARIANT,
  type FinanceEntryType,
  type PaymentStatus,
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

export const Route = createFileRoute("/admin/contas")({
  component: Contas,
});

type FinanceEntry = {
  id: string;
  type: FinanceEntryType;
  description: string;
  category: string | null;
  amount: number;
  due_date: string | null;
  paid_at: string | null;
  status: PaymentStatus;
  patient_id: string | null;
  notes: string | null;
  created_at: string;
  patients: { name: string } | null;
};

type Patient = { id: string; name: string };

const emptyForm = {
  type: "pagar" as FinanceEntryType,
  description: "",
  category: "Outros",
  amount: "",
  due_date: "",
  patient_id: "",
  status: "pendente" as PaymentStatus,
  notes: "",
};

function isOverdue(entry: FinanceEntry) {
  if (entry.status !== "pendente" || !entry.due_date) return false;
  return new Date(entry.due_date).getTime() < new Date().setHours(0, 0, 0, 0);
}

function Contas() {
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<FinanceEntryType | "todos">("todos");
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "atrasado" | "todos">("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceEntry | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FinanceEntry | null>(null);

  async function load() {
    setLoading(true);
    const [{ data: entriesData }, { data: patientsData }] = await Promise.all([
      db
        .from("finance_entries")
        .select(
          "id, type, description, category, amount, due_date, paid_at, status, patient_id, notes, created_at, patients(name)",
        )
        .order("due_date", { ascending: true }),
      db.from("patients").select("id, name").order("name"),
    ]);
    setEntries((entriesData ?? []) as unknown as FinanceEntry[]);
    setPatients((patientsData ?? []) as Patient[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (typeFilter !== "todos" && e.type !== typeFilter) return false;
      if (statusFilter === "atrasado" && !isOverdue(e)) return false;
      if (statusFilter !== "todos" && statusFilter !== "atrasado" && e.status !== statusFilter)
        return false;
      if (
        q &&
        !e.description.toLowerCase().includes(q) &&
        !e.patients?.name.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [entries, query, typeFilter, statusFilter]);

  const totals = useMemo(() => {
    const aPagar = entries
      .filter((e) => e.type === "pagar" && e.status === "pendente")
      .reduce((s, e) => s + Number(e.amount), 0);
    const aReceber = entries
      .filter((e) => e.type === "receber" && e.status === "pendente")
      .reduce((s, e) => s + Number(e.amount), 0);
    return { aPagar, aReceber, saldo: aReceber - aPagar };
  }, [entries]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(e: FinanceEntry) {
    setEditing(e);
    setForm({
      type: e.type,
      description: e.description,
      category: e.category ?? "Outros",
      amount: String(e.amount),
      due_date: e.due_date ? e.due_date.slice(0, 10) : "",
      patient_id: e.patient_id ?? "",
      status: e.status,
      notes: e.notes ?? "",
    });
    setDialogOpen(true);
  }

  async function save() {
    if (!form.description.trim() || !form.amount.trim()) return;
    setSaving(true);
    const payload = {
      type: form.type,
      description: form.description.trim(),
      category: form.category || null,
      amount: Number(form.amount.replace(",", ".")),
      due_date: form.due_date || null,
      patient_id: form.patient_id || null,
      status: form.status,
      notes: form.notes.trim() || null,
      paid_at: form.status === "pago" ? new Date().toISOString() : null,
    };
    if (editing) {
      await db.from("finance_entries").update(payload).eq("id", editing.id);
    } else {
      await db.from("finance_entries").insert(payload);
    }
    setSaving(false);
    setDialogOpen(false);
    load();
  }

  async function markPaid(e: FinanceEntry) {
    await db
      .from("finance_entries")
      .update({ status: "pago", paid_at: new Date().toISOString() })
      .eq("id", e.id);
    load();
  }

  async function remove() {
    if (!deleteTarget) return;
    await db.from("finance_entries").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null);
    load();
  }

  return (
    <div className="animate-in fade-in duration-300">
      <PageHeader
        title="📥📤 Contas a Pagar/Receber"
        action={
          <Button onClick={openCreate}>
            <Plus /> Nova conta
          </Button>
        }
      />

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            📤 A pagar (pendente)
          </p>
          <p className="mt-1 text-2xl font-extrabold text-red-600">
            {formatCurrency(totals.aPagar)}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            📥 A receber (pendente)
          </p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-600">
            {formatCurrency(totals.aReceber)}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            ⚖️ Saldo previsto
          </p>
          <p
            className={`mt-1 text-2xl font-extrabold ${totals.saldo >= 0 ? "text-emerald-600" : "text-red-600"}`}
          >
            {formatCurrency(totals.saldo)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar descrição ou paciente..."
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Pagar e receber</SelectItem>
            {Object.entries(FINANCE_ENTRY_TYPE_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="atrasado">🔴 Atrasado</SelectItem>
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filtered.length} conta(s)</span>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-card">
        {loading ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Carregando...</p>
        ) : filtered.length === 0 ? (
          <EmptyState icon={ArrowLeftRight} title="Nenhuma conta encontrada." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => (
                <TableRow key={e.id} className="animate-in fade-in">
                  <TableCell>
                    <Badge variant={FINANCE_ENTRY_TYPE_VARIANT[e.type]}>
                      {FINANCE_ENTRY_TYPE_LABEL[e.type]}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {e.description}
                    {e.patients?.name && (
                      <span className="block text-xs font-normal text-muted-foreground">
                        {e.patients.name}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{e.category ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {e.due_date ? new Date(e.due_date).toLocaleDateString("pt-BR") : "—"}
                  </TableCell>
                  <TableCell className={e.type === "pagar" ? "text-red-600" : "text-emerald-600"}>
                    {e.type === "pagar" ? "-" : "+"}
                    {formatCurrency(Number(e.amount))}
                  </TableCell>
                  <TableCell>
                    {isOverdue(e) ? (
                      <Badge variant="destructive">🔴 Atrasado</Badge>
                    ) : (
                      <Badge variant={STATUS_VARIANT[e.status]}>{STATUS_LABEL[e.status]}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {e.status === "pendente" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => markPaid(e)}
                        aria-label={
                          e.type === "pagar" ? "Marcar como pago" : "Marcar como recebido"
                        }
                        className="text-muted-foreground hover:text-emerald-600"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(e)}
                      aria-label="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(e)}
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
            <DialogTitle>{editing ? "Editar conta" : "Nova conta"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select
                  value={form.type}
                  onValueChange={(type) =>
                    setForm((f) => ({ ...f, type: type as FinanceEntryType }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FINANCE_ENTRY_TYPE_LABEL).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    {FINANCE_ENTRY_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-description">Descrição</Label>
              <Input
                id="c-description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Ex.: Aluguel da clínica, Consulta João Silva..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="c-amount">Valor (R$)</Label>
                <Input
                  id="c-amount"
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-due">Vencimento</Label>
                <Input
                  id="c-due"
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Paciente (opcional)</Label>
                <Select
                  value={form.patient_id}
                  onValueChange={(patient_id) => setForm((f) => ({ ...f, patient_id }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhum" />
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
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(status) =>
                    setForm((f) => ({ ...f, status: status as PaymentStatus }))
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
              <Label htmlFor="c-notes">Observações</Label>
              <Textarea
                id="c-notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Opcional"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={save}
              disabled={!form.description.trim() || !form.amount.trim() || saving}
            >
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
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
