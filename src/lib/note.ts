// Nota grande (A4) de orçamento ou recibo: dados, número e valor por extenso.
import type { CartItem } from "./pdv";

export type NoteKind = "orcamento" | "recibo";

export type NotePatient = {
  name: string;
  cpf?: string | null;
  phone?: string | null;
  address?: string | null;
};

export type NoteData = {
  kind: NoteKind;
  number: string;
  date: Date;
  patient: NotePatient;
  items: CartItem[];
  subtotal: number;
  discount: number;
  surcharge: number;
  total: number;
  /** Recibo: forma de pagamento, parcelas e se já foi recebido. */
  method?: string | null | undefined;
  installments?: number | null | undefined;
  received?: boolean | undefined;
  /** Orçamento: validade em dias. */
  validityDays?: number | undefined;
  notes?: string | undefined;
};

const pad = (n: number) => String(n).padStart(2, "0");

/** Número do documento: ORC-261003-AB12 / REC-261003-AB12. */
export function noteNumber(kind: NoteKind, date: Date, id: string) {
  const d = `${String(date.getFullYear()).slice(2)}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
  const tail =
    id
      .replace(/[^a-z0-9]/gi, "")
      .slice(0, 4)
      .toUpperCase() || "0000";
  return `${kind === "orcamento" ? "ORC" : "REC"}-${d}-${tail}`;
}

const UNITS = [
  "zero",
  "um",
  "dois",
  "três",
  "quatro",
  "cinco",
  "seis",
  "sete",
  "oito",
  "nove",
  "dez",
  "onze",
  "doze",
  "treze",
  "quatorze",
  "quinze",
  "dezesseis",
  "dezessete",
  "dezoito",
  "dezenove",
];
const TENS = [
  "",
  "",
  "vinte",
  "trinta",
  "quarenta",
  "cinquenta",
  "sessenta",
  "setenta",
  "oitenta",
  "noventa",
];
const HUNDREDS = [
  "",
  "cento",
  "duzentos",
  "trezentos",
  "quatrocentos",
  "quinhentos",
  "seiscentos",
  "setecentos",
  "oitocentos",
  "novecentos",
];

function below1000(n: number): string {
  if (n === 100) return "cem";
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h) parts.push(HUNDREDS[h]!);
  if (rest) {
    if (rest < 20) parts.push(UNITS[rest]!);
    else {
      const t = Math.floor(rest / 10);
      const u = rest % 10;
      parts.push(u ? `${TENS[t]} e ${UNITS[u]}` : TENS[t]!);
    }
  }
  return parts.join(" e ");
}

function integerWords(n: number): string {
  if (n === 0) return "zero";
  const groups: { value: number; one: string; many: string }[] = [
    { value: Math.floor(n / 1_000_000) % 1000, one: "milhão", many: "milhões" },
    { value: Math.floor(n / 1000) % 1000, one: "mil", many: "mil" },
    { value: n % 1000, one: "", many: "" },
  ];
  const parts: string[] = [];
  for (const g of groups) {
    if (!g.value) continue;
    if (g.one === "mil") parts.push(g.value === 1 ? "mil" : `${below1000(g.value)} mil`);
    else if (g.one) parts.push(`${below1000(g.value)} ${g.value === 1 ? g.one : g.many}`);
    else parts.push(below1000(g.value));
  }
  // "mil e duzentos", "dois mil e cinquenta"; mas "mil trezentos e dez".
  const last = groups[2]!.value;
  if (parts.length > 1 && last && (last < 100 || last % 100 === 0))
    return `${parts.slice(0, -1).join(" ")} e ${parts.at(-1)}`;
  return parts.join(" ");
}

/** Valor em reais por extenso: 234.5 → "duzentos e trinta e quatro reais e cinquenta centavos". */
export function moneyInWords(value: number): string {
  const cents = Math.round(Math.abs(value) * 100);
  const reais = Math.floor(cents / 100);
  const c = cents % 100;
  const parts: string[] = [];
  if (reais) {
    const millions = reais % 1_000_000 === 0 && reais >= 1_000_000;
    parts.push(`${integerWords(reais)}${millions ? " de" : ""} ${reais === 1 ? "real" : "reais"}`);
  }
  if (c) parts.push(`${integerWords(c)} ${c === 1 ? "centavo" : "centavos"}`);
  return parts.length ? parts.join(" e ") : "zero real";
}
