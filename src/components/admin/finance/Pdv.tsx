import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Calculator as CalculatorIcon,
  Check,
  CheckCircle2,
  DollarSign,
  FileText,
  Maximize2,
  MessageSquare,
  Minimize2,
  Minus,
  Pencil,
  Percent,
  Plus,
  Printer,
  PrinterX,
  Search,
  ShoppingCart,
  Stethoscope,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { db } from "@/integrations/mysql/client";
import { formatCurrency } from "@/lib/admin/labels";
import { parseMoney } from "@/lib/admin/finance-period";
import { moneyText, noAdjust, type Adjust } from "@/lib/admin/finance-adjust";
import { normalizeName } from "@/lib/odontogram-plan";
import { change, itemTotal, saleDescription, saleTotals, type CartItem } from "@/lib/pdv";
import {
  paymentMethod,
  paymentMethodLabel,
  parseInstallments,
  useEnabledPaymentMethods,
} from "@/lib/payment-methods";
import { Calculator } from "@/components/admin/finance/Calculator";
import { printHtml, receiptHtml, type ReceiptData } from "@/lib/receipt";
import { readPreference, savePreference, subscribePreferences } from "@/lib/preferences";
import { PdvBudgetPicker } from "@/components/admin/finance/PdvBudgetPicker";
import { MoneyInput } from "@/components/admin/finance/FinanceUI";
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

type Treatment = { id: string; name: string; price: number | string | null };
type Patient = { id: string; name: string };
type Sale = {
  id: string;
  number: number;
  items: CartItem[];
  patientId: string | null;
  discount: Adjust;
  surcharge: Adjust;
};
type Receipt = ReceiptData;

let seq = 0;
const key = () => `k${Date.now()}${++seq}`;
const newSale = (number: number): Sale => ({
  id: key(),
  number,
  items: [],
  patientId: null,
  discount: noAdjust,
  surcharge: noAdjust,
});
const pad = (n: number) => String(n).padStart(2, "0");
const qtyText = (n: number) => String(n).replace(".", ",");

const SHORTCUTS = [
  ["F2", "Finalizar venda"],
  ["F3", "Calculadora"],
  ["F4", "Desconto"],
  ["F7", "Acréscimo"],
  ["F6", "Orçamento"],
  ["F9", "Limpar"],
  ["F8", "Imprimir"],
  ["F10", "Puxar orçamento"],
] as const;

/**
 * Caixa do Financeiro (PDV): vendas abertas em abas, carrinho de tratamentos,
 * desconto/acréscimo, orçamento, recibo e finalização com forma de pagamento.
 * As vendas abertas ficam só na tela (nada no navegador); ao finalizar, viram
 * um lançamento no Financeiro.
 */
