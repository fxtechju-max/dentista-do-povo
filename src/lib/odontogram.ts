export type ToothCondition =
  "saudavel" | "carie" | "restaurado" | "ausente" | "canal" | "coroa" | "implante" | "fraturado";

export const TOOTH_CONDITIONS: ToothCondition[] = [
  "saudavel",
  "carie",
  "restaurado",
  "ausente",
  "canal",
  "coroa",
  "implante",
  "fraturado",
];

export const TOOTH_CONDITION_LABEL: Record<ToothCondition, string> = {
  saudavel: "Saudável",
  carie: "Cárie",
  restaurado: "Restaurado",
  ausente: "Ausente",
  canal: "Canal",
  coroa: "Coroa",
  implante: "Implante",
  fraturado: "Fraturado",
};

export const TOOTH_CONDITION_COLOR: Record<ToothCondition, string> = {
  saudavel: "border-border bg-background text-muted-foreground",
  carie: "border-red-600 bg-red-500 text-white",
  restaurado: "border-blue-600 bg-blue-500 text-white",
  ausente: "border-border bg-muted text-muted-foreground line-through opacity-60",
  canal: "border-purple-600 bg-purple-500 text-white",
  coroa: "border-amber-600 bg-amber-500 text-white",
  implante: "border-teal-600 bg-teal-500 text-white",
  fraturado: "border-orange-600 bg-orange-500 text-white",
};

// FDI notation, arranged as charted (patient facing you): upper row from
// upper-right third molar to upper-left third molar, then lower row from
// lower-left third molar to lower-right third molar.
export const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
