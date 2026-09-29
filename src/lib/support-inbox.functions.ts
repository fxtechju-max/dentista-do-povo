import { createServerFn } from "@tanstack/react-start";

export type InboxConversation = {
  id: string;
  visitor_name: string;
  last_message_at: string;
  last_sender: "visitor" | "admin" | null;
  last_content: string | null;
  unread: boolean;
};

// Caixa de entrada do suporte (botão flutuante do painel): conversas com a
// última mensagem e se há mensagem do visitante que o administrador não leu.
export const getSupportInbox = createServerFn({ method: "POST" }).handler(async () => {
  const { requestActor } = await import("@/integrations/mysql/auth.server");
  if (!(await requestActor()).admin) return { data: [] as InboxConversation[], unread: 0 };
  const { getPool } = await import("@/integrations/mysql/pool.server");
  const [rows] = await getPool().execute(
    `SELECT c.id, c.visitor_name, c.last_message_at, m.sender AS last_sender,
            left(m.content, 160) AS last_content,
            (m.sender = 'visitor' AND (c.admin_read_at IS NULL OR c.admin_read_at < m.created_at)) AS unread
       FROM conversations c
       LEFT JOIN LATERAL (
         SELECT sender, content, created_at FROM messages
          WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1
       ) m ON true
      ORDER BY c.last_message_at DESC
      LIMIT 30`,
  );
  const data = rows.map((r) => ({
    id: String(r["id"]),
    visitor_name: String(r["visitor_name"]),
    last_message_at:
      r["last_message_at"] instanceof Date
        ? r["last_message_at"].toISOString()
        : String(r["last_message_at"]),
    last_sender: (r["last_sender"] as InboxConversation["last_sender"]) ?? null,
    last_content: (r["last_content"] as string | null) ?? null,
    unread: Boolean(r["unread"]),
  }));
  return { data, unread: data.filter((c) => c.unread).length };
});

// Marca a conversa como lida pelo administrador (sem passar pelo histórico de
// alterações, que registraria cada leitura).
export const markSupportRead = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const id = (data as { id?: unknown } | null)?.id;
    if (typeof id !== "string" || !id || id.length > 64) throw new Error("Conversa inválida.");
    return { id };
  })
  .handler(async ({ data }) => {
    const { requestActor } = await import("@/integrations/mysql/auth.server");
    if (!(await requestActor()).admin) return { ok: false };
    const { getPool } = await import("@/integrations/mysql/pool.server");
    await getPool().execute("UPDATE conversations SET admin_read_at=now() WHERE id=?", [data.id]);
    return { ok: true };
  });
