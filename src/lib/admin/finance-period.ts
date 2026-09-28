// Períodos prontos dos filtros de Orçamentos, Financeiro e Contas.

export type PeriodId =
  | "todos"
  | "este_mes"
  | "mes_passado"
  | "ultimos_30"
  | "proximos_30"
  | "este_ano"
  | "personalizado";

export const PERIODS: { id: PeriodId; label: string }[] = [
  { id: "todos", label: "Todo o período" },
  { id: "este_mes", label: "Este mês" },
  { id: "mes_passado", label: "Mês passado" },
  { id: "ultimos_30", label: "Últimos 30 dias" },
  { id: "proximos_30", label: "Próximos 30 dias" },
  { id: "este_ano", label: "Este ano" },
  { id: "personalizado", label: "Personalizado…" },
];

/** Intervalo [início, fim] em milissegundos (null = sem limite). */
export function periodRange(
  period: PeriodId,
  from: string,
  to: string,
  now = new Date(),
): [number | null, number | null] {
  const y = now.getFullYear();
  const m = now.getMonth();
  const day = 24 * 60 * 60 * 1000;
  switch (period) {
    case "este_mes":
      return [new Date(y, m, 1).getTime(), new Date(y, m + 1, 1).getTime() - 1];
    case "mes_passado":
      return [new Date(y, m - 1, 1).getTime(), new Date(y, m, 1).getTime() - 1];
    case "ultimos_30":
      return [now.getTime() - 30 * day, now.getTime()];
    case "proximos_30":
      return [new Date(y, m, now.getDate()).getTime(), now.getTime() + 30 * day];
    case "este_ano":
      return [new Date(y, 0, 1).getTime(), new Date(y + 1, 0, 1).getTime() - 1];
    case "personalizado":
      return [
        from ? new Date(`${from}T00:00:00`).getTime() : null,
        to ? new Date(`${to}T23:59:59.999`).getTime() : null,
      ];
    default:
      return [null, null];
  }
}

export function inRange(dateIso: string | null | undefined, range: [number | null, number | null]) {
  const [start, end] = range;
  if (start == null && end == null) return true;
  if (!dateIso) return false;
  const t = new Date(dateIso.length === 10 ? `${dateIso}T12:00:00` : dateIso).getTime();
  return (start == null || t >= start) && (end == null || t <= end);
}

/** "12,5" / "1.234,56" / "1234.56" → número. */
export function parseMoney(value: string): number {
  const v = value.trim();
  if (!v) return NaN;
  const normalized = v.includes(",") ? v.replace(/\./g, "").replace(",", ".") : v;
  return Number(normalized);
}

/** Dias até a data (negativo = atrasado). */
export function daysUntil(dateIso: string, now = new Date()) {
  const due = new Date(`${dateIso.slice(0, 10)}T00:00:00`).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((due - today) / (24 * 60 * 60 * 1000));
}
