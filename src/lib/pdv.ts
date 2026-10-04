// Caixa (PDV) do Financeiro: contas da venda, calculadora e margem de lucro.
import { computeTotal, type Adjust } from "./admin/finance-adjust";

export type CartItem = {
  key: string;
  name: string;
  /** Preço unitário em reais. */
  price: number;
  qty: number;
  note: string;
  /** Item puxado de um orçamento (fica ligado ao pagamento ao finalizar). */
  budgetId?: string;
  /** Lançamento "a receber" do orçamento, substituído ao finalizar no caixa. */
  pendingPaymentId?: string;
};

const round = (n: number) => Math.round(n * 100) / 100;

export const itemTotal = (i: CartItem) => round(i.price * i.qty);

export function saleTotals(items: CartItem[], discount: Adjust, surcharge: Adjust) {
  const subtotal = round(items.reduce((s, i) => s + itemTotal(i), 0));
  const t = computeTotal(subtotal, discount, surcharge);
  return { subtotal, ...t, count: items.reduce((s, i) => s + i.qty, 0) };
}

/** Texto curto da venda para o lançamento: "2x Restauração; Limpeza". */
export function saleDescription(items: CartItem[]) {
  return items
    .map(
      (i) =>
        `${i.qty !== 1 ? `${String(i.qty).replace(".", ",")}x ` : ""}${i.name}${i.note ? ` (${i.note})` : ""}`,
    )
    .join("; ")
    .slice(0, 1000);
}

/** Troco para pagamento em dinheiro (nunca negativo). */
export function change(received: number, total: number) {
  return received > total ? round(received - total) : 0;
}

// ── Calculadora ──────────────────────────────────────────────────────────
export type CalcOp = "+" | "-" | "×" | "÷";
export type CalcState = {
  display: string;
  stored: number | null;
  op: CalcOp | null;
  /** Próximo dígito começa um número novo. */
  fresh: boolean;
};

export const CALC_START: CalcState = { display: "0", stored: null, op: null, fresh: true };

const num = (s: string) => Number(s.replace(",", "."));
export function formatCalc(n: number) {
  if (!Number.isFinite(n)) return "Erro";
  const r = Math.round(n * 1e10) / 1e10;
  return String(r).replace(".", ",");
}

function apply(a: number, b: number, op: CalcOp) {
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "×":
      return a * b;
    case "÷":
      return b === 0 ? NaN : a / b;
  }
}

export function calcPress(s: CalcState, key: string): CalcState {
  if (s.display === "Erro" && key !== "C") s = CALC_START;
  if (/^\d$/.test(key) || key === "00") {
    if (s.fresh) return { ...s, display: key === "00" ? "0" : key, fresh: false };
    if (s.display.replace(/[-,]/g, "").length >= 15) return s;
    const next = s.display === "0" ? (key === "00" ? "0" : key) : s.display + key;
    return { ...s, display: next };
  }
  if (key === ",") {
    if (s.fresh) return { ...s, display: "0,", fresh: false };
    return s.display.includes(",") ? s : { ...s, display: s.display + "," };
  }
  if (key === "C") return CALC_START;
  if (key === "⌫") {
    if (s.fresh) return s;
    const d = s.display.length > 1 ? s.display.slice(0, -1) : "0";
    return { ...s, display: d === "-" ? "0" : d };
  }
  if (key === "%") {
    const v = num(s.display);
    // Com + ou −, vira porcentagem do número anterior (100 + 10% = 110).
    const pct = s.stored != null && (s.op === "+" || s.op === "-") ? (s.stored * v) / 100 : v / 100;
    return { ...s, display: formatCalc(pct), fresh: true };
  }
  if (key === "+" || key === "-" || key === "×" || key === "÷") {
    const v = num(s.display);
    if (s.stored != null && s.op && !s.fresh) {
      const r = apply(s.stored, v, s.op);
      return { display: formatCalc(r), stored: r, op: key, fresh: true };
    }
    return { ...s, stored: s.stored != null && s.fresh ? s.stored : v, op: key, fresh: true };
  }
  if (key === "=") {
    if (s.stored == null || !s.op) return { ...s, fresh: true };
    const r = apply(s.stored, num(s.display), s.op);
    return { display: formatCalc(r), stored: null, op: null, fresh: true };
  }
  return s;
}

// ── Margem de lucro (sobre o preço de venda) ─────────────────────────────
export type MarginTarget = "preco" | "margem" | "custo";

export function marginCalc(
  target: MarginTarget,
  v: { cost: number | null; margin: number | null; price: number | null },
): number | null {
  const ok = (n: number | null): n is number => n != null && Number.isFinite(n);
  if (target === "preco" && ok(v.cost) && ok(v.margin) && v.margin < 100)
    return round(v.cost / (1 - v.margin / 100));
  if (target === "margem" && ok(v.cost) && ok(v.price) && v.price > 0)
    return round(((v.price - v.cost) / v.price) * 100);
  if (target === "custo" && ok(v.price) && ok(v.margin))
    return round(v.price * (1 - v.margin / 100));
  return null;
}
