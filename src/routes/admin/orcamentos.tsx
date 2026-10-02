import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  FileText,
  Pencil,
  Plus,
  Receipt,
  Search,
  Send,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  User,
  Wallet,
  XCircle,
} from "lucide-react";
import { db } from "@/integrations/mysql/client";
import { BudgetDialog } from "@/components/admin/finance/BudgetDialog";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import {
  Initial,
  PeriodFilter,
  RowMenu,
  StatCard,
  StatusChips,
  StatusPill,
} from "@/components/admin/finance/FinanceUI";
import { formatCurrency, type BudgetStatus } from "@/lib/admin/labels";
import { inRange, periodRange, type PeriodId } from "@/lib/admin/finance-period";
import { Button } from "@/components/ui/button";
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

export const Route = createFileRoute("/admin/orcamentos")({
  // ?paciente=<id> abre a lista já filtrada (ex.: vindo do odontograma).
  validateSearch: (search: Record<string, unknown>): { paciente?: string } =>
    typeof search["paciente"] === "string" ? { paciente: search["paciente"] } : {},
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
type Treatment = {
  id: string;
  name: string;
  price: number | null;
  description: string | null;
  duration_minutes: number | null;
};

const STATUS: Record<BudgetStatus, { label: string; pill: string; dot: string }> = {
  rascunho: {
    label: "Rascunho",
    pill: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
    dot: "bg-slate-400",
  },
  enviado: {
    label: "Aguardando",
    pill: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  aprovado: {
    label: "Aprovado",
    pill: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  recusado: {
    label: "Recusado",
    pill: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
    dot: "bg-red-500",
  },
};
const STATUS_ORDER: BudgetStatus[] = ["rascunho", "enviado", "aprovado", "recusado"];

const date = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

function Orcamentos() {
  const navigate = useNavigate();
  const { paciente } = Route.useSearch();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<BudgetStatus | "todos">("todos");
  const [patientFilter, setPatientFilter] = useState(paciente ?? "todos");
  const [period, setPeriod] = useState<{ period: PeriodId; from: string; to: string }>({
    period: "todos",
    from: "",
    to: "",
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Budget | null>(null);

  async function load() {
    const [{ data: budgetsData }, { data: patientsData }, { data: treatmentsData }] =
      await Promise.all([
        db
          .from("budgets")
          .select("id, patient_id, treatment, value, status, notes, created_at, patients(name)")
          .order("created_at", { ascending: false }),
        db.from("patients").select("id, name").order("name"),
        db
          .from("treatments")
          .select("id, name, price, description, duration_minutes")
          .eq("active", true)
          .order("name"),
      ]);
    setBudgets((budgetsData ?? []) as unknown as Budget[]);
    setPatients((patientsData ?? []) as Patient[]);
    setTreatments((treatmentsData ?? []) as Treatment[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  // Base do período e paciente (os indicadores seguem esses filtros).
  const scoped = useMemo(() => {
    const range = periodRange(period.period, period.from, period.to);
    const q = query.trim().toLowerCase();
    return budgets.filter(
      (b) =>
        inRange(b.created_at, range) &&
        (patientFilter === "todos" || b.patient_id === patientFilter) &&
        (!q || b.patients?.name.toLowerCase().includes(q) || b.treatment.toLowerCase().includes(q)),
    );
  }, [budgets, period, patientFilter, query]);

  const filtered = status === "todos" ? scoped : scoped.filter((b) => b.status === status);

  const kpi = useMemo(() => {
    const sum = (list: Budget[]) => list.reduce((s, b) => s + Number(b.value), 0);
    const by = (s: BudgetStatus) => scoped.filter((b) => b.status === s);
    const decided = by("aprovado").length + by("recusado").length;
    return {
      total: sum(scoped),
      approved: sum(by("aprovado")),
      approvedCount: by("aprovado").length,
      waiting: sum(by("enviado")),
      waitingCount: by("enviado").length,
      refused: sum(by("recusado")),
      refusedCount: by("recusado").length,
      rate: decided ? Math.round((by("aprovado").length / decided) * 100) : 0,
      decided,
    };
  }, [scoped]);

  const hasFilters =
    !!query.trim() || patientFilter !== "todos" || period.period !== "todos" || status !== "todos";

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(b: Budget) {
    setEditing(b);
    setDialogOpen(true);
  }

  async function setBudgetStatus(b: Budget, next: BudgetStatus) {
    const { error } = await db.from("budgets").update({ status: next }).eq("id", b.id);
    if (error) return;
    toast.success(`Orçamento marcado como ${STATUS[next].label.toLowerCase()}.`);
    load();
  }

  async function sendToFinance(b: Budget) {
    const { error } = await db
      .from("payments")
      .insert({ patient_id: b.patient_id, amount: Number(b.value), status: "pendente" });
    if (error) return;
    toast.success("Lançado no Financeiro como pendente.", {
      action: { label: "Abrir", onClick: () => navigate({ to: "/admin/financeiro" }) },
    });
  }

  async function remove() {
    if (!deleteTarget) return;
    const { error } = await db.from("budgets").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null);
    if (!error) toast.success("Orçamento excluído.");
    load();
  }

  // Ação principal conforme o momento do orçamento.
  function primaryAction(b: Budget) {
    if (b.status === "rascunho")
      return (
        <Button size="sm" variant="outline" onClick={() => setBudgetStatus(b, "enviado")}>
          <Send className="h-3.5 w-3.5" /> Enviar
        </Button>
      );
    if (b.status === "enviado")
      return (
        <div className="flex gap-1.5">
          <Button
            size="sm"
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => setBudgetStatus(b, "aprovado")}
          >
            <ThumbsUp className="h-3.5 w-3.5" /> Aprovar
          </Button>
          <Button size="sm" variant="outline" onClick={() => setBudgetStatus(b, "recusado")}>
            <ThumbsDown className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only">Recusar</span>
          </Button>
        </div>
      );
    if (b.status === "aprovado")
      return (
        <Button size="sm" variant="outline" onClick={() => sendToFinance(b)}>
          <Wallet className="h-3.5 w-3.5" /> Lançar no Financeiro
        </Button>
      );
    return null;
  }

  function menu(b: Budget) {
    return (
      <RowMenu
        items={[
          { label: "Editar", icon: Pencil, onClick: () => openEdit(b) },
          {
            label: "Abrir paciente",
            icon: User,
            onClick: () =>
              navigate({ to: "/admin/pacientes/$patientId", params: { patientId: b.patient_id } }),
          },
          {
            label: "Gerar proposta",
            icon: FileText,
            onClick: () =>
              navigate({
                to: "/admin/pacientes/$patientId/proposta",
                params: { patientId: b.patient_id },
              }),
          },
          ...(b.status !== "aprovado"
            ? [
                {
                  label: "Marcar como aprovado",
                  icon: CheckCircle2,
                  onClick: () => setBudgetStatus(b, "aprovado"),
                },
              ]
            : []),
          ...(b.status === "aprovado"
            ? [{ label: "Lançar no Financeiro", icon: Wallet, onClick: () => sendToFinance(b) }]
            : []),
          { label: "Excluir", icon: Trash2, onClick: () => setDeleteTarget(b), danger: true },
        ]}
      />
    );
  }

  return (
    <div className="animate-in fade-in space-y-5 duration-300">
      <PageHeader
        title="🧾 Orçamentos"
        description="Propostas de tratamento: acompanhe do rascunho até a aprovação."
        action={
          <Button onClick={openCreate} disabled={patients.length === 0}>
            <Plus /> Novo orçamento
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={Receipt}
          label="Total orçado"
          value={formatCurrency(kpi.total)}
          hint={`${scoped.length} orçamento(s)`}
          tone="slate"
          onClick={() => setStatus("todos")}
          active={status === "todos"}
        />
        <StatCard
          icon={CheckCircle2}
          label="Aprovado"
          value={formatCurrency(kpi.approved)}
          hint={kpi.decided ? `${kpi.rate}% de aprovação` : "Nenhum decidido ainda"}
          progress={kpi.rate}
          tone="green"
          onClick={() => setStatus("aprovado")}
          active={status === "aprovado"}
        />
        <StatCard
          icon={Clock}
          label="Aguardando"
          value={formatCurrency(kpi.waiting)}
          hint={`${kpi.waitingCount} aguardando resposta`}
          tone="blue"
          onClick={() => setStatus("enviado")}
          active={status === "enviado"}
        />
        <StatCard
          icon={XCircle}
          label="Recusado"
          value={formatCurrency(kpi.refused)}
          hint={`${kpi.refusedCount} recusado(s)`}
          tone="red"
          onClick={() => setStatus("recusado")}
          active={status === "recusado"}
        />
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4">
        <StatusChips
          value={status}
          onChange={setStatus}
          options={[
            { id: "todos", label: "Todos", count: scoped.length },
            ...STATUS_ORDER.map((s) => ({
              id: s,
              label: STATUS[s].label,
              dot: STATUS[s].dot,
              count: scoped.filter((b) => b.status === s).length,
            })),
          ]}
        />
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-52 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar paciente ou tratamento..."
              className="h-9 pl-9"
            />
          </div>
          <select
            value={patientFilter}
            onChange={(e) => setPatientFilter(e.target.value)}
            className="h-9 max-w-52 rounded-lg border border-border bg-card px-3 text-sm font-medium"
            aria-label="Paciente"
          >
            <option value="todos">Todos os pacientes</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <PeriodFilter
            value={period.period}
            from={period.from}
            to={period.to}
            onChange={setPeriod}
          />
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQuery("");
                setStatus("todos");
                setPatientFilter("todos");
                setPeriod({ period: "todos", from: "", to: "" });
              }}
            >
              Limpar
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {loading ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Carregando...</p>
        ) : filtered.length === 0 ? (
          <div className="p-2">
            <EmptyState
              icon={Receipt}
              title={
                budgets.length === 0
                  ? "Nenhum orçamento ainda. Crie o primeiro!"
                  : "Nenhum orçamento com esses filtros."
              }
            />
            {budgets.length === 0 && patients.length > 0 && (
              <div className="pb-6 text-center">
                <Button onClick={openCreate}>
                  <Plus /> Criar orçamento
                </Button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Celular */}
            <ul className="divide-y divide-border md:hidden">
              {filtered.map((b) => (
                <li key={b.id} className="space-y-2.5 p-4">
                  <div className="flex items-start gap-3">
                    <Initial name={b.patients?.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{b.patients?.name ?? "—"}</p>
                      <p className="truncate text-sm text-muted-foreground">{b.treatment}</p>
                    </div>
                    {menu(b)}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-lg font-extrabold">
                      {formatCurrency(Number(b.value))}
                    </span>
                    <StatusPill label={STATUS[b.status].label} className={STATUS[b.status].pill} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">{date(b.created_at)}</span>
                    {primaryAction(b)}
                  </div>
                </li>
              ))}
            </ul>
            {/* Computador */}
            <table className="hidden w-full text-sm md:table">
              <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Paciente</th>
                  <th className="px-4 py-3 font-semibold">Tratamento</th>
                  <th className="px-4 py-3 text-right font-semibold">Valor</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((b) => (
                  <tr key={b.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Initial name={b.patients?.name} />
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{b.patients?.name ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">{date(b.created_at)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="max-w-72 px-4 py-3">
                      <p className="truncate font-medium">{b.treatment}</p>
                      {b.notes && (
                        <p className="truncate text-xs text-muted-foreground">{b.notes}</p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-bold">
                      {formatCurrency(Number(b.value))}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill
                        label={STATUS[b.status].label}
                        className={STATUS[b.status].pill}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {primaryAction(b)}
                        {menu(b)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      <BudgetDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        patients={patients}
        treatments={treatments}
        statusOptions={STATUS_ORDER.map((s) => ({
          id: s,
          label: STATUS[s].label,
          dot: STATUS[s].dot,
        }))}
        defaultPatientId={patientFilter !== "todos" ? patientFilter : ""}
        onSaved={load}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir orçamento?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.treatment} de {deleteTarget?.patients?.name}. Essa ação não pode ser
              desfeita.
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
