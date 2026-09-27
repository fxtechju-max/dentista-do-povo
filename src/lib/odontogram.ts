export type ToothCondition =
  | "higido"
  | "higido_selado"
  | "cariado"
  | "mancha_branca"
  | "restaurado"
  | "restaurado_carie"
  | "selante"
  | "coroa"
  | "nucleo"
  | "pilar"
  | "protese_parcial"
  | "protese_temporaria"
  | "implante"
  | "fratura"
  | "resto_radicular"
  | "raiz_residual"
  | "retracao_gengival"
  | "calculo_dental"
  | "tratamento_endodontico"
  | "endodontia_realizada"
  | "extracao_indicada"
  | "extraido"
  | "ausente";

export const TOOTH_CONDITIONS: ToothCondition[] = [
  "higido",
  "higido_selado",
  "cariado",
  "mancha_branca",
  "restaurado",
  "restaurado_carie",
  "selante",
  "coroa",
  "nucleo",
  "pilar",
  "protese_parcial",
  "protese_temporaria",
  "implante",
  "fratura",
  "resto_radicular",
  "raiz_residual",
  "retracao_gengival",
  "calculo_dental",
  "tratamento_endodontico",
  "endodontia_realizada",
  "extracao_indicada",
  "extraido",
  "ausente",
];

export const TOOTH_CONDITION_LABEL: Record<ToothCondition, string> = {
  higido: "Hígido (H)",
  higido_selado: "Hígido selado (Hs)",
  cariado: "Cariado (Ca)",
  mancha_branca: "Mancha branca ativa (Mb)",
  restaurado: "Restaurado (R)",
  restaurado_carie: "Restaurado com cárie (Rc)",
  selante: "Selante (Sl)",
  coroa: "Coroa (Cu)",
  nucleo: "Núcleo (Nu)",
  pilar: "Pilar de prótese (Pl)",
  protese_parcial: "Prótese parcial removível (Pp)",
  protese_temporaria: "Prótese temporária (Pt)",
  implante: "Implante (Im)",
  fratura: "Fratura (Fr)",
  resto_radicular: "Resto radicular (RR)",
  raiz_residual: "Raiz residual (Rz)",
  retracao_gengival: "Retração gengival (Rg)",
  calculo_dental: "Cálculo dental (Cd)",
  tratamento_endodontico: "Necessita tratamento endodôntico (Te)",
  endodontia_realizada: "Tratamento endodôntico realizado (Er)",
  extracao_indicada: "Extração indicada (Ei)",
  extraido: "Extraído (Ex)",
  ausente: "Ausente (A)",
};

// Short 1-2 letter codes shown on the tooth chip itself.
export const TOOTH_CONDITION_CODE: Record<ToothCondition, string> = {
  higido: "H",
  higido_selado: "Hs",
  cariado: "Ca",
  mancha_branca: "Mb",
  restaurado: "R",
  restaurado_carie: "Rc",
  selante: "Sl",
  coroa: "Cu",
  nucleo: "Nu",
  pilar: "Pl",
  protese_parcial: "Pp",
  protese_temporaria: "Pt",
  implante: "Im",
  fratura: "Fr",
  resto_radicular: "RR",
  raiz_residual: "Rz",
  retracao_gengival: "Rg",
  calculo_dental: "Cd",
  tratamento_endodontico: "Te",
  endodontia_realizada: "Er",
  extracao_indicada: "Ei",
  extraido: "Ex",
  ausente: "A",
};

