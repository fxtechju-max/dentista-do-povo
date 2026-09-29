import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCheck,
  ExternalLink,
  MessageCircle,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { db } from "@/integrations/mysql/client";
import { draftSupportReply } from "@/lib/admin/functions";
import {
  getSupportInbox,
  markSupportRead,
  type InboxConversation,
} from "@/lib/support-inbox.functions";

type Message = { id: string; sender: "visitor" | "admin"; content: string; created_at: string };

const time = (iso: string) => {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};

/**
 * Botão flutuante do painel: mostra quantas mensagens do suporte estão sem
 * resposta, avisa quando chega uma nova e permite ler e responder (com
 * sugestão da IA) sem sair da tela atual.
 */
export function SupportFab() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [inbox, setInbox] = useState<InboxConversation[]>([]);
  const [unread, setUnread] = useState(0);
  const [tab, setTab] = useState<"nao_lidas" | "todas">("nao_lidas");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [bubble, setBubble] = useState<string | null>(null);
  const seen = useRef<Map<string, string> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<string | null>(null);
  useEffect(() => {
    activeRef.current = open ? activeId : null;
  }, [open, activeId]);

  const refreshInbox = useCallback(async () => {
    const result = await getSupportInbox().catch(() => null);
    if (!result) return;
    setInbox(result.data);
    setUnread(result.unread);
    // Mensagem nova de visitante desde a última consulta → balão de aviso.
    const previous = seen.current;
    seen.current = new Map(result.data.map((c) => [c.id, c.last_message_at]));
    if (!previous) return;
    const fresh = result.data.find(
      (c) => c.unread && previous.get(c.id) !== c.last_message_at && activeRef.current !== c.id,
    );
    if (!fresh) return;
    setBubble(`${fresh.visitor_name}: ${fresh.last_content ?? "nova mensagem"}`);
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "granted" &&
      document.visibilityState !== "visible"
    ) {
      const n = new Notification(`Nova mensagem de ${fresh.visitor_name}`, {
        body: fresh.last_content ?? "",
        tag: `ddp-conversation-${fresh.id}`,
        icon: "/favicon.ico",
      });
      n.onclick = () => {
        window.focus();
        setOpen(true);
        setActiveId(fresh.id);
        n.close();
      };
    }
  }, []);

  // Consulta leve a cada 10s (só com a aba visível).
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    async function tick() {
      if (stopped) return;
      if (document.visibilityState === "visible") await refreshInbox();
      if (!stopped) timer = setTimeout(tick, open ? 4000 : 10000);
    }
    void tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [refreshInbox, open]);

  useEffect(() => {
    if (!bubble) return;
    const t = setTimeout(() => setBubble(null), 7000);
    return () => clearTimeout(t);
  }, [bubble]);

  // Conversa aberta: mensagens a cada 3s e marca como lida.
  useEffect(() => {
    if (!open || !activeId) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let lastCount = -1;
    async function tick() {
      if (stopped) return;
      const { data } = await db
        .from("messages")
        .select("id, sender, content, created_at")
        .eq("conversation_id", activeId!)
        .order("created_at");
      if (!stopped && data) {
        setMessages(data as Message[]);
        if (data.length !== lastCount) {
          lastCount = data.length;
          await markSupportRead({ data: { id: activeId! } }).catch(() => {});
          void refreshInbox();
        }
      }
      if (!stopped) timer = setTimeout(tick, 3000);
    }
    void tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [open, activeId, refreshInbox]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, activeId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function openConversation(id: string) {
    setMessages([]);
    setDraft("");
    setAiError(null);
    setActiveId(id);
  }

  async function send() {
    const content = draft.trim();
    if (!content || !activeId || sending) return;
    setSending(true);
    const { error } = await db
      .from("messages")
      .insert({ conversation_id: activeId, sender: "admin", content });
    setSending(false);
    if (error) return;
    setDraft("");
    setMessages((prev) => [
      ...prev,
      { id: `tmp-${Date.now()}`, sender: "admin", content, created_at: new Date().toISOString() },
    ]);
    void markSupportRead({ data: { id: activeId } });
    void refreshInbox();
  }

  async function suggest() {
    const conversation = inbox.find((c) => c.id === activeId);
    if (!conversation || !messages.length || aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const result = await draftSupportReply({
        data: {
          visitorName: conversation.visitor_name,
          messages: messages.map((m) => ({ sender: m.sender, content: m.content })),
        },
      });
      setDraft(result.draft);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Não foi possível sugerir a resposta.");
    } finally {
      setAiLoading(false);
    }
  }

  const active = inbox.find((c) => c.id === activeId) ?? null;
  const list = tab === "nao_lidas" ? inbox.filter((c) => c.unread) : inbox;

  return (
    <div className="print:hidden">
      {bubble && !open && (
        <button
          type="button"
          onClick={() => {
            setBubble(null);
            setOpen(true);
            setTab("nao_lidas");
          }}
          className="fixed bottom-24 right-5 z-50 max-w-[17rem] rounded-2xl rounded-br-sm border border-border bg-card px-4 py-3 text-left shadow-xl animate-in fade-in slide-in-from-bottom-3 duration-300"
        >
          <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-primary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" /> Nova mensagem
          </span>
          <span className="mt-1 line-clamp-2 block text-sm">{bubble}</span>
        </button>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={
          open
            ? "Fechar mensagens do suporte"
            : `Mensagens do suporte${unread ? ` — ${unread} sem resposta` : ""}`
        }
        className="group fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-all duration-200 hover:scale-105 active:scale-95"
      >
        {unread > 0 && !open && (
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/40" />
        )}
        <span className="relative transition-transform duration-300 group-hover:rotate-6">
          {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        </span>
        {unread > 0 && !open && (
          <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white ring-2 ring-background animate-in zoom-in duration-300">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Mensagens do suporte"
          className="fixed inset-x-3 bottom-24 z-50 flex h-[min(34rem,calc(100dvh-8rem))] origin-bottom-right flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200 sm:inset-x-auto sm:right-5 sm:w-[23rem]"
        >
          <div className="flex items-center gap-2 bg-primary px-3 py-3 text-primary-foreground">
            {active ? (
              <button
                type="button"
                onClick={() => setActiveId(null)}
                aria-label="Voltar para a lista"
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/15"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                <MessageCircle className="h-4 w-4" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">
                {active ? active.visitor_name : "Mensagens do suporte"}
              </p>
              <p className="truncate text-[11px] opacity-80">
                {active
                  ? "Visitante do site"
                  : unread
                    ? `${unread} conversa(s) aguardando resposta`
                    : "Tudo respondido"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate({
                  to: "/admin/suporte",
                  search: active ? { conversationId: active.id } : {},
                });
              }}
              title="Abrir no módulo Suporte"
              aria-label="Abrir no módulo Suporte"
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/15"
            >
              <ExternalLink className="h-4 w-4" />
            </button>
          </div>

          {!active ? (
            <>
              <div className="flex gap-1 border-b border-border p-2">
                {(
                  [
                    ["nao_lidas", `Sem resposta${unread ? ` (${unread})` : ""}`],
                    ["todas", "Todas"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                      tab === id
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <ul className="flex-1 overflow-y-auto">
                {list.length === 0 ? (
                  <li className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
                    <CheckCheck className="h-8 w-8 text-emerald-500" />
                    {tab === "nao_lidas"
                      ? "Nenhuma mensagem esperando resposta."
                      : "Nenhuma conversa ainda. Quando alguém usar o chat do site, aparece aqui."}
                  </li>
                ) : (
                  list.map((c, i) => (
                    <li
                      key={c.id}
                      className="animate-in fade-in slide-in-from-bottom-1 fill-mode-both"
                      style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}
                    >
                      <button
                        type="button"
                        onClick={() => openConversation(c.id)}
                        className="flex w-full items-start gap-3 border-b border-border px-3 py-3 text-left transition-colors hover:bg-accent"
                      >
                        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                          {c.visitor_name.charAt(0).toUpperCase()}
                          {c.unread && (
                            <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-red-500 ring-2 ring-card" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span
                              className={`truncate text-sm ${c.unread ? "font-extrabold" : "font-semibold"}`}
                            >
                              {c.visitor_name}
                            </span>
                            <span className="shrink-0 text-[11px] text-muted-foreground">
                              {time(c.last_message_at)}
                            </span>
                          </span>
                          <span
                            className={`mt-0.5 line-clamp-1 block text-xs ${c.unread ? "text-foreground" : "text-muted-foreground"}`}
                          >
                            {c.last_sender === "admin" ? "Você: " : ""}
                            {c.last_content ?? "Sem mensagens"}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </>
          ) : (
            <>
              <div className="flex-1 space-y-2 overflow-y-auto bg-muted/30 p-3">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm animate-in fade-in duration-200 ${
                      m.sender === "admin"
                        ? "ml-auto rounded-br-sm bg-primary text-primary-foreground"
                        : "mr-auto rounded-bl-sm border border-border bg-card"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    <p
                      className={`mt-0.5 text-right text-[10px] ${m.sender === "admin" ? "opacity-70" : "text-muted-foreground"}`}
                    >
                      {time(m.created_at)}
                    </p>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              {aiError && (
                <p className="border-t border-border bg-destructive/10 px-3 py-1.5 text-[11px] font-semibold text-destructive">
                  {aiError}
                </p>
              )}
              <div className="flex items-end gap-2 border-t border-border p-2">
                <button
                  type="button"
                  onClick={suggest}
                  disabled={!messages.length || aiLoading}
                  title="Sugerir resposta com IA"
                  aria-label="Sugerir resposta com IA"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-primary disabled:opacity-50"
                >
                  <Sparkles
                    className={`h-4 w-4 ${aiLoading ? "animate-pulse text-primary" : ""}`}
                  />
                </button>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  rows={1}
                  placeholder={aiLoading ? "Escrevendo sugestão..." : "Escreva a resposta..."}
                  disabled={aiLoading}
                  className="max-h-28 min-h-10 flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={send}
                  disabled={!draft.trim() || sending}
                  aria-label="Enviar resposta"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform active:scale-95 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
          {!active && (
            <Link
              to="/admin/suporte"
              onClick={() => setOpen(false)}
              className="border-t border-border py-2.5 text-center text-xs font-bold text-primary hover:bg-accent"
            >
              Abrir o módulo Suporte
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
