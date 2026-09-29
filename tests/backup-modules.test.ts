import test from "node:test";
import assert from "node:assert/strict";
import { deletePlan, withRequired } from "../src/lib/backup-modules";

test("apagar pacientes leva junto o que depende deles", () => {
  const ids = withRequired(["pacientes"]);
  for (const id of ["agenda", "orcamentos", "receitas", "odontograma", "prontuario"])
    assert.ok(ids.includes(id as never), id);
  assert.ok(!ids.includes("financeiro"));
});

test("ordem apaga filhos antes dos pais e mantém pagamentos avulsos", () => {
  const plan = deletePlan(["pacientes"]);
  const order = plan.map((s) => s.table);
  assert.ok(order.indexOf("tooth_procedures") < order.indexOf("patients"));
  assert.ok(order.indexOf("appointments") < order.indexOf("patients"));
  assert.deepEqual(
    plan.find((s) => s.table === "payments"),
    { table: "payments", where: "patient_id IS NOT NULL" },
  );
});

test("módulo sozinho apaga só a tabela dele", () => {
  assert.deepEqual(deletePlan(["blog"]), [{ table: "blog_posts" }]);
  assert.deepEqual(
    deletePlan(["suporte"]).map((s) => s.table),
    ["messages", "conversations"],
  );
});
