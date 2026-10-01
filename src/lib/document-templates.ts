// Modelos de documentos (receituário, atestado, declaração...): campos
// automáticos {{...}} preenchidos com os dados da clínica e do paciente.
import { calculateAge } from "@/lib/admin/labels";

export type DocumentLayout = "classico" | "moderno" | "elegante";

export const DOCUMENT_LAYOUTS: { id: DocumentLayout; name: string; description: string }[] = [
  { id: "classico", name: "Clássico", description: "Faixa azul lateral e cabeçalho com logo" },
  { id: "moderno", name: "Moderno", description: "Cabeçalho centralizado e rodapé com contatos" },
  { id: "elegante", name: "Elegante", description: "Marca d'água e rodapé escuro ondulado" },
];

export type DocumentTemplate = {
  id: string;
  kind: string;
  name: string;
  title: string;
  body: string;
  layout: DocumentLayout;
  sort_order: number;
};

export type ClinicInfo = {
  clinic_name: string;
  dentist_name: string;
  dentist_cro: string;
  phone: string;
  whatsapp_number: string;
  clinic_email: string;
  address: string;
  clinic_city: string;
  instagram_url: string;
};

// Usado enquanto o banco não tiver os dados (a migration 0005 grava estes valores).
export const DEFAULT_CLINIC: ClinicInfo = {
  clinic_name: "Dentista do Povo",
  dentist_name: "Dr. Álvaro Augusto Battiston",
  dentist_cro: "CRO/RO 2853",
  phone: "(69) 98492-0788",
  whatsapp_number: "(69) 98492-0788",
  clinic_email: "",
  address: "Avenida Cujubim, nº 2112, Setor 02, Cujubim - RO, CEP 76864-000",
  clinic_city: "Cujubim - RO",
  instagram_url: "",
};

export function clinicFromRow(row: Partial<Record<keyof ClinicInfo, string | null>> | null) {
  const info = { ...DEFAULT_CLINIC };
  if (row)
    for (const key of Object.keys(info) as (keyof ClinicInfo)[]) {
      const value = row[key];
      if (typeof value === "string" && value.trim()) info[key] = value.trim();
    }
  return info;
}

export type DocumentPatient = {
  name: string;
  cpf: string | null;
  address: string | null;
  birth_date: string | null;
  phone: string | null;
  guardian_name: string | null;
};

export const PLACEHOLDERS: { key: string; label: string }[] = [
  { key: "paciente_nome", label: "Nome do paciente" },
  { key: "paciente_cpf", label: "CPF do paciente" },
  { key: "paciente_endereco", label: "Endereço do paciente" },
  { key: "paciente_nascimento", label: "Nascimento" },
  { key: "paciente_idade", label: "Idade" },
  { key: "paciente_telefone", label: "Telefone do paciente" },
  { key: "paciente_responsavel", label: "Responsável" },
  { key: "data", label: "Data (dd/mm/aaaa)" },
  { key: "data_extenso", label: "Data por extenso" },
  { key: "cidade", label: "Cidade" },
  { key: "dentista", label: "Dentista" },
  { key: "cro", label: "CRO" },
  { key: "clinica", label: "Clínica" },
  { key: "telefone_clinica", label: "Telefone da clínica" },
  { key: "endereco_clinica", label: "Endereço da clínica" },
];

const BLANK = "____________________";

