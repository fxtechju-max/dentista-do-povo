import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Send, MessageCircle, Trash2, Sparkles, Link2, Check } from "lucide-react";
import { db } from "@/integrations/mysql/client";
import { draftSupportReply } from "@/lib/admin/functions";

export const Route = createFileRoute("/admin/suporte")({
  validateSearch: (search: Record<string, unknown>) => {
    const conversationId = search["conversationId"];
    return typeof conversationId === "string" ? { conversationId } : {};
  },
  component: Suporte,
});

type Conversation = {
  id: string;
  visitor_name: string;
  last_message_at: string;
};

type Message = {
  id: string;
  conversation_id: string;
  sender: "visitor" | "admin";
  content: string;
  created_at: string;
};

function conversationLink(id: string) {
  return `${window.location.origin}/admin/suporte?conversationId=${id}`;
}

function Suporte() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const conversationsRef = useRef<Conversation[]>([]);
  const activeIdRef = useRef<string | null>(null);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const loadConversations = useCallback(async () => {
    const { data } = await db
      .from("conversations")
      .select("id, visitor_name, last_message_at")
      .order("last_message_at", { ascending: false });
    if (data) setConversations(data as Conversation[]);
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Open the conversation pointed to by a notification/direct link (?conversationId=...)
  useEffect(() => {
    if (search.conversationId) setActiveId(search.conversationId);
  }, [search.conversationId]);

  const notifyAdmin = useCallback(
    (title: string, body: string, conversationId: string) => {
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
      // Skip the interruption if the admin is already looking at this exact conversation.
      if (document.visibilityState === "visible" && activeIdRef.current === conversationId) return;
      const notification = new Notification(title, {
        body,
        tag: `ddp-conversation-${conversationId}`,
        icon: "/favicon.ico",
      });
      notification.onclick = () => {
        window.focus();
        navigate({ to: "/admin/suporte", search: { conversationId } });
        notification.close();
      };
    },
    [navigate],
  );

  async function copyConversationLink(id: string) {
    try {
      await navigator.clipboard.writeText(conversationLink(id));
      setCopiedId(id);
      setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 2000);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — nothing to fall back to.
    }
  }

  // Poll without overlapping requests; stop when the panel unmounts.
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let previous: Map<string, string> | null = null;
    async function refresh() {
      if (stopped) return;
      const { data } = await db.from("conversations").select("id, visitor_name, last_message_at").order("last_message_at", { ascending: false });
      if (!stopped && data) {
        setConversations(data as Conversation[]);
        for (const conversation of data) {
          if (previous && previous.get(conversation.id) !== conversation.last_message_at) {
            const { data: latest } = await db.from("messages").select("sender, content").eq("conversation_id", conversation.id).order("created_at", { ascending: false }).limit(1);
            if (!stopped && latest?.[0]?.sender === "visitor") notifyAdmin(
              'Nova mensagem de ' + conversation.visitor_name, latest[0].content, conversation.id,
            );
          }
        }
        previous = new Map(data.map(c => [c.id, c.last_message_at]));
      }
      const id = activeIdRef.current;
      if (id && !stopped) {
        const { data: messages } = await db.from("messages").select("id, conversation_id, sender, content, created_at").eq("conversation_id", id).order("created_at");
        if (!stopped && activeIdRef.current === id && messages) setMessages(messages as Message[]);
      }
      if (!stopped) timer = setTimeout(refresh, 3000);
    }
    void refresh();
    return () => { stopped = true; clearTimeout(timer); };
  }, [notifyAdmin]);

  // Load messages when a conversation is opened
  useEffect(() => {
    if (!activeId) return;
    db
      .from("messages")
      .select("id, conversation_id, sender, content, created_at")
      .eq("conversation_id", activeId)
      .order("created_at")
      .then(({ data }) => {
        if (data) setMessages(data as Message[]);
      });
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function reply() {
    const content = draft.trim();
    if (!content || !activeId) return;
    setDraft("");
    await db.from("messages").insert({
      conversation_id: activeId,
      sender: "admin",
      content,
    });
  }

  async function draftWithAI() {
    if (!active || messages.length === 0 || aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const result = await draftSupportReply({
        data: {
          visitorName: active.visitor_name,
          messages: messages.map((m) => ({ sender: m.sender, content: m.content })),
        },

      });
      setDraft(result.draft);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Não foi possível gerar a resposta.");
    } finally {
      setAiLoading(false);
    }
  }

  async function removeConversation(id: string) {
    await db.from("conversations").delete().eq("id", id);
    if (activeId === id) {
      setActiveId(null);
      setMessages([]);
    }
    loadConversations();
  }

  const active = conversations.find((c) => c.id === activeId);

  return (
    <div className="flex h-full overflow-hidden rounded-2xl border border-border bg-card">
      {/* Conversation list */}
      <aside className="w-72 shrink-0 overflow-y-auto border-r border-border">
        <p className="border-b border-border px-4 py-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          💬 Conversas ({conversations.length})
        </p>
        {conversations.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">
            Nenhuma conversa ainda. Quando um visitante abrir o chat no site, aparece aqui.
          </p>
        )}
        {conversations.map((c) => (
          <div
            key={c.id}
            className={`group flex w-full items-center gap-2 border-b border-border px-4 py-3 text-left transition-colors ${
              activeId === c.id ? "bg-primary/5" : "hover:bg-accent"
            }`}
          >
            <button
              onClick={() => setActiveId(c.id)}
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                {c.visitor_name.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">{c.visitor_name}</span>
                <span className="block text-xs text-muted-foreground">
                  {new Date(c.last_message_at).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </span>
            </button>
            <button
              onClick={() => copyConversationLink(c.id)}
              aria-label="Copiar link direto desta conversa"
              title="Copiar link direto desta conversa"
              className="hidden text-muted-foreground hover:text-foreground group-hover:block"
            >
              {copiedId === c.id ? (
                <Check className="h-4 w-4 text-primary" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={() => removeConversation(c.id)}
              aria-label="Excluir conversa"
              className="hidden text-muted-foreground hover:text-destructive group-hover:block"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </aside>

      {/* Chat pane */}
      <main className="flex flex-1 flex-col">
        {!active ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
            <MessageCircle className="h-10 w-10" />
            <p className="text-sm">Selecione uma conversa para responder</p>
          </div>
        ) : (
          <>
            <div className="border-b border-border px-5 py-3">
              <p className="font-bold">{active.visitor_name}</p>
              <p className="text-xs text-muted-foreground">Visitante do site</p>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-5">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.sender === "admin"
                      ? "ml-auto rounded-br-sm bg-primary text-primary-foreground"
                      : "mr-auto rounded-bl-sm border border-border bg-card"
                  }`}
                >
                  {m.content}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {aiError && (
              <p className="border-t border-border bg-destructive/10 px-4 py-2 text-xs font-semibold text-destructive">
                {aiError}
              </p>
            )}
            <div className="flex items-center gap-2 border-t border-border p-4">
              <button
                onClick={draftWithAI}
                disabled={messages.length === 0 || aiLoading}
                aria-label="Redigir resposta com IA"
                title="Redigir resposta com IA a partir desta conversa"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
              >
                <Sparkles className={`h-4 w-4 ${aiLoading ? "animate-pulse" : ""}`} />
              </button>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && reply()}
                placeholder={
                  aiLoading ? "Gerando resposta com IA..." : `Responder ${active.visitor_name}...`
                }
                disabled={aiLoading}
                className="flex-1 rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
              />
              <button
                onClick={reply}
                disabled={!draft.trim()}
                aria-label="Enviar resposta"
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
