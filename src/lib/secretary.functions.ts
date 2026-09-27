// Public server function: the AI virtual secretary auto-replies to visitors
// on the site chat widget while no human admin has taken over the
// conversation yet. No auth middleware here on purpose — visitors are
// anonymous — so keep this handler defensive and side-effect-light.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const BOT_PREFIX = "🤖 Atendente virtual:";

const input = z.object({ conversationId: z.string().uuid() });

export const secretaryAutoReply = createServerFn({ method: "POST" })
  .validator((data: unknown) => input.parse(data))
  .handler(async ({ data }) => {
    const { requestActor, rateLimit } = await import("@/integrations/mysql/auth.server");
    const { executeQuery } = await import("@/integrations/mysql/query.server");
    const { createDataClient } = await import("@/integrations/mysql/query");
    const actor = await requestActor();
    if (!actor.admin && !actor.visitorHash) return { replied: false };
    const visitorDb = createDataClient(query => executeQuery(query, actor));
    const { data: owned } = await visitorDb.from("conversations").select("id").eq("id", data.conversationId).maybeSingle();
    if (!owned) return { replied: false };
    await rateLimit(`secretary:${data.conversationId}`, 1, 10);
    const db = createDataClient(query => executeQuery(query, { ...actor, admin: true }));

    const { data: settings } = await db
      .from("clinic_settings")
      .select("ai_secretary_enabled, clinic_name, phone, address")
      .eq("id", "default")
      .maybeSingle();
    if (!settings?.ai_secretary_enabled) return { replied: false };

    const { data: conversation } = await db
      .from("conversations")
      .select("visitor_name")
      .eq("id", data.conversationId)
      .maybeSingle();
    if (!conversation) return { replied: false };

    const { data: messages } = await db
      .from("messages")
      .select("sender, content")
      .eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (!messages || messages.length === 0) return { replied: false };
    messages.reverse();

    const last = messages[messages.length - 1];
    if (last?.sender !== "visitor") return { replied: false };

    const humanAlreadyReplied = messages.some(
      (m) => m.sender === "admin" && !m.content.startsWith(BOT_PREFIX),
    );
    if (humanAlreadyReplied) return { replied: false };

    const apiKey = process.env["AI_GATEWAY_API_KEY"];
    const baseUrl = process.env["AI_GATEWAY_BASE_URL"];
    const model = process.env["AI_GATEWAY_MODEL"];
    if (!apiKey || !baseUrl || !model) return { replied: false };

    const { data: services } = await db
      .from("services")
      .select("name, price")
      .eq("active", true)
      .order("sort_order");

    const servicesText = (services ?? [])
      .map((s) => `- ${s.name}${s.price != null ? ` (R$ ${Number(s.price).toFixed(2)})` : ""}`)
      .join("\n");

    const systemPrompt = [
      `Você é a secretária virtual da clínica odontológica "${settings.clinic_name ?? "Dentista do Povo"}".`,
      "Atenda o visitante do chat do site de forma cordial, breve e objetiva, em português do Brasil.",
      "Você pode: informar sobre serviços, preços aproximados, telefone, endereço e horário; ajudar a agendar uma" +
        " consulta pedindo nome, telefone e preferência de dia/horário para um atendente humano confirmar depois.",
      "Você NUNCA deve dar diagnóstico, indicar tratamento ou avaliar sintomas. Se o visitante descrever dor ou" +
        " um problema de saúde, oriente a agendar uma avaliação presencial sem opinar sobre o que pode ser.",
      "Se perguntarem, diga que você é uma atendente virtual e que um dentista da equipe confirma tudo pessoalmente.",
      settings.phone ? `Telefone/WhatsApp da clínica: ${settings.phone}.` : "",
      settings.address ? `Endereço da clínica: ${settings.address}.` : "",
      servicesText ? `Serviços oferecidos:\n${servicesText}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map((m) => ({
            role: m.sender === "visitor" ? ("user" as const) : ("assistant" as const),
            content: m.content,
          })),
        ],
      }),
    });
    if (!response.ok) return { replied: false };

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const reply = json.choices?.[0]?.message?.content?.trim();
    if (!reply) return { replied: false };

    await db.from("messages").insert({
      conversation_id: data.conversationId,
      sender: "admin",
      content: `${BOT_PREFIX} ${reply}`,
    });

    return { replied: true };
  });
