import test from "node:test";
import assert from "node:assert/strict";
import { loginKind, normalizeUsername, usernameError } from "../src/lib/username";

test("nome de usuário é normalizado e validado", () => {
  assert.equal(normalizeUsername("  Dr. Álvaro "), "dr.alvaro");
  assert.equal(normalizeUsername("Tito Xavier"), "tito.xavier");
  assert.equal(usernameError("titoxavier32"), null);
  assert.equal(
    usernameError("ab"),
    "Use de 3 a 30 caracteres: letras, números, ponto, hífen ou sublinhado.",
  );
  assert.equal(usernameError("a@b"), "O nome de usuário não pode ter @.");
  assert.equal(usernameError(""), "Informe o nome de usuário.");
});

test("login reconhece e-mail ou usuário", () => {
  assert.equal(loginKind("admin@clinica.com"), "email");
  assert.equal(loginKind("titoxavier32"), "username");
});
