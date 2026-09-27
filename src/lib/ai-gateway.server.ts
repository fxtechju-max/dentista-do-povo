// Server-only. Resolves AI Gateway credentials from the database (set via
// Configurações > Inteligência Artificial) falling back to the AI_GATEWAY_*
// env vars. The api key column is never selected outside this file and
// functions.ts's getAiGatewaySettings (which only ever returns a masked
// preview) — never send it to the browser in full.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type GatewayConfig = { apiKey: string; baseUrl: string; model: string };

export async function getAiGatewayConfig(): Promise<GatewayConfig | null> {
  const { data } = await supabaseAdmin
    .from("clinic_settings")
    .select("ai_gateway_base_url, ai_gateway_model, ai_gateway_api_key")
    .eq("id", "default")
    .maybeSingle();
  const apiKey = data?.ai_gateway_api_key || process.env["AI_GATEWAY_API_KEY"] || "";
  const baseUrl = data?.ai_gateway_base_url || process.env["AI_GATEWAY_BASE_URL"] || "";
  const model = data?.ai_gateway_model || process.env["AI_GATEWAY_MODEL"] || "";
  if (!apiKey || !baseUrl || !model) return null;
  return { apiKey, baseUrl, model };
}

export async function callAiGateway(
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
) {
  const config = await getAiGatewayConfig();
  if (!config) {
    throw new Error(
      "AI Gateway não configurado. Configure em Configurações > Inteligência Artificial.",
    );
  }
  const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.4,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    }),
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Falha ao chamar o AI Gateway (${response.status}): ${errText.slice(0, 300)}`);
  }
  const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("O AI Gateway não retornou nenhum texto.");
  return text;
}
