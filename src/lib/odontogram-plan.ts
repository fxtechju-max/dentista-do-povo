// Plano de tratamento do odontograma: liga cada procedimento planejado ao
// catálogo de Tratamentos (valor sugerido) e monta os itens do orçamento.
import { procedureLabel, surfaceLabel, type Surface } from "./odontogram-pro";

export type CatalogTreatment = {
  id: string;
  name: string;
  price: number | string | null;
  active: boolean;
};

/** Nomes do catálogo inicial que correspondem a cada procedimento. */
const CATALOG_ALIASES: Record<string, string[]> = {
  avaliacao: ["Avaliação Odontológica"],
  restauracao: ["Restauração (Obturação)"],
  tratamento_canal: ["Tratamento de Canal"],
  coroa: ["Coroa Dentária"],
  implante: ["Implante Dentário"],
  extracao: ["Extração Simples"],
  profilaxia: ["Limpeza e Profilaxia", "Profilaxia", "Limpeza"],
  clareamento: ["Clareamento Dental"],
  protese: ["Prótese Dentária"],
  ortodontia: ["Aparelho Ortodôntico (Instalação)"],
};

export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Nome usado ao cadastrar o procedimento em Tratamentos. */
export function catalogName(procedureId: string): string {
  return procedureLabel(procedureId).replace(/\s*\/\s*/g, " / ");
}

/** "Outro" não vira tratamento no catálogo: cada caso é diferente. */
export function canCreateInCatalog(procedureId: string): boolean {
  return procedureId !== "outro";
}

/** Tratamento do catálogo que corresponde ao procedimento, se houver. */
export function findTreatment<T extends CatalogTreatment>(
  procedureId: string,
  catalog: T[],
): T | undefined {
  const names = [...(CATALOG_ALIASES[procedureId] ?? []), procedureLabel(procedureId)].map(
    normalizeName,
  );
  const byName = (list: T[]) => {
    for (const name of names) {
      const hit = list.find((t) => normalizeName(t.name) === name);
      if (hit) return hit;
    }
    // "Restauração" também encontra "Restauração em resina", etc.
    const first = normalizeName(procedureLabel(procedureId)).split(" ")[0];
    return first && first.length >= 4
      ? list.find((t) => normalizeName(t.name).split(" ")[0] === first)
      : undefined;
  };
  // Ativos primeiro; um inativo com o mesmo nome evita cadastro duplicado.
  return byName(catalog.filter((t) => t.active)) ?? byName(catalog);
}

export function toNumber(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Texto do item no orçamento: "Restauração — Dente 16 (Oclusal, Mesial)". */
export function budgetItemTitle(p: {
  planned_procedure: string | null;
  tooth_number: number;
  surfaces: Surface[];
  notes: string | null;
}): string {
  const id = p.planned_procedure ?? "outro";
  const name =
    id === "outro" && p.notes?.trim()
      ? p.notes.trim().split("\n")[0]!.slice(0, 60)
      : procedureLabel(id);
  const faces = p.surfaces.map((s) => surfaceLabel(s, p.tooth_number)).join(", ");
  return `${name} — Dente ${p.tooth_number}${faces ? ` (${faces})` : ""}`;
}
