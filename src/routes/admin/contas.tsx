import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowLeftRight,
  ArrowUpCircle,
  CheckCircle2,
  Copy,
  Pencil,
  Plus,
  Scale,
  Search,
  Trash2,
} from "lucide-react";
import { db } from "@/integrations/mysql/client";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { PaymentMethodFields } from "@/components/admin/PaymentMethodFields";
import {
  MoneyInput,
  PeriodFilter,
  RowMenu,
  Segmented,
  StatCard,
  StatusChips,
  StatusPill,
} from "@/components/admin/finance/FinanceUI";
import {
  FINANCE_ENTRY_CATEGORIES,
  formatCurrency,
  type FinanceEntryType,
  type PaymentStatus,
} from "@/lib/admin/labels";
import {
  daysUntil,
  inRange,
  parseMoney,
  periodRange,
  type PeriodId,
} from "@/lib/admin/finance-period";
import {
  PAYMENT_METHODS,
  parseInstallments,
  paymentMethodLabel,
  useEnabledPaymentMethods,
} from "@/lib/payment-methods";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  payment_method: string | null;
  installments: number | null;
  patients: { name: string } | null;
};
type Patient = { id: string; name: string };
type View = FinanceEntryType | "todas";
type StatusFilter = "todas" | "atrasadas" | "semana" | PaymentStatus;

