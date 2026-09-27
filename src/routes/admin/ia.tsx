import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Sparkles, Send } from "lucide-react";
import { db } from "@/integrations/mysql/client";
import { askAssistant } from "@/lib/admin/functions";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/ia")({
  component: Ia,
});

type ChatMessage = { role: "user" | "assistant"; content: string };

function Ia() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const content = draft.trim();
    if (!content || loading) return;
    setError(null);
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setDraft("");
    setLoading(true);
    try {
      const result = await askAssistant({
        data: { messages: next },

      });
      setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível falar com o assistente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-in fade-in flex h-full flex-col duration-300">
      <PageHeader
        title="🤖 IA"
        description="Assistente interno para tarefas do dia a dia da clínica."
      />

      <div className="mt-4 flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <Sparkles className="h-8 w-8" />
              <p className="text-sm">Pergunte algo ou peça ajuda com um texto para a clínica.</p>
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
            placeholder="Digite sua pergunta..."
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
  );
}
