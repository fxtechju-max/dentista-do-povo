import { useEffect, useMemo, useState } from "react";
import { Check, FileText, Search, UserRound } from "lucide-react";
import { db } from "@/integrations/mysql/client";
import { formatCurrency } from "@/lib/admin/labels";
import { normalizeName } from "@/lib/odontogram-plan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type OpenBudget = {
  id: string;
  patient_id: string;
  treatment: string;
  value: number | string;
  status: "rascunho" | "enviado" | "aprovado" | "recusado";
  created_at: string;
  payment_id: string | null;
  patients: { name: string } | null;
  /** Lançado no Financeiro e ainda a receber: pode ser recebido no caixa. */
  pending?: boolean;
};

export type LoadedBudget = {
  budgetId: string;
  name: string;
  price: number;
  /** Lançamento "a receber" que este pagamento no caixa substitui. */
  pendingPaymentId?: string;
};

const STATUS: Record<OpenBudget["status"], { label: string; cls: string }> = {
  rascunho: {
    label: "Rascunho",
    cls: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  },
  enviado: {
    label: "Aguardando",
    cls: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  },
  aprovado: {
    label: "Aprovado",
    cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
  recusado: { label: "Recusado", cls: "bg-red-100 text-red-700" },
};

/**
 * "Puxar orçamento" no Caixa: lista os orçamentos ainda não pagos (sem
 * lançamento ligado), agrupados por paciente, para levar ao carrinho.
 */
export function PdvBudgetPicker({
  open,
  onOpenChange,
  initialPatientId,
  initialBudgetId,
  onLoad,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Orçamento (ou paciente) para já abrir selecionado. */
  initialPatientId?: string | null | undefined;
  initialBudgetId?: string | null | undefined;
  onLoad: (patientId: string, items: LoadedBudget[]) => void;
}) {
  const [budgets, setBudgets] = useState<OpenBudget[] | null>(null);
  const [query, setQuery] = useState("");
  const [patientId, setPatientId] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setBudgets(null);
    void (async () => {
      const { data } = await db
        .from("budgets")
        .select("id, patient_id, treatment, value, status, created_at, payment_id, patients(name)")
        .order("created_at", { ascending: false });
      const all = (data ?? []) as unknown as OpenBudget[];
      // Lançados no Financeiro: só voltam ao caixa se o lançamento ainda está a receber.
      const linked = [...new Set(all.map((x) => x.payment_id).filter(Boolean))] as string[];
      const pendingIds = new Set<string>();
      if (linked.length) {
        const { data: pays } = await db.from("payments").select("id, status").in("id", linked);
        for (const pay of (pays ?? []) as { id: string; status: string }[])
          if (pay.status === "pendente") pendingIds.add(pay.id);
      }
      const list = all
        .filter((x) => x.status !== "recusado" && (!x.payment_id || pendingIds.has(x.payment_id)))
        .map((x) => ({ ...x, pending: !!x.payment_id }));
      setBudgets(list);
      const fromBudget = initialBudgetId ? list.find((x) => x.id === initialBudgetId) : undefined;
      const patient =
        fromBudget?.patient_id ??
        (initialPatientId && list.some((x) => x.patient_id === initialPatientId)
          ? initialPatientId
          : null);
      setPatientId(patient);
      if (!patient) return setChecked(new Set());
      const mine = list.filter((x) => x.patient_id === patient);
      const approved = mine.filter((x) => x.status === "aprovado" || x.pending);
      const base = approved.length ? approved : mine;
      // Veio de um orçamento específico: só ele marcado (os outros ficam para escolher).
      setChecked(new Set(fromBudget ? [fromBudget.id] : base.map((x) => x.id)));
    })();
  }, [open, initialPatientId, initialBudgetId]);

  const groups = useMemo(() => {
    const map = new Map<string, { name: string; items: OpenBudget[] }>();
    for (const b of budgets ?? []) {
      const g = map.get(b.patient_id) ?? { name: b.patients?.name ?? "Paciente", items: [] };
      g.items.push(b);
      map.set(b.patient_id, g);
    }
    const q = normalizeName(query);
    return [...map.entries()]
      .map(([id, g]) => ({ id, ...g, total: g.items.reduce((s, b) => s + Number(b.value), 0) }))
      .filter((g) => !q || normalizeName(g.name).includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [budgets, query]);

  const group = groups.find((g) => g.id === patientId) ?? null;
  const selected = group?.items.filter((b) => checked.has(b.id)) ?? [];
  const total = selected.reduce((s, b) => s + Number(b.value), 0);

  function pick(id: string) {
    setPatientId(id);
    const g = groups.find((x) => x.id === id);
    const approved = g?.items.filter((b) => b.status === "aprovado" || b.pending) ?? [];
    setChecked(new Set((approved.length ? approved : (g?.items ?? [])).map((b) => b.id)));
  }

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function load() {
    if (!patientId || !selected.length) return;
    onLoad(
      patientId,
      selected.map((b) => ({
        budgetId: b.id,
        name: b.treatment,
        price: Number(b.value),
        ...(b.pending && b.payment_id ? { pendingPaymentId: b.payment_id } : {}),
      })),
    );
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] max-w-3xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border p-5">
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
              <FileText className="h-5 w-5" />
            </span>
            Puxar orçamento para o caixa
          </DialogTitle>
          <DialogDescription>
            Escolha o paciente e marque os itens que ele vai pagar agora.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden sm:grid-cols-[15rem_minmax(0,1fr)]">
          <div className="flex min-h-0 flex-col border-b border-border bg-muted/30 sm:border-b-0 sm:border-r">
            <div className="p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar paciente..."
                  className="h-9 bg-background pl-9"
                />
              </div>
            </div>
            <ul className="max-h-48 flex-1 overflow-y-auto px-2 pb-2 sm:max-h-none">
              {budgets == null ? (
                <li className="p-3 text-sm text-muted-foreground">Carregando...</li>
              ) : groups.length === 0 ? (
                <li className="p-3 text-sm text-muted-foreground">
                  {budgets.length ? "Nenhum paciente encontrado." : "Nenhum orçamento em aberto."}
                </li>
              ) : (
                groups.map((g) => (
                  <li key={g.id}>
                    <button
                      type="button"
                      onClick={() => pick(g.id)}
                      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                        patientId === g.id ? "bg-violet-600 text-white" : "hover:bg-accent"
                      }`}
                    >
                      <UserRound className="h-4 w-4 shrink-0 opacity-70" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{g.name}</span>
                        <span className="block text-[11px] opacity-75">
                          {g.items.length} item(ns) · {formatCurrency(g.total)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="flex min-h-0 flex-col">
            {!group ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
                <FileText className="h-10 w-10 opacity-40" />
                Escolha um paciente para ver os orçamentos em aberto.
              </div>
            ) : (
              <ul className="flex-1 space-y-2 overflow-y-auto p-3">
                {group.items.map((b) => {
                  const on = checked.has(b.id);
                  return (
                    <li key={b.id}>
                      <button
                        type="button"
                        onClick={() => toggle(b.id)}
                        className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                          on
                            ? "border-violet-500 bg-violet-50 dark:bg-violet-950/40"
                            : "border-border hover:bg-accent"
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${
                            on
                              ? "border-violet-600 bg-violet-600 text-white"
                              : "border-muted-foreground/40"
                          }`}
                        >
                          {on && <Check className="h-3.5 w-3.5" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{b.treatment}</span>
                          <span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS[b.status].cls}`}
                            >
                              {STATUS[b.status].label}
                            </span>
                            {b.pending && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                A receber
                              </span>
                            )}
                            {new Date(b.created_at).toLocaleDateString("pt-BR")}
                          </span>
                        </span>
                        <span className="shrink-0 font-bold tabular-nums">
                          {formatCurrency(Number(b.value))}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter className="items-center gap-2 border-t border-border p-4 sm:justify-between">
          <p className="text-sm">
            {selected.length ? (
              <>
                {selected.length} item(ns) ·{" "}
                <b className="text-violet-700 dark:text-violet-300">{formatCurrency(total)}</b>
              </>
            ) : (
              <span className="text-muted-foreground">Nenhum item marcado</span>
            )}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={load}
              disabled={!selected.length}
              className="bg-violet-600 text-white hover:bg-violet-700"
            >
              <Check className="h-4 w-4" /> Levar para o carrinho
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