export function Pdv({
  patients,
  onFinished,
  cashSessionId,
  budgetPatientId,
  budgetId,
  onBudgetHandled,
}: {
  patients: Patient[];
  onFinished: () => void;
  /** Caixa do dia aberto: as vendas ficam ligadas a ele para o fechamento. */
  cashSessionId: string;
  /** Veio de Orçamentos › Finalizar no Caixa: abre os orçamentos deste paciente. */
  budgetPatientId?: string | null | undefined;
  budgetId?: string | null | undefined;
  onBudgetHandled?: (() => void) | undefined;
}) {
  const [budgetOpen, setBudgetOpen] = useState(false);
  useEffect(() => {
    if (budgetPatientId || budgetId) setBudgetOpen(true);
  }, [budgetPatientId, budgetId]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [clinic, setClinic] = useState<{ name: string; phone: string; address: string }>({
    name: "Dentista do Povo",
    phone: "",
    address: "",
  });
  const [sales, setSales] = useState<Sale[]>(() => [newSale(1)]);
  const [activeId, setActiveId] = useState(sales[0]!.id);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [searchFocus, setSearchFocus] = useState(false);
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [adjustOpen, setAdjustOpen] = useState<"discount" | "surcharge" | null>(null);
  const [calcOpen, setCalcOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [patientOpen, setPatientOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    db.from("treatments")
      .select("id, name, price")
      .eq("active", true)
      .order("name")
      .then(({ data }) => setTreatments((data ?? []) as Treatment[]));
    db.from("clinic_settings")
      .select("clinic_name, phone, address")
      .eq("id", "default")
      .maybeSingle()
      .then(({ data }) => {
        const d = data as {
          clinic_name: string | null;
          phone: string | null;
          address: string | null;
        } | null;
        if (d)
          setClinic({
            name: d.clinic_name || "Dentista do Povo",
            phone: d.phone ?? "",
            address: d.address ?? "",
          });
      });
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const sale = sales.find((s) => s.id === activeId) ?? sales[0]!;
  const totals = saleTotals(sale.items, sale.discount, sale.surcharge);
  const patient = patients.find((p) => p.id === sale.patientId) ?? null;

  const updateSale = useCallback(
    (patch: Partial<Sale> | ((s: Sale) => Partial<Sale>)) =>
      setSales((list) =>
        list.map((s) =>
          s.id === activeId ? { ...s, ...(typeof patch === "function" ? patch(s) : patch) } : s,
        ),
      ),
    [activeId],
  );

  const results = useMemo(() => {
    const words = normalizeName(query).split(" ").filter(Boolean);
    if (!words.length) return treatments.slice(0, 8);
    return treatments
      .filter((t) => words.every((w) => normalizeName(t.name).includes(w)))
      .slice(0, 8);
  }, [treatments, query]);

  function addItem(name: string, price: number) {
    const existing = sale.items.find((i) => i.name === name && i.price === price && !i.note);
    if (existing) {
      updateSale((s) => ({
        items: s.items.map((i) => (i.key === existing.key ? { ...i, qty: i.qty + 1 } : i)),
      }));
      setLastAdded(existing.key);
    } else {
      const item: CartItem = { key: key(), name, price, qty: 1, note: "" };
      updateSale((s) => ({ items: [...s.items, item] }));
      setLastAdded(item.key);
    }
    setQuery("");
    setHighlight(0);
    setTimeout(() => setLastAdded(null), 900);
    searchRef.current?.focus();
  }

  function addFromCatalog(t: Treatment) {
    addItem(t.name, t.price != null ? Number(t.price) : 0);
  }

  function addCustom() {
    const name = query.trim();
    if (!name) return;
    const item: CartItem = { key: key(), name, price: 0, qty: 1, note: "" };
    updateSale((s) => ({ items: [...s.items, item] }));
    setQuery("");
    setEditingPrice(item.key);
  }

  const setItem = (k: string, patch: Partial<CartItem>) =>
    updateSale((s) => ({ items: s.items.map((i) => (i.key === k ? { ...i, ...patch } : i)) }));

  function openNewSale() {
    const number = Math.max(...sales.map((s) => s.number)) + 1;
    const s = newSale(number);
    setSales((list) => [...list, s]);
    setActiveId(s.id);
    setTimeout(() => searchRef.current?.focus(), 50);
  }

  function closeSale(id: string) {
    setSales((list) => {
      const rest = list.filter((s) => s.id !== id);
      const next = rest.length ? rest : [newSale(1)];
      if (id === activeId) setActiveId(next[next.length - 1]!.id);
      return next;
    });
  }

  function clearSale() {
    updateSale({ items: [], discount: noAdjust, surcharge: noAdjust });
    setClearOpen(false);
    toast.success("Carrinho limpo.");
  }

  async function makeBudget() {
    if (!sale.items.length) {
      toast.error("Adicione tratamentos ao carrinho.");
      return;
    }
    if (!sale.patientId) {
      setPatientOpen(true);
      toast.error("Escolha o paciente para gerar o orçamento.");
      return;
    }
    const fresh = sale.items.filter((i) => !i.budgetId);
    if (!fresh.length) {
      toast.info("Esses itens já são de um orçamento.");
      return;
    }
    let created = 0;
    for (const i of fresh) {
      const { error } = await db.from("budgets").insert({
        patient_id: sale.patientId,
        treatment: `${i.qty !== 1 ? `${qtyText(i.qty)}x ` : ""}${i.name}${i.note ? ` — ${i.note}` : ""}`,
        value: itemTotal(i),
        status: "rascunho",
        notes: "Gerado pelo caixa do Financeiro.",
      });
      if (!error) created++;
    }
    if (created)
      toast.success(`Orçamento criado com ${created} item(ns) para ${patient?.name}.`, {
        action: {
          label: "Ver",
          onClick: () => window.location.assign(`/admin/orcamentos?paciente=${sale.patientId}`),
        },
      });
  }

  function printReceipt(r: Receipt) {
    printHtml(receiptHtml(r, clinic));
  }

  function printCurrent() {
    if (!sale.items.length) {
      toast.error("O carrinho está vazio.");
      return;
    }
    printReceipt({
      kind: "conferencia",
      number: sale.number,
      patient: patient?.name ?? "Cliente à vista",
      items: sale.items,
      subtotal: totals.subtotal,
      discount: totals.discount,
      surcharge: totals.surcharge,
      total: totals.total,
      received: false,
      date: new Date(),
    });
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  }

  // Atalhos de teclado (só com nenhuma janela aberta).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector("[role=dialog],[role=alertdialog]")) return;
      const map: Record<string, () => void> = {
        F2: () => sale.items.length && setFinishOpen(true),
        F3: () => setCalcOpen(true),
        F4: () => setAdjustOpen("discount"),
        F7: () => setAdjustOpen("surcharge"),
        F6: () => void makeBudget(),
        F9: () => sale.items.length && setClearOpen(true),
        F8: printCurrent,
        F10: () => setBudgetOpen(true),
      };
      const fn = map[e.key];
      if (fn) {
        e.preventDefault();
        fn();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const actions = [
    {
      id: "print",
      label: "Imprimir",
      key: "F8",
      icon: Printer,
      tone: "bg-sky-600 hover:bg-sky-700",
      onClick: printCurrent,
      disabled: !sale.items.length,
    },
    {
      id: "calc",
      label: "Calculadora",
      key: "F3",
      icon: CalculatorIcon,
      tone: "bg-slate-500 hover:bg-slate-600",
      onClick: () => setCalcOpen(true),
    },
    {
      id: "clear",
      label: "Limpar",
      key: "F9",
      icon: Trash2,
      tone: "bg-orange-600 hover:bg-orange-700",
      onClick: () => setClearOpen(true),
      disabled: !sale.items.length,
    },
    {
      id: "budget",
      label: "Orçamento",
      key: "F6",
      icon: FileText,
      tone: "bg-violet-600 hover:bg-violet-700",
      onClick: () => void makeBudget(),
      disabled: !sale.items.length,
    },
    {
      id: "surcharge",
      label: "Acréscimo",
      key: "F7",
      icon: DollarSign,
      tone: "bg-amber-500 hover:bg-amber-600",
      onClick: () => setAdjustOpen("surcharge"),
    },
    {
      id: "discount",
      label: "Desconto",
      key: "F4",
      icon: Percent,
      tone: "bg-emerald-600 hover:bg-emerald-700",
      onClick: () => setAdjustOpen("discount"),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        {/* Esquerda: vendas, busca e carrinho */}
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex items-center gap-2 overflow-x-auto rounded-2xl border border-border bg-card p-2 shadow-sm">
            {sales.map((s) => {
              const on = s.id === sale.id;
              const n = s.items.reduce((a, i) => a + i.qty, 0);
              return (
                <div
                  key={s.id}
                  className={`group flex shrink-0 items-center rounded-xl border-2 transition-all ${
                    on
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
                      : "border-transparent hover:bg-accent"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveId(s.id)}
                    className="flex items-center gap-2 px-3 py-1.5 text-left"
                  >
                    <ShoppingCart
                      className={`h-4 w-4 ${on ? "text-emerald-600" : "text-muted-foreground"}`}
                    />
                    <span>
                      <span
                        className={`block text-sm font-bold ${on ? "text-emerald-700 dark:text-emerald-300" : ""}`}
                      >
                        Venda {pad(s.number)}
                      </span>
                      <span className="block text-[11px] text-muted-foreground">
                        {n ? `${qtyText(n)} item(ns)` : "vazia"}
                      </span>
                    </span>
                  </button>
                  {sales.length > 1 && (
                    <button
                      type="button"
                      onClick={() => closeSale(s.id)}
                      aria-label={`Fechar venda ${pad(s.number)}`}
                      className="mr-1 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground opacity-60 hover:bg-background hover:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
            <Button
              size="sm"
              className="ml-auto shrink-0 bg-violet-600 text-white hover:bg-violet-700"
              onClick={() => setBudgetOpen(true)}
            >
              <FileText className="h-4 w-4" /> Puxar orçamento
            </Button>
            <Button variant="outline" size="sm" className="shrink-0" onClick={openNewSale}>
              <Plus className="h-4 w-4" /> Nova venda
            </Button>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlight(0);
              }}
              onFocus={() => setSearchFocus(true)}
              onBlur={() => setTimeout(() => setSearchFocus(false), 150)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setHighlight((h) => Math.min(h + 1, results.length));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHighlight((h) => Math.max(h - 1, 0));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  const t = results[highlight];
                  if (t) addFromCatalog(t);
                  else addCustom();
                } else if (e.key === "Escape") {
                  setQuery("");
                  searchRef.current?.blur();
                }
              }}
              placeholder="Buscar tratamento pelo nome… (Enter adiciona)"
              className="h-14 w-full rounded-2xl border border-border bg-card pl-12 pr-4 text-base shadow-sm outline-none transition-shadow focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15"
              aria-label="Buscar tratamento"
            />
            {searchFocus && query.trim() && (
              <ul className="absolute z-30 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl border border-border bg-popover p-1.5 shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150">
                {results.map((t, i) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => addFromCatalog(t)}
                      onMouseEnter={() => setHighlight(i)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${
                        highlight === i ? "bg-emerald-50 dark:bg-emerald-950/40" : ""
                      }`}
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        <Stethoscope className="h-4 w-4" />
                      </span>
                      <span className="flex-1 truncate font-semibold">{t.name}</span>
                      <span className="font-bold tabular-nums">
                        {t.price != null ? formatCurrency(Number(t.price)) : "—"}
                      </span>
                    </button>
                  </li>
                ))}
                {query.trim() && (
                  <li>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={addCustom}
                      onMouseEnter={() => setHighlight(results.length)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${
                        highlight === results.length ? "bg-accent" : ""
                      }`}
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                        <Plus className="h-4 w-4" />
                      </span>
                      Adicionar “<b>{query.trim()}</b>” como item avulso
                    </button>
                  </li>
                )}
              </ul>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-extrabold">
              Carrinho{" "}
              <span className="text-sm font-semibold text-muted-foreground">
                ({sale.items.length})
              </span>
            </h3>
            <PatientPicker
              patients={patients}
              patient={patient}
              open={patientOpen}
              onOpenChange={setPatientOpen}
              onChange={(id) => updateSale({ patientId: id })}
            />
          </div>

          <div className="min-h-[14rem] flex-1 overflow-y-auto rounded-2xl border border-border bg-card shadow-sm xl:max-h-[calc(100dvh-24rem)]">
            {sale.items.length === 0 ? (
              <div className="flex h-full min-h-[14rem] flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                  <ShoppingCart className="h-8 w-8" />
                </span>
                <p className="font-semibold text-foreground">Carrinho vazio</p>
                <p className="max-w-xs text-sm">
                  Busque um tratamento acima e aperte Enter, ou clique em um resultado.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {sale.items.map((i) => (
                  <li
                    key={i.key}
                    className={`relative flex flex-wrap items-center gap-3 px-4 py-3 pr-10 transition-colors duration-700 sm:flex-nowrap sm:pr-4 ${
                      lastAdded === i.key ? "bg-emerald-50 dark:bg-emerald-950/30" : ""
                    } animate-in fade-in slide-in-from-left-2 duration-300`}
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      <Stethoscope className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1 basis-[calc(100%-3.5rem)] sm:basis-0">
                      <p className="truncate font-bold uppercase tracking-wide">{i.name}</p>
                      {editingPrice === i.key ? (
                        <div className="mt-1 flex items-center gap-2">
                          <div className="w-36">
                            <MoneyInput
                              value={moneyText(i.price) || ""}
                              onChange={(v) => setItem(i.key, { price: parseMoney(v) || 0 })}
                            />
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => setEditingPrice(null)}>
                            <Check className="h-4 w-4" /> OK
                          </Button>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(i.price)} un.
                        </p>
                      )}
                      {editingNote === i.key ? (
                        <Input
                          autoFocus
                          value={i.note}
                          onChange={(e) => setItem(i.key, { note: e.target.value })}
                          onBlur={() => setEditingNote(null)}
                          onKeyDown={(e) => e.key === "Enter" && setEditingNote(null)}
                          placeholder="Ex.: dente 36, retorno..."
                          className="mt-1 h-8 text-sm"
                        />
                      ) : i.note ? (
                        <p className="mt-0.5 text-xs italic text-muted-foreground">“{i.note}”</p>
                      ) : null}
                      <div className="mt-1 flex gap-3 text-xs font-semibold text-muted-foreground">
                        <button
                          type="button"
                          onClick={() => setEditingNote(i.key)}
                          className="inline-flex items-center gap-1 hover:text-foreground"
                        >
                          <MessageSquare className="h-3.5 w-3.5" /> Observação
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingPrice(i.key)}
                          className="inline-flex items-center gap-1 hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Alterar preço
                        </button>
                      </div>
                    </div>
                    <div className="ml-14 flex items-center rounded-xl bg-muted p-1 sm:ml-0">
                      <button
                        type="button"
                        onClick={() =>
                          setItem(i.key, { qty: Math.max(1, Math.round((i.qty - 1) * 100) / 100) })
                        }
                        aria-label="Diminuir quantidade"
                        className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-background"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <QtyInput value={i.qty} onChange={(qty) => setItem(i.key, { qty })} />
                      <button
                        type="button"
                        onClick={() => setItem(i.key, { qty: Math.round((i.qty + 1) * 100) / 100 })}
                        aria-label="Aumentar quantidade"
                        className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-background"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <span className="ml-auto w-28 text-right text-lg font-extrabold tabular-nums sm:ml-0">
                      {formatCurrency(itemTotal(i))}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateSale((s) => ({ items: s.items.filter((x) => x.key !== i.key) }))
                      }
                      aria-label={`Remover ${i.name}`}
                      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:static"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 font-semibold text-emerald-600">
              {sale.items.length > 0 && (
                <>
                  <Check className="h-4 w-4" /> {qtyText(totals.count)} item(ns) no carrinho
                </>
              )}
            </span>
            {sale.items.length > 0 && (
              <button
                type="button"
                onClick={() => setClearOpen(true)}
                className="inline-flex items-center gap-1.5 font-semibold text-red-500 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" /> Limpar carrinho
              </button>
            )}
          </div>
        </div>

        {/* Direita: resumo */}
        <aside className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-lg xl:sticky xl:top-20 xl:self-start [@media(max-height:860px)]:p-4">
          <h3 className="text-lg font-extrabold">Resumo da venda</h3>
          <div className="mt-4 space-y-2 border-b border-border pb-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="font-bold text-foreground tabular-nums">
                {formatCurrency(totals.subtotal)}
              </span>
            </div>
            {totals.discount > 0 && (
              <div className="flex items-center justify-between text-emerald-600 animate-in fade-in slide-in-from-top-1">
                <span className="flex items-center gap-1.5">
                  Desconto
                  <button
                    type="button"
                    onClick={() => updateSale({ discount: noAdjust })}
                    aria-label="Remover desconto"
                    className="rounded hover:bg-emerald-100 dark:hover:bg-emerald-950"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
                <span className="font-bold tabular-nums">− {formatCurrency(totals.discount)}</span>
              </div>
            )}
            {totals.surcharge > 0 && (
              <div className="flex items-center justify-between text-amber-600 animate-in fade-in slide-in-from-top-1">
                <span className="flex items-center gap-1.5">
                  Acréscimo
                  <button
                    type="button"
                    onClick={() => updateSale({ surcharge: noAdjust })}
                    aria-label="Remover acréscimo"
                    className="rounded hover:bg-amber-100 dark:hover:bg-amber-950"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
                <span className="font-bold tabular-nums">+ {formatCurrency(totals.surcharge)}</span>
              </div>
            )}
          </div>
          <div className="py-5 text-center [@media(max-height:860px)]:py-2">
            <p className="text-sm font-semibold text-muted-foreground">Total</p>
            <p
              key={totals.total}
              className="text-5xl font-extrabold tracking-tight text-emerald-600 tabular-nums animate-in zoom-in-95 duration-200 [@media(max-height:860px)]:text-4xl"
            >
              {formatCurrency(totals.total)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {actions.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={a.onClick}
                disabled={a.disabled}
                className={`relative flex h-14 items-center justify-center gap-2 rounded-xl [@media(max-height:860px)]:h-11 text-sm font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 disabled:pointer-events-none disabled:opacity-40 ${a.tone}`}
              >
                <a.icon className="h-5 w-5" /> {a.label}
                <span className="absolute right-2 top-1.5 text-[9px] font-bold opacity-70">
                  {a.key}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-amber-100/70 px-3 py-2.5 text-sm font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
            <ShoppingCart className="h-4 w-4" />
            {qtyText(totals.count)} item(ns) · Subtotal: <b>{formatCurrency(totals.subtotal)}</b>
          </div>
          <button
            type="button"
            onClick={() => setFinishOpen(true)}
            disabled={!sale.items.length}
            className="mt-5 flex h-16 flex-col items-center justify-center rounded-xl bg-emerald-600 [@media(max-height:860px)]:mt-3 [@media(max-height:860px)]:h-14 text-white shadow-lg shadow-emerald-600/25 transition-all hover:-translate-y-0.5 hover:bg-emerald-700 active:translate-y-0 disabled:pointer-events-none disabled:opacity-40"
          >
            <span className="flex items-center gap-2 text-lg font-extrabold">
              <Check className="h-5 w-5" /> Finalizar venda
            </span>
            <span className="text-[11px] font-semibold opacity-80">F2</span>
          </button>
        </aside>
      </div>

      {/* Barra de atalhos */}
      <div className="hidden flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground md:flex">
        {SHORTCUTS.map(([k, label]) => (
          <span key={k} className="flex items-center gap-1.5">
            <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-xs font-bold text-foreground">
              {k}
            </kbd>
            {label}
          </span>
        ))}
        <span className="ml-auto flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Caixa aberto
          </span>
          <Button variant="outline" size="sm" onClick={toggleFullscreen}>
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            {fullscreen ? "Sair da tela cheia" : "Tela cheia"}
          </Button>
        </span>
      </div>

      <Calculator open={calcOpen} onOpenChange={setCalcOpen} />

      <PdvBudgetPicker
        open={budgetOpen}
        onOpenChange={(o) => {
          setBudgetOpen(o);
          if (!o) onBudgetHandled?.();
        }}
        initialPatientId={budgetPatientId ?? sale.patientId}
        initialBudgetId={budgetId}
        onLoad={(patientId, loaded) => {
          const items: CartItem[] = loaded.map((b) => ({
            key: key(),
            name: b.name,
            price: b.price,
            qty: 1,
            note: "",
            budgetId: b.budgetId,
            ...(b.pendingPaymentId ? { pendingPaymentId: b.pendingPaymentId } : {}),
          }));
          const already = new Set(sale.items.map((i) => i.budgetId).filter(Boolean));
          const fresh = items.filter((i) => !already.has(i.budgetId));
          if (sale.items.length && sale.patientId !== patientId) {
            // Outra pessoa no carrinho atual: abre uma venda nova para não misturar.
            const number = Math.max(...sales.map((x) => x.number)) + 1;
            const next = { ...newSale(number), patientId, items: fresh };
            setSales((list) => [...list, next]);
            setActiveId(next.id);
          } else {
            updateSale((cur) => ({ patientId, items: [...cur.items, ...fresh] }));
          }
          toast.success(`${fresh.length} item(ns) do orçamento no carrinho.`);
          setTimeout(() => searchRef.current?.focus(), 100);
        }}
      />

      <AdjustDialog
        kind={adjustOpen}
        subtotal={totals.subtotal}
        value={adjustOpen === "surcharge" ? sale.surcharge : sale.discount}
        onClose={() => setAdjustOpen(null)}
        onApply={(v) => {
          if (adjustOpen === "discount") updateSale({ discount: v });
          if (adjustOpen === "surcharge") updateSale({ surcharge: v });
          setAdjustOpen(null);
        }}
      />

      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Limpar a Venda {pad(sale.number)}?</DialogTitle>
            <DialogDescription>
              Todos os itens, desconto e acréscimo saem do carrinho.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setClearOpen(false)}>
              Voltar
            </Button>
            <Button variant="destructive" onClick={clearSale} autoFocus>
              <Trash2 className="h-4 w-4" /> Limpar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FinishDialog
        open={finishOpen}
        onOpenChange={setFinishOpen}
        sale={sale}
        cashSessionId={cashSessionId}
        patientName={patient?.name ?? null}
        totals={totals}
        onPrint={printReceipt}
        onDone={() => {
          onFinished();
          if (sales.length > 1) closeSale(sale.id);
          else updateSale({ items: [], patientId: null, discount: noAdjust, surcharge: noAdjust });
          setTimeout(() => searchRef.current?.focus(), 100);
        }}
      />
    </div>
  );
}

/** Quantidade digitável (aceita 1,5): confirma ao sair do campo ou com Enter. */
function QtyInput({ value, onChange }: { value: number; onChange: (qty: number) => void }) {
  const [text, setText] = useState(qtyText(value));
  useEffect(() => setText(qtyText(value)), [value]);
  const commit = () => {
    const v = parseMoney(text);
    if (v > 0 && v < 10000) onChange(Math.round(v * 1000) / 1000);
    else setText(qtyText(value));
  };
  return (
    <input
      value={text}
      onChange={(e) => setText(e.target.value.replace(/[^\d,.]/g, ""))}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
      inputMode="decimal"
      aria-label="Quantidade"
      className="w-12 bg-transparent text-center font-bold tabular-nums outline-none"
    />
  );
}

function esc(s: string) {
  return s.replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!,
  );
}

function PatientPicker({
  patients,
  patient,
  open,
  onOpenChange,
  onChange,
}: {
  patients: Patient[];
  patient: Patient | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onChange: (id: string | null) => void;
}) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const n = normalizeName(q);
    return (n ? patients.filter((p) => normalizeName(p.name).includes(n)) : patients).slice(0, 8);
  }, [patients, q]);
  return (
    <div className="relative">
      <div
        className={`flex items-center gap-2 rounded-xl border-2 px-3 py-1.5 text-sm ${
          patient
            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
            : "border-emerald-500/60"
        }`}
      >
        <UserRound className="h-4 w-4 text-emerald-600" />
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          className="max-w-44 truncate font-semibold"
        >
          {patient?.name ?? "Cliente à vista"}
        </button>
        {patient && (
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Tirar paciente"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          aria-label="Escolher paciente"
          className="text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-border bg-popover p-2 shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150">
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar paciente..."
            className="h-9"
          />
          <ul className="mt-1 max-h-64 overflow-y-auto">
            <li>
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  onOpenChange(false);
                }}
                className="w-full rounded-lg px-2.5 py-2 text-left text-sm text-muted-foreground hover:bg-accent"
              >
                Cliente à vista (sem paciente)
              </button>
            </li>
            {list.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(p.id);
                    onOpenChange(false);
                    setQ("");
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-accent"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    {p.name.charAt(0).toUpperCase()}
                  </span>
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
          <Link
            to="/admin/pacientes"
            className="block border-t border-border px-2.5 pt-2 text-xs font-semibold text-primary"
          >
            + Cadastrar paciente
          </Link>
        </div>
      )}
    </div>
  );
}

function AdjustDialog({
  kind,
  subtotal,
  value,
  onClose,
  onApply,
}: {
  kind: "discount" | "surcharge" | null;
  subtotal: number;
  value: Adjust;
  onClose: () => void;
  onApply: (v: Adjust) => void;
}) {
  const [draft, setDraft] = useState<Adjust>(value);
  useEffect(() => {
    if (kind) setDraft(value.value ? value : { mode: "percent", value: "" });
  }, [kind, value]);
  const isDiscount = kind === "discount";
  const v = parseMoney(draft.value || "0");
  const amount = draft.mode === "percent" ? (subtotal * Math.min(v, 100)) / 100 : v;
  const quick = isDiscount ? ["5", "10", "15", "20"] : ["2", "5", "10"];
  return (
    <Dialog open={!!kind} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isDiscount ? (
              <Percent className="h-5 w-5 text-emerald-600" />
            ) : (
              <DollarSign className="h-5 w-5 text-amber-500" />
            )}
            {isDiscount ? "Desconto" : "Acréscimo"}
          </DialogTitle>
          <DialogDescription>Sobre o subtotal de {formatCurrency(subtotal)}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
            {(["percent", "valor"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setDraft({ ...draft, mode: m })}
                className={`rounded-lg py-2 text-sm font-bold ${draft.mode === m ? "bg-card shadow-sm" : "text-muted-foreground"}`}
              >
                {m === "percent" ? "Porcentagem (%)" : "Valor (R$)"}
              </button>
            ))}
          </div>
          <div className="relative">
            <Input
              autoFocus
              inputMode="decimal"
              value={draft.value}
              onChange={(e) =>
                setDraft({ ...draft, value: e.target.value.replace(/[^\d,.]/g, "") })
              }
              onKeyDown={(e) => e.key === "Enter" && onApply(draft)}
              placeholder={draft.mode === "percent" ? "0" : "0,00"}
              className="h-14 pr-12 text-2xl font-extrabold"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">
              {draft.mode === "percent" ? "%" : "R$"}
            </span>
          </div>
          {draft.mode === "percent" && (
            <div className="flex gap-2">
              {quick.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setDraft({ ...draft, value: q })}
                  className="flex-1 rounded-lg border border-border py-1.5 text-sm font-semibold hover:bg-accent"
                >
                  {q}%
                </button>
              ))}
            </div>
          )}
          <p className="rounded-xl bg-muted/70 p-3 text-sm">
            {isDiscount ? "Desconto" : "Acréscimo"}:{" "}
            <b>{formatCurrency(amount > 0 ? amount : 0)}</b> · Novo total:{" "}
            <b className="text-emerald-600">
              {formatCurrency(
                Math.max(0, subtotal + (isDiscount ? -Math.min(amount, subtotal) : amount)),
              )}
            </b>
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onApply(noAdjust)}>
            Remover
          </Button>
          <Button onClick={() => onApply(draft)}>
            <Check className="h-4 w-4" /> Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FinishDialog({
  open,
  onOpenChange,
  sale,
  cashSessionId,
  patientName,
  totals,
  onPrint,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  sale: Sale;
  cashSessionId: string;
  patientName: string | null;
  totals: ReturnType<typeof saleTotals>;
  onPrint: (r: Receipt) => void;
  onDone: () => void;
}) {
  const methods = useEnabledPaymentMethods();
  const [method, setMethod] = useState("");
  const [installments, setInstallments] = useState("1");
  const [received, setReceived] = useState("");
  const [later, setLater] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<Receipt | null>(null);
  const [doneChange, setDoneChange] = useState(0);
  const [printChoice, setPrintChoiceState] = useState<"imprimir" | "nao">(
    () => readPreference("pdvPrint") ?? "imprimir",
  );
  // A preferência pode chegar depois que a tela montou: sincroniza ao abrir.
  useEffect(() => {
    const sync = () => setPrintChoiceState(readPreference("pdvPrint") ?? "imprimir");
    sync();
    return subscribePreferences(sync);
  }, [open]);
  function setPrintChoice(v: "imprimir" | "nao") {
    setPrintChoiceState(v);
    void savePreference({ key: "pdvPrint", value: v });
  }

  useEffect(() => {
    if (!open) return;
    setMethod(methods[0]?.id ?? "");
    setInstallments("1");
    setReceived("");
    setLater(false);
    setDone(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const current = paymentMethod(method);
  const isCash = method === "dinheiro";
  const receivedValue = parseMoney(received || "0");
  const troco = isCash ? change(receivedValue, totals.total) : 0;
  const missing = isCash && received.trim() !== "" && receivedValue < totals.total;

  async function confirm() {
    if (saving || missing) return;
    setSaving(true);
    const { data: paid, error } = await db
      .from("payments")
      .insert({
        patient_id: sale.patientId,
        amount: totals.total,
        discount: totals.discount,
        surcharge: totals.surcharge,
        status: later ? "pendente" : "pago",
        paid_at: later ? null : new Date().toISOString(),
        payment_method: method || null,
        installments: parseInstallments(method, installments),
        description: saleDescription(sale.items),
        cash_session_id: cashSessionId,
      })
      .select("id")
      .single();
    if (error || !paid) {
      setSaving(false);
      return;
    }
    // Lançamentos "a receber" desses orçamentos foram pagos agora: saem da lista.
    for (const old of new Set(sale.items.map((i) => i.pendingPaymentId).filter(Boolean))) {
      await db
        .from("payments")
        .delete()
        .eq("id", old as string)
        .eq("status", "pendente");
    }
    // Orçamentos puxados para o caixa ficam aprovados e ligados a este pagamento.
    for (const budgetId of new Set(sale.items.map((i) => i.budgetId).filter(Boolean))) {
      await db
        .from("budgets")
        .update({ payment_id: paid.id, status: "aprovado" })
        .eq("id", budgetId as string);
    }
    setSaving(false);
    const receipt: Receipt = {
      kind: "venda",
      number: sale.number,
      patient: patientName ?? "Cliente à vista",
      items: sale.items,
      subtotal: totals.subtotal,
      discount: totals.discount,
      surcharge: totals.surcharge,
      total: totals.total,
      method: method
        ? paymentMethodLabel(method, parseInstallments(method, installments))
        : "Não informada",
      installments: parseInstallments(method, installments),
      cashReceived: isCash && !later && receivedValue > 0 ? receivedValue : undefined,
      change: troco || undefined,
      received: !later,
      date: new Date(),
    };
    if (printChoice === "imprimir") onPrint(receipt);
    setDoneChange(troco);
    setDone(receipt);
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-h-[92dvh] max-w-lg overflow-y-auto">
        {done ? (
          <div className="space-y-5 py-3 text-center animate-in zoom-in-95 duration-300">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950">
              <CheckCircle2 className="h-9 w-9" />
            </span>
            <div>
              <DialogTitle className="text-xl">Venda {pad(done.number)} concluída</DialogTitle>
              <DialogDescription className="mt-1">
                {formatCurrency(done.total)} · {done.method} ·{" "}
                {done.received ? "recebido" : "fica a receber"}
              </DialogDescription>
              {doneChange > 0 && (
                <p className="mt-3 rounded-xl bg-amber-100 py-2 text-lg font-extrabold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  Troco: {formatCurrency(doneChange)}
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {printChoice === "imprimir"
                ? "Cupom não fiscal enviado para a impressora."
                : "Cupom não impresso (opção Não imprimir)."}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="outline" onClick={() => onPrint(done)}>
                <Printer className="h-4 w-4" />{" "}
                {printChoice === "imprimir" ? "Imprimir de novo" : "Imprimir cupom"}
              </Button>
              <Button onClick={() => onOpenChange(false)} autoFocus>
                <Plus className="h-4 w-4" /> Próxima venda
              </Button>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Finalizar Venda {pad(sale.number)}</DialogTitle>
              <DialogDescription>
                {patientName ?? "Cliente à vista"} · {sale.items.length} item(ns)
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-2xl bg-emerald-50 p-4 text-center dark:bg-emerald-950/40">
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                Total a pagar
              </p>
              <p className="text-4xl font-extrabold text-emerald-600 tabular-nums">
                {formatCurrency(totals.total)}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Forma de pagamento</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {methods.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id)}
                    className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left text-sm font-semibold transition-all ${
                      method === m.id
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    <span className="text-lg">{m.emoji}</span>
                    <span className="leading-tight">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
            {current?.installments && (
              <div className="space-y-1.5 animate-in fade-in duration-200">
                <Label>Parcelas</Label>
                <div className="flex flex-wrap gap-1.5">
                  {["1", "2", "3", "4", "5", "6", "10", "12"].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setInstallments(n)}
                      className={`min-w-11 rounded-lg border px-2 py-1.5 text-sm font-bold ${installments === n ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950" : "border-border hover:bg-accent"}`}
                    >
                      {n}x
                    </button>
                  ))}
                </div>
                {Number(installments) > 1 && (
                  <p className="text-xs text-muted-foreground">
                    {installments}x de {formatCurrency(totals.total / Number(installments))}
                  </p>
                )}
              </div>
            )}
            {isCash && !later && (
              <div className="space-y-1.5 animate-in fade-in duration-200">
                <Label htmlFor="pdv-received">Valor recebido (para calcular o troco)</Label>
                <MoneyInput id="pdv-received" value={received} onChange={setReceived} />
                {missing ? (
                  <p className="text-xs font-semibold text-destructive">
                    O valor recebido é menor que o total.
                  </p>
                ) : troco > 0 ? (
                  <p className="text-sm font-extrabold text-amber-600">
                    Troco: {formatCurrency(troco)}
                  </p>
                ) : null}
              </div>
            )}
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3 text-sm">
              <input
                type="checkbox"
                checked={later}
                onChange={(e) => setLater(e.target.checked)}
                className="h-4 w-4 accent-amber-500"
              />
              <span>
                <b>Fica a receber</b>
                <span className="block text-xs text-muted-foreground">
                  O paciente vai pagar depois — entra em Lançamentos como “A receber”.
                </span>
              </span>
            </label>
            <div className="space-y-1.5">
              <Label>Cupom não fiscal</Label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["imprimir", "Imprimir cupom", Printer],
                    ["nao", "Não imprimir", PrinterX],
                  ] as const
                ).map(([id, label, Icon]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPrintChoice(id)}
                    aria-pressed={printChoice === id}
                    className={`flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition-all ${
                      printChoice === id
                        ? id === "imprimir"
                          ? "border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
                          : "border-slate-400 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        : "border-border text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    <Icon className="h-4 w-4" /> {label}
                  </button>
                ))}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Voltar
              </Button>
              <Button
                onClick={confirm}
                disabled={saving || missing}
                className="min-w-44 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <Check className="h-4 w-4" />
                {saving
                  ? "Registrando..."
                  : later
                    ? "Registrar a receber"
                    : `Receber ${formatCurrency(totals.total)}`}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