// Tailwind classes for each condition — solid enough to double as a legend
// swatch background (bg-*) and an SVG tooth fill (fill-*) with the same string.
export const TOOTH_CONDITION_COLOR: Record<ToothCondition, string> = {
  higido: "border-emerald-600 bg-emerald-500 fill-emerald-500 text-white",
  higido_selado: "border-emerald-700 bg-emerald-600 fill-emerald-600 text-white",
  cariado: "border-red-700 bg-red-600 fill-red-600 text-white",
  mancha_branca: "border-sky-600 bg-sky-500 fill-sky-500 text-white",
  restaurado: "border-blue-700 bg-blue-600 fill-blue-600 text-white",
  restaurado_carie: "border-orange-700 bg-orange-600 fill-orange-600 text-white",
  selante: "border-lime-700 bg-lime-500 fill-lime-500 text-white",
  coroa: "border-amber-700 bg-amber-500 fill-amber-500 text-white",
  nucleo: "border-purple-700 bg-purple-500 fill-purple-500 text-white",
  pilar: "border-indigo-700 bg-indigo-500 fill-indigo-500 text-white",
  protese_parcial: "border-cyan-700 bg-cyan-500 fill-cyan-500 text-white",
  protese_temporaria: "border-cyan-600 bg-cyan-400 fill-cyan-400 text-white",
  implante: "border-teal-700 bg-teal-500 fill-teal-500 text-white",
  fratura: "border-rose-700 bg-rose-600 fill-rose-600 text-white",
  resto_radicular: "border-stone-700 bg-stone-500 fill-stone-500 text-white",
  raiz_residual: "border-stone-600 bg-stone-400 fill-stone-400 text-white",
  retracao_gengival: "border-pink-600 bg-pink-500 fill-pink-500 text-white",
  calculo_dental: "border-yellow-600 bg-yellow-500 fill-yellow-500 text-white",
  tratamento_endodontico: "border-violet-600 bg-violet-500 fill-violet-500 text-white",
  endodontia_realizada: "border-violet-800 bg-violet-700 fill-violet-700 text-white",
  extracao_indicada: "border-orange-800 bg-orange-700 fill-orange-700 text-white",
  extraido: "border-muted-foreground bg-muted fill-muted text-muted-foreground",
  ausente: "border-muted-foreground bg-muted fill-muted text-muted-foreground",
};

// Priority order used to pick which condition "wins" the tooth's main color
// when several are marked — most clinically urgent first.
const CONDITION_PRIORITY: ToothCondition[] = [
  "ausente",
  "extraido",
  "extracao_indicada",
  "fratura",
  "resto_radicular",
  "raiz_residual",
  "cariado",
  "restaurado_carie",
  "tratamento_endodontico",
  "endodontia_realizada",
  "coroa",
  "nucleo",
  "pilar",
  "implante",
  "protese_parcial",
  "protese_temporaria",
  "mancha_branca",
  "calculo_dental",
  "retracao_gengival",
  "restaurado",
  "selante",
  "higido_selado",
  "higido",
];

export function primaryCondition(conditions: ToothCondition[]): ToothCondition | null {
  for (const c of CONDITION_PRIORITY) if (conditions.includes(c)) return c;
  return conditions[0] ?? null;
}

export type Dentition = "permanente" | "deciduo";

// FDI notation. Permanent: quadrants 1-4 (11-48). Deciduous: quadrants 5-8 (51-85).
export const UPPER_TEETH: Record<Dentition, number[]> = {
  permanente: [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28],
  deciduo: [55, 54, 53, 52, 51, 61, 62, 63, 64, 65],
};
export const LOWER_TEETH: Record<Dentition, number[]> = {
  permanente: [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38],
  deciduo: [85, 84, 83, 82, 81, 71, 72, 73, 74, 75],
};

export type ToothType = "incisor" | "canine" | "premolar" | "molar";

export function toothType(toothNumber: number, dentition: Dentition): ToothType {
  const position = toothNumber % 10;
  if (dentition === "deciduo") {
    if (position <= 2) return "incisor";
    if (position === 3) return "canine";
    return "molar"; // primary dentition has no premolars
  }
  if (position <= 2) return "incisor";
  if (position === 3) return "canine";
  if (position <= 5) return "premolar";
  return "molar";
}
