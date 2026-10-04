// Nome de usuário do administrador (login com e-mail ou usuário).

/** 3 a 30 caracteres: letras minúsculas, números, ponto, hífen e sublinhado. */
export const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,29}$/;

export function normalizeUsername(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ".")
    .replace(/\.{2,}/g, ".");
}

export function usernameError(value: string): string | null {
  const v = normalizeUsername(value);
  if (!v) return "Informe o nome de usuário.";
  if (v.includes("@")) return "O nome de usuário não pode ter @.";
  if (!USERNAME_RE.test(v))
    return "Use de 3 a 30 caracteres: letras, números, ponto, hífen ou sublinhado.";
  return null;
}

/** O que foi digitado no login é e-mail (tem @) ou nome de usuário. */
export function loginKind(login: string): "email" | "username" {
  return login.includes("@") ? "email" : "username";
}
