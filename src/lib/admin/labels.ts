export type AppointmentStatus = "agendado" | "confirmado" | "concluido" | "cancelado";
export type BudgetStatus = "rascunho" | "enviado" | "aprovado" | "recusado";
export type PaymentStatus = "pendente" | "pago" | "cancelado";
export type LeadStatus = "novo" | "em_contato" | "convertido" | "perdido";

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
