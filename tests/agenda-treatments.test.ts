import test from "node:test";
import assert from "node:assert/strict";
import { mergeAgendaTreatments } from "../src/lib/agenda-treatments";

test("agenda traz tratamentos ativos, inativos e serviços do site", () => {
  const list = mergeAgendaTreatments(
    [
      { id: "1", name: "Restauração", price: 150, description: null, active: true },
      { id: "2", name: "Clareamento antigo", price: 300, description: null, active: false },
      { id: "3", name: "Avaliação", price: 0, description: null, active: true },
    ],
    [
      { id: "a", name: "avaliacao", price: 0, description: null, active: true },
      { id: "b", name: "Implantes", price: 2000, description: null, active: true },
    ],
  );
  assert.deepEqual(
    list.map((t) => t.name),
    ["Avaliação", "Restauração", "Implantes", "Clareamento antigo"],
  );
  assert.equal(list.find((t) => t.name === "Implantes")?.source, "servico");
  assert.equal(list.find((t) => t.name === "Implantes")?.id, "servico-b");
  assert.equal(list.filter((t) => /avalia/i.test(t.name)).length, 1);
});
