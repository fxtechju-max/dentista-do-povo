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

/** Troca {{campo}} pelo valor; campos sem valor viram uma linha para preencher à mão. */
export function fillTemplate(text: string, values: Record<string, string>) {
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (match, key: string) =>
    key in values ? values[key] || BLANK : match,
  );
}

export function fileName(title: string, patientName: string | null) {
  const base = [title, patientName].filter(Boolean).join(" - ");
  return base
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9 -]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}