export function longDate(date = new Date()) {
  return date.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

export function placeholderValues(
  clinic: ClinicInfo,
  patient: DocumentPatient | null,
  date = new Date(),
): Record<string, string> {
  const birth = patient?.birth_date
    ? new Date(`${patient.birth_date.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR")
    : "";
  const age = patient?.birth_date ? calculateAge(patient.birth_date) : null;
  return {
    paciente_nome: patient?.name ?? "",
    paciente_cpf: patient?.cpf ?? "",
    paciente_endereco: patient?.address ?? "",
    paciente_nascimento: birth,
    paciente_idade: age != null ? `${age} anos` : "",
    paciente_telefone: patient?.phone ?? "",
    paciente_responsavel: patient?.guardian_name ?? "",
    data: date.toLocaleDateString("pt-BR"),
    data_extenso: longDate(date),
    cidade: clinic.clinic_city,
    dentista: clinic.dentist_name,
    cro: clinic.dentist_cro,
    clinica: clinic.clinic_name,
    telefone_clinica: clinic.phone,
    endereco_clinica: clinic.address,
  };
}

// ── Campos para preencher ────────────────────────────────────────────────
// No texto do modelo: {{campo:Hora de início}} (o tipo vem do nome) ou
// {{campo:Observações|longo}}. Na hora de gerar, cada um vira um campo do
// formulário — sem precisar editar o texto nem deixar linhas.

export type FieldType = "texto" | "hora" | "numero" | "data" | "longo";
export type FillField = { key: string; label: string; type: FieldType };

const FIELD_RE = /\{\{\s*campo\s*:\s*([^}|]+?)\s*(?:\|\s*(texto|hora|numero|data|longo)\s*)?\}\}/g;
const AUTO_RE = /\{\{\s*([a-z_]+)\s*\}\}/g;

export function fieldKey(label: string) {
  return label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function inferType(label: string): FieldType {
  const l = label.toLowerCase();
  if (l.startsWith("hora")) return "hora";
  if (l.startsWith("data")) return "data";
  if (/\bdias?\b|quantidade|n[úu]mero de/.test(l)) return "numero";
  if (/observa|como usar|orienta|posologia|descri/.test(l)) return "longo";
  return "texto";
}

/** Campos para preencher do modelo, na ordem em que aparecem (sem repetir). */
export function templateFields(text: string): FillField[] {
  const out = new Map<string, FillField>();
  for (const m of text.matchAll(FIELD_RE)) {
    const label = m[1]!.trim();
    const key = fieldKey(label);
    if (key && !out.has(key))
      out.set(key, { key, label, type: (m[2] as FieldType | undefined) ?? inferType(label) });
  }
  return [...out.values()];
}

/** Campos automáticos ({{paciente_nome}}...) usados no modelo. */
export function templateAutoKeys(text: string): string[] {
  const keys = new Set<string>();
  for (const m of text.matchAll(AUTO_RE)) keys.add(m[1]!);
  return PLACEHOLDERS.map((p) => p.key).filter((k) => keys.has(k));
}

/** Valor como sai no documento (data em dd/mm/aaaa). */
export function formatFieldValue(type: FieldType, raw: string) {
  const v = raw.trim();
  if (type === "data" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v.split("-").reverse().join("/");
  return v;
}

/** Converte as linhas "____" de modelos antigos em campos para preencher. */
export function blanksToFields(text: string) {
  let n = 0;
  return text.replace(/_{3,}/g, () => `{{campo:Campo ${++n}}}`);
}

/**
 * Monta o texto final. Campos automáticos sem valor viram uma linha curta
 * (para escrever à mão). Campos para preencher vazios: a linha some quando só
 * tinha campos vazios (ex.: "2. {{campo:Medicamento 2}}" ou "CID: {{campo:CID}}");
 * no meio de uma frase, viram uma linha curta.
 */
export function fillTemplate(
  text: string,
  values: Record<string, string>,
  fields: Record<string, string> = {},
) {
  const lines = text.split("\n").flatMap((line) => {
    const used = [...line.matchAll(FIELD_RE)];
    if (used.length) {
      const allEmpty = used.every((m) => !(fields[fieldKey(m[1]!)] ?? "").trim());
      const rest = line.replace(FIELD_RE, "").replace(AUTO_RE, "").trim();
      if (allEmpty && (/^[\d.)\-–•*\s]*$/.test(rest) || /^[\p{L}\s]{1,24}:$/u.test(rest)))
        return [];
    }
    return [
      line
        .replace(FIELD_RE, (_m, label: string, type?: FieldType) => {
          const l = label.trim();
          const v = formatFieldValue(type ?? inferType(l), fields[fieldKey(l)] ?? "");
          return v || SHORT_BLANK;
        })
        .replace(AUTO_RE, (match, key: string) => (key in values ? values[key] || BLANK : match)),
    ];
  });
  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const SHORT_BLANK = "________";

export function fileName(title: string, patientName: string | null) {
  const base = [title, patientName].filter(Boolean).join(" - ");
  return base
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9 -]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}
