// Formas de pagamento usadas no Financeiro e em Contas a Pagar/Receber.
// A clínica ativa/desativa cada uma em Configurações › Formas de pagamento
// (clinic_settings.disabled_payment_methods).
import { useEffect, useState } from "react";
import { db } from "@/integrations/mysql/client";

export type PaymentMethod = {
  id: string;
  label: string;
  emoji: string;
  description: string;
  /** Aceita parcelamento (mostra o campo de parcelas). */
  installments?: boolean;
};

export const PAYMENT_METHODS: PaymentMethod[] = [
  { id: "pix", label: "PIX", emoji: "⚡", description: "Transferência instantânea" },
  { id: "dinheiro", label: "Dinheiro", emoji: "💵", description: "Pagamento em espécie" },
  {
    id: "cartao_credito",
    label: "Cartão de crédito",
    emoji: "💳",
    description: "À vista ou parcelado",
    installments: true,
  },
  { id: "cartao_debito", label: "Cartão de débito", emoji: "💳", description: "Débito na hora" },
  { id: "boleto", label: "Boleto", emoji: "🧾", description: "Boleto bancário" },
  {
    id: "transferencia",
    label: "Transferência (TED/DOC)",
    emoji: "🏦",
    description: "Transferência bancária",
  },
  {
    id: "link_pagamento",
    label: "Link de pagamento",
    emoji: "🔗",
    description: "Link enviado ao paciente",
    installments: true,
  },
  { id: "cheque", label: "Cheque", emoji: "📝", description: "À vista ou pré-datado" },
  {
    id: "crediario",
    label: "Crediário / carnê",
    emoji: "📒",
    description: "Parcelado direto com a clínica",
    installments: true,
  },
  {
    id: "convenio",
    label: "Convênio / plano odontológico",
    emoji: "🩺",
    description: "Pago pelo convênio",
  },
  { id: "deposito", label: "Depósito bancário", emoji: "🏧", description: "Depósito em conta" },
  { id: "outros", label: "Outros", emoji: "➕", description: "Qualquer outra forma" },
];

export function paymentMethod(id: string | null | undefined): PaymentMethod | null {
  return PAYMENT_METHODS.find((m) => m.id === id) ?? null;
}

/** Ex.: "💳 Cartão de crédito · 3x" */
export function paymentMethodLabel(
  id: string | null | undefined,
  installments?: number | null,
): string {
  const method = paymentMethod(id);
  if (!method) return "—";
  const parts = `${method.emoji} ${method.label}`;
  return method.installments && installments && installments > 1
    ? `${parts} · ${installments}x`
    : parts;
}

/** Formas ativas da clínica (todas, enquanto carrega ou se nada foi desativado). */
export function useEnabledPaymentMethods() {
  const [disabled, setDisabled] = useState<string[]>([]);
  useEffect(() => {
    db.from("clinic_settings")
      .select("disabled_payment_methods")
      .eq("id", "default")
      .maybeSingle()
      .then(({ data }) => setDisabled(data?.disabled_payment_methods ?? []));
  }, []);
  return PAYMENT_METHODS.filter((m) => !disabled.includes(m.id));
}

/** Converte o texto do campo de parcelas em número válido (ou null). */
export function parseInstallments(method: string, value: string): number | null {
  if (!paymentMethod(method)?.installments) return null;
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 48) : 1;
}
