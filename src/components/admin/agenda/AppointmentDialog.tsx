import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  Check,
  Clock,
  PenLine,
  Search,
  Stethoscope,
  UserRound,
  X,
} from "lucide-react";
import { db } from "@/integrations/mysql/client";
import {
  APPOINTMENT_STATUS_LABEL,
  formatCurrency,
  type AppointmentStatus,
} from "@/lib/admin/labels";
import { normalizeName } from "@/lib/odontogram-plan";
import { STATUS_STYLE } from "@/lib/agenda-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export type { AgendaTreatment } from "@/lib/agenda-treatments";
import type { AgendaTreatment } from "@/lib/agenda-treatments";

export type AgendaAppointment = {
  id: string;
  patient_id: string;
  treatment: string;
  scheduled_at: string;
  status: AppointmentStatus;
};

const SEP = " + ";
const SLOTS = Array.from({ length: 23 }, (_, i) => {
  const minutes = 7 * 60 + i * 30; // 07:00 até 18:00
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${minutes % 60 ? "30" : "00"}`;
});
const pad = (n: number) => String(n).padStart(2, "0");
const toDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/**
 * Nova/editar consulta: paciente com busca, todos os tratamentos cadastrados
 * para escolher (um ou vários), data com horários rápidos (mostra os ocupados)
 * e situação.
 */
export function AppointmentDialog({
  open,
  onOpenChange,
  editing,
  prefillDate,
  patients,
  treatments,
  appointments,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: (AgendaAppointment & { patients?: { name: string } | null }) | null;
  prefillDate: Date | null;
  patients: { id: string; name: string }[];
  treatments: AgendaTreatment[];
  appointments: (AgendaAppointment & { patients?: { name: string } | null })[];
  onSaved: () => void;
}) {
  const [patientId, setPatientId] = useState("");
  const [patientQuery, setPatientQuery] = useState("");
  const [patientOpen, setPatientOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [custom, setCustom] = useState("");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"todos" | "ativos" | "inativos" | "servicos">("todos");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [status, setStatus] = useState<AppointmentStatus>("agendado");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setKind("todos");
    setPatientQuery("");
    setPatientOpen(false);
    if (editing) {
      const d = new Date(editing.scheduled_at);
      setPatientId(editing.patient_id);
      const names = editing.treatment
        .split(SEP)
        .map((s) => s.trim())
        .filter(Boolean);
      const known = new Set(treatments.map((t) => t.name));
      setSelected(names.filter((n) => known.has(n)));
      setCustom(names.filter((n) => !known.has(n)).join(SEP));
      setDate(toDate(d));
      setTime(toTime(d));
      setStatus(editing.status);
    } else {
      const d = prefillDate ?? new Date();
      setPatientId("");
      setSelected([]);
      setCustom("");
      setDate(toDate(d));
      setTime(prefillDate && prefillDate.getHours() ? toTime(prefillDate) : "");
      setStatus("agendado");
    }
  }, [open, editing, prefillDate, treatments]);

  const patient = patients.find((p) => p.id === patientId) ?? null;
  const patientMatches = useMemo(() => {
    const q = normalizeName(patientQuery);
    return (q ? patients.filter((p) => normalizeName(p.name).includes(q)) : patients).slice(0, 8);
  }, [patients, patientQuery]);

  const results = useMemo(() => {
    const words = normalizeName(query).split(" ").filter(Boolean);
    return treatments.filter((t) => {
      if (kind === "ativos" && (t.source === "servico" || t.active === false)) return false;
      if (kind === "inativos" && (t.source === "servico" || t.active !== false)) return false;
      if (kind === "servicos" && t.source !== "servico") return false;
      return words.every((w) => normalizeName(`${t.name} ${t.description ?? ""}`).includes(w));
    });
  }, [treatments, query, kind]);

  const counts = useMemo(
    () => ({
      todos: treatments.length,
      ativos: treatments.filter((t) => t.source !== "servico" && t.active !== false).length,
      inativos: treatments.filter((t) => t.source !== "servico" && t.active === false).length,
      servicos: treatments.filter((t) => t.source === "servico").length,
    }),
    [treatments],
  );

  const chosen = treatments.filter((t) => selected.includes(t.name));
  const duration = chosen.reduce((s, t) => s + (t.duration_minutes ?? 0), 0);
  const price = chosen.reduce((s, t) => s + (t.price != null ? Number(t.price) : 0), 0);
  const treatmentText = [...selected, ...(custom.trim() ? [custom.trim()] : [])].join(SEP);

  // Horários já ocupados no dia escolhido (menos a própria consulta em edição).
  const busy = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of appointments) {
      if (a.status === "cancelado" || a.id === editing?.id) continue;
      const d = new Date(a.scheduled_at);
      if (toDate(d) !== date) continue;
      map.set(toTime(d), a.patients?.name ?? "Ocupado");
    }
    return map;
  }, [appointments, date, editing]);

  const endTime = useMemo(() => {
    if (!time || !duration) return null;
    const [h, m] = time.split(":").map(Number);
    const end = new Date(2000, 0, 1, h, (m ?? 0) + duration);
    return toTime(end);
  }, [time, duration]);

  const valid = !!patientId && !!treatmentText && !!date && !!time;

  function toggle(name: string) {
    setSelected((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  }

  async function save() {
    if (!valid || saving) return;
    setSaving(true);
    const payload = {
      patient_id: patientId,
      treatment: treatmentText,
      scheduled_at: new Date(`${date}T${time}:00`).toISOString(),
      status,
    };
    const { error } = editing
      ? await db.from("appointments").update(payload).eq("id", editing.id)
      : await db.from("appointments").insert(payload);
    setSaving(false);
    if (error) return;
    toast.success(
      editing
        ? "Consulta atualizada."
        : `Consulta marcada para ${date.split("-").reverse().join("/")} às ${time}.`,
    );
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-full max-w-none flex-col gap-0 overflow-hidden p-0 sm:h-[90dvh] sm:max-w-5xl sm:rounded-2xl [&>button:last-child]:hidden">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CalendarDays className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-lg">
              {editing ? "Editar consulta" : "Nova consulta"}
            </DialogTitle>
            <DialogDescription>Paciente, tratamentos, dia e horário.</DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:overflow-hidden">
          {/* Tratamentos */}
          <section className="flex max-h-[55dvh] min-h-[18rem] flex-col border-b border-border bg-muted/30 lg:max-h-none lg:min-h-0 lg:border-b-0 lg:border-r">
            <div className="space-y-2 p-4 pb-3">
              <p className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Stethoscope className="h-3.5 w-3.5" /> Tratamentos cadastrados
                </span>
                <span className="normal-case tracking-normal">
                  {selected.length ? `${selected.length} selecionado(s)` : "toque para selecionar"}
                </span>
              </p>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar tratamento..."
                  className="h-11 bg-background pl-9"
                  aria-label="Buscar tratamento"
                />
              </div>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar tratamentos">
                {(
                  [
                    ["todos", "Todos"],
                    ["ativos", "Ativos"],
                    ["inativos", "Inativos"],
                    ["servicos", "Serviços do site"],
                  ] as const
                )
                  .filter(([k]) => k === "todos" || counts[k] > 0)
                  .map(([k, label]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setKind(k)}
                      aria-pressed={kind === k}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                        kind === k
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {label} <span className="opacity-70">{counts[k]}</span>
                    </button>
                  ))}
              </div>
            </div>
            <ul className="grid flex-1 grid-cols-1 content-start gap-2 overflow-y-auto px-4 pb-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {results.map((t, i) => {
                const on = selected.includes(t.name);
                return (
                  <li
                    key={t.id}
                    className="animate-in fade-in slide-in-from-bottom-1 fill-mode-both"
                    style={{ animationDelay: `${Math.min(i, 14) * 18}ms` }}
                  >
                    <button
                      type="button"
                      onClick={() => toggle(t.name)}
                      aria-pressed={on}
                      className={`group flex h-full w-full items-start gap-2.5 rounded-xl border-2 bg-card p-3 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md ${
                        on
                          ? "border-primary ring-2 ring-primary/15"
                          : "border-transparent shadow-sm"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                          on
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/30"
                        }`}
                      >
                        {on && <Check className="h-3.5 w-3.5 animate-in zoom-in duration-150" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold leading-snug">{t.name}</span>
                        {(t.source === "servico" || t.active === false) && (
                          <span
                            className={`mt-1 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                              t.source === "servico"
                                ? "bg-sky-500/15 text-sky-700 dark:text-sky-300"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {t.source === "servico" ? "Serviço do site" : "Inativo"}
                          </span>
                        )}
                        <span className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                          {t.duration_minutes ? (
                            <span className="inline-flex items-center gap-0.5">
                              <Clock className="h-3 w-3" /> {t.duration_minutes} min
                            </span>
                          ) : null}
                          {t.price != null && (
                            <span className="font-semibold text-foreground/80">
                              {formatCurrency(Number(t.price))}
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
              {results.length === 0 && (
                <li className="col-span-full rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                  Nenhum tratamento com “{query}”. Use o campo “Outro” ao lado.
                </li>
              )}
            </ul>
          </section>

          {/* Dados da consulta */}
          <section className="flex min-h-0 flex-col">
            <div className="flex-1 space-y-5 p-4 lg:overflow-y-auto">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <UserRound className="h-3.5 w-3.5" /> Paciente
                </Label>
                {patient && !patientOpen ? (
                  <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3 animate-in fade-in duration-200">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      {patient.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold">{patient.name}</span>
                    <Button variant="ghost" size="sm" onClick={() => setPatientOpen(true)}>
                      Trocar
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={patientQuery}
                      onChange={(e) => {
                        setPatientQuery(e.target.value);
                        setPatientOpen(true);
                      }}
                      onFocus={() => setPatientOpen(true)}
                      placeholder="Buscar paciente pelo nome..."
                      className="h-11 pl-9"
                      aria-label="Buscar paciente"
                    />
                    {patientOpen && (
                      <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-xl animate-in fade-in slide-in-from-top-1 duration-150">
                        {patientMatches.length ? (
                          patientMatches.map((p) => (
                            <li key={p.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  setPatientId(p.id);
                                  setPatientOpen(false);
                                }}
                                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-accent"
                              >
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                  {p.name.charAt(0).toUpperCase()}
                                </span>
                                {p.name}
                              </button>
                            </li>
                          ))
                        ) : (
                          <li className="px-3 py-2 text-sm text-muted-foreground">
                            Nenhum paciente encontrado.
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Tratamentos da consulta</Label>
                {selected.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selected.map((n) => (
                      <span
                        key={n}
                        className="inline-flex items-center gap-1 rounded-full bg-primary/10 py-1 pl-3 pr-1 text-xs font-semibold text-primary animate-in zoom-in-95 duration-150"
                      >
                        {n}
                        <button
                          type="button"
                          onClick={() => toggle(n)}
                          aria-label={`Tirar ${n}`}
                          className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-primary/20"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Selecione na lista ao lado (pode ser mais de um).
                  </p>
                )}
                <div className="relative">
                  <PenLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                    placeholder="Outro (ex.: retorno, ajuste de aparelho)"
                    className="pl-9"
                    aria-label="Outro tratamento"
                  />
                </div>
                {(duration > 0 || price > 0) && (
                  <p className="flex flex-wrap gap-x-4 text-xs text-muted-foreground animate-in fade-in duration-200">
                    {duration > 0 && (
                      <span>
                        Duração estimada: <b className="text-foreground">{duration} min</b>
                      </span>
                    )}
                    {price > 0 && (
                      <span>
                        Valor de tabela: <b className="text-foreground">{formatCurrency(price)}</b>
                      </span>
                    )}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-[minmax(0,1fr)_8rem] gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="ap-date">Dia</Label>
                    <Input
                      id="ap-date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ap-time">Horário</Label>
                    <Input
                      id="ap-time"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {SLOTS.map((s) => {
                    const who = busy.get(s);
                    const on = time === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setTime(s)}
                        title={who ? `Ocupado: ${who}` : "Livre"}
                        className={`rounded-lg border px-2 py-1 text-xs font-semibold tabular-nums transition-all ${
                          on
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : who
                              ? "border-amber-300 bg-amber-50 text-amber-700 line-through decoration-amber-500/60 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                              : "border-border hover:border-primary/50 hover:bg-primary/5"
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Riscados = já ocupados neste dia.
                  {time && busy.get(time) ? (
                    <b className="text-amber-600">
                      {" "}
                      Atenção: {time} já tem {busy.get(time)}.
                    </b>
                  ) : null}
                  {endTime ? ` Término previsto: ${endTime}.` : ""}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Situação</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(Object.keys(APPOINTMENT_STATUS_LABEL) as AppointmentStatus[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(s)}
                      className={`flex items-center justify-center gap-1.5 rounded-lg border-2 px-2 py-2 text-xs font-bold transition-all ${
                        status === s
                          ? STATUS_STYLE[s].ring
                          : "border-border text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${STATUS_STYLE[s].dot}`} />
                      {APPOINTMENT_STATUS_LABEL[s].replace(/^\S+\s/, "")}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card px-4 py-3">
              <p className="min-w-0 text-sm">
                {valid ? (
                  <span className="text-muted-foreground">
                    <b className="text-foreground">{patient?.name}</b> ·{" "}
                    {date.split("-").reverse().join("/")} às{" "}
                    <b className="text-foreground">{time}</b>
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    Escolha paciente, tratamento, dia e horário.
                  </span>
                )}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                  Cancelar
                </Button>
                <Button onClick={save} disabled={!valid || saving} className="min-w-36">
                  <Check className="h-4 w-4" />{" "}
                  {saving ? "Salvando..." : editing ? "Salvar" : "Marcar consulta"}
                </Button>
              </div>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
