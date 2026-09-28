export type AppointmentStatus = "agendado" | "confirmado" | "concluido" | "cancelado";
export type BudgetStatus = "rascunho" | "enviado" | "aprovado" | "recusado";
export type PaymentStatus = "pendente" | "pago" | "cancelado";
export type LeadStatus = "novo" | "em_contato" | "convertido" | "perdido";
export type FinanceEntryType = "pagar" | "receber";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

export const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  agendado: "🕓 Agendado",
  confirmado: "✅ Confirmado",
  concluido: "✔️ Concluído",
  cancelado: "❌ Cancelado",
};

export const APPOINTMENT_STATUS_VARIANT: Record<AppointmentStatus, BadgeVariant> = {
  agendado: "secondary",
  confirmado: "default",
  concluido: "default",
  cancelado: "destructive",
};

export const BUDGET_STATUS_LABEL: Record<BudgetStatus, string> = {
  rascunho: "📝 Rascunho",
  enviado: "📤 Enviado",
  aprovado: "✅ Aprovado",
  recusado: "❌ Recusado",
};

export const BUDGET_STATUS_VARIANT: Record<BudgetStatus, BadgeVariant> = {
  rascunho: "outline",
  enviado: "secondary",
  aprovado: "default",
  recusado: "destructive",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pendente: "⏳ Pendente",
  pago: "✅ Pago",
  cancelado: "❌ Cancelado",
};

export const PAYMENT_STATUS_VARIANT: Record<PaymentStatus, BadgeVariant> = {
  pendente: "secondary",
  pago: "default",
  cancelado: "destructive",
};

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  novo: "🆕 Novo",
  em_contato: "💬 Em contato",
  convertido: "✅ Convertido",
  perdido: "❌ Perdido",
};

export const LEAD_STATUS_VARIANT: Record<LeadStatus, BadgeVariant> = {
  novo: "secondary",
  em_contato: "outline",
  convertido: "default",
  perdido: "destructive",
};

export const FINANCE_ENTRY_TYPE_LABEL: Record<FinanceEntryType, string> = {
  pagar: "📤 A pagar",
  receber: "📥 A receber",
};

export const FINANCE_ENTRY_TYPE_VARIANT: Record<FinanceEntryType, BadgeVariant> = {
  pagar: "destructive",
  receber: "default",
};

export const FINANCE_ENTRY_CATEGORIES = [
  "Aluguel",
  "Fornecedores",
  "Salários",
  "Equipamentos",
  "Marketing",
  "Impostos",
  "Consultas",
  "Convênios",
  "Outros",
];

export const AUDIT_TABLE_LABEL: Record<string, string> = {
  patients: "Paciente",
  appointments: "Consulta",
  treatments: "Tratamento",
  budgets: "Orçamento",
  payments: "Financeiro",
  finance_entries: "Contas a pagar/receber",
  leads: "CRM (lead)",
  prescriptions: "Receita",
  documents: "Documento",
  services: "Serviço",
  blog_posts: "Post do blog",
  gallery_photos: "Foto da galeria",
  whatsapp_contacts: "Contato WhatsApp",
  patient_anamnesis: "Anamnese",
  tooth_records: "Odontograma",
  clinical_notes: "Evolução clínica",
  clinic_settings: "Configurações da clínica",
  profiles: "Perfil",
  conversations: "Conversa (suporte)",
  messages: "Mensagem",
  ai_search_history: "Histórico de IA",
};

export const AUDIT_ACTION_LABEL: Record<"insert" | "update" | "delete", string> = {
  insert: "criou",
  update: "atualizou",
  delete: "excluiu",
};

export function formatCPF(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function calculateAge(birthDate: string): number | null {
  if (!birthDate) return null;
  const dob = new Date(birthDate);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

export function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export const GENDER_LABEL: Record<string, string> = {
  masculino: "Masculino",
  feminino: "Feminino",
  outro: "Outro",
};

/** Código sequencial do paciente no formato #000125. */
export function patientCode(code: number | null | undefined) {
  return code != null ? `#${String(code).padStart(6, "0")}` : "—";
}
