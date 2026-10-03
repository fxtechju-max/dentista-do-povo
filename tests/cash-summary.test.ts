import test from "node:test";
import assert from "node:assert/strict";
import { cashDifference, cashSummary } from "../src/lib/cash-summary";

test("caixa do dia: vendas por forma e dinheiro esperado na gaveta", () => {
  const s = cashSummary(
    "100.00",
    [
      { amount: "234.00", status: "pago", payment_method: "dinheiro" },
      { amount: 150, status: "pago", payment_method: "pix" },
      { amount: 66, status: "pago", payment_method: "dinheiro" },
      { amount: 450, status: "pendente", payment_method: null },
      { amount: 999, status: "cancelado", payment_method: "dinheiro" },
    ],
    [
      { type: "suprimento", amount: "50" },
      { type: "sangria", amount: 200 },
    ],
  );
  assert.equal(s.received, 450);
  assert.equal(s.receivedCount, 3);
  assert.equal(s.pending, 450);
  assert.equal(s.cashSales, 300);
  assert.deepEqual(s.byMethod[0], { method: "dinheiro", total: 300, count: 2 });
  // 100 fundo + 300 dinheiro + 50 suprimento − 200 sangria
  assert.equal(s.expectedCash, 250);
  assert.equal(cashDifference(245, s.expectedCash), -5);
  assert.equal(cashDifference(250, s.expectedCash), 0);
});
