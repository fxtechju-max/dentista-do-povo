import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Lightbulb, Search, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  TUTORIAL_GROUPS,
  TUTORIAL_SECTIONS,
  TUTORIAL_UPDATES,
  type TutorialSection,
} from "@/lib/tutorial";

export const NOVIDADES = "novidades";

const formatDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR");

// Seções citadas em atualizações dos últimos 14 dias ganham a etiqueta NOVO.
const RECENT_MS = 14 * 24 * 60 * 60 * 1000;
const recentSections = new Set(
  TUTORIAL_UPDATES.filter(
    (u) => Date.now() - new Date(`${u.date}T12:00:00`).getTime() < RECENT_MS,
  ).flatMap((u) => u.sections),
);

function matches(section: TutorialSection, query: string) {
  const text = [
    section.title,
    section.summary,
    ...section.steps.flatMap((s) => [s.title, s.text]),
    ...(section.tips ?? []),
  ]
    .join(" ")
    .toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => text.includes(word));
}

/** Tela do Tutorial. `active` é o id da seção aberta (ou "novidades"). */
export function TutorialView({
  active,
  onNavigate,
}: {
  active: string;
  onNavigate: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [navOpen, setNavOpen] = useState(false);

  const visible = useMemo(
    () => (query.trim() ? TUTORIAL_SECTIONS.filter((s) => matches(s, query)) : TUTORIAL_SECTIONS),
    [query],
  );
  const section = TUTORIAL_SECTIONS.find((s) => s.id === active);

  function open(id: string) {
    setNavOpen(false);
    onNavigate(id);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="animate-in fade-in duration-300">
      <PageHeader
        title="📘 Tutorial"
        description="Explicações de cada módulo, passo a passo, e as novidades de cada atualização."
      />

      <div className="mt-5 grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar no tutorial..."
              className="bg-card pl-9"
            />
          </div>

          <button
            type="button"
            onClick={() => setNavOpen((o) => !o)}
            aria-expanded={navOpen}
            className="flex w-full items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-left text-sm font-semibold lg:hidden"
          >
            <span className="truncate">
              {section ? `${section.emoji} ${section.title}` : "✨ Novidades"}
            </span>
            <span className="text-xs text-primary">
              {navOpen ? "Fechar ▲" : "Todas as seções ▼"}
            </span>
          </button>
          <nav
            className={`${navOpen || query.trim() ? "block" : "hidden"} rounded-2xl border border-border bg-card p-2 lg:block`}
          >
            <button
              type="button"
              onClick={() => open(NOVIDADES)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold transition-colors ${
                active === NOVIDADES ? "bg-primary text-primary-foreground" : "hover:bg-accent"
              }`}
            >
              <Sparkles className="h-4 w-4" /> Novidades
              <span className="ml-auto text-xs opacity-80">{TUTORIAL_UPDATES.length}</span>
            </button>

            {TUTORIAL_GROUPS.map((group) => {
              const items = visible.filter((s) => s.group === group.id);
              if (!items.length) return null;
              return (
                <div key={group.id} className="mt-3">
                  <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    {group.label}
                  </p>
                  {items.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => open(s.id)}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${
                        active === s.id
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "hover:bg-accent"
                      }`}
                    >
                      <span>{s.emoji}</span>
                      <span className="truncate">{s.title}</span>
                      {recentSections.has(s.id) && (
                        <span
                          className={`ml-auto rounded px-1.5 py-0.5 text-[9px] font-extrabold ${
                            active === s.id
                              ? "bg-primary-foreground text-primary"
                              : "bg-primary text-primary-foreground"
                          }`}
                        >
                          NOVO
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              );
            })}
            {visible.length === 0 && (
              <p className="px-3 py-4 text-sm text-muted-foreground">
                Nada encontrado para “{query}”.
              </p>
            )}
          </nav>
        </aside>

        <main className="min-w-0">
          {section ? <SectionView section={section} onOpen={open} /> : <Updates onOpen={open} />}
        </main>
      </div>
    </div>
  );
}

function Updates({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 text-lg font-extrabold">
          <Sparkles className="h-5 w-5 text-primary" /> Novidades do sistema
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cada atualização ganha um tutorial aqui, da mais recente para a mais antiga.
        </p>
      </div>
      <ol className="relative space-y-4 border-l-2 border-primary/30 pl-6">
        {TUTORIAL_UPDATES.map((u) => (
          <li
            key={`${u.date}-${u.title}`}
            className="relative rounded-2xl border border-border bg-card p-5"
          >
            <span className="absolute -left-[33px] top-6 h-4 w-4 rounded-full border-4 border-background bg-primary" />
            <p className="text-xs font-semibold text-muted-foreground">{formatDate(u.date)}</p>
            <h3 className="mt-0.5 font-extrabold">{u.title}</h3>
            <ul className="mt-3 space-y-1.5">
              {u.items.map((item) => (
                <li key={item} className="flex gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              {u.sections.map((id) => {
                const s = TUTORIAL_SECTIONS.find((x) => x.id === id);
                return s ? (
                  <Button key={id} variant="outline" size="sm" onClick={() => onOpen(id)}>
                    {s.emoji} Ver tutorial: {s.title}
                  </Button>
                ) : null;
              })}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function SectionView({
  section,
  onOpen,
}: {
  section: TutorialSection;
  onOpen: (id: string) => void;
}) {
  const group = TUTORIAL_GROUPS.find((g) => g.id === section.group);
  const updates = TUTORIAL_UPDATES.filter((u) => u.sections.includes(section.id));
  const index = TUTORIAL_SECTIONS.findIndex((s) => s.id === section.id);
  const next = TUTORIAL_SECTIONS[index + 1];

  return (
    <article className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {group?.label}
        </p>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-2xl font-extrabold">
            {section.emoji} {section.title}
          </h2>
          {section.to && (
            <Button asChild size="sm">
              <Link to={section.to}>
                Abrir módulo <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
        <p className="mt-2 text-muted-foreground">{section.summary}</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="font-extrabold">Passo a passo</h3>
        <ol className="mt-4 space-y-4">
          {section.steps.map((step, i) => (
            <li key={step.title} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground">
                {i + 1}
              </span>
              <div>
                <p className="font-bold">{step.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {section.tips?.length ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-700 dark:bg-amber-950/40">
          <h3 className="flex items-center gap-2 font-extrabold text-amber-800 dark:text-amber-300">
            <Lightbulb className="h-4 w-4" /> Dicas
          </h3>
          <ul className="mt-2 space-y-1.5 text-sm">
            {section.tips.map((tip) => (
              <li key={tip}>• {tip}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {updates.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="flex items-center gap-2 font-extrabold">
            <Sparkles className="h-4 w-4 text-primary" /> Atualizações deste módulo
          </h3>
          <ul className="mt-3 space-y-3">
            {updates.map((u) => (
              <li key={`${u.date}-${u.title}`} className="text-sm">
                <p className="flex items-center gap-2 font-bold">
                  <Badge variant="secondary">{formatDate(u.date)}</Badge> {u.title}
                </p>
                <ul className="mt-1 space-y-0.5 pl-1 text-muted-foreground">
                  {u.items.map((item) => (
                    <li key={item}>– {item}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}

      {next && (
        <button
          type="button"
          onClick={() => onOpen(next.id)}
          className="flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent"
        >
          <span className="text-sm text-muted-foreground">
            Próximo:{" "}
            <b className="text-foreground">
              {next.emoji} {next.title}
            </b>
          </span>
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </article>
  );
}
