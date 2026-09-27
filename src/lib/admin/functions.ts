// Server functions for the admin panel. The `tanstackStart` Vite plugin strips
// the `.handler(...)` bodies out of the client bundle, so it's safe to read
// server-only env vars and call the AI Gateway here.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/integrations/mysql/auth-middleware";

async function callAiGateway(
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
) {
  const apiKey = process.env["AI_GATEWAY_API_KEY"];
  const baseUrl = process.env["AI_GATEWAY_BASE_URL"];
  const model = process.env["AI_GATEWAY_MODEL"];

  if (!apiKey || !baseUrl || !model) {
    throw new Error(
      "AI Gateway não configurado. Defina AI_GATEWAY_API_KEY, AI_GATEWAY_BASE_URL e AI_GATEWAY_MODEL nas variáveis de ambiente.",
    );
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Falha ao chamar o AI Gateway (${response.status}): ${errText.slice(0, 300)}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("O AI Gateway não retornou nenhum texto.");
  }
  return text;
}

const messageSchema = z.object({
  sender: z.enum(["visitor", "admin"]),
  content: z.string(),
});

const draftReplyInput = z.object({
  visitorName: z.string().min(1),
  messages: z.array(messageSchema).min(1),
});

export const draftSupportReply = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((data: unknown) => draftReplyInput.parse(data))
  .handler(async ({ data, context }) => {

    const transcript = data.messages
      .map((m) => `${m.sender === "visitor" ? data.visitorName : "Atendente"}: ${m.content}`)
      .join("\n");

    const systemPrompt =
      'Você é um assistente de atendimento da clínica odontológica "Dentista do Povo". ' +
      "Leia a conversa de suporte e redija UMA resposta em português do Brasil para o atendente enviar ao cliente a seguir. " +
      "A resposta deve ser cordial, objetiva e personalizada ao contexto da conversa, sem inventar preços, horários ou " +
      "informações que não estejam na conversa. Responda apenas com o texto da mensagem, pronto para envio — sem aspas, " +
      "sem saudações genéricas repetidas e sem explicações sobre o que você fez.";

    const userPrompt = `Cliente: ${data.visitorName}\n\nConversa:\n${transcript}`;
    const draft = await callAiGateway(systemPrompt, [{ role: "user", content: userPrompt }]);
    return { draft };
  });

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const assistantInput = z.object({
  messages: z.array(chatMessageSchema).min(1),
});

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((data: unknown) => assistantInput.parse(data))
  .handler(async ({ data, context }) => {

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [
      { data: todayAppts },
      { count: upcomingApptsCount },
      { data: pendingBudgets },
      { data: pendingPayments },
      { data: newLeads },
    ] = await Promise.all([
      context.db
        .from("appointments")
        .select("treatment, scheduled_at, status, patients(name)")
        .gte("scheduled_at", startOfDay.toISOString())
        .lt("scheduled_at", new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000).toISOString())
        .order("scheduled_at"),
      context.db
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .gte("scheduled_at", now.toISOString())
        .lte("scheduled_at", weekAhead.toISOString()),
      context.db
        .from("budgets")
        .select("treatment, value, status, patients(name)")
        .in("status", ["rascunho", "enviado"]),
      context.db.from("payments").select("amount").eq("status", "pendente"),
      context.db
        .from("leads")
        .select("name, source")
        .eq("status", "novo")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const todayList =
      (todayAppts ?? [])
        .map((a) => {
          const patientName = (a.patients as { name: string } | null)?.name ?? "paciente";
          const time = new Date(a.scheduled_at).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          });
          return `- ${time} ${patientName} (${a.treatment}) [${a.status}]`;
        })
        .join("\n") || "Nenhuma consulta hoje.";

    const budgetsList =
      (pendingBudgets ?? [])
        .map((b) => {
          const patientName = (b.patients as { name: string } | null)?.name ?? "paciente";
          return `- ${patientName}: ${b.treatment} (R$ ${Number(b.value).toFixed(2)}, ${b.status})`;
        })
        .join("\n") || "Nenhum orçamento pendente.";

    const leadsList =
      (newLeads ?? []).map((l) => `- ${l.name}${l.source ? ` (${l.source})` : ""}`).join("\n") ||
      "Nenhum lead novo.";

    const totalPending = (pendingPayments ?? []).reduce((s, p) => s + Number(p.amount), 0);

    const clinicContext = [
      `Data e hora atuais: ${now.toLocaleString("pt-BR")}.`,
      `Consultas de hoje:\n${todayList}`,
      `Consultas nos próximos 7 dias: ${upcomingApptsCount ?? 0}.`,
      `Orçamentos pendentes de aprovação/envio:\n${budgetsList}`,
      `Total em pagamentos pendentes: R$ ${totalPending.toFixed(2)}.`,
      `Leads novos recentes:\n${leadsList}`,
    ].join("\n\n");

    const systemPrompt =
      'Você é a secretária virtual pessoal do dentista responsável pela clínica odontológica "Dentista ' +
      'do Povo". Seu papel é ajudá-lo(a) a organizar o dia: agenda, pacientes, financeiro e leads, como ' +
      "uma secretária de confiança faria. Use os dados reais da clínica fornecidos abaixo para responder " +
      "com precisão — nunca invente números ou compromissos que não estejam nos dados. Se a pergunta for " +
      "sobre algo fora desses dados (ex: um paciente específico não listado), diga que não tem essa " +
      "informação em mãos e sugira consultar a tela correspondente do sistema. Responda em português do " +
      "Brasil, de forma direta, calorosa e organizada (use listas quando fizer sentido).\n\n" +
      `Contexto atual da clínica:\n${clinicContext}`;

    const reply = await callAiGateway(systemPrompt, data.messages);
    return { reply };
  });

