import test from "node:test";
import assert from "node:assert/strict";
import { adsenseFromRow, buildAdsTxt, normalizeClientId } from "../src/lib/adsense-core";

test("AdSense: ID de editor aceita os formatos comuns", () => {
  assert.equal(normalizeClientId("ca-pub-1234567890123456"), "ca-pub-1234567890123456");
  assert.equal(normalizeClientId(" pub-1234567890123456 "), "ca-pub-1234567890123456");
  assert.equal(normalizeClientId("1234567890123456"), "ca-pub-1234567890123456");
  assert.equal(normalizeClientId("abc"), null);
});

test("AdSense: ads.txt usa a linha oficial do Google", () => {
  assert.equal(
    buildAdsTxt("ca-pub-1234567890123456", "outra.com, 9, DIRECT"),
    "google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\noutra.com, 9, DIRECT\n",
  );
  assert.match(buildAdsTxt(null), /^# Configure/);
});

test("AdSense: desligado ou sem ID não carrega anúncios", () => {
  assert.equal(
    adsenseFromRow({ adsense_enabled: false, adsense_client_id: "pub-1234567890123456" }).enabled,
    false,
  );
  assert.equal(adsenseFromRow({ adsense_enabled: true, adsense_client_id: "" }).enabled, false);
  const on = adsenseFromRow({
    adsense_enabled: true,
    adsense_client_id: "pub-1234567890123456",
    adsense_slot_blog_post: "1234567890",
    adsense_slot_home: "x1",
  });
  assert.equal(on.clientId, "ca-pub-1234567890123456");
  assert.equal(on.slots.blog_post, "1234567890");
  assert.equal(on.slots.home, null);
});

test("AdSense: funções usadas pelo servidor (/ads.txt) não importam nada", async () => {
  // Importar código de tela no servidor quebrou o /ads.txt no pacote da Vercel.
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../src/lib/adsense-core.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /^\s*import\s/m);
});
