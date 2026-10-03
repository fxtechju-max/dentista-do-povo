import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Ban,
  BarChart3,
  FileText,
  CheckCircle2,
  Clock,
  DollarSign,
  Pencil,
  Plus,
  Receipt,
  Search,
  ShoppingCart,
  Trash2,
  TrendingUp,
  User,
  Wallet,
} from "lucide-react";
import { db } from "@/integrations/mysql/client";
import { Pdv } from "@/components/admin/finance/Pdv";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ChartSize } from "@/components/admin/finance/FinanceChart";
import {
  readPreference,
  refreshPreferences,
  savePreference,
  subscribePreferences,
} from "@/lib/preferences";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { PaymentMethodFields } from "@/components/admin/PaymentMethodFields";
import { AdjustmentFields } from "@/components/admin/finance/AdjustmentFields";
import { CancelDetailsDialog, CancelPaymentDialog } from "@/components/admin/finance/CancelPayment";
import { baseOf, computeTotal, moneyText, noAdjust, type Adjust } from "@/lib/admin/finance-adjust";
import {
  Initial,
  MoneyInput,
  PeriodFilter,
  RowMenu,
  Segmented,
  StatCard,
  StatusChips,
  StatusPill,
} from "@/components/admin/finance/FinanceUI";
import { formatCurrency, type PaymentStatus } from "@/lib/admin/labels";
import { inRange, parseMoney, periodRange, type PeriodId } from "@/lib/admin/finance-period";
import {
  PAYMENT_METHODS,
  parseInstallments,
  paymentMethod,
  paymentMethodLabel,
  useEnabledPaymentMethods,
} from "@/lib/payment-methods";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type ChartPrefs = { visible: boolean; size: ChartSize };
function loadChartPrefs(): ChartPrefs {
  return readPreference("financeChart") ?? { visible: true, size: "medio" };
}

// O gráfico (recharts) carrega à parte para a página abrir rápido.
const FinanceChart = lazy(() => import("@/components/admin/finance/FinanceChart"));

export const Route = createFileRoute("/admin/financeiro")({
  component: Financeiro,
});

type Payment = {
  id: string;
  patient_id: string | null;
  amount: number;
  status: PaymentStatus;
  paid_at: string | null;
  created_at: string;
  payment_method: string | null;
  installments: number | null;
  discount: number | string | null;
  surcharge: number | string | null;
  cancel_reason: string | null;
  refund_amount: number | string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  description: string | null;
  patients: { name: string } | null;
};
type Patient = { id: string; name: string };

