import test from "node:test";
import assert from "node:assert/strict";
import { blanksToFields, fillTemplate, templateFields } from "../src/lib/document-templates";

const body =
  "Paciente: {{paciente_nome}}\n\n1. {{campo:Medicamento 1}}\n   {{campo:Como usar 1}}\n\n2. {{campo:Medicamento 2}}\n   {{campo:Como usar 2}}\n\nDas {{campo:Hora de início}} às {{campo:Hora de término}}.\nCID: {{campo:CID}}";

test("lê os campos do modelo com o tipo certo", () => {
  const f = templateFields(body);
  assert.deepEqual(
    f.map((x) => [x.key, x.type]),
    [
      ["medicamento_1", "texto"],
      ["como_usar_1", "longo"],
      ["medicamento_2", "texto"],
      ["como_usar_2", "longo"],
      ["hora_de_inicio", "hora"],
      ["hora_de_termino", "hora"],
      ["cid", "texto"],
    ],
  );
});

test("campos preenchidos entram no texto e itens vazios somem", () => {
  const out = fillTemplate(
    body,
    { paciente_nome: "Ana" },
    {
      medicamento_1: "Amoxicilina 500mg",
      como_usar_1: "1 cápsula de 8/8h",
      hora_de_inicio: "08:00",
      hora_de_termino: "10:30",
    },
  );
  assert.equal(
    out,
    "Paciente: Ana\n\n1. Amoxicilina 500mg\n   1 cápsula de 8/8h\n\nDas 08:00 às 10:30.",
  );
});

test("modelo antigo com linhas vira campos", () => {
  assert.equal(
    blanksToFields("das ____ às ____ horas"),
    "das {{campo:Campo 1}} às {{campo:Campo 2}} horas",
  );
});
