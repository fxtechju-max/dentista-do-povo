import test from "node:test";
import assert from "node:assert/strict";
import { baseOf, computeTotal } from "../src/lib/admin/finance-adjust";

test("desconto em reais e acréscimo em porcentagem", () => {
  const r = computeTotal(200, { mode: "valor", value: "20,00" }, { mode: "percent", value: "5" });
  assert.deepEqual(r, { discount: 20, surcharge: 10, total: 190 });
});

test("desconto nunca passa do valor e vazio vale zero", () => {
  assert.equal(
    computeTotal(50, { mode: "valor", value: "80" }, { mode: "valor", value: "" }).total,
    0,
  );
  assert.equal(
    computeTotal(50, { mode: "percent", value: "10" }, { mode: "valor", value: "x" }).total,
    45,
  );
});

test("valor original é recuperado do lançamento salvo", () => {
  assert.equal(baseOf({ amount: "190.00", discount: "20.00", surcharge: "10.00" }), 200);
});
