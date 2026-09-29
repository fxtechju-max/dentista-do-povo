import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { CheckCircle2, ClipboardList, FileText, Receipt, Sparkles, Wallet } from "lucide-react";
import { db } from "@/integrations/mysql/client";
import { formatCurrency } from "@/lib/admin/labels";
import { parseMoney } from "@/lib/admin/finance-period";
import {
  budgetItemTitle,
  canCreateInCatalog,
  catalogName,
  findTreatment,
  toNumber,
  type CatalogTreatment,
} from "@/lib/odontogram-plan";
import { procedureLabel, statusOf, surfaceLabel, type ToothProcedure } from "@/lib/odontogram-pro";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

const money = (n: number | null) => (n == null ? "" : n.toFixed(2).replace(".", ","));

type Result = { count: number; total: number; created: string[] };

/**
 * Procedimentos planejados no odontograma: o doutor marca o que vai ser feito,
 * ajusta os valores e gera o orçamento. Procedimentos que ainda não existem em
 * Tratamentos são cadastrados lá com o valor usado.
 */
export function TreatmentPlan({
  patientId,
  procedures,
  catalog,
  onChanged,
  onSelectTooth,
}: {
  patientId: string;
  procedures: ToothProcedure[];
  catalog: CatalogTreatment[];
  onChanged: () => Promise<void> | void;
  onSelectTooth: (tooth: number) => void;
}) {
  const planned = useMemo(
    () =>
      procedures
        .filter((p) => p.planned_procedure && p.status !== "concluido")
        .sort((a, b) => a.tooth_number - b.tooth_number),
    [procedures],
  );

  // Valores digitados (texto) por procedimento; vazio = valor do catálogo.
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addToCatalog, setAddToCatalog] = useState(true);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  function suggested(p: ToothProcedure): number | null {
    return (
      toNumber(p.price) ?? toNumber(findTreatment(p.planned_procedure!, catalog)?.price) ?? null
    );
  }

  // Novos planejados entram marcados (se ainda não foram orçados).
  const plannedKey = planned.map((p) => p.id).join(",");
  useEffect(() => {
    setChecked((prev) => {
      const next = new Set<string>();
      for (const p of planned) if (prev.has(p.id) || !p.budget_id) next.add(p.id);
      return next;
    });
    setPrices((prev) => {
      const next: Record<string, string> = {};
      for (const p of planned) next[p.id] = prev[p.id] ?? money(suggested(p));
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plannedKey, catalog]);

  const selected = planned.filter((p) => checked.has(p.id));
  const valueOf = (p: ToothProcedure) => parseMoney(prices[p.id] ?? "");
  const missing = selected.filter((p) => !(valueOf(p) >= 0));
  const total = selected.reduce((s, p) => s + (valueOf(p) >= 0 ? valueOf(p) : 0), 0);
  const alreadyBudgeted = selected.filter((p) => p.budget_id).length;

  // Procedimentos que serão cadastrados em Tratamentos (um por tipo).
  const newInCatalog = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of selected) {
      const id = p.planned_procedure!;
      if (!canCreateInCatalog(id) || findTreatment(id, catalog) || map.has(id)) continue;
      map.set(id, valueOf(p));
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.map((p) => p.id).join(","), prices, catalog]);

  function toggle(id: string, on: boolean) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function savePrice(p: ToothProcedure) {
    const raw = (prices[p.id] ?? "").trim();
    const value = raw ? parseMoney(raw) : null;
    if (value != null && !(value >= 0)) return;
    if (value === toNumber(p.price)) return;
    await db.from("tooth_procedures").update({ price: value }).eq("id", p.id);
  }

  function openDialog() {
    setResult(null);
    setNotes("");
    setAddToCatalog(true);
    setDialogOpen(true);
  }

  async function generate() {
    if (saving || !selected.length || missing.length) return;
    setSaving(true);
    try {
      const created: string[] = [];
      if (addToCatalog) {
        for (const [id, price] of newInCatalog) {
          const { error } = await db.from("treatments").insert({
            name: catalogName(id),
            description: "Cadastrado pelo odontograma. Ajuste o valor quando quiser.",
            price,
            active: true,
          });
          if (!error) created.push(catalogName(id));
        }
        // Tratamento já cadastrado sem valor recebe o valor usado agora.
        const priced = new Set<string>();
        for (const p of selected) {
          const t = findTreatment(p.planned_procedure!, catalog);
          if (t && toNumber(t.price) == null && !priced.has(t.id)) {
            priced.add(t.id);
            await db
              .from("treatments")
              .update({ price: valueOf(p) })
              .eq("id", t.id);
          }
        }
      }
      let count = 0;
      for (const p of selected) {
        const value = valueOf(p);
        const itemNotes = [p.notes?.trim(), notes.trim(), "Gerado pelo odontograma."]
          .filter(Boolean)
          .join("\n");
        const { data, error } = await db
          .from("budgets")
          .insert({
            patient_id: patientId,
            treatment: budgetItemTitle(p),
            value,
            status: "rascunho",
            notes: itemNotes,
          })
          .select("id")
          .single();
        if (error || !data) continue;
        count++;
        await db
          .from("tooth_procedures")
          .update({ budget_id: data.id, price: value })
          .eq("id", p.id);
      }
      if (!count) {
        toast.error("Não foi possível criar o orçamento. Tente de novo.");
        return;
      }
      setResult({ count, total, created });
      await onChanged();
    } finally {
      setSaving(false);
    }
  }

  const allChecked = planned.length > 0 && selected.length === planned.length;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ClipboardList className="h-4.5 w-4.5" />
          </span>
          <div>
            <p className="text-sm font-bold">Plano de tratamento</p>
            <p className="text-xs text-muted-foreground">
              Marque o que vai ser feito, confira os valores e gere o orçamento.
            </p>
          </div>
        </div>
        {planned.length > 0 && (
          <div className="flex w-full items-center justify-between gap-3 sm:w-auto">
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {selected.length} de {planned.length} selecionado(s)
              </p>
              <p className="text-lg font-extrabold tabular-nums">{formatCurrency(total)}</p>
            </div>
            <Button onClick={openDialog} disabled={!selected.length}>
              <Receipt className="h-4 w-4" /> Gerar orçamento
            </Button>
          </div>
        )}
      </div>

      {planned.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
          Nenhum procedimento planejado ainda. Toque em um dente, escolha o{" "}
          <strong className="text-foreground">Procedimento planejado</strong> e salve — ele aparece
          aqui para virar orçamento.
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border border-border">
          <label className="flex cursor-pointer items-center gap-3 border-b border-border bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground">
            <Checkbox
              checked={allChecked ? true : selected.length ? "indeterminate" : false}
              onCheckedChange={(v) =>
                setChecked(v === true ? new Set(planned.map((p) => p.id)) : new Set())
              }
            />
            Selecionar todos
          </label>
          <ul className="divide-y divide-border">
            {planned.map((p) => {
              const on = checked.has(p.id);
              const catalogItem = findTreatment(p.planned_procedure!, catalog);
              const invalid = on && !(valueOf(p) >= 0);
              return (
                <li
                  key={p.id}
                  className={`flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 transition-colors sm:flex-nowrap ${
                    on ? "bg-primary/[0.04]" : ""
                  }`}
                >
                  <Checkbox
                    checked={on}
                    onCheckedChange={(v) => toggle(p.id, v === true)}
                    aria-label={`Incluir ${procedureLabel(p.planned_procedure)} do dente ${p.tooth_number}`}
                  />
                  <button
                    type="button"
                    onClick={() => onSelectTooth(p.tooth_number)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-xs font-extrabold hover:border-primary hover:text-primary"
                    title={`Abrir dente ${p.tooth_number}`}
                  >
                    {p.tooth_number}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
                      {procedureLabel(p.planned_procedure)}
                      {p.budget_id && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          Já orçado
                        </span>
                      )}
                      {!catalogItem && canCreateInCatalog(p.planned_procedure!) && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                          Novo tratamento
                        </span>
                      )}
                    </p>
                    <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusOf(p.status).dot}`}
                      />
                      {statusOf(p.status).label}
                      {p.surfaces.length
                        ? ` · ${p.surfaces.map((s) => surfaceLabel(s, p.tooth_number)).join(", ")}`
                        : ""}
                    </p>
                  </div>
                  <div className="relative ml-auto w-32 shrink-0">
                    <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                      R$
                    </span>
                    <Input
                      inputMode="decimal"
                      value={prices[p.id] ?? ""}
                      onChange={(e) =>
                        setPrices((prev) => ({
                          ...prev,
                          [p.id]: e.target.value.replace(/[^\d,.]/g, ""),
                        }))
                      }
                      onBlur={() => savePrice(p)}
                      placeholder="0,00"
                      aria-label={`Valor de ${procedureLabel(p.planned_procedure)} do dente ${p.tooth_number}`}
                      aria-invalid={invalid}
                      className={`h-9 pl-8 text-right font-semibold tabular-nums ${
                        invalid ? "border-destructive" : ""
                      }`}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => !saving && setDialogOpen(open)}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
          {result ? (
            <div className="space-y-5 py-2 text-center animate-in fade-in zoom-in-95 duration-300">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950">
                <CheckCircle2 className="h-7 w-7" />
              </span>
              <DialogHeader className="space-y-1 sm:text-center">
                <DialogTitle className="text-center">Orçamento criado</DialogTitle>
                <DialogDescription className="text-center">
                  {result.count} item(ns) · total de{" "}
                  <strong className="text-foreground">{formatCurrency(result.total)}</strong>, como
                  rascunho em Orçamentos.
                </DialogDescription>
              </DialogHeader>
              {result.created.length > 0 && (
                <p className="rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                  <Sparkles className="mr-1 inline h-3.5 w-3.5 text-primary" />
                  Cadastrado(s) em Tratamentos: <strong>{result.created.join(", ")}</strong>. Você
                  pode alterar os valores lá quando quiser.
                </p>
              )}
              <div className="grid gap-2 sm:grid-cols-2">
                <Button asChild>
                  <Link to="/admin/orcamentos" search={{ paciente: patientId }}>
                    <Wallet className="h-4 w-4" /> Abrir orçamentos
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/admin/pacientes/$patientId/proposta" params={{ patientId }}>
                    <FileText className="h-4 w-4" /> Ver proposta
                  </Link>
                </Button>
              </div>
              <Button variant="ghost" className="w-full" onClick={() => setDialogOpen(false)}>
                Continuar no odontograma
              </Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Gerar orçamento</DialogTitle>
                <DialogDescription>
                  Cada procedimento vira um item do orçamento do paciente (rascunho). Você pode
                  editar tudo depois em Orçamentos.
                </DialogDescription>
              </DialogHeader>

              <ul className="divide-y divide-border rounded-xl border border-border">
                {selected.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="min-w-0 truncate text-sm">{budgetItemTitle(p)}</span>
                    <span
                      className={`shrink-0 text-sm font-semibold tabular-nums ${
                        valueOf(p) >= 0 ? "" : "text-destructive"
                      }`}
                    >
                      {valueOf(p) >= 0 ? formatCurrency(valueOf(p)) : "Sem valor"}
                    </span>
                  </li>
                ))}
                <li className="flex items-center justify-between bg-muted/50 px-3 py-2.5">
                  <span className="text-sm font-bold">Total</span>
                  <span className="text-base font-extrabold tabular-nums">
                    {formatCurrency(total)}
                  </span>
                </li>
              </ul>

              {missing.length > 0 && (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                  Informe o valor de {missing.length} procedimento(s) no plano antes de gerar (use
                  0,00 para itens sem custo).
                </p>
              )}
              {alreadyBudgeted > 0 && (
                <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                  {alreadyBudgeted} item(ns) já estão em um orçamento — serão incluídos de novo.
                </p>
              )}

              {newInCatalog.size > 0 && (
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3">
                  <Checkbox
                    checked={addToCatalog}
                    onCheckedChange={(v) => setAddToCatalog(v === true)}
                    className="mt-0.5"
                  />
                  <span className="text-sm">
                    <span className="font-semibold">Cadastrar em Tratamentos</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {[...newInCatalog]
                        .map(
                          ([id, price]) =>
                            `${catalogName(id)} (${price >= 0 ? formatCurrency(price) : "sem valor"})`,
                        )
                        .join(", ")}{" "}
                      — com os valores acima; depois você altera em Tratamentos.
                    </span>
                  </span>
                </label>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="plan-notes">Observações do orçamento (opcional)</Label>
                <Textarea
                  id="plan-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: condições de pagamento, prazo de validade..."
                />
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                  Cancelar
                </Button>
                <Button onClick={generate} disabled={saving || missing.length > 0}>
                  <Receipt className="h-4 w-4" />
                  {saving ? "Gerando..." : `Criar orçamento · ${formatCurrency(total)}`}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
