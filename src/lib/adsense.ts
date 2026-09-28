// Google AdSense configurado pela área restrita (Configurações › Anúncios).
// Nada vem de variável de ambiente: tudo fica em clinic_settings.
import { db } from "@/integrations/mysql/client";
import { ADSENSE_OFF, adsenseFromRow, type AdsenseRow, type AdsenseSettings } from "./adsense-core";

export * from "./adsense-core";

export async function loadAdsense(): Promise<AdsenseSettings> {
  try {
    const { data } = await db
      .from("clinic_settings")
      .select(
        "adsense_enabled, adsense_client_id, adsense_slot_home, adsense_slot_blog_list, adsense_slot_blog_post",
      )
      .eq("id", "default")
      .maybeSingle();
    return adsenseFromRow(data as AdsenseRow | null);
  } catch {
    return ADSENSE_OFF;
  }
}
