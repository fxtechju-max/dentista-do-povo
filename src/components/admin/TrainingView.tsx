import { Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  GraduationCap,
  PartyPopper,
  PlayCircle,
  RotateCcw,
  Target,
  Users,
  XCircle,
} from "lucide-react";
import { trainingSteps, type Training } from "@/lib/training";
import { useTrainingProgress } from "@/lib/training-progress";
import { Button } from "@/components/ui/button";

export function TrainingView({ training }: { training: Training }) {
  const [progress, setProgress] = useTrainingProgress();
  const done = useMemo(() => new Set(progress[training.id] ?? []), [progress, training.id]);
  const all = trainingSteps(training);
  const doneCount = all.filter((s) => done.has(s)).length;
  const percent = all.length ? Math.round((doneCount / all.length) * 100) : 0;
  const nextKey = all.find((s) => !done.has(s));
  const stepRefs = useRef<Record<string, HTMLLIElement | null>>({});

  function toggle(key: string) {
    const next = new Set(done);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setProgress({ ...progress, [training.id]: [...next] });
  }

  function restart() {
    setProgress({ ...progress, [training.id]: [] });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToNext() {
    if (!nextKey) return;
    stepRefs.current[nextKey]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <article className="space-y-4">
      {/* Cabeçalho */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-primary">
            <GraduationCap className="h-4 w-4" /> Trilha guiada
          </p>
          <h2 className="mt-1 text-2xl font-extrabold leading-tight">
            {training.emoji} {training.title}
          </h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">{training.summary}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1 font-semibold shadow-sm">
              <Users className="h-3.5 w-3.5 text-primary" /> {training.audience}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1 font-semibold shadow-sm">
              <Clock className="h-3.5 w-3.5 text-primary" /> {training.duration}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1 font-semibold shadow-sm">
              <Target className="h-3.5 w-3.5 text-primary" /> {all.length} passos em{" "}
              {training.chapters.length} etapas
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 border-t border-border p-4">
          <div className="min-w-48 flex-1">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span>
                {doneCount} de {all.length} passos concluídos
              </span>
              <span className="tabular-nums text-primary">{percent}%</span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-700"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
          <div className="flex gap-2">
            {nextKey && (
              <Button size="sm" onClick={goToNext}>
                <PlayCircle className="h-4 w-4" />{" "}
                {doneCount ? "Continuar de onde parei" : "Começar"}
              </Button>
            )}
            {doneCount > 0 && (
              <Button size="sm" variant="ghost" onClick={restart}>
                <RotateCcw className="h-4 w-4" /> Recomeçar
              </Button>
            )}
          </div>
        </div>
      </div>

      {percent === 100 && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 animate-in zoom-in-95 duration-500 dark:border-emerald-800 dark:bg-emerald-950/40">
          <PartyPopper className="h-8 w-8 shrink-0 text-emerald-600" />
          <div>
            <p className="font-extrabold text-emerald-800 dark:text-emerald-300">
              Trilha concluída!
            </p>
            <p className="text-sm text-emerald-900/80 dark:text-emerald-200/80">
              Você passou por todo o fluxo. {training.quiz ? "Faça o teste abaixo para fixar." : ""}
            </p>
          </div>
        </div>
      )}

      {training.example && (
        <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/[0.04] p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">
            {training.example.title}
          </p>
          <p className="mt-1 text-sm">{training.example.text}</p>
        </div>
      )}

      {/* Etapas */}
      <ol className="space-y-4">
        {training.chapters.map((chapter, ci) => {
          const keys = chapter.steps.map((s) => `${chapter.id}/${s.id}`);
          const chapterDone = keys.filter((k) => done.has(k)).length;
          const complete = chapterDone === keys.length;
          const current = !complete && keys.includes(nextKey ?? "");
          return (
            <li
              key={chapter.id}
              className={`rounded-2xl border bg-card p-5 transition-shadow animate-in fade-in slide-in-from-bottom-2 fill-mode-both ${
                current ? "border-primary/50 shadow-md ring-1 ring-primary/20" : "border-border"
              }`}
              style={{ animationDelay: `${ci * 60}ms` }}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${
                    complete ? "bg-emerald-100 dark:bg-emerald-950" : "bg-primary/10"
                  }`}
                >
                  {complete ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : chapter.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Etapa {ci + 1} · {chapterDone}/{keys.length}
                  </p>
                  <h3 className="text-lg font-extrabold leading-tight">{chapter.title}</h3>
                  <p className="text-sm text-muted-foreground">{chapter.goal}</p>
                </div>
              </div>

              <ul className="mt-4 space-y-2">
                {chapter.steps.map((step) => {
                  const key = `${chapter.id}/${step.id}`;
                  const checked = done.has(key);
                  const isNext = key === nextKey;
                  return (
                    <li
                      key={key}
                      ref={(el) => {
                        stepRefs.current[key] = el;
                      }}
                      className={`flex gap-3 rounded-xl border p-3 transition-colors ${
                        checked
                          ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20"
                          : isNext
                            ? "border-primary/40 bg-primary/[0.03]"
                            : "border-border"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggle(key)}
                        aria-pressed={checked}
                        aria-label={
                          checked ? `Desmarcar: ${step.title}` : `Marcar como feito: ${step.title}`
                        }
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                          checked
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-muted-foreground/40 hover:border-primary"
                        }`}
                      >
                        {checked && (
                          <Check className="h-3.5 w-3.5 animate-in zoom-in duration-200" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`font-bold ${checked ? "text-muted-foreground line-through decoration-emerald-500/60" : ""}`}
                        >
                          {step.title}
                          {isNext && (
                            <span className="ml-2 rounded-full bg-primary px-2 py-0.5 align-middle text-[10px] font-bold text-primary-foreground no-underline">
                              Próximo
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-sm text-muted-foreground">{step.text}</p>
                        {step.check && (
                          <p className="mt-1.5 flex items-start gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span>
                              <b>Deu certo se:</b> {step.check}
                            </span>
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {step.to && (
                            <Button asChild size="sm" variant="outline" className="h-8">
                              <Link to={step.to}>
                                {step.toLabel ?? "Abrir módulo"}{" "}
                                <ArrowRight className="h-3.5 w-3.5" />
                              </Link>
                            </Button>
                          )}
                          {!checked && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950"
                              onClick={() => toggle(key)}
                            >
                              <Check className="h-3.5 w-3.5" /> Feito
                            </Button>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>

      {training.quiz && <Quiz training={training} />}
    </article>
  );
}

function Quiz({ training }: { training: Training }) {
  const quiz = training.quiz!;
  const [answers, setAnswers] = useState<(number | null)[]>(() => quiz.map(() => null));
  const answered = answers.filter((a) => a != null).length;
  const correct = answers.filter((a, i) => a === quiz[i]!.answer).length;
  const finished = answered === quiz.length;

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-lg font-extrabold">
          <GraduationCap className="h-5 w-5 text-primary" /> Teste rápido
        </h3>
        <span className="text-sm font-semibold text-muted-foreground">
          {answered}/{quiz.length} respondidas
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        Confira se ficou claro. Escolha uma resposta para ver a explicação.
      </p>
      <ol className="mt-4 space-y-4">
        {quiz.map((q, qi) => {
          const chosen = answers[qi];
          return (
            <li key={q.question} className="rounded-xl border border-border p-4">
              <p className="font-bold">
                {qi + 1}. {q.question}
              </p>
              <div className="mt-2 grid gap-2">
                {q.options.map((opt, oi) => {
                  const picked = chosen === oi;
                  const showRight = chosen != null && oi === q.answer;
                  const showWrong = picked && oi !== q.answer;
                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={chosen != null}
                      onClick={() => setAnswers((prev) => prev.map((a, i) => (i === qi ? oi : a)))}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors disabled:cursor-default ${
                        showRight
                          ? "border-emerald-400 bg-emerald-50 font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : showWrong
                            ? "border-red-300 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                            : "border-border enabled:hover:border-primary/50 enabled:hover:bg-primary/5"
                      }`}
                    >
                      {showRight ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                      ) : showWrong ? (
                        <XCircle className="h-4 w-4 shrink-0" />
                      ) : (
                        <span className="h-4 w-4 shrink-0 rounded-full border-2 border-muted-foreground/40" />
                      )}
                      {opt}
                    </button>
                  );
                })}
              </div>
              {chosen != null && (
                <p className="mt-2 rounded-lg bg-muted/60 px-3 py-2 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
                  <b>{chosen === q.answer ? "Isso mesmo! " : "Quase. "}</b>
                  {q.explain}
                </p>
              )}
            </li>
          );
        })}
      </ol>
      {finished && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-primary/10 p-4 animate-in zoom-in-95 duration-300">
          <p className="font-extrabold">
            Você acertou {correct} de {quiz.length}
            {correct === quiz.length ? " — perfeito! 🎉" : "."}
          </p>
          <Button size="sm" variant="outline" onClick={() => setAnswers(quiz.map(() => null))}>
            <RotateCcw className="h-4 w-4" /> Refazer teste
          </Button>
        </div>
      )}
    </section>
  );
}
