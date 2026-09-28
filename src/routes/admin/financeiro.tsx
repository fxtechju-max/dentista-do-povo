import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  DollarSign,
  Pencil,
  Plus,
  Receipt,
  Search,
  Trash2,
  TrendingUp,
  User,
  Wallet,
} from "lucide-react";
import { db } from "@/integrations/mysql/client";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { PaymentMethodFields } from "@/components/admin/PaymentMethodFields";
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [receiving, setReceiving] = useState<Payment | null>(null);
  const [receiveMethod, setReceiveMethod] = useState({ method: "", installments: "" });
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null);

  async function load() {
    const [{ data: paymentsData }, { data: patientsData }] = await Promise.all([
      db
        .from("payments")
        .select(
          "id, patient_id, amount, status, paid_at, created_at, payment_method, installments, patients(name)",
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

  const scoped = useMemo(() => {
    const range = periodRange(period.period, period.from, period.to);
    const q = query.trim().toLowerCase();
    return payments.filter(
      (p) =>
        inRange(p.paid_at ?? p.created_at, range) &&
        (patientFilter === "todos" || p.patient_id === patientFilter) &&
        (methodFilter === "todos" || (p.payment_method ?? "nao_informada") === methodFilter) &&
        (!q || p.patients?.name.toLowerCase().includes(q)),
    );
  }, [payments, period, patientFilter, methodFilter, query]);

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
    return {
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
      amount: String(p.amount).replace(".", ","),
      status: p.status,
      paid_on: (p.paid_at ?? new Date().toISOString()).slice(0, 10),
      payment_method: p.payment_method ?? "",
      installments: p.installments ? String(p.installments) : "",
    });
    setDialogOpen(true);
  }

  const amount = parseMoney(form.amount);
  const formValid = amount > 0;

  async function save() {
    if (!formValid) return;
    setSaving(true);
    const payload = {
      patient_id: form.patient_id || null,
      amount,
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
  }

  async function confirmReceive() {
    if (!receiving) return;
    const { error } = await db
      .from("payments")
      .update({
        status: "pago",
        paid_at: new Date().toISOString(),
        payment_method: receiveMethod.method || null,
        installments: parseInstallments(receiveMethod.method, receiveMethod.installments),
      })
      .eq("id", receiving.id);
    if (error) return;
    toast.success(`${formatCurrency(Number(receiving.amount))} recebido.`);
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
          { label: "Editar", icon: Pencil, onClick: () => openEdit(p) },
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
          <Button onClick={openCreate}>
            <Plus /> Novo lançamento
          </Button>
        }
      />

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
                      {method === "nao_informada" ? "Não informada" : paymentMethodLabel(method)}
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
                      <p className="truncate font-semibold">{p.patients?.name ?? "Sem paciente"}</p>
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
                    <span className="text-lg font-extrabold">
                      {formatCurrency(Number(p.amount))}
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
                          <p className="text-xs text-muted-foreground">
                            {p.status === "pago" ? "Recebido em " : "Lançado em "}
                            {date(p.paid_at ?? p.created_at)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-bold">
                      {formatCurrency(Number(p.amount))}
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

      <Dialog open={!!receiving} onOpenChange={(o) => !o && setReceiving(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar recebimento</DialogTitle>
            <DialogDescription>
              {receiving?.patients?.name ?? "Lançamento"} ·{" "}
              <b className="text-foreground">{formatCurrency(Number(receiving?.amount ?? 0))}</b>
            </DialogDescription>
          </DialogHeader>
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
              <CheckCircle2 className="h-4 w-4" /> Confirmar recebimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar lançamento" : "Novo lançamento"}</DialogTitle>
            <DialogDescription>Registre um pagamento recebido ou a receber.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="f-amount">Valor</Label>
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
                options={STATUS_ORDER.map((s) => ({
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={!formValid || saving}>
              {saving ? "Salvando..." : editing ? "Salvar alterações" : "Criar lançamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
