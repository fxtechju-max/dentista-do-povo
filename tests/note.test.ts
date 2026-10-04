import test from "node:test";
import assert from "node:assert/strict";
import { moneyInWords, noteNumber } from "../src/lib/note";

test("valor por extenso em reais", () => {
  assert.equal(moneyInWords(234), "duzentos e trinta e quatro reais");
  assert.equal(moneyInWords(234.5), "duzentos e trinta e quatro reais e cinquenta centavos");
  assert.equal(moneyInWords(1), "um real");
  assert.equal(moneyInWords(100), "cem reais");
  assert.equal(moneyInWords(0.99), "noventa e nove centavos");
  assert.equal(moneyInWords(1200), "mil e duzentos reais");
  assert.equal(moneyInWords(1310), "mil trezentos e dez reais");
  assert.equal(moneyInWords(2050), "dois mil e cinquenta reais");
  assert.equal(moneyInWords(1800), "mil e oitocentos reais");
  assert.equal(moneyInWords(15420.1), "quinze mil quatrocentos e vinte reais e dez centavos");
  assert.equal(moneyInWords(1_000_000), "um milhão de reais");
});

test("número do documento", () => {
  assert.equal(noteNumber("orcamento", new Date(2026, 9, 3), "ab12-cd"), "ORC-261003-AB12");
  assert.equal(noteNumber("recibo", new Date(2026, 0, 9), "x"), "REC-260109-X");
});
