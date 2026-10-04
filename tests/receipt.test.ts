import test from "node:test";
import assert from "node:assert/strict";
import { receiptCode, receiptHtml } from "../src/lib/receipt";

const base = {
  number: 3,
  patient: "Ana <Souza>",
  items: [
    { key: "a", name: "Restauração", price: 120, qty: 1.5, note: "dente 36" },
    { key: "b", name: "Limpeza", price: 80, qty: 1, note: "" },
  ],
  subtotal: 260,
  discount: 26,
  surcharge: 0,
  total: 234,
  date: new Date(2026, 9, 3, 14, 5),
};

test("cupom não fiscal de venda: 80 mm, itens, totais, troco", () => {
  const html = receiptHtml(
    {
      ...base,
      kind: "venda",
      method: "💵 Dinheiro",
      cashReceived: 300,
      change: 66,
      received: true,
    },
    { name: "Dentista do Povo", phone: "(69) 98492-0788" },
  );
  assert.match(html, /CUPOM NÃO FISCAL/);
  assert.match(html, /NÃO É DOCUMENTO FISCAL/);
  assert.match(html, /size: 80mm/);
  assert.match(html, /1,5 x R\$ 120,00/);
  assert.match(html, /R\$ 180,00/);
  assert.match(html, /Troco/);
  assert.doesNotMatch(html, /💵/);
  assert.match(html, /Ana &lt;Souza&gt;/);
  assert.doesNotMatch(html, /VALOR A RECEBER/);
});

test("conferência e venda a receber trazem os avisos", () => {
  assert.match(
    receiptHtml({ ...base, kind: "conferencia", received: false }, { name: "X" }),
    /NÃO VALE COMO COMPROVANTE/,
  );
  assert.match(
    receiptHtml({ ...base, kind: "venda", method: "PIX", received: false }, { name: "X" }),
    /VALOR A RECEBER/,
  );
  assert.equal(receiptCode(base.date, 3), "261003-1405-03");
});
