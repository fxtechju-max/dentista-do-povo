import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Check,
  Clock,
  PenLine,
  Plus,
  Receipt,
  Search,
  Stethoscope,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { db } from "@/integrations/mysql/client";
import { formatCurrency, type BudgetStatus } from "@/lib/admin/labels";
import { parseMoney } from "@/lib/admin/finance-period";
import { normalizeName } from "@/lib/odontogram-plan";
import { MoneyInput, Segmented } from "@/components/admin/finance/FinanceUI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export type BudgetPatient = { id: string; name: string };
export type BudgetTreatment = {
  id: string;
  name: string;
  price: number | string | null;
  description?: string | null;
  duration_minutes?: number | null;
};
export type EditableBudget = {
  id: string;
  patient_id: string;
  treatment: string;
  value: number | string;
  status: BudgetStatus;
  notes: string | null;
};

type Item = { key: string; name: string; value: string; detail: string };

const money = (n: number | string | null | undefined) =>
  n == null || n === "" ? "" : Number(n).toFixed(2).replace(".", ",");

let seq = 0;
const newKey = () => `item-${Date.now()}-${++seq}`;

/**
 * Janela de orçamento: catálogo de tratamentos com busca à esquerda e o
 * orçamento sendo montado à direita. Novo orçamento aceita vários itens (cada
 * um vira uma linha em Orçamentos, como no odontograma); editar altera um.
 */
