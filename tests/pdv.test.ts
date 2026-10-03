import test from "node:test";
import assert from "node:assert/strict";
import {
  CALC_START,
  calcPress,
  change,
  marginCalc,
  saleDescription,
  saleTotals,
  type CartItem,
} from "../src/lib/pdv";

const press = (keys: string[]) => keys.reduce(calcPress, CALC_START).display;

test("calculadora faz contas em sequência, decimais e porcentagem", () => {
  assert.equal(press(["1", "2", "+", "8", "="]), "20");
  assert.equal(press(["2", "+", "3", "×", "4", "="]), "20");
  assert.equal(press(["1", ",", "5", "×", "2", "5", "0", "="]), "375");
  assert.equal(press(["1", "0", "0", "+", "1", "0", "%", "="]), "110");
  assert.equal(press(["9", "÷", "0", "="]), "Erro");
  assert.equal(press(["1", "2", "3", "⌫"]), "12");
  assert.equal(press(["5", "00"]), "500");
});

test("margem de lucro sobre o preço de venda", () => {
  assert.equal(marginCalc("preco", { cost: 60, margin: 40, price: null }), 100);
  assert.equal(marginCalc("margem", { cost: 60, margin: null, price: 100 }), 40);
  assert.equal(marginCalc("custo", { cost: null, margin: 40, price: 100 }), 60);
  assert.equal(marginCalc("preco", { cost: 60, margin: null, price: null }), null);
});

test("totais da venda com desconto, acréscimo e troco", () => {
  const items: CartItem[] = [
    { key: "a", name: "Restauração", price: 120, qty: 2, note: "" },
    { key: "b", name: "Limpeza", price: 80, qty: 1, note: "retorno" },
  ];
  const t = saleTotals(items, { mode: "percent", value: "10" }, { mode: "valor", value: "" });
  assert.deepEqual([t.subtotal, t.discount, t.total, t.count], [320, 32, 288, 3]);
  assert.equal(saleDescription(items), "2x Restauração; Limpeza (retorno)");
  assert.equal(change(300, 288), 12);
  assert.equal(change(100, 288), 0);
});
