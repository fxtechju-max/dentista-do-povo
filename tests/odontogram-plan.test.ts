import test from "node:test";
import assert from "node:assert/strict";
import { budgetItemTitle, findTreatment, normalizeName } from "../src/lib/odontogram-plan";

const catalog = [
  { id: "1", name: "Restauração (Obturação)", price: "120.00", active: true },
  { id: "2", name: "Extração Simples", price: 100, active: true },
  { id: "3", name: "Extração de Siso", price: 280, active: true },
  { id: "4", name: "Faceta em resina", price: null, active: false },
];

test("nomes são comparados sem acento nem pontuação", () => {
  assert.equal(normalizeName("  Restauração (Obturação) "), "restauracao obturacao");
});

test("procedimento planejado encontra o tratamento do catálogo", () => {
  assert.equal(findTreatment("restauracao", catalog)?.id, "1");
  assert.equal(findTreatment("extracao", catalog)?.id, "2");
  assert.equal(findTreatment("faceta", catalog)?.id, "4");
  assert.equal(findTreatment("selante", catalog), undefined);
});

test("item do orçamento traz procedimento, dente e faces", () => {
  assert.equal(
    budgetItemTitle({
      planned_procedure: "restauracao",
      tooth_number: 36,
      surfaces: ["oclusal", "palatina"],
      notes: null,
    }),
    "Restauração — Dente 36 (Oclusal, Lingual)",
  );
});
