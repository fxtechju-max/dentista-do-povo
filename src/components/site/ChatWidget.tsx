import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { db } from "@/integrations/mysql/client";
import { secretaryAutoReply } from "@/lib/secretary.functions";

type Message = {
  id: string;
  sender: "visitor" | "admin";
  content: string;
  created_at: string;
};

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [visitorName, setVisitorName] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  // Balão de convite: aparece alguns segundos depois de abrir a página.
  const [invite, setInvite] = useState(false);
  const [inviteClosed, setInviteClosed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setInvite(true), 2500);
    return () => clearTimeout(t);
  }, []);

  // Resolve ownership on the server using the opaque visitor cookie.
  useEffect(() => {
    let cancelled = false;
    db.chat
      .resume()
      .then(({ data }) => {
        if (!cancelled && data) {
          setConversationId(data.id);
          setVisitorName(data.visitor_name);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
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
      {/* Balão "Como posso ajudar?" */}
      {invite && !inviteClosed && !open && (
        <div className="fixed bottom-[5.25rem] right-5 z-50 animate-in fade-in slide-in-from-bottom-3 zoom-in-95 duration-500">
          <div className="animate-chat-float relative">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="relative block w-60 rounded-3xl rounded-br-md border border-border bg-card px-4 py-3 pr-8 text-left shadow-xl shadow-black/10 transition-shadow hover:shadow-2xl"
            >
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Online agora
              </span>
              <span className="mt-1 block text-[15px] font-extrabold leading-snug text-foreground">
                👋 Olá! Como posso ajudar?
              </span>
              <span className="mt-0.5 block text-xs font-semibold text-primary">
                Clique aqui e fale com a gente →
              </span>
              {/* "rabinho" da nuvem apontando para o botão */}
              <span className="absolute -bottom-[7px] right-5 h-3.5 w-3.5 rotate-45 border-b border-r border-border bg-card" />
            </button>
            <button
              type="button"
              onClick={() => setInviteClosed(true)}
              aria-label="Fechar aviso"
              className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Fechar chat" : "Abrir chat de suporte"}
        className="group fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform duration-200 hover:scale-110 active:scale-95"
      >
        {!open && (
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/30 [animation-duration:2.5s]" />
        )}
        <span className="relative transition-transform duration-300 group-hover:rotate-12">
          {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        </span>
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[28rem] w-[22rem] max-w-[calc(100vw-2.5rem)] origin-bottom-right flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200">
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
