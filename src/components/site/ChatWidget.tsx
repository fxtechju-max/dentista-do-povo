import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { db } from "@/integrations/supabase/client";
import { secretaryAutoReply } from "@/lib/secretary.functions";

type Message = {
  id: string;
  sender: "visitor" | "admin";
  content: string;
  created_at: string;
};

const STORAGE_KEY = "ddp_mysql_chat";

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [visitorName, setVisitorName] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Restore existing conversation from this browser
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { id: string; name: string };
        setConversationId(saved.id);
        setVisitorName(saved.name);
      }
    } catch {
      // ignore corrupted storage
    }
  }, []);

  // Short polling works on Vercel without a persistent WebSocket server.
  useEffect(() => {
    if (!conversationId) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      if (stopped) return;
      if (open && document.visibilityState === "visible") {
        const { data } = await db
          .from("messages")
          .select("id, sender, content, created_at")
          .eq("conversation_id", conversationId!)
          .order("created_at");
        if (!stopped && data) setMessages(data as Message[]);
      }
      if (!stopped) timer = setTimeout(refresh, 3000);
    }
    void refresh();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [conversationId, open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function startConversation() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const { data, error } = await db
      .from("conversations")
      .insert({ visitor_name: trimmed })
      .select("id")
      .single();
    if (error || !data) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: data.id, name: trimmed }));
    setConversationId(data.id);
    setVisitorName(trimmed);
  }

  async function sendMessage() {
    const content = draft.trim();
    if (!content || !conversationId || sending) return;
    setSending(true);
    const { error } = await db.from("messages").insert({
      conversation_id: conversationId,
      sender: "visitor",
      content,
    });
    setSending(false);
    if (error) return;
    setDraft("");
    // Best-effort: lets the virtual secretary answer while no human has
    // taken over yet. Silently ignored if disabled or if the AI Gateway
    // isn't configured.
    secretaryAutoReply({ data: { conversationId } }).catch(() => {});
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Fechar chat" : "Abrir chat de suporte"}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[28rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          {/* Header */}
          <div className="bg-primary px-4 py-3 text-primary-foreground">
            <p className="font-bold">💬 Suporte online</p>
            <p className="text-xs opacity-80">
              Fale direto com nossa equipe — grátis e sem cadastro
            </p>
          </div>

          {!conversationId ? (
            /* Name gate */
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
              <MessageCircle className="h-10 w-10 text-primary" />
              <p className="text-center text-sm text-muted-foreground">Como podemos te chamar?</p>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && startConversation()}
                placeholder="Seu nome"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={startConversation}
                disabled={!name.trim()}
                className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                Iniciar conversa
              </button>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 space-y-2 overflow-y-auto p-4">
                {messages.length === 0 && (
                  <p className="pt-8 text-center text-sm text-muted-foreground">
                    Olá, {visitorName}! Envie sua mensagem e responderemos aqui mesmo.
                  </p>
                )}
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      m.sender === "visitor"
                        ? "ml-auto rounded-br-sm bg-primary text-primary-foreground"
                        : "mr-auto rounded-bl-sm bg-muted text-foreground"
                    }`}
                  >
                    {m.content}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Composer */}
              <div className="flex items-center gap-2 border-t border-border p-3">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  onClick={sendMessage}
                  disabled={!draft.trim() || sending}
                  aria-label="Enviar mensagem"
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
