import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Clock,
  Inbox,
  Link2,
  MessageCircle,
  MessagesSquare,
  Search,
  Send,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import { db } from "@/integrations/mysql/client";
import { draftSupportReply } from "@/lib/admin/functions";
import {
  getSupportInbox,
  markSupportRead,
  type InboxConversation,
} from "@/lib/support-inbox.functions";
import { DEFAULT_CLINIC_WHATSAPP } from "@/lib/whatsapp-link";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/suporte")({
  validateSearch: (search: Record<string, unknown>) => {
    const conversationId = search["conversationId"];
    return typeof conversationId === "string" ? { conversationId } : {};
  },
  component: Suporte,
});

type Message = {
  id: string;
  conversation_id: string;
  sender: "visitor" | "admin";
  content: string;
  created_at: string;
};

type Filter = "todas" | "sem_resposta" | "respondidas";

const AVATAR_COLORS = [
  "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
];

function avatarColor(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length]!;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (
    (parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")
  ).toUpperCase();
}

function Avatar({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${avatarColor(name)} ${
        size === "lg" ? "h-11 w-11 text-sm" : "h-10 w-10 text-xs"
      }`}
    >
      {initials(name) || "?"}
    </span>
  );
}

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

function shortTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (sameDay(d, now)) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, now)) return "Hoje";
  if (sameDay(d, yesterday)) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

function conversationLink(id: string) {
  return `${window.location.origin}/admin/suporte?conversationId=${id}`;
}

function Suporte() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [inbox, setInbox] = useState<InboxConversation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("todas");
  const [copied, setCopied] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InboxConversation | null>(null);
  const [whatsapp, setWhatsapp] = useState(DEFAULT_CLINIC_WHATSAPP);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeIdRef = useRef<string | null>(null);
  const seen = useRef<Map<string, string> | null>(null);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    if (search.conversationId) setActiveId(search.conversationId);
  }, [search.conversationId]);

  useEffect(() => {
    db.from("clinic_settings")
      .select("whatsapp_number, phone")
      .eq("id", "default")
      .maybeSingle()
      .then(({ data }) => {
        const n = (data as { whatsapp_number: string | null; phone: string | null } | null) ?? null;
        if (n?.whatsapp_number || n?.phone) setWhatsapp((n.whatsapp_number || n.phone)!);
      });
  }, []);

  const notifyAdmin = useCallback(
    (c: InboxConversation) => {
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
      if (document.visibilityState === "visible" && activeIdRef.current === c.id) return;
      const n = new Notification(`Nova mensagem de ${c.visitor_name}`, {
        body: c.last_content ?? "",
        tag: `ddp-conversation-${c.id}`,
        icon: "/favicon.ico",
      });
      n.onclick = () => {
        window.focus();
        navigate({ to: "/admin/suporte", search: { conversationId: c.id } });
        n.close();
      };
    },
    [navigate],
  );

  const loadInbox = useCallback(async () => {
    const result = await getSupportInbox().catch(() => null);
    if (!result) return;
    setInbox(result.data);
    setLoaded(true);
    const previous = seen.current;
    seen.current = new Map(result.data.map((c) => [c.id, c.last_message_at]));
    if (!previous) return;
    for (const c of result.data)
      if (c.unread && previous.get(c.id) !== c.last_message_at) notifyAdmin(c);
  }, [notifyAdmin]);

  // Lista e conversa aberta se atualizam sozinhas (sem sobrepor consultas).
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      if (stopped) return;
      if (document.visibilityState === "visible") {
        await loadInbox();
        const id = activeIdRef.current;
        if (id && !stopped) {
          const { data } = await db
            .from("messages")
            .select("id, conversation_id, sender, content, created_at")
            .eq("conversation_id", id)
            .order("created_at");
          if (!stopped && activeIdRef.current === id && data) setMessages(data as Message[]);
        }
      }
      if (!stopped) timer = setTimeout(refresh, 3000);
    }
    void refresh();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [loadInbox]);

  // Abrir conversa: carrega mensagens na hora.
  useEffect(() => {
    setMessages([]);
    setAiError(null);
    if (!activeId) return;
    db.from("messages")
      .select("id, conversation_id, sender, content, created_at")
      .eq("conversation_id", activeId)
      .order("created_at")
      .then(({ data }) => {
        if (data && activeIdRef.current === activeId) setMessages(data as Message[]);
      });
  }, [activeId]);

  // Conversa aberta conta como lida (o botão flutuante deixa de avisar).
  useEffect(() => {
    if (activeId)
      void markSupportRead({ data: { id: activeId } })
        .then(() =>
          setInbox((list) => list.map((c) => (c.id === activeId ? { ...c, unread: false } : c))),
        )
        .catch(() => {});
  }, [activeId, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, activeId]);

  // Caixa de texto cresce com o conteúdo.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [draft]);

  const counts = useMemo(
    () => ({
      todas: inbox.length,
      sem_resposta: inbox.filter((c) => c.unread || c.last_sender === "visitor").length,
      respondidas: inbox.filter((c) => c.last_sender === "admin").length,
      hoje: inbox.filter((c) => sameDay(new Date(c.last_message_at), new Date())).length,
    }),
    [inbox],
  );

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inbox.filter(
      (c) =>
        (filter === "todas" ||
          (filter === "sem_resposta" && (c.unread || c.last_sender === "visitor")) ||
          (filter === "respondidas" && c.last_sender === "admin")) &&
        (!q ||
          c.visitor_name.toLowerCase().includes(q) ||
          (c.last_content ?? "").toLowerCase().includes(q)),
    );
  }, [inbox, filter, query]);

  const active = inbox.find((c) => c.id === activeId) ?? null;

  const grouped = useMemo(() => {
    const out: { day: string; items: Message[] }[] = [];
    for (const m of messages) {
      const day = dayLabel(m.created_at);
      const last = out.at(-1);
      if (last && last.day === day) last.items.push(m);
      else out.push({ day, items: [m] });
    }
    return out;
  }, [messages]);

  const quickReplies = useMemo(
    () => [
      "Olá! Tudo bem? Como posso te ajudar?",
      "Pode me passar seu telefone para agendarmos sua avaliação?",
      "Nosso horário é de segunda a sábado, das 8h às 19h. Urgências 24h.",
      `Se preferir, fale com a gente no WhatsApp: ${whatsapp}`,
      "Obrigado pelo contato! Qualquer dúvida, estamos à disposição. 😊",
    ],
    [whatsapp],
  );

  function openConversation(id: string) {
    setActiveId(id);
    setDraft("");
    navigate({ to: "/admin/suporte", search: { conversationId: id }, replace: true });
  }

  function closeConversation() {
    setActiveId(null);
    navigate({ to: "/admin/suporte", search: {}, replace: true });
  }

  async function reply() {
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
      {
        id: `tmp-${Date.now()}`,
        conversation_id: activeId,
        sender: "admin",
        content,
        created_at: new Date().toISOString(),
      },
    ]);
    void loadInbox();
    textareaRef.current?.focus();
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
      textareaRef.current?.focus();
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Não foi possível gerar a resposta.");
    } finally {
      setAiLoading(false);
    }
  }

  async function copyLink(id: string) {
    try {
      await navigator.clipboard.writeText(conversationLink(id));
      setCopied(true);
      toast.success("Link da conversa copiado.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  }

  async function removeConversation() {
    if (!deleteTarget) return;
    const { error } = await db.from("conversations").delete().eq("id", deleteTarget.id);
    if (!error) toast.success("Conversa excluída.");
    if (activeId === deleteTarget.id) closeConversation();
    setDeleteTarget(null);
    void loadInbox();
  }

  const FILTERS: { id: Filter; label: string; count: number }[] = [
    { id: "todas", label: "Todas", count: counts.todas },
    { id: "sem_resposta", label: "Sem resposta", count: counts.sem_resposta },
    { id: "respondidas", label: "Respondidas", count: counts.respondidas },
  ];

  return (
    <div className="animate-in fade-in space-y-4 duration-300">
      {/* Indicadores */}
      <div className={`grid-cols-2 gap-3 lg:grid-cols-4 ${active ? "hidden md:grid" : "grid"}`}>
        {[
          {
            icon: MessagesSquare,
            label: "Conversas",
            value: counts.todas,
            tone: "bg-primary/10 text-primary",
          },
          {
            icon: Inbox,
            label: "Sem resposta",
            value: counts.sem_resposta,
            tone: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
            onClick: () => setFilter("sem_resposta"),
          },
          {
            icon: CheckCheck,
            label: "Respondidas",
            value: counts.respondidas,
            tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
            onClick: () => setFilter("respondidas"),
          },
          {
            icon: Clock,
            label: "Ativas hoje",
            value: counts.hoje,
            tone: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
          },
        ].map((k, i) => (
          <button
            key={k.label}
            type="button"
            onClick={k.onClick}
            disabled={!k.onClick}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 fill-mode-both enabled:hover:-translate-y-0.5 enabled:hover:shadow-md disabled:cursor-default"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${k.tone}`}
            >
              <k.icon className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-2xl font-extrabold leading-none tabular-nums">
                {k.value}
              </span>
              <span className="mt-1 block text-xs font-semibold text-muted-foreground">
                {k.label}
              </span>
            </span>
          </button>
        ))}
      </div>

      <div className="flex h-[calc(100dvh-7rem)] min-h-[26rem] md:h-[calc(100dvh-15rem)] md:min-h-[30rem] overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:h-[calc(100dvh-13rem)]">
        {/* Lista de conversas */}
        <aside
          className={`w-full shrink-0 flex-col border-r border-border md:flex md:w-80 lg:w-96 ${
            active ? "hidden" : "flex"
          }`}
        >
          <div className="space-y-3 border-b border-border p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar nome ou mensagem..."
                className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex gap-1 rounded-xl bg-muted p-1">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-1.5 py-1.5 text-xs font-bold transition-all ${
                    filter === f.id
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.label}
                  <span
                    className={`rounded-full px-1.5 text-[10px] tabular-nums ${
                      filter === f.id ? "bg-primary text-primary-foreground" : "bg-background"
                    }`}
                  >
                    {f.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <ul className="flex-1 overflow-y-auto">
            {!loaded ? (
              Array.from({ length: 5 }).map((_, i) => (
                <li key={i} className="flex items-center gap-3 border-b border-border px-4 py-3">
                  <span className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                  <span className="flex-1 space-y-2">
                    <span className="block h-3 w-1/2 animate-pulse rounded bg-muted" />
                    <span className="block h-3 w-3/4 animate-pulse rounded bg-muted" />
                  </span>
                </li>
              ))
            ) : list.length === 0 ? (
              <li className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  {inbox.length ? (
                    <Search className="h-6 w-6" />
                  ) : (
                    <MessageCircle className="h-6 w-6" />
                  )}
                </span>
                <p className="text-sm font-semibold">
                  {inbox.length ? "Nada encontrado" : "Nenhuma conversa ainda"}
                </p>
                <p className="max-w-56 text-xs text-muted-foreground">
                  {inbox.length
                    ? "Tente outra busca ou outro filtro."
                    : "Quando um visitante abrir o chat no site, a conversa aparece aqui."}
                </p>
              </li>
            ) : (
              list.map((c, i) => {
                const selected = c.id === activeId;
                const waiting = c.last_sender === "visitor";
                return (
                  <li
                    key={c.id}
                    className="animate-in fade-in slide-in-from-left-1 fill-mode-both"
                    style={{ animationDelay: `${Math.min(i, 10) * 20}ms` }}
                  >
                    <button
                      type="button"
                      onClick={() => openConversation(c.id)}
                      className={`relative flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors ${
                        selected ? "bg-primary/[0.07]" : "hover:bg-accent/60"
                      }`}
                    >
                      {selected && (
                        <span className="absolute inset-y-0 left-0 w-1 rounded-r bg-primary" />
                      )}
                      <span className="relative">
                        <Avatar name={c.visitor_name} />
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
                          <span
                            className={`shrink-0 text-[11px] ${c.unread ? "font-bold text-primary" : "text-muted-foreground"}`}
                          >
                            {shortTime(c.last_message_at)}
                          </span>
                        </span>
                        <span className="mt-0.5 flex items-center gap-1.5">
                          <span
                            className={`line-clamp-1 flex-1 text-xs ${c.unread ? "text-foreground" : "text-muted-foreground"}`}
                          >
                            {c.last_sender === "admin" && (
                              <CheckCheck className="mr-1 inline h-3.5 w-3.5 text-primary" />
                            )}
                            {c.last_content ?? "Sem mensagens ainda"}
                          </span>
                          {waiting && (
                            <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                              Aguardando
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </aside>

        {/* Conversa */}
        <section className={`min-w-0 flex-1 flex-col ${active ? "flex" : "hidden md:flex"}`}>
          {!active ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-muted/20 p-8 text-center">
              <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 text-primary animate-in zoom-in-50 duration-500">
                <MessagesSquare className="h-9 w-9" />
              </span>
              <p className="text-lg font-bold">Central de atendimento</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Escolha uma conversa à esquerda para ler e responder. Novas mensagens chegam
                sozinhas, sem recarregar a página.
              </p>
              {counts.sem_resposta > 0 && (
                <Button className="mt-2" onClick={() => setFilter("sem_resposta")}>
                  <Inbox className="h-4 w-4" /> Ver {counts.sem_resposta} sem resposta
                </Button>
              )}
            </div>
          ) : (
            <>
              <header className="flex items-center gap-3 border-b border-border px-3 py-3 sm:px-5">
                <button
                  type="button"
                  onClick={closeConversation}
                  aria-label="Voltar para a lista"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent md:hidden"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <Avatar name={active.visitor_name} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{active.visitor_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    Visitante do site · desde{" "}
                    {new Date(active.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyLink(active.id)}
                  title="Copiar link desta conversa"
                  aria-label="Copiar link desta conversa"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Link2 className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteTarget(active)}
                  title="Excluir conversa"
                  aria-label="Excluir conversa"
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </header>

              <div className="flex-1 overflow-y-auto bg-muted/30 px-3 py-4 sm:px-6">
                {grouped.map((g) => (
                  <div key={g.day} className="space-y-2">
                    <div className="sticky top-0 z-10 flex justify-center py-2">
                      <span className="rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold text-muted-foreground shadow-sm">
                        {g.day}
                      </span>
                    </div>
                    {g.items.map((m, i) => {
                      const mine = m.sender === "admin";
                      const prev = g.items[i - 1];
                      const continued = prev?.sender === m.sender;
                      return (
                        <div
                          key={m.id}
                          className={`flex animate-in fade-in slide-in-from-bottom-1 duration-200 ${mine ? "justify-end" : "justify-start"} ${continued ? "!mt-0.5" : ""}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm shadow-sm sm:max-w-[70%] ${
                              mine
                                ? `bg-primary text-primary-foreground ${continued ? "" : "rounded-br-md"}`
                                : `border border-border bg-card ${continued ? "" : "rounded-bl-md"}`
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{m.content}</p>
                            <p
                              className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${mine ? "opacity-75" : "text-muted-foreground"}`}
                            >
                              {mine && "Você · "}
                              {clock(m.created_at)}
                              {mine && <CheckCheck className="h-3 w-3" />}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {aiError && (
                <p className="border-t border-border bg-destructive/10 px-4 py-2 text-xs font-semibold text-destructive">
                  {aiError}
                </p>
              )}

              <div className="border-t border-border bg-card p-3">
                <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
                  <span className="flex shrink-0 items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    <Zap className="h-3.5 w-3.5" /> Rápidas
                  </span>
                  {quickReplies.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setDraft(r);
                        textareaRef.current?.focus();
                      }}
                      title={r}
                      className="max-w-56 shrink-0 truncate rounded-full border border-border bg-background px-3 py-1 text-xs transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    onClick={draftWithAI}
                    disabled={messages.length === 0 || aiLoading}
                    title="Sugerir resposta com IA"
                    aria-label="Sugerir resposta com IA"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary disabled:opacity-50"
                  >
                    <Sparkles
                      className={`h-4 w-4 ${aiLoading ? "animate-pulse text-primary" : ""}`}
                    />
                  </button>
                  <textarea
                    ref={textareaRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void reply();
                      }
                    }}
                    rows={1}
                    placeholder={
                      aiLoading
                        ? "Gerando resposta com IA..."
                        : `Responder ${active.visitor_name}...`
                    }
                    disabled={aiLoading}
                    className="min-h-11 flex-1 resize-none rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={reply}
                    disabled={!draft.trim() || sending}
                    aria-label="Enviar resposta"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20 transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:shadow-none"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-1.5 hidden text-[11px] text-muted-foreground sm:block">
                  Enter envia · Shift + Enter quebra linha
                </p>
              </div>
            </>
          )}
        </section>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir a conversa com {deleteTarget?.visitor_name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Todas as mensagens desta conversa serão apagadas. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={removeConversation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