const patientRecordSchema = z.object({
  patientName: z.string().min(1),
  appointments: z.array(
    z.object({ treatment: z.string(), scheduled_at: z.string(), status: z.string() }),
  ),
  budgets: z.array(z.object({ treatment: z.string(), value: z.number(), status: z.string() })),
  payments: z.array(z.object({ amount: z.number(), status: z.string() })),
  prescriptions: z.array(z.object({ medication: z.string(), instructions: z.string().nullable() })),
});

export const summarizePatientHistory = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((data: unknown) => patientRecordSchema.parse(data))
  .handler(async ({ data, context }) => {

    const lines = [
      `Paciente: ${data.patientName}`,
      "",
      "Consultas:",
      ...data.appointments.map((a) => `- ${a.treatment} em ${a.scheduled_at} (${a.status})`),
      "",
      "Orçamentos:",
      ...data.budgets.map((b) => `- ${b.treatment}: R$ ${b.value.toFixed(2)} (${b.status})`),
      "",
      "Pagamentos:",
      ...data.payments.map((p) => `- R$ ${p.amount.toFixed(2)} (${p.status})`),
      "",
      "Receitas:",
      ...data.prescriptions.map(
        (rx) => `- ${rx.medication}${rx.instructions ? `: ${rx.instructions}` : ""}`,
      ),
    ].join("\n");

    const systemPrompt =
      "Você é um assistente que ajuda dentistas a revisar o histórico de um paciente antes de um atendimento. " +
      "Leia os dados abaixo e escreva um resumo curto e objetivo, em português do Brasil, em tópicos: situação " +
      "geral, tratamentos relevantes, pendências financeiras e qualquer alerta importante (ex: receitas ativas). " +
      "Use apenas os dados fornecidos, sem inventar informações clínicas.";

    const summary = await callAiGateway(systemPrompt, [{ role: "user", content: lines }]);
    return { summary };
  });

const prescriptionDraftInput = z.object({
  patientName: z.string().min(1),
  notes: z.string().min(1),
});

export const draftPrescription = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((data: unknown) => prescriptionDraftInput.parse(data))
  .handler(async ({ data, context }) => {

    const systemPrompt =
      "Você ajuda um cirurgião-dentista a rascunhar o texto de uma receita odontológica a partir de anotações " +
      "curtas dele. Gere um rascunho em português do Brasil com: nome do medicamento (ou classe, se não " +
      "especificado), dosagem usual e posologia. NUNCA decida o diagnóstico ou substitua o julgamento clínico — " +
      "isso é apenas um rascunho que o dentista vai revisar e ajustar antes de assinar. Responda em JSON no " +
      'formato {"medication": string, "instructions": string}, sem texto fora do JSON.';

    const userPrompt = `Paciente: ${data.patientName}\nAnotações do dentista: ${data.notes}`;
    const raw = await callAiGateway(systemPrompt, [{ role: "user", content: userPrompt }]);

    try {
      const cleaned = raw.replace(/^```json\s*|```$/g, "").trim();
      const parsed = z
        .object({ medication: z.string(), instructions: z.string() })
        .parse(JSON.parse(cleaned));
      return parsed;
    } catch {
      return { medication: data.notes, instructions: raw };
    }
  });
