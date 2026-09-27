import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Send, History, Search, Trash2, Plus } from "lucide-react";
import { db } from "@/integrations/supabase/client";
import { askAssistant } from "@/lib/admin/functions";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/ia")({
  component: Ia,
});

type ChatMessage = { role: "user" | "assistant"; content: string };
type HistoryEntry = { id: string; question: string; answer: string; created_at: string };

function Ia() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyQuery, setHistoryQuery] = useState("");
  const [viewing, setViewing] = useState<HistoryEntry | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadHistory() {
    const { data } = await db
      .from("ai_search_history")
      .select("id, question, answer, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    setHistory((data ?? []) as HistoryEntry[]);
  }

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    if (!viewing) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, viewing]);

  const filteredHistory = useMemo(() => {
    const q = historyQuery.trim().toLowerCase();
    if (!q) return history;
    return history.filter((h) => h.question.toLowerCase().includes(q));
  }, [history, historyQuery]);

  async function send() {
    const content = draft.trim();
    if (!content || loading) return;
    setError(null);
    setViewing(null);
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setDraft("");
    setLoading(true);
    try {
      const result = await askAssistant({
        data: { messages: next },
      });
      setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
      await db.from("ai_search_history").insert({ question: content, answer: result.reply });
      loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível falar com o assistente.");
    } finally {
      setLoading(false);
    }
  }

  async function removeHistory(id: string) {
    await db.from("ai_search_history").delete().eq("id", id);
    if (viewing?.id === id) setViewing(null);
    setHistory((prev) => prev.filter((h) => h.id !== id));
  }

  function newConversation() {
    setViewing(null);
    setMessages([]);
    setError(null);
  }

  return (
    <div className="animate-in fade-in flex h-full flex-col duration-300">
      <PageHeader
        title="🤖 IA"
        description="Assistente interno para tarefas do dia a dia da clínica."
      />

      <div className="mt-4 grid flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[280px_1fr]">
        <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between gap-2 border-b border-border p-3">
            <p className="flex items-center gap-1.5 text-sm font-bold">
              <History className="h-4 w-4" /> Histórico
            </p>
            <Button
              variant="ghost"
              size="icon"
              onClick={newConversation}
              aria-label="Nova pergunta"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={historyQuery}
                onChange={(e) => setHistoryQuery(e.target.value)}
                placeholder="Buscar no histórico..."
                className="h-8 pl-8 text-sm"
              />
            </div>
          </div>
          <div className="flex-1 space-y-1 overflow-y-auto p-2">
            {filteredHistory.length === 0 ? (
              <p className="p-4 text-center text-xs text-muted-foreground">
                {historyQuery ? "Nada encontrado." : "Nenhuma pesquisa ainda."}
              </p>
            ) : (
              filteredHistory.map((h) => (
                <div
                  key={h.id}
                  className={`group flex items-start gap-1 rounded-lg px-2 py-1.5 text-left transition-colors ${
                    viewing?.id === h.id ? "bg-primary/10" : "hover:bg-accent"
                  }`}
                >
                  <button onClick={() => setViewing(h)} className="min-w-0 flex-1 text-left">
                    <p className="line-clamp-2 text-xs font-semibold">{h.question}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {new Date(h.created_at).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </button>
                  <button
                    onClick={() => removeHistory(h.id)}
                    aria-label="Excluir do histórico"
                    className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card">
          {viewing ? (
            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              <div className="ml-auto max-w-[75%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm whitespace-pre-line text-primary-foreground">
                {viewing.question}
              </div>
              <div className="mr-auto max-w-[75%] rounded-2xl rounded-bl-sm border border-border bg-background px-4 py-2.5 text-sm whitespace-pre-line">
                {viewing.answer}
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Pesquisa de {new Date(viewing.created_at).toLocaleString("pt-BR")} · somente leitura
              </p>
            </div>
          ) : (
            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {messages.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                  <Sparkles className="h-8 w-8" />
                  <p className="text-sm">
                    Pergunte algo ou peça ajuda com um texto para a clínica.
                  </p>
                </div>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[75%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm ${
                    m.role === "user"
                      ? "ml-auto rounded-br-sm bg-primary text-primary-foreground"
                      : "mr-auto rounded-bl-sm border border-border bg-background"
                  }`}
                >
                  {m.content}
                </div>
              ))}
              {loading && (
                <div className="mr-auto flex items-center gap-1 rounded-2xl rounded-bl-sm border border-border bg-background px-4 py-2.5 text-sm text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 animate-pulse" /> Pensando...
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}

          {error && (
            <p className="border-t border-border bg-destructive/10 px-4 py-2 text-xs font-semibold text-destructive">
              {error}
            </p>
          )}

          <div className="flex items-center gap-2 border-t border-border p-4">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={
                viewing ? "Digite para começar uma nova pergunta..." : "Digite sua pergunta..."
              }
              disabled={loading}
            />
            <Button
              onClick={send}
              disabled={!draft.trim() || loading}
              size="icon"
              aria-label="Enviar"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
