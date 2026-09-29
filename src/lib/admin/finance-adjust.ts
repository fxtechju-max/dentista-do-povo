// Desconto e acréscimo de um lançamento do Financeiro. O banco guarda o valor
// final (amount) e os ajustes em reais; na tela dá para digitar em R$ ou %.
import { parseMoney } from "./finance-period";

export type AdjustMode = "valor" | "percent";
export type Adjust = { mode: AdjustMode; value: string };

export const noAdjust: Adjust = { mode: "valor", value: "" };

const round = (n: number) => Math.round(n * 100) / 100;

/** Valor em reais de um ajuste sobre a base (vazio/ inválido = 0). */
export function adjustAmount(base: number, adjust: Adjust): number {
  const v = parseMoney(adjust.value);
  if (!(v > 0) || !(base >= 0)) return 0;
  return round(adjust.mode === "percent" ? (base * Math.min(v, 100)) / 100 : v);
}

export function computeTotal(base: number, discount: Adjust, surcharge: Adjust) {
  const d = Math.min(adjustAmount(base, discount), Math.max(base, 0));
  const s = adjustAmount(base, surcharge);
  return { discount: d, surcharge: s, total: round(Math.max(base, 0) - d + s) };
}

/** Valor original (antes dos ajustes) de um lançamento salvo. */
export function baseOf(p: {
  amount: number | string;
  discount?: number | string | null;
  surcharge?: number | string | null;
}) {
  return round(Number(p.amount) + Number(p.discount ?? 0) - Number(p.surcharge ?? 0));
}

export const moneyText = (n: number) => (n ? n.toFixed(2).replace(".", ",") : "");
