// Resumo do caixa do dia: vendas por forma de pagamento e o dinheiro que deve
// estar na gaveta (fundo + vendas em dinheiro + suprimentos − sangrias).

export type CashPayment = {
  amount: number | string;
  status: string;
  payment_method: string | null;
};
export type CashMovement = { type: "sangria" | "suprimento" | string; amount: number | string };

const round = (n: number) => Math.round(n * 100) / 100;

export function cashSummary(
  opening: number | string,
  payments: CashPayment[],
  movements: CashMovement[],
) {
  const byMethod = new Map<string, { total: number; count: number }>();
  let received = 0;
  let receivedCount = 0;
  let pending = 0;
  let pendingCount = 0;
  for (const p of payments) {
    const v = Number(p.amount) || 0;
    if (p.status === "pago") {
      received += v;
      receivedCount++;
      const k = p.payment_method || "nao_informada";
      const cur = byMethod.get(k) ?? { total: 0, count: 0 };
      byMethod.set(k, { total: cur.total + v, count: cur.count + 1 });
    } else if (p.status === "pendente") {
      pending += v;
      pendingCount++;
    }
  }
  const sum = (t: string) =>
    movements.filter((m) => m.type === t).reduce((s, m) => s + (Number(m.amount) || 0), 0);
  const suprimentos = round(sum("suprimento"));
  const sangrias = round(sum("sangria"));
  const cashSales = round(byMethod.get("dinheiro")?.total ?? 0);
  return {
    opening: round(Number(opening) || 0),
    received: round(received),
    receivedCount,
    pending: round(pending),
    pendingCount,
    byMethod: [...byMethod.entries()]
      .map(([method, v]) => ({ method, total: round(v.total), count: v.count }))
      .sort((a, b) => b.total - a.total),
    cashSales,
    suprimentos,
    sangrias,
    expectedCash: round((Number(opening) || 0) + cashSales + suprimentos - sangrias),
  };
}

export type CashSummary = ReturnType<typeof cashSummary>;

/** Diferença entre o contado e o esperado: positivo = sobra, negativo = falta. */
export function cashDifference(counted: number, expected: number) {
  return round(counted - expected);
}
