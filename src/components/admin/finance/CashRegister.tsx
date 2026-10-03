import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  CheckCircle2,
  Clock,
  History,
  Lock,
  LockOpen,
  Printer,
  Store,
  TrendingUp,
} from "lucide-react";
import {
  addCashMovement,
  closeCash,
  openCash,
  type CashSession,
  type CashStatus,
} from "@/lib/cash.functions";
import { cashDifference, type CashSummary } from "@/lib/cash-summary";
import { formatCurrency } from "@/lib/admin/labels";
import { parseMoney } from "@/lib/admin/finance-period";
import { paymentMethodLabel } from "@/lib/payment-methods";
import { MoneyInput } from "@/components/admin/finance/FinanceUI";
import { Button } from "@/components/ui/button";
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

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
const methodName = (m: string) => (m === "nao_informada" ? "Não informada" : paymentMethodLabel(m));

/** Tela de caixa fechado: botão para abrir o caixa do dia e o histórico. */
export function ClosedCash({
  history,
  onOpened,
}: {
  history: CashSession[];
  onOpened: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState<CashSession | null>(null);
  const now = new Date();
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 text-center shadow-sm sm:p-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.12),transparent_60%)]" />
        <span className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-muted text-muted-foreground">
          <Lock className="h-9 w-9" />
        </span>
        <p className="relative mt-5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
        </p>
        <h2 className="relative mt-1 text-3xl font-extrabold tracking-tight">Caixa fechado</h2>
        <p className="relative mx-auto mt-2 max-w-md text-muted-foreground">
          Para começar a vender, abra o caixa do dia informando quanto dinheiro há na gaveta (fundo
          de troco).
        </p>
        <Button
          size="lg"
          onClick={() => setOpen(true)}
          className="relative mt-6 h-14 rounded-2xl bg-emerald-600 px-8 text-base font-extrabold text-white shadow-lg shadow-emerald-600/25 transition-transform hover:-translate-y-0.5 hover:bg-emerald-700"
        >
          <LockOpen className="h-5 w-5" /> Abrir caixa do dia
        </Button>
      </div>

      {history.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="mb-3 flex items-center gap-2 text-sm font-bold">
            <History className="h-4 w-4 text-muted-foreground" /> Últimos caixas
          </p>
          <ul className="divide-y divide-border">
            {history.map((h) => {
              const diff = h.difference ?? 0;
              return (
                <li key={h.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                  <span className="min-w-36 font-semibold">
                    {new Date(h.opened_at).toLocaleDateString("pt-BR")}{" "}
                    <span className="font-normal text-muted-foreground">
                      {time(h.opened_at)}–{h.closed_at ? time(h.closed_at) : ""}
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    Vendas <b className="text-foreground">{formatCurrency(h.total_sales ?? 0)}</b>
                  </span>
                  <DiffBadge diff={diff} />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-8"
                    onClick={() => setReport(h)}
                  >
                    <Printer className="h-3.5 w-3.5" /> Relatório
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <OpenCashDialog open={open} onOpenChange={setOpen} onOpened={onOpened} />
      {report && <ReportPrinter session={report} summary={null} onDone={() => setReport(null)} />}
    </div>
  );
}

function DiffBadge({ diff }: { diff: number }) {
  const cls =
    Math.abs(diff) < 0.005
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
      : diff > 0
        ? "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
        : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300";
  const label =
    Math.abs(diff) < 0.005
      ? "Conferido"
      : diff > 0
        ? `Sobra ${formatCurrency(diff)}`
        : `Falta ${formatCurrency(-diff)}`;
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${cls}`}>{label}</span>;
}

function OpenCashDialog({
  open,
  onOpenChange,
  onOpened,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onOpened: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) {
      setAmount("");
      setNotes("");
    }
  }, [open]);
  const value = amount.trim() ? parseMoney(amount) : 0;
  const valid = value >= 0;

  async function confirm() {
    if (!valid || saving) return;
    setSaving(true);
    try {
      const r = await openCash({ data: { amount: value, notes } });
      if (r.error) return void toast.error(r.error.message);
      toast.success(`Caixa aberto com fundo de ${formatCurrency(value)}.`);
      onOpenChange(false);
      onOpened();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível abrir o caixa.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <LockOpen className="h-5 w-5" />
            </span>
            Abertura de caixa
          </DialogTitle>
          <DialogDescription>
            {new Date().toLocaleString("pt-BR", { dateStyle: "full", timeStyle: "short" })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cash-open-amount">Fundo de troco (dinheiro na gaveta)</Label>
            <MoneyInput id="cash-open-amount" value={amount} onChange={setAmount} />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[0, 50, 100, 200, 300].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAmount(v ? v.toFixed(2).replace(".", ",") : "0,00")}
                  className="rounded-lg border border-border px-3 py-1 text-xs font-semibold hover:bg-accent"
                >
                  {v ? formatCurrency(v) : "Sem fundo"}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cash-open-notes">Observação (opcional)</Label>
            <Textarea
              id="cash-open-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex.: troco conferido pela recepção"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={confirm}
            disabled={!valid || saving}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <LockOpen className="h-4 w-4" /> {saving ? "Abrindo..." : "Abrir caixa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Barra do caixa aberto: resumo e botões de sangria, suprimento e fechamento. */
export function CashBar({ status, onChanged }: { status: CashStatus; onChanged: () => void }) {
  const session = status.open!;
  const s = status.summary!;
  const [movement, setMovement] = useState<"sangria" | "suprimento" | null>(null);
  const [closing, setClosing] = useState(false);
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/30">
        <span className="flex items-center gap-2.5">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <Store className="h-4.5 w-4.5" />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-300 ring-2 ring-emerald-50 dark:ring-emerald-950" />
          </span>
          <span>
            <span className="block text-sm font-extrabold text-emerald-800 dark:text-emerald-300">
              Caixa aberto
            </span>
            <span className="flex items-center gap-1 text-xs text-emerald-900/70 dark:text-emerald-200/70">
              <Clock className="h-3 w-3" /> desde {time(session.opened_at)}
              {session.opened_by ? ` · ${session.opened_by.split("@")[0]}` : ""}
            </span>
          </span>
        </span>
        <Metric label="Fundo" value={formatCurrency(s.opening)} />
        <Metric label="Vendas recebidas" value={formatCurrency(s.received)} strong />
        <Metric label="Dinheiro na gaveta" value={formatCurrency(s.expectedCash)} />
        <div className="ml-auto flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-card"
            onClick={() => setMovement("suprimento")}
          >
            <ArrowDownCircle className="h-4 w-4 text-sky-600" /> Suprimento
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-card"
            onClick={() => setMovement("sangria")}
          >
            <ArrowUpCircle className="h-4 w-4 text-amber-600" /> Sangria
          </Button>
          <Button
            size="sm"
            onClick={() => setClosing(true)}
            className="bg-slate-800 text-white hover:bg-slate-900 dark:bg-slate-200 dark:text-slate-900"
          >
            <Lock className="h-4 w-4" /> Fechar caixa
          </Button>
        </div>
      </div>
      <MovementDialog kind={movement} onClose={() => setMovement(null)} onSaved={onChanged} />
      <CloseCashDialog
        open={closing}
        onOpenChange={setClosing}
        status={status}
        onClosed={onChanged}
      />
    </>
  );
}

function Metric({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <span>
      <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span
        className={`block tabular-nums ${strong ? "text-lg font-extrabold text-emerald-700 dark:text-emerald-300" : "font-bold"}`}
      >
        {value}
      </span>
    </span>
  );
}

function MovementDialog({
  kind,
  onClose,
  onSaved,
}: {
  kind: "sangria" | "suprimento" | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (kind) {
      setAmount("");
      setReason("");
    }
  }, [kind]);
  const value = parseMoney(amount);
  const isOut = kind === "sangria";
  async function confirm() {
    if (!kind || !(value > 0) || saving) return;
    setSaving(true);
    try {
      const r = await addCashMovement({ data: { type: kind, amount: value, reason } });
      if (r.error) return void toast.error(r.error.message);
      toast.success(`${isOut ? "Sangria" : "Suprimento"} de ${formatCurrency(value)} registrado.`);
      onClose();
      onSaved();
    } finally {
      setSaving(false);
    }
  }
  return (
    <Dialog open={!!kind} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isOut ? (
              <ArrowUpCircle className="h-5 w-5 text-amber-600" />
            ) : (
              <ArrowDownCircle className="h-5 w-5 text-sky-600" />
            )}
            {isOut ? "Sangria (retirada)" : "Suprimento (reforço)"}
          </DialogTitle>
          <DialogDescription>
            {isOut
              ? "Dinheiro tirado da gaveta (ex.: depósito no banco, pagamento de despesa)."
              : "Dinheiro colocado na gaveta (ex.: mais troco)."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cash-move-amount">Valor</Label>
            <MoneyInput id="cash-move-amount" value={amount} onChange={setAmount} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cash-move-reason">Motivo</Label>
            <Textarea
              id="cash-move-reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={isOut ? "Ex.: depósito no banco" : "Ex.: troco extra"}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={confirm} disabled={!(value > 0) || saving}>
            {saving ? "Registrando..." : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CloseCashDialog({
  open,
  onOpenChange,
  status,
  onClosed,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  status: CashStatus;
  onClosed: () => void;
}) {
  const s = status.summary!;
  const [counted, setCounted] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<{ session: CashSession; summary: CashSummary } | null>(null);
  const [print, setPrint] = useState(false);
  useEffect(() => {
    if (open) {
      setCounted("");
      setNotes("");
      setDone(null);
    }
  }, [open]);
  const countedValue = counted.trim() ? parseMoney(counted) : null;
  const diff =
    countedValue != null && countedValue >= 0 ? cashDifference(countedValue, s.expectedCash) : null;

  async function confirm() {
    if (countedValue == null || !(countedValue >= 0) || saving) return;
    setSaving(true);
    try {
      const r = await closeCash({ data: { counted: countedValue, notes } });
      if (r.error || !r.session) return void toast.error(r.error?.message ?? "Erro ao fechar.");
      setDone({ session: r.session, summary: r.summary! });
      toast.success("Caixa fechado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível fechar o caixa.");
    } finally {
      setSaving(false);
    }
  }

  function finish() {
    onOpenChange(false);
    onClosed();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (done ? finish() : !saving && onOpenChange(o))}>
      <DialogContent className="max-h-[92dvh] max-w-xl overflow-y-auto">
        {done ? (
          <div className="space-y-5 py-2 text-center animate-in zoom-in-95 duration-300">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <CheckCircle2 className="h-9 w-9" />
            </span>
            <div>
              <DialogTitle className="text-xl">Caixa fechado</DialogTitle>
              <DialogDescription className="mt-1">
                Vendas recebidas:{" "}
                <b className="text-foreground">{formatCurrency(done.summary.received)}</b>
              </DialogDescription>
              <div className="mt-3 flex justify-center">
                <DiffBadge diff={done.session.difference ?? 0} />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="outline" onClick={() => setPrint(true)}>
                <Printer className="h-4 w-4" /> Imprimir relatório
              </Button>
              <Button onClick={finish}>Concluir</Button>
            </div>
            {print && (
              <ReportPrinter
                session={done.session}
                summary={done.summary}
                movements={status.movements}
                onDone={() => setPrint(false)}
              />
            )}
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <Lock className="h-5 w-5" />
                </span>
                Fechamento de caixa
              </DialogTitle>
              <DialogDescription>
                Aberto em {dateTime(status.open!.opened_at)}. Confira o dinheiro da gaveta.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-2">
              <SummaryCard icon={Banknote} label="Fundo inicial" value={s.opening} />
              <SummaryCard
                icon={TrendingUp}
                label={`Vendas recebidas (${s.receivedCount})`}
                value={s.received}
                tone="green"
              />
              <SummaryCard icon={ArrowDownCircle} label="Suprimentos" value={s.suprimentos} />
              <SummaryCard icon={ArrowUpCircle} label="Sangrias" value={-s.sangrias} />
            </div>

            {s.byMethod.length > 0 && (
              <div className="rounded-xl border border-border">
                <p className="border-b border-border px-3 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Recebido por forma de pagamento
                </p>
                <ul className="divide-y divide-border text-sm">
                  {s.byMethod.map((m) => (
                    <li key={m.method} className="flex justify-between px-3 py-2">
                      <span>
                        {methodName(m.method)}{" "}
                        <span className="text-muted-foreground">· {m.count}</span>
                      </span>
                      <b className="tabular-nums">{formatCurrency(m.total)}</b>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {s.pendingCount > 0 && (
              <p className="rounded-lg bg-amber-100/70 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                {s.pendingCount} venda(s) ficaram a receber ({formatCurrency(s.pending)}) — não
                entram no dinheiro da gaveta.
              </p>
            )}

            <div className="rounded-2xl bg-muted/60 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Dinheiro esperado na gaveta</span>
                <span className="text-xl font-extrabold tabular-nums">
                  {formatCurrency(s.expectedCash)}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Fundo + vendas em dinheiro + suprimentos − sangrias
              </p>
              <div className="mt-3 space-y-1.5">
                <Label htmlFor="cash-counted">Dinheiro contado na gaveta</Label>
                <MoneyInput id="cash-counted" value={counted} onChange={setCounted} />
              </div>
              {diff != null && (
                <div className="mt-3 flex items-center justify-between animate-in fade-in duration-200">
                  <span className="text-sm">Diferença</span>
                  <DiffBadge diff={diff} />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cash-close-notes">Observação do fechamento</Label>
              <Textarea
                id="cash-close-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  diff && diff < 0 ? "Explique a falta, se souber o motivo." : "Opcional"
                }
              />
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Voltar
              </Button>
              <Button
                onClick={confirm}
                disabled={countedValue == null || !(countedValue >= 0) || saving}
                className="bg-slate-800 text-white hover:bg-slate-900 dark:bg-slate-200 dark:text-slate-900"
              >
                <Lock className="h-4 w-4" /> {saving ? "Fechando..." : "Fechar caixa"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Banknote;
  label: string;
  value: number;
  tone?: "green";
}) {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>
      <p
        className={`mt-0.5 text-lg font-extrabold tabular-nums ${tone === "green" ? "text-emerald-600" : ""}`}
      >
        {value < 0 ? `− ${formatCurrency(-value)}` : formatCurrency(value)}
      </p>
    </div>
  );
}

/** Imprime o relatório de fechamento (iframe escondido). */
function ReportPrinter({
  session,
  summary,
  movements = [],
  onDone,
}: {
  session: CashSession;
  summary: CashSummary | null;
  movements?: CashStatus["movements"];
  onDone: () => void;
}) {
  useEffect(() => {
    const esc = (t: string) =>
      t.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
    const row = (a: string, b: string) => `<tr><td>${a}</td><td class="r">${b}</td></tr>`;
    const methods =
      summary?.byMethod
        .map((m) => row(`${esc(methodName(m.method))} (${m.count})`, formatCurrency(m.total)))
        .join("") ?? "";
    const moves = movements
      .map((m) =>
        row(
          `${m.type === "sangria" ? "Sangria" : "Suprimento"} ${time(m.created_at)}${m.reason ? ` — ${esc(m.reason)}` : ""}`,
          `${m.type === "sangria" ? "−" : "+"} ${formatCurrency(m.amount)}`,
        ),
      )
      .join("");
    const diff = session.difference ?? 0;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Fechamento de caixa</title><style>
      body{font-family:Arial,sans-serif;width:320px;margin:0 auto;padding:16px;font-size:13px;color:#111}
      h1{font-size:16px;text-align:center;margin:0 0 4px}p{margin:2px 0}hr{border:0;border-top:1px dashed #999;margin:10px 0}
      table{width:100%;border-collapse:collapse}td{padding:3px 0;vertical-align:top}.r{text-align:right;white-space:nowrap}b{font-size:14px}
      </style></head><body><h1>FECHAMENTO DE CAIXA</h1>
      <p>Abertura: ${dateTime(session.opened_at)}${session.opened_by ? ` (${esc(session.opened_by)})` : ""}</p>
      <p>Fechamento: ${session.closed_at ? dateTime(session.closed_at) : "—"}${session.closed_by ? ` (${esc(session.closed_by)})` : ""}</p><hr>
      <table>${row("Fundo inicial", formatCurrency(session.opening_amount))}${row("Vendas recebidas", formatCurrency(session.total_sales ?? 0))}</table>
      ${methods ? `<hr><p><b>Por forma de pagamento</b></p><table>${methods}</table>` : ""}
      ${moves ? `<hr><p><b>Movimentos</b></p><table>${moves}</table>` : ""}<hr>
      <table>${row("Esperado em dinheiro", formatCurrency(session.expected_cash ?? 0))}${row("Contado", formatCurrency(session.counted_cash ?? 0))}
      ${row("<b>Diferença</b>", `<b>${Math.abs(diff) < 0.005 ? "Conferido" : diff > 0 ? `Sobra ${formatCurrency(diff)}` : `Falta ${formatCurrency(-diff)}`}</b>`)}</table>
      ${session.closing_notes ? `<hr><p>Obs.: ${esc(session.closing_notes)}</p>` : ""}
      <br><br><p style="text-align:center">______________________________<br>Assinatura</p></body></html>`;
    const frame = document.createElement("iframe");
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
    document.body.appendChild(frame);
    const doc = frame.contentWindow!.document;
    doc.open();
    doc.write(html);
    doc.close();
    const t = setTimeout(() => {
      frame.contentWindow!.focus();
      frame.contentWindow!.print();
      setTimeout(() => frame.remove(), 1000);
      onDone();
    }, 150);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
