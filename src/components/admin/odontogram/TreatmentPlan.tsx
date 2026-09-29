import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  CheckCircle2,
  ClipboardList,
  Eraser,
  FileText,
  Plus,
  Receipt,
  Sparkles,
  Trash2,
  Wallet,
} from "lucide-react";
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
import {
  PROCEDURES,
  procedureLabel,
  statusOf,
  surfaceLabel,
  type Situation,
  type ToothProcedure,
} from "@/lib/odontogram-pro";
import { LOWER_TEETH, UPPER_TEETH } from "@/lib/odontogram";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const money = (n: number | null) => (n == null ? "" : n.toFixed(2).replace(".", ","));

type Result = { count: number; total: number; created: string[] };

const TEETH_GROUPS = [
  { label: "Permanentes — superiores", teeth: UPPER_TEETH.permanente },
  { label: "Permanentes — inferiores", teeth: LOWER_TEETH.permanente },
  { label: "Decíduos — superiores", teeth: UPPER_TEETH.deciduo },
  { label: "Decíduos — inferiores", teeth: LOWER_TEETH.deciduo },
];
const emptyAdd = { tooth: "", procedure: "", price: "", notes: "" };

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
  currentSituation,
  hasAttachments,
  defaultDentist,
}: {
  patientId: string;
  procedures: ToothProcedure[];
  catalog: CatalogTreatment[];
  onChanged: () => Promise<void> | void;
  onSelectTooth: (tooth: number) => void;
  currentSituation: (tooth: number) => Situation | null;
  hasAttachments: (procedureId: string) => boolean;
  defaultDentist: string;
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
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(emptyAdd);
  const [adding, setAdding] = useState(false);
  const [removeList, setRemoveList] = useState<ToothProcedure[] | null>(null);
  const [removing, setRemoving] = useState(false);

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

  function openAdd() {
    setAddForm(emptyAdd);
    setAddOpen(true);
  }

  function pickProcedure(id: string) {
    const price = toNumber(findTreatment(id, catalog)?.price);
    setAddForm((f) => ({ ...f, procedure: id, price: money(price) }));
  }

  const addPrice = addForm.price.trim() ? parseMoney(addForm.price) : null;
  const addValid =
    !!addForm.tooth &&
    !!addForm.procedure &&
    (addPrice == null || addPrice >= 0) &&
    (addForm.procedure !== "outro" || !!addForm.notes.trim());

  async function addProcedure() {
    if (!addValid || adding) return;
    setAdding(true);
    const tooth = Number(addForm.tooth);
    const { error } = await db.from("tooth_procedures").insert({
      patient_id: patientId,
      tooth_number: tooth,
      surfaces: [],
      situation: currentSituation(tooth) ?? "saudavel",
      planned_procedure: addForm.procedure,
      price: addPrice,
      status: "planejado",
      notes: addForm.notes.trim() || null,
      record_date: new Date().toLocaleDateString("en-CA"),
      dentist: defaultDentist.trim() || null,
    });
    setAdding(false);
    if (error) return;
    toast.success(`${procedureLabel(addForm.procedure)} no dente ${tooth} adicionado ao plano.`);
    setAddOpen(false);
    await onChanged();
  }

  // Tira do plano. Registro criado só para planejar (sem situação, faces,
  // observações nem fotos) é apagado; os outros continuam no histórico.
  async function removeFromPlan() {
    if (!removeList?.length || removing) return;
    setRemoving(true);
    for (const p of removeList) {
      const onlyPlan =
        p.situation === "saudavel" && !p.surfaces.length && !p.notes && !hasAttachments(p.id);
      if (onlyPlan) await db.from("tooth_procedures").delete().eq("id", p.id);
      else
        await db
          .from("tooth_procedures")
          .update({ planned_procedure: null, price: null })
          .eq("id", p.id);
    }
    setRemoving(false);
    toast.success(
      removeList.length === 1
        ? "Procedimento removido do plano."
        : `${removeList.length} procedimentos removidos do plano.`,
    );
    setRemoveList(null);
    await onChanged();
  }

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
          <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto">
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
          <div className="mt-3">
            <Button variant="outline" size="sm" onClick={openAdd}>
              <Plus className="h-4 w-4" /> Adicionar procedimento
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border border-border">
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/50 px-3 py-1.5">
            <label className="flex flex-1 cursor-pointer items-center gap-3 py-0.5 text-xs font-semibold text-muted-foreground">
              <Checkbox
                checked={allChecked ? true : selected.length ? "indeterminate" : false}
                onCheckedChange={(v) =>
                  setChecked(v === true ? new Set(planned.map((p) => p.id)) : new Set())
                }
              />
              Selecionar todos
            </label>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={!selected.length}
              onClick={() => setRemoveList(selected)}
            >
              <Eraser className="h-3.5 w-3.5" /> Limpar selecionados
            </Button>
            <Button variant="outline" size="sm" className="h-8" onClick={openAdd}>
              <Plus className="h-3.5 w-3.5" /> Adicionar
            </Button>
          </div>
          <ul className="divide-y divide-border">
            {planned.map((p) => {
              const on = checked.has(p.id);
              const catalogItem = findTreatment(p.planned_procedure!, catalog);
              const invalid = on && !(valueOf(p) >= 0);
              return (
                <li
                  key={p.id}
                  className={`flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 transition-colors animate-in fade-in slide-in-from-left-1 duration-300 sm:flex-nowrap ${
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setRemoveList([p])}
                    title="Remover do plano"
                    aria-label={`Remover ${procedureLabel(p.planned_procedure)} do dente ${p.tooth_number} do plano`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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

      <Dialog open={addOpen} onOpenChange={(open) => !adding && setAddOpen(open)}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar ao plano</DialogTitle>
            <DialogDescription>
              Inclua um procedimento no plano de tratamento sem precisar abrir o dente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3">
              <div className="space-y-1.5">
                <Label>Dente</Label>
                <Select
                  value={addForm.tooth}
                  onValueChange={(v) => setAddForm((f) => ({ ...f, tooth: v }))}
                >
                  <SelectTrigger aria-label="Dente">
                    <SelectValue placeholder="Nº" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {TEETH_GROUPS.map((g) => (
                      <SelectGroup key={g.label}>
                        <SelectLabel className="text-[11px]">{g.label}</SelectLabel>
                        {g.teeth.map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            Dente {n}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Procedimento</Label>
                <Select value={addForm.procedure} onValueChange={pickProcedure}>
                  <SelectTrigger aria-label="Procedimento">
                    <SelectValue placeholder="Escolha" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROCEDURES.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-add-price">Valor</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                  R$
                </span>
                <Input
                  id="plan-add-price"
                  inputMode="decimal"
                  value={addForm.price}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, price: e.target.value.replace(/[^\d,.]/g, "") }))
                  }
                  placeholder="0,00"
                  className="pl-10 font-semibold"
                />
              </div>
              {addForm.procedure && (
                <p className="text-[11px] text-muted-foreground">
                  {findTreatment(addForm.procedure, catalog)
                    ? "Valor sugerido pelo catálogo de Tratamentos."
                    : canCreateInCatalog(addForm.procedure)
                      ? "Procedimento novo: entra em Tratamentos ao gerar o orçamento."
                      : "Descreva o procedimento nas observações."}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-add-notes">
                Observações{addForm.procedure === "outro" ? " (descreva o procedimento)" : ""}
              </Label>
              <Textarea
                id="plan-add-notes"
                rows={2}
                value={addForm.notes}
                onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Ex: resina na face oclusal"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setAddForm(emptyAdd)}
              disabled={adding}
              className="sm:mr-auto"
            >
              <Eraser className="h-4 w-4" /> Limpar campos
            </Button>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={adding}>
              Cancelar
            </Button>
            <Button onClick={addProcedure} disabled={!addValid || adding}>
              <Plus className="h-4 w-4" /> {adding ? "Adicionando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removeList} onOpenChange={(open) => !open && setRemoveList(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {removeList?.length === 1
                ? "Remover este procedimento do plano?"
                : `Remover ${removeList?.length ?? 0} procedimentos do plano?`}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg bg-muted/60 p-2 text-sm text-foreground">
                  {removeList?.map((p) => (
                    <li key={p.id}>• {budgetItemTitle(p)}</li>
                  ))}
                </ul>
                <p>
                  Sai do plano de tratamento. O que já foi registrado no dente (situação, faces,
                  fotos) continua no histórico, e orçamentos já criados não são apagados.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void removeFromPlan();
              }}
              disabled={removing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removing ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
