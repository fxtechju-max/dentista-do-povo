import test from "node:test";
import assert from "node:assert/strict";
import { whatsappLink } from "../src/lib/whatsapp-link";

test("número com DDD ganha o 55 e a mensagem vai codificada", () => {
  assert.equal(whatsappLink("(69) 98492-0788", "Oi"), "https://wa.me/5569984920788?text=Oi");
  assert.equal(whatsappLink("+55 69 98492-0788", "Oi"), "https://wa.me/5569984920788?text=Oi");
  assert.equal(whatsappLink("", "Oi"), null);
});
