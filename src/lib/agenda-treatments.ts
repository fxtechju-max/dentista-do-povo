import { normalizeName } from "./odontogram-plan";

export type AgendaTreatment = {
  id: string;
  name: string;
  price: number | string | null;
  duration_minutes?: number | null;
  description: string | null;
  active?: boolean | null;
  /** "servico" = vem dos Serviços do site (não está em Tratamentos). */
  source?: "tratamento" | "servico";
};

/**
 * Junta tudo o que está cadastrado: tratamentos (ativos primeiro, depois os
 * inativos) e os serviços do site que ainda não existem em Tratamentos.
 */
export function mergeAgendaTreatments(
  treatments: AgendaTreatment[],
  services: AgendaTreatment[],
): AgendaTreatment[] {
  const key = (n: string) => normalizeName(n);
  const names = new Set(treatments.map((t) => key(t.name)));
  const extra = services
    .filter((s) => s.name?.trim() && !names.has(key(s.name)))
    .map((s) => ({ ...s, id: `servico-${s.id}`, source: "servico" as const }));
  const all = [...treatments.map((t) => ({ ...t, source: "tratamento" as const })), ...extra];
  const rank = (t: AgendaTreatment) => (t.active === false ? 2 : t.source === "servico" ? 1 : 0);
  return all.sort(
    (a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }),
  );
}
