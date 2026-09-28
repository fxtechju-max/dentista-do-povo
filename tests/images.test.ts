import test from "node:test";
import assert from "node:assert/strict";
import { imageUrlForWidth } from "../src/lib/images";

test("imagens do Pexels são pedidas na largura certa; outras URLs não mudam", () => {
  const pexels =
    "https://images.pexels.com/photos/1/pexels-photo-1.jpeg?auto=compress&cs=tinysrgb&w=1200";
  assert.equal(new URL(imageUrlForWidth(pexels, 640)).searchParams.get("w"), "640");
  assert.equal(imageUrlForWidth("/api/site-images/abc", 640), "/api/site-images/abc");
  assert.equal(imageUrlForWidth("não é url", 640), "não é url");
});
