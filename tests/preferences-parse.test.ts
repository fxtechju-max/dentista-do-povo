import test from "node:test";
import assert from "node:assert/strict";
import { parsePreferenceRow } from "../src/lib/preferences.functions";

test("preferências de texto simples e JSON antigo são lidas", () => {
  assert.deepEqual(parsePreferenceRow("pdvPrint", "nao"), [{ key: "pdvPrint", value: "nao" }]);
  assert.deepEqual(parsePreferenceRow("pdvLayout", "compacto"), [
    { key: "pdvLayout", value: "compacto" },
  ]);
  assert.deepEqual(parsePreferenceRow("adminZoom", 110), [{ key: "adminZoom", value: 110 }]);
  assert.deepEqual(parsePreferenceRow("theme", '{"mode":"dark","color":"blue"}'), [
    { key: "theme", value: { mode: "dark", color: "blue" } },
  ]);
  assert.deepEqual(parsePreferenceRow("pdvPrint", "talvez"), []);
});
