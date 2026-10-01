import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Ban, Eye, EyeOff, Lock, RotateCcw, ShieldCheck } from "lucide-react";
import { cancelPayment } from "@/lib/finance-cancel.functions";
import { formatCurrency } from "@/lib/admin/labels";
import { parseMoney } from "@/lib/admin/finance-period";
import { MoneyInput } from "@/components/admin/finance/FinanceUI";
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

export type CancellablePayment = {
  id: string;
  amount: number | string;
  status: string;
  patients: { name: string } | null;
  cancel_reason?: string | null;
  refund_amount?: number | string | null;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
};

const REASONS = [
  "Desistência do tratamento",
  "Pagamento em duplicidade",
  "Valor lançado errado",
  "Insatisfação do paciente",
  "Procedimento não realizado",
];

const money = (n: number) => n.toFixed(2).replace(".", ",");

/** Cancelar lançamento: justificativa, devolução e senha do administrador. */
export function CancelPaymentDialog({
  payment,
  onClose,
  onCancelled,
}: {
  payment: CancellablePayment | null;
  onClose: () => void;
  onCancelled: () => void;
}) {
  const [reason, setReason] = useState("");
  const [refund, setRefund] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const amount = Number(payment?.amount ?? 0);
  const received = payment?.status === "pago";

  useEffect(() => {
    if (!payment) return;
    setReason("");
    setRefund(received ? money(amount) : "");
    setPassword("");
    setShowPassword(false);
    setError(null);
  }, [payment, received, amount]);

  const refundValue = received ? parseMoney(refund || "0") : 0;
  const refundInvalid = received && (!(refundValue >= 0) || refundValue > amount + 0.001);
  const valid = reason.trim().length >= 5 && !!password && !refundInvalid;

  async function confirm() {
    if (!payment || !valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      const result = await cancelPayment({
        data: { id: payment.id, reason: reason.trim(), refund: refundValue || 0, password },
      });
      if (result.error) {
        setError(result.error.message);
        setPassword("");
        return;
      }
      toast.success(
        received && refundValue > 0
          ? `Lançamento cancelado. Devolução de ${formatCurrency(refundValue)} registrada.`
          : "Lançamento cancelado.",
      );
      onCancelled();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível cancelar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!payment} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-h-[92dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <Ban className="h-4 w-4" />
            </span>
            Cancelar lançamento
          </DialogTitle>
          <DialogDescription>
            {payment?.patients?.name ?? "Lançamento sem paciente"} ·{" "}
            <b className="text-foreground">{formatCurrency(amount)}</b> ·{" "}
            {received ? "já recebido" : "ainda a receber"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">
              Justificativa <span className="text-destructive">*</span>
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason((prev) => (prev.trim() ? prev : r))}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                    reason.startsWith(r)
                      ? "border-destructive/50 bg-destructive/10 text-destructive"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <Textarea
              id="cancel-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explique por que o lançamento está sendo cancelado e, se for o caso, por que o valor está sendo devolvido."
            />
          </div>

          {received && (
            <div className="space-y-1.5 rounded-xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900 dark:bg-amber-950/20">
              <Label htmlFor="cancel-refund" className="flex items-center gap-1.5">
                <RotateCcw className="h-3.5 w-3.5 text-amber-700" /> Valor devolvido ao paciente
              </Label>
              <MoneyInput id="cancel-refund" value={refund} onChange={setRefund} />
              <p
                className={`text-xs ${refundInvalid ? "text-destructive" : "text-muted-foreground"}`}
              >
                {refundInvalid
                  ? `A devolução vai de R$ 0,00 até ${formatCurrency(amount)}.`
                  : "Use 0,00 se nada foi devolvido. Devolução parcial também pode."}
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="cancel-password" className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" /> Senha do administrador{" "}
              <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="cancel-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && void confirm()}
                placeholder="Digite sua senha para confirmar"
                className="pr-10"
                aria-invalid={!!error}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive animate-in fade-in duration-200">
                {error}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Voltar
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={!valid || saving}>
            <ShieldCheck className="h-4 w-4" />
            {saving ? "Confirmando..." : "Confirmar cancelamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Mostra a justificativa e a devolução de um lançamento cancelado. */
export function CancelDetailsDialog({
  payment,
  onClose,
}: {
  payment: CancellablePayment | null;
  onClose: () => void;
}) {
  const refund = Number(payment?.refund_amount ?? 0);
  return (
    <Dialog open={!!payment} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <Ban className="h-4 w-4" />
            </span>
            Lançamento cancelado
          </DialogTitle>
          <DialogDescription>
            {payment?.patients?.name ?? "Sem paciente"} ·{" "}
            <span className="line-through">{formatCurrency(Number(payment?.amount ?? 0))}</span>
          </DialogDescription>
        </DialogHeader>
        <dl className="space-y-3 text-sm">
          <div className="rounded-xl bg-muted/60 p-3">
            <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Justificativa
            </dt>
            <dd className="mt-1 whitespace-pre-wrap">
              {payment?.cancel_reason ||
                "Cancelado antes desta função existir (sem justificativa)."}
            </dd>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border p-3">
              <dt className="text-xs text-muted-foreground">Valor devolvido</dt>
              <dd
                className={`mt-0.5 font-bold ${refund > 0 ? "text-amber-700 dark:text-amber-300" : ""}`}
              >
                {formatCurrency(refund)}
              </dd>
            </div>
            <div className="rounded-xl border border-border p-3">
              <dt className="text-xs text-muted-foreground">Cancelado em</dt>
              <dd className="mt-0.5 font-bold">
                {payment?.cancelled_at
                  ? new Date(payment.cancelled_at).toLocaleString("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })
                  : "—"}
              </dd>
            </div>
          </div>
          {payment?.cancelled_by && (
            <p className="text-xs text-muted-foreground">
              Confirmado com a senha de <b>{payment.cancelled_by}</b>.
            </p>
          )}
        </dl>
        <DialogFooter>
          <Button onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