const STATUS: Record<PaymentStatus, { label: string; pill: string; dot: string }> = {
  pendente: {
    label: "A receber",
    pill: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  pago: {
    label: "Recebido",
    pill: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  cancelado: {
    label: "Cancelado",
    pill: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    dot: "bg-slate-400",
  },
};
const STATUS_ORDER: PaymentStatus[] = ["pendente", "pago", "cancelado"];

const today = () => new Date().toLocaleDateString("en-CA");
const date = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

const emptyForm = {
  patient_id: "",
  amount: "",
  status: "pendente" as PaymentStatus,
  paid_on: today(),
  payment_method: "",
  installments: "",
  discount: noAdjust as Adjust,
  surcharge: noAdjust as Adjust,
};

function Financeiro() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<PaymentStatus | "todos">("todos");
  const [patientFilter, setPatientFilter] = useState("todos");
  const [methodFilter, setMethodFilter] = useState("todos");
  const [period, setPeriod] = useState<{ period: PeriodId; from: string; to: string }>({
    period: "este_mes",
    from: "",
    to: "",
  });
  const enabledMethods = useEnabledPaymentMethods();
  // Gráfico: mostrar/ocultar e tamanho ficam salvos no projeto (vale para todos).
  const [chart, setChartState] = useState<ChartPrefs>(loadChartPrefs);
  useEffect(() => {
    const refresh = () => setChartState(loadChartPrefs());
    const unsubscribe = subscribePreferences(refresh);
    void refreshPreferences().then(refresh);
    return unsubscribe;
  }, []);
  function setChart(next: ChartPrefs) {
    setChartState(next);
    void savePreference({ key: "financeChart", value: next });
  }
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [receiving, setReceiving] = useState<Payment | null>(null);
  const [receiveMethod, setReceiveMethod] = useState({ method: "", installments: "" });
  const [receiveAdjust, setReceiveAdjust] = useState<{ discount: Adjust; surcharge: Adjust }>({
    discount: noAdjust,
    surcharge: noAdjust,
  });
  const [receiveAdjustOpen, setReceiveAdjustOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null);
  // O Financeiro abre no Caixa (PDV); Lançamentos traz a lista, o gráfico e os filtros.
  const [tab, setTab] = useState<"caixa" | "lancamentos">("caixa");
  const [cancelTarget, setCancelTarget] = useState<Payment | null>(null);
  const [cancelDetails, setCancelDetails] = useState<Payment | null>(null);

  async function load() {
    const [{ data: paymentsData }, { data: patientsData }] = await Promise.all([
      db
        .from("payments")
        .select(
          "id, patient_id, amount, status, paid_at, created_at, payment_method, installments, discount, surcharge, cancel_reason, refund_amount, cancelled_at, cancelled_by, description, patients(name)",
        )
        .order("created_at", { ascending: false }),
      db.from("patients").select("id, name").order("name"),
    ]);
    setPayments((paymentsData ?? []) as unknown as Payment[]);
    setPatients((patientsData ?? []) as Patient[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const range = useMemo(
    () => periodRange(period.period, period.from, period.to),
    [period.period, period.from, period.to],
  );

  const scoped = useMemo(() => {
    const q = query.trim().toLowerCase();
    return payments.filter(
      (p) =>
        inRange(p.paid_at ?? p.created_at, range) &&
        (patientFilter === "todos" || p.patient_id === patientFilter) &&
        (methodFilter === "todos" || (p.payment_method ?? "nao_informada") === methodFilter) &&
        (!q || p.patients?.name.toLowerCase().includes(q)),
    );
  }, [payments, range, patientFilter, methodFilter, query]);

  const filtered = status === "todos" ? scoped : scoped.filter((p) => p.status === status);

  const kpi = useMemo(() => {
    const paid = scoped.filter((p) => p.status === "pago");
    const pending = scoped.filter((p) => p.status === "pendente");
    const sum = (list: Payment[]) => list.reduce((s, p) => s + Number(p.amount), 0);
    const received = sum(paid);
    const toReceive = sum(pending);
    const byMethod = new Map<string, number>();
    for (const p of paid) {
      const k = p.payment_method ?? "nao_informada";
      byMethod.set(k, (byMethod.get(k) ?? 0) + Number(p.amount));
    }
    const active = scoped.filter((p) => p.status !== "cancelado");
    return {
      discounts: active.reduce((s, p) => s + Number(p.discount ?? 0), 0),
      refunds: scoped.reduce((s, p) => s + Number(p.refund_amount ?? 0), 0),
      cancelledCount: scoped.filter((p) => p.status === "cancelado").length,
      surcharges: active.reduce((s, p) => s + Number(p.surcharge ?? 0), 0),
      received,
      toReceive,
      paidCount: paid.length,
      pendingCount: pending.length,
      average: paid.length ? received / paid.length : 0,
      progress: received + toReceive ? (received / (received + toReceive)) * 100 : 0,
      byMethod: [...byMethod.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [scoped]);

  const hasFilters =
    !!query.trim() ||
    patientFilter !== "todos" ||
    methodFilter !== "todos" ||
    status !== "todos" ||
    period.period !== "este_mes";

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, paid_on: today() });
    setDialogOpen(true);
  }

  function openEdit(p: Payment) {
    setEditing(p);
    setForm({
      patient_id: p.patient_id ?? "",
      amount: moneyText(baseOf(p)),
      status: p.status,
      paid_on: (p.paid_at ?? new Date().toISOString()).slice(0, 10),
      payment_method: p.payment_method ?? "",
      installments: p.installments ? String(p.installments) : "",
      discount: { mode: "valor", value: moneyText(Number(p.discount ?? 0)) },
      surcharge: { mode: "valor", value: moneyText(Number(p.surcharge ?? 0)) },
    });
    setDialogOpen(true);
  }

  const amount = parseMoney(form.amount);
  const adjusted = computeTotal(amount > 0 ? amount : 0, form.discount, form.surcharge);
  const formValid = amount > 0 && adjusted.total > 0;

  async function save() {
    if (!formValid) return;
    setSaving(true);
    const payload = {
      patient_id: form.patient_id || null,
      amount: adjusted.total,
      discount: adjusted.discount,
      surcharge: adjusted.surcharge,
      status: form.status,
      paid_at:
        form.status === "pago"
          ? new Date(`${form.paid_on || today()}T12:00:00`).toISOString()
          : null,
      payment_method: form.payment_method || null,
      installments: parseInstallments(form.payment_method, form.installments),
    };
    const { error } = editing
      ? await db.from("payments").update(payload).eq("id", editing.id)
      : await db.from("payments").insert(payload);
    setSaving(false);
    if (error) return;
    toast.success(editing ? "Lançamento atualizado." : "Lançamento criado.");
    setDialogOpen(false);
    load();
  }

  function openReceive(p: Payment) {
    setReceiving(p);
    setReceiveMethod({
      method: p.payment_method ?? "",
      installments: p.installments ? String(p.installments) : "",
    });
    const hasAdjust = Number(p.discount ?? 0) > 0 || Number(p.surcharge ?? 0) > 0;
    setReceiveAdjust({
      discount: { mode: "valor", value: moneyText(Number(p.discount ?? 0)) },
      surcharge: { mode: "valor", value: moneyText(Number(p.surcharge ?? 0)) },
    });
    setReceiveAdjustOpen(hasAdjust);
  }

  const receiveBase = receiving ? baseOf(receiving) : 0;
  const receiveTotal = computeTotal(receiveBase, receiveAdjust.discount, receiveAdjust.surcharge);

  async function confirmReceive() {
    if (!receiving) return;
    const { error } = await db
      .from("payments")
      .update({
        status: "pago",
        paid_at: new Date().toISOString(),
        amount: receiveTotal.total,
        discount: receiveTotal.discount,
        surcharge: receiveTotal.surcharge,
        payment_method: receiveMethod.method || null,
        installments: parseInstallments(receiveMethod.method, receiveMethod.installments),
      })
      .eq("id", receiving.id);
    if (error) return;
    toast.success(`${formatCurrency(receiveTotal.total)} recebido.`);
    setReceiving(null);
    load();
  }

  async function remove() {
    if (!deleteTarget) return;
    const { error } = await db.from("payments").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null);
    if (!error) toast.success("Lançamento excluído.");
    load();
  }

  function menu(p: Payment) {
    const patientId = p.patient_id;
    return (
      <RowMenu
        items={[
          ...(p.status === "cancelado"
            ? [{ label: "Ver justificativa", icon: FileText, onClick: () => setCancelDetails(p) }]
            : [
                { label: "Editar", icon: Pencil, onClick: () => openEdit(p) },
                { label: "Cancelar lançamento", icon: Ban, onClick: () => setCancelTarget(p) },
              ]),
          ...(patientId
            ? [
                {
                  label: "Abrir paciente",
                  icon: User,
                  onClick: () =>
                    navigate({ to: "/admin/pacientes/$patientId", params: { patientId } }),
                },
              ]
            : []),
          { label: "Excluir", icon: Trash2, onClick: () => setDeleteTarget(p), danger: true },
        ]}
      />
    );
  }

  const receiveButton = (p: Payment) =>
    p.status === "pendente" ? (
      <Button
        size="sm"
        className="bg-emerald-600 text-white hover:bg-emerald-700"
        onClick={() => openReceive(p)}
      >
        <CheckCircle2 className="h-3.5 w-3.5" /> Receber
      </Button>
    ) : null;

  const maxMethod = kpi.byMethod[0]?.[1] ?? 0;

  return (
    <div className="animate-in fade-in space-y-5 duration-300">
      <PageHeader
        title="💰 Financeiro"
        description="Pagamentos dos pacientes: o que já entrou e o que falta receber."
        action={
          tab === "lancamentos" ? (
            <Button onClick={openCreate}>
              <Plus /> Novo lançamento
            </Button>
          ) : undefined
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as "caixa" | "lancamentos")}>
        <TabsList className="h-11">
          <TabsTrigger value="caixa" className="gap-1.5 px-4">
            <ShoppingCart className="h-4 w-4" /> Caixa (PDV)
          </TabsTrigger>
          <TabsTrigger value="lancamentos" className="gap-1.5 px-4">
            <Receipt className="h-4 w-4" /> Lançamentos
          </TabsTrigger>
        </TabsList>
        <TabsContent value="caixa" className="mt-4">
          <Pdv patients={patients} onFinished={load} />
        </TabsContent>
        <TabsContent value="lancamentos" className="mt-4 space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              icon={TrendingUp}
              label="Recebido"
              value={formatCurrency(kpi.received)}
              hint={`${Math.round(kpi.progress)}% do total previsto`}
              progress={kpi.progress}
              tone="green"
              onClick={() => setStatus("pago")}
              active={status === "pago"}
            />
            <StatCard
              icon={Clock}
              label="A receber"
              value={formatCurrency(kpi.toReceive)}
              hint={`${kpi.pendingCount} pendente(s)`}
              tone="amber"
              onClick={() => setStatus("pendente")}
              active={status === "pendente"}
            />
            <StatCard
              icon={DollarSign}
              label="Ticket médio"
              value={formatCurrency(kpi.average)}
              hint="Por pagamento recebido"
              tone="blue"
            />
            <StatCard
              icon={Receipt}
              label="Lançamentos"
              value={String(scoped.length)}
              hint={`${kpi.paidCount} recebido(s)`}
              tone="slate"
              onClick={() => setStatus("todos")}
              active={status === "todos"}
            />
          </div>

          {chart.visible ? (
            <Suspense
              fallback={
                <div className="h-64 animate-pulse rounded-2xl border border-border bg-card" />
              }
            >
              <FinanceChart
                payments={scoped}
                range={range}
                size={chart.size}
                onSizeChange={(size) => setChart({ ...chart, size })}
                onHide={() => {
                  setChart({ ...chart, visible: false });
                  toast("Gráfico oculto.", {
                    action: {
                      label: "Desfazer",
                      onClick: () => setChart({ ...chart, visible: true }),
                    },
                  });
                }}
              />
            </Suspense>
          ) : (
            <button
              type="button"
              onClick={() => setChart({ ...chart, visible: true })}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card/60 py-2.5 text-sm font-semibold text-muted-foreground transition-colors animate-in fade-in duration-300 hover:border-primary/50 hover:text-primary"
            >
              <BarChart3 className="h-4 w-4" /> Mostrar gráfico
            </button>
          )}

          {(kpi.discounts > 0 || kpi.surcharges > 0 || kpi.cancelledCount > 0) && (
            <div className="flex flex-wrap gap-2 animate-in fade-in duration-300">
              {kpi.cancelledCount > 0 && (
                <button
                  type="button"
                  onClick={() => setStatus("cancelado")}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                >
                  {kpi.cancelledCount} cancelado(s)
                  {kpi.refunds > 0 ? ` · devolvido ${formatCurrency(kpi.refunds)}` : ""}
                </button>
              )}
              {kpi.discounts > 0 && (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  Descontos concedidos: {formatCurrency(kpi.discounts)}
                </span>
              )}
              {kpi.surcharges > 0 && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  Acréscimos cobrados: {formatCurrency(kpi.surcharges)}
                </span>
              )}
            </div>
          )}

          {kpi.byMethod.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold">Recebido por forma de pagamento</p>
                {methodFilter !== "todos" && (
                  <Button variant="ghost" size="sm" onClick={() => setMethodFilter("todos")}>
                    Ver todas
                  </Button>
                )}
              </div>
              <div className="mt-3 space-y-1">
                {kpi.byMethod.map(([method, total]) => {
                  const active = methodFilter === method;
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setMethodFilter(active ? "todos" : method)}
                      className={`block w-full rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-accent ${active ? "bg-accent" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="font-medium">
                          {method === "nao_informada"
                            ? "Não informada"
                            : paymentMethodLabel(method)}
                        </span>
                        <span className="font-bold">{formatCurrency(total)}</span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-700"
                          style={{ width: `${maxMethod ? (total / maxMethod) * 100 : 0}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
                  count: scoped.filter((p) => p.status === s).length,
                })),
              ]}
            />
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-52 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar paciente..."
                  className="h-9 pl-9"
                />
              </div>
              <select
                value={patientFilter}
                onChange={(e) => setPatientFilter(e.target.value)}
                className="h-9 max-w-48 rounded-lg border border-border bg-card px-3 text-sm font-medium"
                aria-label="Paciente"
              >
                <option value="todos">Todos os pacientes</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
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
                    setStatus("todos");
                    setPatientFilter("todos");
                    setMethodFilter("todos");
                    setPeriod({ period: "este_mes", from: "", to: "" });
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
                  icon={Wallet}
                  title={
                    payments.length === 0
                      ? "Nenhum lançamento ainda."
                      : "Nenhum lançamento nesse período ou filtro."
                  }
                />
                <div className="pb-6 text-center">
                  <Button onClick={openCreate} variant={payments.length ? "outline" : "default"}>
                    <Plus /> Novo lançamento
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <ul className="divide-y divide-border md:hidden">
                  {filtered.map((p) => (
                    <li key={p.id} className="space-y-2.5 p-4">
                      <div className="flex items-start gap-3">
                        <Initial name={p.patients?.name ?? "Avulso"} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">
                            {p.patients?.name ?? "Sem paciente"}
                          </p>
                          {p.description && (
                            <p className="truncate text-xs text-foreground/80">{p.description}</p>
                          )}
                          <p className="truncate text-xs text-muted-foreground">
                            {date(p.paid_at ?? p.created_at)} ·{" "}
                            {paymentMethod(p.payment_method)
                              ? paymentMethodLabel(p.payment_method, p.installments)
                              : "Forma não informada"}
                          </p>
                        </div>
                        {menu(p)}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span>
                          <span className="block text-lg font-extrabold">
                            <span
                              className={
                                p.status === "cancelado" ? "text-muted-foreground line-through" : ""
                              }
                            >
                              {formatCurrency(Number(p.amount))}
                            </span>
                          </span>
                          <AdjustNote p={p} />
                        </span>
                        {receiveButton(p) ?? (
                          <StatusPill
                            label={STATUS[p.status].label}
                            className={STATUS[p.status].pill}
                          />
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                <table className="hidden w-full text-sm md:table">
                  <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Paciente</th>
                      <th className="px-4 py-3 text-right font-semibold">Valor</th>
                      <th className="px-4 py-3 font-semibold">Forma</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 text-right font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((p) => (
                      <tr key={p.id} className="transition-colors hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Initial name={p.patients?.name ?? "Avulso"} />
                            <div className="min-w-0">
                              <p className="truncate font-semibold">
                                {p.patients?.name ?? "Sem paciente"}
                              </p>
                              {p.description && (
                                <p
                                  className="max-w-72 truncate text-xs text-foreground/80"
                                  title={p.description}
                                >
                                  {p.description}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {p.status === "pago" ? "Recebido em " : "Lançado em "}
                                {date(p.paid_at ?? p.created_at)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-bold">
                          {formatCurrency(Number(p.amount))}
                          <AdjustNote p={p} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {paymentMethodLabel(p.payment_method, p.installments)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill
                            label={STATUS[p.status].label}
                            className={STATUS[p.status].pill}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            {receiveButton(p)}
                            {menu(p)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!receiving} onOpenChange={(o) => !o && setReceiving(null)}>
        <DialogContent className="max-h-[92dvh] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Confirmar recebimento</DialogTitle>
            <DialogDescription>
              {receiving?.patients?.name ?? "Lançamento"} ·{" "}
              <b className="text-foreground">{formatCurrency(receiveTotal.total)}</b>
            </DialogDescription>
          </DialogHeader>
          {receiveAdjustOpen ? (
            <AdjustmentFields
              idPrefix="rcv"
              base={receiveBase}
              discount={receiveAdjust.discount}
              surcharge={receiveAdjust.surcharge}
              onChange={setReceiveAdjust}
            />
          ) : (
            <button
              type="button"
              onClick={() => setReceiveAdjustOpen(true)}
              className="w-full rounded-xl border border-dashed border-border px-3 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
            >
              + Aplicar desconto ou acréscimo
            </button>
          )}
          <PaymentMethodFields
            methods={enabledMethods}
            method={receiveMethod.method}
            installments={receiveMethod.installments}
            onChange={({ method, installments }) => setReceiveMethod({ method, installments })}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiving(null)}>
              Cancelar
            </Button>
            <Button
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={confirmReceive}
            >
              <CheckCircle2 className="h-4 w-4" /> Receber {formatCurrency(receiveTotal.total)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[92dvh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar lançamento" : "Novo lançamento"}</DialogTitle>
            <DialogDescription>Registre um pagamento recebido ou a receber.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="f-amount">Valor do serviço</Label>
                <MoneyInput
                  id="f-amount"
                  value={form.amount}
                  onChange={(v) => setForm((f) => ({ ...f, amount: v }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-patient">Paciente (opcional)</Label>
                <select
                  id="f-patient"
                  value={form.patient_id}
                  onChange={(e) => setForm((f) => ({ ...f, patient_id: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                >
                  <option value="">Sem paciente</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Situação</Label>
              <Segmented
                value={form.status}
                onChange={(s) => setForm((f) => ({ ...f, status: s }))}
                // Cancelar só pelo menu ⋯ › Cancelar lançamento (pede a senha).
                options={STATUS_ORDER.filter((s) => s !== "cancelado").map((s) => ({
                  id: s,
                  label: STATUS[s].label,
                  dot: STATUS[s].dot,
                }))}
              />
            </div>
            {form.status === "pago" && (
              <div className="space-y-1.5">
                <Label htmlFor="f-paid">Data do recebimento</Label>
                <Input
                  id="f-paid"
                  type="date"
                  value={form.paid_on}
                  onChange={(e) => setForm((f) => ({ ...f, paid_on: e.target.value }))}
                />
              </div>
            )}
            <PaymentMethodFields
              methods={enabledMethods}
              method={form.payment_method}
              installments={form.installments}
              onChange={({ method, installments }) =>
                setForm((f) => ({ ...f, payment_method: method, installments }))
              }
            />
            <AdjustmentFields
              idPrefix="f"
              base={amount > 0 ? amount : 0}
              discount={form.discount}
              surcharge={form.surcharge}
              onChange={(adj) => setForm((f) => ({ ...f, ...adj }))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={!formValid || saving}>
              {saving
                ? "Salvando..."
                : `${editing ? "Salvar" : "Lançar"} ${formatCurrency(adjusted.total)}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CancelPaymentDialog
        payment={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onCancelled={load}
      />
      <CancelDetailsDialog payment={cancelDetails} onClose={() => setCancelDetails(null)} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              {formatCurrency(Number(deleteTarget?.amount ?? 0))}
              {deleteTarget?.patients?.name ? ` de ${deleteTarget.patients.name}` : ""}. Essa ação
              não pode ser desfeita.
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

/** "− R$ 10,00 desc. · + R$ 5,00 acrésc." embaixo do valor. */
function AdjustNote({ p }: { p: Payment }) {
  const d = Number(p.discount ?? 0);
  const a = Number(p.surcharge ?? 0);
  if (p.status === "cancelado") {
    const refund = Number(p.refund_amount ?? 0);
    return (
      <span className="block text-[11px] font-medium text-muted-foreground">
        {refund > 0 ? (
          <span className="text-amber-700 dark:text-amber-300">
            Devolvido {formatCurrency(refund)}
          </span>
        ) : (
          "Sem devolução"
        )}
      </span>
    );
  }
  if (!d && !a) return null;
  return (
    <span className="block text-[11px] font-medium">
      {d > 0 && <span className="text-emerald-600">− {formatCurrency(d)} desc.</span>}
      {d > 0 && a > 0 && <span className="text-muted-foreground"> · </span>}
      {a > 0 && (
        <span className="text-amber-700 dark:text-amber-300">+ {formatCurrency(a)} acrésc.</span>
      )}
    </span>
  );
}
