// Definições do odontograma profissional (situações, faces, procedimentos,
// status) usadas pela aba Odontograma do paciente.
import type { ToothCondition } from "./odontogram";

export type Situation =
  | "saudavel"
  | "carie"
  | "restauracao"
  | "canal"
  | "coroa"
  | "implante"
  | "ausente"
  | "extracao_indicada"
  | "extraido"
  | "fratura"
  | "selante"
  | "protese"
  | "outros";

export const SITUATIONS: { id: Situation; label: string; color: string }[] = [
  { id: "saudavel", label: "Saudável", color: "#ffffff" },
  { id: "carie", label: "Cárie", color: "#ef4444" },
  { id: "restauracao", label: "Restauração", color: "#3b82f6" },
  { id: "canal", label: "Tratamento de canal", color: "#dc2626" },
  { id: "coroa", label: "Coroa", color: "#facc15" },
  { id: "implante", label: "Implante", color: "#6b7280" },
  { id: "ausente", label: "Ausente", color: "#e5e7eb" },
  { id: "extracao_indicada", label: "Extração indicada", color: "#f97316" },
  { id: "extraido", label: "Extraído", color: "#9ca3af" },
  { id: "fratura", label: "Fratura", color: "#a855f7" },
  { id: "selante", label: "Selante", color: "#22c55e" },
  { id: "protese", label: "Prótese", color: "#f9a8d4" },
  { id: "outros", label: "Outros", color: "#92400e" },
];

export const SITUATION_BY_ID = Object.fromEntries(SITUATIONS.map((s) => [s.id, s])) as Record<
  Situation,
  (typeof SITUATIONS)[number]
>;

export function situationOf(value: string | null | undefined): (typeof SITUATIONS)[number] {
  return SITUATION_BY_ID[value as Situation] ?? SITUATION_BY_ID.outros;
}

export type Surface = "oclusal" | "mesial" | "distal" | "vestibular" | "palatina";

export const SURFACES: Surface[] = ["oclusal", "mesial", "distal", "vestibular", "palatina"];

/** Nome da face conforme o dente: incisivos/caninos têm borda incisal; inferiores, face lingual. */
export function surfaceLabel(surface: Surface, toothNumber: number): string {
  const position = toothNumber % 10;
  const quadrant = Math.floor(toothNumber / 10);
  const anterior = position <= 3;
  const lower = [3, 4, 7, 8].includes(quadrant);
  switch (surface) {
    case "oclusal":
      return anterior ? "Incisal" : "Oclusal";
    case "mesial":
      return "Mesial";
    case "distal":
      return "Distal";
    case "vestibular":
      return "Vestibular";
    case "palatina":
      return lower ? "Lingual" : "Palatina";
  }
}

export const PROCEDURES: { id: string; label: string }[] = [
  { id: "avaliacao", label: "Avaliação" },
  { id: "restauracao", label: "Restauração" },
  { id: "tratamento_canal", label: "Tratamento de canal" },
  { id: "coroa", label: "Coroa" },
  { id: "implante", label: "Implante" },
  { id: "extracao", label: "Extração" },
  { id: "selante", label: "Selante" },
  { id: "profilaxia", label: "Profilaxia / limpeza" },
  { id: "raspagem", label: "Raspagem" },
  { id: "clareamento", label: "Clareamento" },
  { id: "protese", label: "Prótese" },
  { id: "faceta", label: "Faceta" },
  { id: "ortodontia", label: "Ortodontia" },
  { id: "outro", label: "Outro" },
];

export function procedureLabel(id: string | null | undefined): string {
  if (!id) return "—";
  return PROCEDURES.find((p) => p.id === id)?.label ?? id;
}

export type ProcedureStatus = "planejado" | "em_andamento" | "concluido";

export const STATUSES: { id: ProcedureStatus; label: string; dot: string }[] = [
  { id: "planejado", label: "Planejado", dot: "bg-sky-500" },
  { id: "em_andamento", label: "Em andamento", dot: "bg-orange-500" },
  { id: "concluido", label: "Concluído", dot: "bg-emerald-500" },
];

export function statusOf(value: string | null | undefined) {
  return STATUSES.find((s) => s.id === value) ?? STATUSES[0]!;
}

export type ToothProcedure = {
  id: string;
  patient_id: string;
  tooth_number: number;
  surfaces: Surface[];
  situation: Situation;
  planned_procedure: string | null;
  /** Valor do procedimento planejado (numeric vem como texto do banco). */
  price: number | string | null;
  /** Orçamento gerado pelo Plano de tratamento. */
  budget_id: string | null;
  status: ProcedureStatus;
  notes: string | null;
  record_date: string;
  dentist: string | null;
  created_at: string;
};

export type ToothAttachment = {
  id: string;
  procedure_id: string | null;
  tooth_number: number;
  title: string | null;
  created_at: string;
};

/** Faces vindas do banco: aceita lista ou texto JSON e ignora valores estranhos. */
export function asSurfaces(value: unknown): Surface[] {
  let list = value;
  for (let i = 0; i < 2 && typeof list === "string"; i++) {
    try {
      list = JSON.parse(list);
    } catch {
      return [];
    }
  }
  return Array.isArray(list)
    ? list.filter((x): x is Surface => SURFACES.includes(x as Surface))
    : [];
}

/** Registros mais recentes primeiro (data do registro, depois criação). */
export function sortProcedures(list: ToothProcedure[]): ToothProcedure[] {
  return [...list].sort(
    (a, b) =>
      b.record_date.localeCompare(a.record_date) || b.created_at.localeCompare(a.created_at),
  );
}

// Registros do odontograma antigo (tooth_records.conditions) mapeados para as
// situações novas — assim o histórico de antes continua aparecendo.
const LEGACY_MAP: Partial<Record<ToothCondition, Situation>> = {
  higido: "saudavel",
  higido_selado: "selante",
  cariado: "carie",
  mancha_branca: "carie",
  restaurado: "restauracao",
  restaurado_carie: "carie",
  selante: "selante",
  coroa: "coroa",
  nucleo: "coroa",
  pilar: "protese",
  protese_parcial: "protese",
  protese_temporaria: "protese",
  implante: "implante",
  fratura: "fratura",
  tratamento_endodontico: "canal",
  endodontia_realizada: "canal",
  extracao_indicada: "extracao_indicada",
  extraido: "extraido",
  ausente: "ausente",
};

export function legacySituation(condition: ToothCondition | null): Situation | null {
  if (!condition) return null;
  return LEGACY_MAP[condition] ?? "outros";
}
