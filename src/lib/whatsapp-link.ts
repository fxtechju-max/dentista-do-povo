// Link wa.me da clínica. Números brasileiros sem DDI (10 ou 11 dígitos)
// recebem o 55 na frente.
export const DEFAULT_CLINIC_WHATSAPP = "69984920788";
export const WHATSAPP_GREETING =
  "Olá! Vim pelo site da Dentista do Povo e gostaria de mais informações.";

export function whatsappLink(
  number: string | null | undefined,
  text: string = WHATSAPP_GREETING,
): string | null {
  let digits = (number ?? "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length <= 11) digits = `55${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