const TYPE = {
  receber: {
    label: "A receber",
    icon: ArrowDownCircle,
    color: "text-emerald-600",
    chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
  pagar: {
    label: "A pagar",
    icon: ArrowUpCircle,
    color: "text-red-600",
    chip: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  },
} as const;

const today = () => new Date().toLocaleDateString("en-CA");

/** Situação da conta: paga, cancelada ou prazo (atrasada/vence hoje/em N dias). */
function dueInfo(e: FinanceEntry): { label: string; pill: string; overdue: boolean } {
  if (e.status === "pago")
    return {
      label: e.type === "pagar" ? "Paga" : "Recebida",
      pill: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
      overdue: false,
    };
  if (e.status === "cancelado")
    return {
      label: "Cancelada",
      pill: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
      overdue: false,
    };
  if (!e.due_date)
    return {
      label: "Pendente",
      pill: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
      overdue: false,
    };
  const d = daysUntil(e.due_date);
  if (d < 0)
    return {
      label: `Atrasada há ${-d} dia${d === -1 ? "" : "s"}`,
      pill: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
      overdue: true,
    };
  if (d === 0)
    return {
      label: "Vence hoje",
      pill: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
      overdue: false,
    };
  return {
    label: d === 1 ? "Vence amanhã" : `Vence em ${d} dias`,
    pill:
      d <= 7
        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
        : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    overdue: false,
  };
}

const emptyForm = {
  type: "pagar" as FinanceEntryType,
  description: "",
  category: "Outros",
  amount: "",
  due_date: today(),
  patient_id: "",
  status: "pendente" as PaymentStatus,
  notes: "",
  payment_method: "",
  installments: "",
};

const fmtDate = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR");

function nextMonth(iso: string) {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return d.toLocaleDateString("en-CA");
}

function Contas() {
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("todas");
  const [status, setStatus] = useState<StatusFilter>("todas");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("todas");
  const [methodFilter, setMethodFilter] = useState("todos");
  const [period, setPeriod] = useState<{ period: PeriodId; from: string; to: string }>({
    period: "todos",
    from: "",
    to: "",
  });
  const enabledMethods = useEnabledPaymentMethods();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceEntry | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [settling, setSettling] = useState<FinanceEntry | null>(null);
  const [settleMethod, setSettleMethod] = useState({ method: "", installments: "" });
  const [deleteTarget, setDeleteTarget] = useState<FinanceEntry | null>(null);

  async function load() {
    const [{ data: entriesData }, { data: patientsData }] = await Promise.all([
      db
        .from("finance_entries")
        .select(
          "id, type, description, category, amount, due_date, paid_at, status, patient_id, notes, created_at, payment_method, installments, patients(name)",
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

  // Tudo que respeita tipo, período, busca, categoria e forma (base dos indicadores).
  const scoped = useMemo(() => {
    const range = periodRange(period.period, period.from, period.to);
    const q = query.trim().toLowerCase();
    return entries.filter(
      (e) =>
        (view === "todas" || e.type === view) &&
        inRange(e.due_date ?? e.created_at, range) &&
        (category === "todas" || (e.category ?? "Outros") === category) &&
        (methodFilter === "todos" || (e.payment_method ?? "nao_informada") === methodFilter) &&
        (!q ||
          e.description.toLowerCase().includes(q) ||
          e.patients?.name.toLowerCase().includes(q)),
    );
  }, [entries, view, period, query, category, methodFilter]);

  const isOverdue = (e: FinanceEntry) => dueInfo(e).overdue;
  const dueThisWeek = (e: FinanceEntry) =>
    e.status === "pendente" &&
    !!e.due_date &&
    daysUntil(e.due_date) >= 0 &&
    daysUntil(e.due_date) <= 7;

  const filtered = scoped
    .filter((e) =>
      status === "todas"
        ? true
        : status === "atrasadas"
          ? isOverdue(e)
          : status === "semana"
            ? dueThisWeek(e)
            : e.status === status,
    )
    .sort((a, b) => {
      // Pendentes primeiro (por vencimento), depois as quitadas mais recentes.
      const rank = (e: FinanceEntry) => (e.status === "pendente" ? 0 : 1);
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
      return (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999");
    });

  const kpi = useMemo(() => {
    const pending = scoped.filter((e) => e.status === "pendente");
    const sum = (list: FinanceEntry[]) => list.reduce((s, e) => s + Number(e.amount), 0);
    const toPay = sum(pending.filter((e) => e.type === "pagar"));
    const toReceive = sum(pending.filter((e) => e.type === "receber"));
    const overdue = scoped.filter(isOverdue);
    return {
      toPay,
      toReceive,
      balance: toReceive - toPay,
      overdueCount: overdue.length,
      overdueTotal: sum(overdue),
      weekCount: scoped.filter(dueThisWeek).length,
    };
  }, [scoped]);

  const hasFilters =
    !!query.trim() ||
    category !== "todas" ||
    methodFilter !== "todos" ||
    status !== "todas" ||
    period.period !== "todos";

  function openCreate(type?: FinanceEntryType) {
    setEditing(null);
    setForm({ ...emptyForm, type: type ?? (view === "todas" ? "pagar" : view), due_date: today() });
    setDialogOpen(true);
  }

  function openEdit(e: FinanceEntry) {
    setEditing(e);
    setForm({
      type: e.type,
      description: e.description,
      category: e.category ?? "Outros",
      amount: String(e.amount).replace(".", ","),
      due_date: e.due_date ? e.due_date.slice(0, 10) : "",
      patient_id: e.patient_id ?? "",
      status: e.status,
      notes: e.notes ?? "",
      payment_method: e.payment_method ?? "",
      installments: e.installments ? String(e.installments) : "",
    });
    setDialogOpen(true);
  }

  const amount = parseMoney(form.amount);
  const formValid = !!form.description.trim() && amount > 0;

  async function save() {
    if (!formValid) return;
    setSaving(true);
    const payload = {
      type: form.type,
      description: form.description.trim(),
      category: form.category || null,
      amount,
      due_date: form.due_date || null,
      patient_id: form.patient_id || null,
      status: form.status,
      notes: form.notes.trim() || null,
      paid_at: form.status === "pago" ? (editing?.paid_at ?? new Date().toISOString()) : null,
      payment_method: form.payment_method || null,
      installments: parseInstallments(form.payment_method, form.installments),
    };
    const { error } = editing
      ? await db.from("finance_entries").update(payload).eq("id", editing.id)
      : await db.from("finance_entries").insert(payload);
    setSaving(false);
    if (error) return;
    toast.success(editing ? "Conta atualizada." : "Conta criada.");
    setDialogOpen(false);
    load();
  }

  function openSettle(e: FinanceEntry) {
    setSettling(e);
    setSettleMethod({
      method: e.payment_method ?? "",
      installments: e.installments ? String(e.installments) : "",
    });
  }

  async function confirmSettle() {
    if (!settling) return;
    const { error } = await db
      .from("finance_entries")
      .update({
        status: "pago",
        paid_at: new Date().toISOString(),
        payment_method: settleMethod.method || null,
        installments: parseInstallments(settleMethod.method, settleMethod.installments),
      })
      .eq("id", settling.id);
    if (error) return;
    toast.success(settling.type === "pagar" ? "Conta paga." : "Conta recebida.");
    setSettling(null);
    load();
  }

  async function repeatNextMonth(e: FinanceEntry) {
    const { error } = await db.from("finance_entries").insert({
      type: e.type,
      description: e.description,
      category: e.category,
      amount: Number(e.amount),
      due_date: nextMonth(e.due_date ?? today()),
      patient_id: e.patient_id,
      status: "pendente",
      notes: e.notes,
      payment_method: e.payment_method,
      installments: e.installments,
    });
    if (error) return;
    toast.success(`Criada para ${fmtDate(nextMonth(e.due_date ?? today()))}.`);
    load();
  }

  async function remove() {
    if (!deleteTarget) return;
    const { error } = await db.from("finance_entries").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null);
    if (!error) toast.success("Conta excluída.");
    load();
  }

  function menu(e: FinanceEntry) {
    return (
      <RowMenu
        items={[
          { label: "Editar", icon: Pencil, onClick: () => openEdit(e) },
          { label: "Repetir no próximo mês", icon: Copy, onClick: () => repeatNextMonth(e) },
          { label: "Excluir", icon: Trash2, onClick: () => setDeleteTarget(e), danger: true },
        ]}
      />
    );
  }

  const settleButton = (e: FinanceEntry) =>
    e.status === "pendente" ? (
      <Button
        size="sm"
        className={
          e.type === "receber"
            ? "bg-emerald-600 text-white hover:bg-emerald-700"
            : "bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
        }
        onClick={() => openSettle(e)}
      >
        <CheckCircle2 className="h-3.5 w-3.5" /> {e.type === "pagar" ? "Pagar" : "Receber"}
      </Button>
    ) : null;

  const typeIcon = (e: FinanceEntry) => {
    const T = TYPE[e.type];
    return (
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${T.chip}`}
        title={T.label}
      >
        <T.icon className="h-4.5 w-4.5" />
      </span>
    );
  };

  const signed = (e: FinanceEntry) => (
    <span className={`whitespace-nowrap font-bold ${TYPE[e.type].color}`}>
      {e.type === "pagar" ? "−" : "+"}
      {formatCurrency(Number(e.amount))}
    </span>
  );

  return (
    <div className="animate-in fade-in space-y-5 duration-300">
      <PageHeader
        title="📥📤 Contas a Pagar/Receber"
        description="Despesas e receitas da clínica, com vencimento e alertas de atraso."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => openCreate("receber")}>
              <ArrowDownCircle className="text-emerald-600" /> A receber
            </Button>
            <Button onClick={() => openCreate("pagar")}>
              <Plus /> Conta a pagar
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-1 rounded-2xl border border-border bg-card p-1 shadow-sm sm:inline-grid sm:w-auto">
        {(
          [
            ["todas", "Todas", ArrowLeftRight],
            ["receber", "A receber", ArrowDownCircle],
            ["pagar", "A pagar", ArrowUpCircle],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className={`flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-2 py-2 text-xs font-semibold transition-colors sm:px-4 sm:text-sm ${
              view === id ? "bg-primary text-primary-foreground shadow" : "hover:bg-accent"
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {kpi.overdueCount > 0 && status !== "atrasadas" && (
        <button
          type="button"
          onClick={() => setStatus("atrasadas")}
          className="animate-in fade-in flex w-full items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-800 transition-colors hover:bg-red-100 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
        >
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span className="flex-1">
            <b>
              {kpi.overdueCount} conta{kpi.overdueCount > 1 ? "s" : ""} atrasada
              {kpi.overdueCount > 1 ? "s" : ""}
            </b>{" "}
            somando {formatCurrency(kpi.overdueTotal)}.
          </span>
          <span className="font-semibold underline">Ver</span>
        </button>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={ArrowDownCircle}
          label="A receber"
          value={formatCurrency(kpi.toReceive)}
          hint="Pendente"
          tone="green"
          onClick={() => {
            setView("receber");
            setStatus("pendente");
          }}
        />
        <StatCard
          icon={ArrowUpCircle}
          label="A pagar"
          value={formatCurrency(kpi.toPay)}
          hint="Pendente"
          tone="red"
          onClick={() => {
            setView("pagar");
            setStatus("pendente");
          }}
        />
        <StatCard
          icon={Scale}
          label="Saldo previsto"
          value={formatCurrency(kpi.balance)}
          hint="A receber − a pagar"
          tone={kpi.balance >= 0 ? "blue" : "red"}
        />
        <StatCard
          icon={AlertTriangle}
          label="Atrasadas"
          value={String(kpi.overdueCount)}
          hint={kpi.overdueCount ? formatCurrency(kpi.overdueTotal) : "Tudo em dia 🎉"}
          tone={kpi.overdueCount ? "red" : "green"}
          onClick={() => setStatus("atrasadas")}
          active={status === "atrasadas"}
        />
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4">
        <StatusChips<StatusFilter>
          value={status}
          onChange={setStatus}
          options={[
            { id: "todas", label: "Todas", count: scoped.length },
            { id: "atrasadas", label: "Atrasadas", dot: "bg-red-500", count: kpi.overdueCount },
            { id: "semana", label: "Vencem em 7 dias", dot: "bg-amber-500", count: kpi.weekCount },
            {
              id: "pendente",
              label: "Pendentes",
              dot: "bg-blue-500",
              count: scoped.filter((e) => e.status === "pendente").length,
            },
            {
              id: "pago",
              label: "Quitadas",
              dot: "bg-emerald-500",
              count: scoped.filter((e) => e.status === "pago").length,
            },
            {
              id: "cancelado",
              label: "Canceladas",
              dot: "bg-slate-400",
              count: scoped.filter((e) => e.status === "cancelado").length,
            },
          ]}
        />
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-52 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar descrição ou paciente..."
              className="h-9 pl-9"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card px-3 text-sm font-medium"
            aria-label="Categoria"
          >
            <option value="todas">Todas as categorias</option>
            {FINANCE_ENTRY_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="h-9 max-w-48 rounded-lg border border-border bg-card px-3 text-sm font-medium"
            aria-label="Forma de pagamento"
          >
            <option value="todos">Todas as formas</option>
            <option value="nao_informada">Não informada</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.emoji} {m.label}
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
                setStatus("todas");
                setCategory("todas");
                setMethodFilter("todos");
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
              icon={ArrowLeftRight}
              title={
                entries.length === 0
                  ? "Nenhuma conta cadastrada ainda."
                  : status === "atrasadas"
                    ? "Nenhuma conta atrasada. Tudo em dia!"
                    : "Nenhuma conta com esses filtros."
              }
            />
            {entries.length === 0 && (
              <div className="flex justify-center gap-2 pb-6">
                <Button variant="outline" onClick={() => openCreate("receber")}>
                  Conta a receber
                </Button>
                <Button onClick={() => openCreate("pagar")}>Conta a pagar</Button>
              </div>
            )}
          </div>
        ) : (
          <>
            <ul className="divide-y divide-border md:hidden">
              {filtered.map((e) => {
                const info = dueInfo(e);
                return (
                  <li
                    key={e.id}
                    className={`space-y-2.5 p-4 ${info.overdue ? "bg-red-50/60 dark:bg-red-950/20" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      {typeIcon(e)}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{e.description}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {e.category ?? "Outros"}
                          {e.patients?.name ? ` · ${e.patients.name}` : ""}
                          {e.due_date ? ` · vence ${fmtDate(e.due_date)}` : ""}
                        </p>
                      </div>
                      {menu(e)}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-lg">{signed(e)}</span>
                      <StatusPill label={info.label} className={info.pill} />
                    </div>
                    {settleButton(e) && <div className="flex justify-end">{settleButton(e)}</div>}
                  </li>
                );
              })}
            </ul>
            <table className="hidden w-full text-sm md:table">
              <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Conta</th>
                  <th className="px-4 py-3 font-semibold">Vencimento</th>
                  <th className="px-4 py-3 text-right font-semibold">Valor</th>
                  <th className="px-4 py-3 font-semibold">Situação</th>
                  <th className="px-4 py-3 text-right font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((e) => {
                  const info = dueInfo(e);
                  return (
                    <tr
                      key={e.id}
                      className={`transition-colors hover:bg-muted/30 ${info.overdue ? "bg-red-50/60 dark:bg-red-950/20" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {typeIcon(e)}
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{e.description}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {e.category ?? "Outros"}
                              {e.patients?.name ? ` · ${e.patients.name}` : ""}
                              {e.payment_method
                                ? ` · ${paymentMethodLabel(e.payment_method, e.installments)}`
                                : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {e.due_date ? fmtDate(e.due_date) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">{signed(e)}</td>
                      <td className="px-4 py-3">
                        <StatusPill label={info.label} className={info.pill} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {settleButton(e)}
                          {menu(e)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </div>

      <Dialog open={!!settling} onOpenChange={(o) => !o && setSettling(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {settling?.type === "pagar" ? "Confirmar pagamento" : "Confirmar recebimento"}
            </DialogTitle>
            <DialogDescription>
              {settling?.description} ·{" "}
              <b className="text-foreground">{formatCurrency(Number(settling?.amount ?? 0))}</b>
            </DialogDescription>
          </DialogHeader>
          <PaymentMethodFields
            methods={enabledMethods}
            method={settleMethod.method}
            installments={settleMethod.installments}
            onChange={({ method, installments }) => setSettleMethod({ method, installments })}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettling(null)}>
              Cancelar
            </Button>
            <Button onClick={confirmSettle}>
              <CheckCircle2 className="h-4 w-4" /> Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar conta" : "Nova conta"}</DialogTitle>
            <DialogDescription>
              Despesas da clínica (a pagar) ou valores que a clínica vai receber.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Segmented
              value={form.type}
              onChange={(type) => setForm((f) => ({ ...f, type }))}
              options={[
                { id: "pagar", label: "📤 A pagar" },
                { id: "receber", label: "📥 A receber" },
              ]}
            />
            <div className="space-y-1.5">
              <Label htmlFor="c-description">Descrição</Label>
              <Input
                id="c-description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder={
                  form.type === "pagar"
                    ? "Ex.: Aluguel da clínica, material de consumo..."
                    : "Ex.: Convênio, tratamento parcelado..."
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <div className="flex flex-wrap gap-1.5">
                {FINANCE_ENTRY_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, category: c }))}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                      form.category === c
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="c-amount">Valor</Label>
                <MoneyInput
                  id="c-amount"
                  value={form.amount}
                  onChange={(v) => setForm((f) => ({ ...f, amount: v }))}
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
            <div className="space-y-1.5">
              <Label>Situação</Label>
              <Segmented
                value={form.status}
                onChange={(s) => setForm((f) => ({ ...f, status: s }))}
                options={[
                  { id: "pendente", label: "Pendente", dot: "bg-amber-500" },
                  {
                    id: "pago",
                    label: form.type === "pagar" ? "Paga" : "Recebida",
                    dot: "bg-emerald-500",
                  },
                  { id: "cancelado", label: "Cancelada", dot: "bg-slate-400" },
                ]}
              />
            </div>
            <PaymentMethodFields
              methods={enabledMethods}
              method={form.payment_method}
              installments={form.installments}
              onChange={({ method, installments }) =>
                setForm((f) => ({ ...f, payment_method: method, installments }))
              }
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="c-patient">Paciente (opcional)</Label>
                <select
                  id="c-patient"
                  value={form.patient_id}
                  onChange={(e) => setForm((f) => ({ ...f, patient_id: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                >
                  <option value="">Nenhum</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-notes">Observações</Label>
                <Textarea
                  id="c-notes"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Opcional"
                  rows={1}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={!formValid || saving}>
              {saving ? "Salvando..." : editing ? "Salvar alterações" : "Criar conta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.description} · {formatCurrency(Number(deleteTarget?.amount ?? 0))}.
              Essa ação não pode ser desfeita.
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
