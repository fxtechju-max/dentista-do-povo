import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar as CalendarIcon,
  CalendarDays,
  List,
  Plus,
  Pencil,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { db } from "@/integrations/mysql/client";
import {
  AppointmentDialog,
  type AgendaTreatment,
} from "@/components/admin/agenda/AppointmentDialog";
import { mergeAgendaTreatments } from "@/lib/agenda-treatments";
import { STATUS_STYLE } from "@/lib/agenda-status";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import {
  APPOINTMENT_STATUS_LABEL as STATUS_LABEL,
  APPOINTMENT_STATUS_VARIANT as STATUS_VARIANT,
  type AppointmentStatus,
} from "@/lib/admin/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export const Route = createFileRoute("/admin/agenda")({
  component: Agenda,
});

type Appointment = {
  id: string;
  patient_id: string;
  treatment: string;
  scheduled_at: string;
  status: AppointmentStatus;
  patients: { name: string } | null;
};

type Patient = { id: string; name: string };

function Agenda() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "todos">("todos");
  const [periodFilter, setPeriodFilter] = useState<"todos" | "hoje" | "semana">("todos");
  const [calendarView, setCalendarView] = useState<"mes" | "semana" | "dia">("mes");
  const [anchor, setAnchor] = useState(new Date());
  const [navDirection, setNavDirection] = useState<1 | -1>(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [prefill, setPrefill] = useState<Date | null>(null);
  const [treatments, setTreatments] = useState<AgendaTreatment[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Appointment | null>(null);

  async function load() {
    setLoading(true);
    const [
      { data: appointmentsData },
      { data: patientsData },
      { data: treatmentsData },
      { data: servicesData },
    ] = await Promise.all([
      db
        .from("appointments")
        .select("id, patient_id, treatment, scheduled_at, status, patients(name)")
        .order("scheduled_at", { ascending: false }),
      db.from("patients").select("id, name").order("name"),
      db
        .from("treatments")
        .select("id, name, price, duration_minutes, description, active")
        .order("name"),
      db.from("services").select("id, name, price, description, active").order("name"),
    ]);
    setTreatments(
      mergeAgendaTreatments(
        (treatmentsData ?? []) as AgendaTreatment[],
        (servicesData ?? []) as AgendaTreatment[],
      ),
    );
    setAppointments((appointmentsData ?? []) as unknown as Appointment[]);
    setPatients((patientsData ?? []) as Patient[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = new Date();
    const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return appointments.filter((a) => {
      if (statusFilter !== "todos" && a.status !== statusFilter) return false;
      if (
        q &&
        !(a.patients?.name.toLowerCase().includes(q) || a.treatment.toLowerCase().includes(q))
      ) {
        return false;
      }
      if (periodFilter !== "todos") {
        const date = new Date(a.scheduled_at);
        if (periodFilter === "hoje") {
          if (date.toDateString() !== now.toDateString()) return false;
        } else if (periodFilter === "semana") {
          if (date < now || date > weekAhead) return false;
        }
      }
      return true;
    });
  }, [appointments, query, statusFilter, periodFilter]);

  const weekStart = useMemo(() => startOfWeek(anchor, { weekStartsOn: 1 }), [anchor]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const appointmentsForDay = useCallback(
    (day: Date) =>
      appointments
        .filter((a) => isSameDay(new Date(a.scheduled_at), day))
        .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)),
    [appointments],
  );
  const appointmentsByDay = useMemo(
    () => weekDays.map((day) => appointmentsForDay(day)),
    [weekDays, appointmentsForDay],
  );
  const weekAppointmentCount = useMemo(
    () => appointmentsByDay.reduce((sum, d) => sum + d.length, 0),
    [appointmentsByDay],
  );

  const monthStart = useMemo(() => startOfMonth(anchor), [anchor]);
  const monthEnd = useMemo(() => endOfMonth(anchor), [anchor]);
  const monthGridDays = useMemo(() => {
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [monthStart, monthEnd]);
  const monthAppointmentCount = useMemo(
    () =>
      appointments.filter((a) => {
        const d = new Date(a.scheduled_at);
        return d >= monthStart && d <= monthEnd;
      }).length,
    [appointments, monthStart, monthEnd],
  );

  const dayAppointments = useMemo(() => appointmentsForDay(anchor), [anchor, appointmentsForDay]);

  const stats = useMemo(() => {
    const now = new Date();
    const week = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const active = appointments.filter((a) => a.status !== "cancelado");
    return [
      {
        label: "Consultas hoje",
        value: active.filter((a) => isToday(new Date(a.scheduled_at))).length,
        icon: CalendarDays,
        tone: "bg-primary/10 text-primary",
        onClick: () => {
          setAnchor(new Date());
          setCalendarView("dia");
        },
      },
      {
        label: "Próximos 7 dias",
        value: active.filter((a) => {
          const d = new Date(a.scheduled_at);
          return d >= now && d <= week;
        }).length,
        icon: Clock,
        tone: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
        onClick: () => {
          setAnchor(new Date());
          setCalendarView("semana");
        },
      },
      {
        label: "Confirmadas",
        value: appointments.filter(
          (a) => a.status === "confirmado" && new Date(a.scheduled_at) >= now,
        ).length,
        icon: CheckCircle2,
        tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
        onClick: undefined,
      },
      {
        label: "Concluídas no mês",
        value: appointments.filter(
          (a) => a.status === "concluido" && isSameMonth(new Date(a.scheduled_at), now),
        ).length,
        icon: Sparkles,
        tone: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
        onClick: undefined,
      },
    ];
  }, [appointments]);

  function navigate(direction: 1 | -1) {
    setNavDirection(direction);
    setAnchor((d) => {
      if (calendarView === "mes") return addMonths(d, direction);
      if (calendarView === "dia") return addDays(d, direction);
      return addDays(d, direction * 7);
    });
  }

  function openCreate(prefillIso?: string) {
    setEditing(null);
    setPrefill(prefillIso ? new Date(prefillIso) : null);
    setDialogOpen(true);
  }

  function openEdit(a: Appointment) {
    setEditing(a);
    setDialogOpen(true);
  }

  async function remove() {
    if (!deleteTarget) return;
    await db.from("appointments").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null);
    load();
  }

  return (
    <div className="animate-in fade-in duration-300">
      <PageHeader
        title="📅 Agenda"
        description="Consultas marcadas na clínica."
        action={
          <Button onClick={() => openCreate()} disabled={patients.length === 0}>
            <Plus /> Nova consulta
          </Button>
        }
      />

      {patients.length === 0 && !loading && (
        <p className="mt-3 text-sm text-muted-foreground">
          Cadastre um paciente antes de marcar uma consulta.
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((k, i) => (
          <button
            key={k.label}
            type="button"
            onClick={k.onClick}
            style={{ animationDelay: `${i * 70}ms` }}
            className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-all duration-200 animate-in fade-in slide-in-from-bottom-3 fill-mode-both hover:-translate-y-0.5 hover:shadow-md"
          >
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${k.tone}`}
            >
              <k.icon className="h-5 w-5" />
            </span>
            <span>
              <span
                key={k.value}
                className="block text-2xl font-extrabold leading-none tabular-nums animate-in zoom-in-50 duration-500"
              >
                {k.value}
              </span>
              <span className="mt-1 block text-xs font-semibold text-muted-foreground">
                {k.label}
              </span>
            </span>
          </button>
        ))}
      </div>

      <Tabs defaultValue="calendario" className="mt-4">
        <TabsList>
          <TabsTrigger value="calendario">
            <CalendarDays className="h-4 w-4" /> Calendário
          </TabsTrigger>
          <TabsTrigger value="lista">
            <List className="h-4 w-4" /> Lista
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendario" className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-gradient-to-r from-primary/5 via-card to-card p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(-1)}
                  aria-label="Anterior"
                  className="transition-transform hover:-translate-x-0.5"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(1)}
                  aria-label="Próximo"
                  className="transition-transform hover:translate-x-0.5"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNavDirection(1);
                    setAnchor(new Date());
                  }}
                >
                  Hoje
                </Button>
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-0.5">
                {(
                  [
                    { id: "mes", label: "Mês" },
                    { id: "semana", label: "Semana" },
                    { id: "dia", label: "Dia" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setCalendarView(opt.id)}
                    className={`rounded-md px-3 py-1 text-xs font-bold transition-colors ${
                      calendarView === opt.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-right">
              {calendarView === "mes" && (
                <>
                  <p className="text-sm font-bold capitalize">
                    {format(anchor, "MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {monthAppointmentCount} consulta{monthAppointmentCount === 1 ? "" : "s"} neste
                    mês
                  </p>
                </>
              )}
              {calendarView === "semana" && (
                <>
                  <p className="text-sm font-bold capitalize">
                    {format(weekStart, "d 'de' MMMM", { locale: ptBR })} —{" "}
                    {format(addDays(weekStart, 6), "d 'de' MMMM", { locale: ptBR })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {weekAppointmentCount} consulta{weekAppointmentCount === 1 ? "" : "s"} nesta
                    semana
                  </p>
                </>
              )}
              {calendarView === "dia" && (
                <>
                  <p className="text-sm font-bold capitalize">
                    {format(anchor, "EEEE, d 'de' MMMM", { locale: ptBR })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {dayAppointments.length} consulta{dayAppointments.length === 1 ? "" : "s"} neste
                    dia
                  </p>
                </>
              )}
            </div>
          </div>

          {loading ? (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className="h-40 animate-pulse rounded-2xl border border-border bg-card"
                  style={{ animationDelay: `${i * 60}ms` }}
                />
              ))}
            </div>
          ) : calendarView === "mes" ? (
            <div
              key={monthStart.toISOString()}
              className={`animate-in fade-in mt-3 duration-300 ${
                navDirection === 1 ? "slide-in-from-right-4" : "slide-in-from-left-4"
              }`}
            >
              <div className="grid grid-cols-7 gap-px overflow-hidden rounded-t-2xl border border-border bg-border text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
                  <div key={d} className="bg-card py-2">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-px overflow-hidden rounded-b-2xl border border-t-0 border-border bg-border">
                {monthGridDays.map((day, i) => {
                  const items = appointmentsForDay(day);
                  const today = isToday(day);
                  const inMonth = isSameMonth(day, anchor);
                  const visible = items.slice(0, 3);
                  const overflow = items.length - visible.length;
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => {
                        setAnchor(day);
                        setCalendarView("dia");
                      }}
                      style={{ animationDelay: `${i * 8}ms` }}
                      className={`animate-in fade-in flex min-h-24 flex-col items-stretch gap-1 p-1.5 text-left transition-colors fill-mode-both sm:min-h-28 ${
                        inMonth ? "bg-card hover:bg-accent" : "bg-muted/30 text-muted-foreground/60"
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          today ? "bg-primary text-primary-foreground" : ""
                        }`}
                      >
                        {format(day, "d")}
                      </span>
                      <div className="flex-1 space-y-0.5 overflow-hidden">
                        {visible.map((a) => (
                          <span
                            key={a.id}
                            className={`block truncate rounded px-1 py-0.5 text-[10px] font-semibold transition-transform hover:scale-[1.02] ${STATUS_STYLE[a.status].chip}`}
                          >
                            {format(new Date(a.scheduled_at), "HH:mm")} {a.patients?.name ?? "—"}
                          </span>
                        ))}
                        {overflow > 0 && (
                          <span className="block px-1 text-[10px] font-bold text-muted-foreground">
                            +{overflow} mais
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : calendarView === "semana" ? (
            <div
              key={weekStart.toISOString()}
              className={`animate-in fade-in mt-3 grid grid-cols-1 gap-3 overflow-x-auto duration-300 sm:grid-cols-2 lg:grid-cols-7 ${
                navDirection === 1 ? "slide-in-from-right-4" : "slide-in-from-left-4"
              }`}
            >
              {weekDays.map((day, i) => {
                const items = appointmentsByDay[i] ?? [];
                const today = isToday(day);
                return (
                  <div
                    key={day.toISOString()}
                    style={{ animationDelay: `${i * 40}ms` }}
                    className={`animate-in fade-in slide-in-from-bottom-2 flex min-w-0 flex-col rounded-2xl border bg-card fill-mode-both transition-shadow duration-300 hover:shadow-md ${
                      today ? "border-primary shadow-sm ring-1 ring-primary/20" : "border-border"
                    }`}
                  >
                    <div
                      className={`flex items-center justify-between rounded-t-2xl border-b px-3 py-2 ${
                        today ? "border-primary/20 bg-primary/5" : "border-border"
                      }`}
                    >
                      <button
                        onClick={() => {
                          setAnchor(day);
                          setCalendarView("dia");
                        }}
                        className="text-left"
                      >
                        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                          {format(day, "EEE", { locale: ptBR })}
                          {today && (
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                            </span>
                          )}
                        </p>
                        <p className={`text-lg font-extrabold ${today ? "text-primary" : ""}`}>
                          {format(day, "dd")}
                        </p>
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openCreate(day.toISOString())}
                        aria-label="Nova consulta neste dia"
                        disabled={patients.length === 0}
                        className="transition-transform hover:scale-110 hover:rotate-90"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex-1 space-y-1.5 p-2">
                      {items.length === 0 ? (
                        <p className="py-4 text-center text-xs text-muted-foreground">
                          Sem consultas
                        </p>
                      ) : (
                        items.map((a, ai) => (
                          <button
                            key={a.id}
                            onClick={() => openEdit(a)}
                            style={{ animationDelay: `${i * 40 + ai * 60}ms` }}
                            className="animate-in fade-in relative w-full overflow-hidden rounded-lg border border-border bg-background p-2 pl-3 text-left text-xs fill-mode-both transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-accent hover:shadow-sm"
                          >
                            <span
                              className={`absolute inset-y-0 left-0 w-1 ${STATUS_STYLE[a.status].dot}`}
                            />
                            <span className="flex items-center gap-1 font-bold text-foreground">
                              <Clock className="h-3 w-3 text-primary" />
                              {format(new Date(a.scheduled_at), "HH:mm")}
                            </span>
                            <span className="mt-0.5 block truncate font-semibold">
                              {a.patients?.name ?? "—"}
                            </span>
                            <span className="block truncate text-muted-foreground">
                              {a.treatment}
                            </span>
                            <Badge variant={STATUS_VARIANT[a.status]} className="mt-1">
                              {STATUS_LABEL[a.status]}
                            </Badge>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              key={anchor.toDateString()}
              className={`animate-in fade-in mt-3 space-y-2 duration-300 ${
                navDirection === 1 ? "slide-in-from-right-4" : "slide-in-from-left-4"
              }`}
            >
              {dayAppointments.length === 0 ? (
                <div className="rounded-2xl border border-border bg-card">
                  <EmptyState icon={CalendarIcon} title="Nenhuma consulta neste dia." />
                </div>
              ) : (
                dayAppointments.map((a, ai) => (
                  <div
                    key={a.id}
                    style={{ animationDelay: `${ai * 50}ms` }}
                    className="animate-in fade-in slide-in-from-bottom-2 relative flex items-center gap-4 overflow-hidden rounded-2xl border border-border bg-card p-4 pl-5 fill-mode-both transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <span
                      className={`absolute inset-y-0 left-0 w-1.5 ${STATUS_STYLE[a.status].dot}`}
                    />
                    <div className="flex w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 py-2 text-primary">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm font-extrabold">
                        {format(new Date(a.scheduled_at), "HH:mm")}
                      </span>
                    </div>
                    <button
                      onClick={() => openEdit(a)}
                      className="min-w-0 flex-1 text-left"
                      aria-label="Editar consulta"
                    >
                      <p className="truncate font-bold">{a.patients?.name ?? "—"}</p>
                      <p className="truncate text-sm text-muted-foreground">{a.treatment}</p>
                    </button>
                    <Badge variant={STATUS_VARIANT[a.status]}>{STATUS_LABEL[a.status]}</Badge>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(a)}
                        aria-label="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(a)}
                        aria-label="Excluir"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => openCreate(anchor.toISOString())}
                disabled={patients.length === 0}
              >
                <Plus /> Nova consulta neste dia
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="lista" className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar paciente ou tratamento..."
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                {Object.entries(STATUS_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={periodFilter}
              onValueChange={(v) => setPeriodFilter(v as typeof periodFilter)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Qualquer data</SelectItem>
                <SelectItem value="hoje">Hoje</SelectItem>
                <SelectItem value="semana">Próximos 7 dias</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">{filtered.length} consulta(s)</span>
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-card">
            {loading ? (
              <p className="p-8 text-center text-sm text-muted-foreground">Carregando...</p>
            ) : filtered.length === 0 ? (
              <EmptyState icon={CalendarIcon} title="Nenhuma consulta encontrada." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Tratamento</TableHead>
                    <TableHead>Data e hora</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a) => (
                    <TableRow key={a.id} className="animate-in fade-in">
                      <TableCell className="font-semibold">{a.patients?.name ?? "—"}</TableCell>
                      <TableCell>{a.treatment}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(a.scheduled_at).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[a.status]}>{STATUS_LABEL[a.status]}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(a)}
                          aria-label="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(a)}
                          aria-label="Excluir"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <AppointmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        prefillDate={prefill}
        patients={patients}
        treatments={treatments}
        appointments={appointments}
        onSaved={load}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir consulta?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
