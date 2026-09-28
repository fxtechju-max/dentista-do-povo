// Google AdSense configurado pela área restrita (Configurações › Anúncios).
// Nada vem de variável de ambiente: tudo fica em clinic_settings.
import { db } from "@/integrations/mysql/client";
import {
  ADSENSE_OFF,
  DEFAULT_ADSENSE_CLIENT_ID,
  adsenseFromRow,
  type AdsenseRow,
  type AdsenseSettings,
} from "./adsense-core";

const DEFAULT_ADSENSE: AdsenseSettings = {
  ...ADSENSE_OFF,
  enabled: true,
  clientId: DEFAULT_ADSENSE_CLIENT_ID,
};

export * from "./adsense-core";

export async function loadAdsense(): Promise<AdsenseSettings> {
  try {
    const { data, error } = await db
      .from("clinic_settings")
      .select(
        "adsense_enabled, adsense_client_id, adsense_slot_home, adsense_slot_blog_list, adsense_slot_blog_post",
      )
      .eq("id", "default")
      .maybeSingle();
    // Banco fora do ar ou ainda sem configuração: usa o ID da clínica, para a
    // verificação do Google funcionar. Desligar em Configurações › Anúncios vale sempre.
    if (error || !data) return DEFAULT_ADSENSE;
    return adsenseFromRow(data as AdsenseRow | null);
  } catch {
    return DEFAULT_ADSENSE;
  }
}