export function BudgetDialog({
  open,
  onOpenChange,
  editing,
  patients,
  treatments,
  statusOptions,
  defaultPatientId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: EditableBudget | null;
  patients: BudgetPatient[];
  treatments: BudgetTreatment[];
  statusOptions: { id: BudgetStatus; label: string; dot: string }[];
  defaultPatientId: string;
  onSaved: () => void;
}) {
  const [patientId, setPatientId] = useState("");
  const [patientQuery, setPatientQuery] = useState("");
  const [patientOpen, setPatientOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState<BudgetStatus>("rascunho");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setPatientQuery("");
    setPatientOpen(false);
    if (editing) {
      setPatientId(editing.patient_id);
      setItems([
        { key: newKey(), name: editing.treatment, value: money(editing.value), detail: "" },
      ]);
      setStatus(editing.status);
      setNotes(editing.notes ?? "");
    } else {
      setPatientId(defaultPatientId);
      setItems([]);
      setStatus("rascunho");
      setNotes("");
    }
  }, [open, editing, defaultPatientId]);

  const patient = patients.find((p) => p.id === patientId) ?? null;
  const patientMatches = useMemo(() => {
    const q = normalizeName(patientQuery);
    return (q ? patients.filter((p) => normalizeName(p.name).includes(q)) : patients).slice(0, 8);
  }, [patients, patientQuery]);

  const results = useMemo(() => {
    const words = normalizeName(query).split(" ").filter(Boolean);
    return treatments.filter((t) => {
      const text = normalizeName(`${t.name} ${t.description ?? ""}`);
      return words.every((w) => text.includes(w));
    });
  }, [treatments, query]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const i of items) map.set(i.name, (map.get(i.name) ?? 0) + 1);
    return map;
  }, [items]);

  function add(t: BudgetTreatment) {
    const item = { key: newKey(), name: t.name, value: money(t.price), detail: "" };
    setItems((prev) => (editing ? [item] : [...prev, item]));
    setJustAdded(item.key);
    setTimeout(() => setJustAdded((k) => (k === item.key ? null : k)), 900);
  }

  function addCustom() {
    const name = query.trim();
    const item = { key: newKey(), name, value: "", detail: "" };
    setItems((prev) => (editing ? [item] : [...prev, item]));
    setQuery("");
    setTimeout(() => document.getElementById(`item-name-${item.key}`)?.focus(), 50);
  }

  const update = (key: string, patch: Partial<Item>) =>
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  const values = items.map((i) => parseMoney(i.value || "0"));
  const total = values.reduce((s, v) => s + (v >= 0 ? v : 0), 0);
  const invalidItem = items.some((i, idx) => !i.name.trim() || !(values[idx]! >= 0));
  const valid = !!patientId && items.length > 0 && !invalidItem;

  const title = (i: Item) =>
    i.detail.trim() ? `${i.name.trim()} — ${i.detail.trim()}` : i.name.trim();

  async function save() {
    if (!valid || saving) return;
    setSaving(true);
    try {
      if (editing) {
        const { error } = await db
          .from("budgets")
          .update({
            patient_id: patientId,
            treatment: title(items[0]!),
            value: values[0]!,
            status,
            notes: notes.trim() || null,
          })
          .eq("id", editing.id);
        if (error) return;
        toast.success("Orçamento atualizado.");
      } else {
        let created = 0;
        for (const [idx, i] of items.entries()) {
          const { error } = await db.from("budgets").insert({
            patient_id: patientId,
            treatment: title(i),
            value: values[idx]!,
            status,
            notes: notes.trim() || null,
          });
          if (!error) created++;
        }
        if (!created) return;
        toast.success(
          created === 1
            ? "Orçamento criado."
            : `Orçamento criado com ${created} itens · ${formatCurrency(total)}.`,
        );
      }
      onOpenChange(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-full max-w-none flex-col gap-0 overflow-hidden p-0 sm:h-[88dvh] sm:max-w-6xl sm:rounded-2xl [&>button:last-child]:hidden">
        {/* Cabeçalho */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Receipt className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-lg">
              {editing ? "Editar orçamento" : "Novo orçamento"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Altere o paciente, o tratamento, o valor ou a situação."
                : "Escolha o paciente e adicione os tratamentos do catálogo."}
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            aria-label="Fechar"
            disabled={saving}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:overflow-hidden">
          {/* Catálogo */}
          <section className="flex max-h-[55dvh] min-h-[18rem] flex-col border-b border-border bg-muted/30 lg:max-h-none lg:min-h-0 lg:border-b-0 lg:border-r">
            <div className="space-y-2 p-4 pb-3">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <Stethoscope className="h-3.5 w-3.5" /> Tratamentos
              </p>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={searchRef}
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (results[0]) add(results[0]);
                      else if (query.trim()) addCustom();
                    }
                  }}
                  placeholder="Buscar tratamento (ex.: restauração, canal, limpeza)"
                  className="h-11 bg-background pl-9 pr-9 text-base"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      searchRef.current?.focus();
                    }}
                    aria-label="Limpar busca"
                    className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {results.length} tratamento(s) · clique para adicionar · Enter adiciona o primeiro
              </p>
            </div>
            <ul className="flex-1 space-y-2 overflow-y-auto px-4 pb-4">
              {results.map((t, i) => {
                const n = counts.get(t.name) ?? 0;
                return (
                  <li
                    key={t.id}
                    className="animate-in fade-in slide-in-from-bottom-1 fill-mode-both"
                    style={{ animationDelay: `${Math.min(i, 12) * 15}ms` }}
                  >
                    <button
                      type="button"
                      onClick={() => add(t)}
                      className={`group flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md active:translate-y-0 ${
                        n ? "border-primary/40 ring-1 ring-primary/20" : "border-border"
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                          n
                            ? "bg-primary text-primary-foreground"
                            : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
                        }`}
                      >
                        {n ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-semibold">{t.name}</span>
                          {n > 1 && (
                            <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                              ×{n}
                            </span>
                          )}
                        </span>
                        {(t.description || t.duration_minutes) && (
                          <span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                            {t.duration_minutes ? (
                              <span className="inline-flex shrink-0 items-center gap-1">
                                <Clock className="h-3 w-3" /> {t.duration_minutes} min
                              </span>
                            ) : null}
                            {t.description && <span className="line-clamp-1">{t.description}</span>}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-sm font-bold tabular-nums">
                        {t.price != null ? (
                          formatCurrency(Number(t.price))
                        ) : (
                          <span className="text-xs font-medium text-muted-foreground">
                            sem preço
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
              {results.length === 0 && (
                <li className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                  Nenhum tratamento com “{query}”.
                </li>
              )}
              <li>
                <button
                  type="button"
                  onClick={addCustom}
                  className="flex w-full items-center gap-3 rounded-xl border border-dashed border-border p-3 text-left text-sm transition-colors hover:border-primary/50 hover:bg-primary/5"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <PenLine className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block font-semibold">
                      {query.trim() ? `Adicionar “${query.trim()}”` : "Item personalizado"}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      Para algo que não está no catálogo de Tratamentos.
                    </span>
                  </span>
                </button>
              </li>
            </ul>
          </section>

          {/* Orçamento */}
          <section className="flex min-h-0 flex-col">
            <div className="flex-1 space-y-5 p-4 lg:overflow-y-auto">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <UserRound className="h-3.5 w-3.5" /> Paciente
                </Label>
                {patient && !patientOpen ? (
                  <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      {patient.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold">{patient.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPatientOpen(true);
                        setPatientQuery("");
                      }}
                    >
                      Trocar
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={patientQuery}
                      onChange={(e) => {
                        setPatientQuery(e.target.value);
                        setPatientOpen(true);
                      }}
                      onFocus={() => setPatientOpen(true)}
                      placeholder="Buscar paciente pelo nome..."
                      className="h-11 pl-9"
                      aria-label="Buscar paciente"
                    />
                    {patientOpen && (
                      <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-xl animate-in fade-in slide-in-from-top-1 duration-150">
                        {patientMatches.length ? (
                          patientMatches.map((p) => (
                            <li key={p.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  setPatientId(p.id);
                                  setPatientOpen(false);
                                }}
                                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-accent"
                              >
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                  {p.name.charAt(0).toUpperCase()}
                                </span>
                                {p.name}
                              </button>
                            </li>
                          ))
                        ) : (
                          <li className="px-3 py-2 text-sm text-muted-foreground">
                            Nenhum paciente encontrado.
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label>{editing ? "Tratamento" : `Itens do orçamento (${items.length})`}</Label>
                  {items.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground"
                      onClick={() => setItems([])}
                    >
                      Limpar itens
                    </Button>
                  )}
                </div>
                {items.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                    <Stethoscope className="h-8 w-8 text-muted-foreground/60" />
                    Clique nos tratamentos ao lado para montar o orçamento.
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {items.map((item, idx) => {
                      const bad = !(values[idx]! >= 0) || !item.name.trim();
                      return (
                        <li
                          key={item.key}
                          className={`rounded-xl border bg-card p-3 transition-all duration-500 animate-in fade-in slide-in-from-right-2 ${
                            justAdded === item.key
                              ? "border-primary ring-2 ring-primary/30"
                              : "border-border"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold">
                              {idx + 1}
                            </span>
                            <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,1fr)_9.5rem]">
                              <Input
                                id={`item-name-${item.key}`}
                                value={item.name}
                                onChange={(e) => update(item.key, { name: e.target.value })}
                                placeholder="Nome do tratamento"
                                className="font-semibold"
                                aria-label="Nome do tratamento"
                              />
                              <MoneyInput
                                value={item.value}
                                onChange={(v) => update(item.key, { value: v })}
                              />
                              <Input
                                value={item.detail}
                                onChange={(e) => update(item.key, { detail: e.target.value })}
                                placeholder="Dente ou observação (opcional) — ex.: Dente 36"
                                className="h-9 text-sm sm:col-span-2"
                                aria-label="Dente ou observação do item"
                              />
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              onClick={() =>
                                setItems((prev) => prev.filter((i) => i.key !== item.key))
                              }
                              aria-label={`Remover ${item.name || "item"}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          {bad && (
                            <p className="ml-8 mt-1 text-xs text-destructive">
                              Informe o nome e um valor válido (0,00 para itens sem custo).
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Situação</Label>
                <Segmented value={status} onChange={setStatus} options={statusOptions} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="budget-notes">Observações</Label>
                <Textarea
                  id="budget-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Condições de pagamento, validade, detalhes..."
                  rows={3}
                />
              </div>
            </div>

            {/* Rodapé com total */}
            <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card px-4 py-3 shadow-[0_-4px_12px_-6px_rgba(0,0,0,0.12)] lg:shadow-none">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Total
                </p>
                <p
                  key={total}
                  className="text-2xl font-extrabold tabular-nums text-primary animate-in zoom-in-95 duration-200"
                >
                  {formatCurrency(total)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                  Cancelar
                </Button>
                <Button onClick={save} disabled={!valid || saving} className="min-w-40">
                  <Check className="h-4 w-4" />
                  {saving
                    ? "Salvando..."
                    : editing
                      ? "Salvar alterações"
                      : items.length > 1
                        ? `Criar com ${items.length} itens`
                        : "Criar orçamento"}
                </Button>
              </div>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
