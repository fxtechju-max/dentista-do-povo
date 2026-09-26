import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { addDays, format, isSameDay, isToday, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
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

function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function dayKey(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T09:00`;
}

const emptyForm = {
  patient_id: "",
  treatment: "",
  scheduled_at: "",
  status: "agendado" as AppointmentStatus,
};

function Agenda() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "todos">("todos");
  const [periodFilter, setPeriodFilter] = useState<"todos" | "hoje" | "semana">("todos");
  const [weekAnchor, setWeekAnchor] = useState(new Date());
  const [weekDirection, setWeekDirection] = useState<1 | -1>(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Appointment | null>(null);

  async function load() {
    setLoading(true);
    const [{ data: appointmentsData }, { data: patientsData }] = await Promise.all([
      supabase
        .from("appointments")
        .select("id, patient_id, treatment, scheduled_at, status, patients(name)")
        .order("scheduled_at", { ascending: false }),
      supabase.from("patients").select("id, name").order("name"),
    ]);
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

  const weekStart = useMemo(() => startOfWeek(weekAnchor, { weekStartsOn: 1 }), [weekAnchor]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const appointmentsByDay = useMemo(() => {
    return weekDays.map((day) =>
      appointments
        .filter((a) => isSameDay(new Date(a.scheduled_at), day))
        .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)),
    );
  }, [weekDays, appointments]);
  const weekAppointmentCount = useMemo(
    () => appointmentsByDay.reduce((sum, d) => sum + d.length, 0),
    [appointmentsByDay],
  );

  function openCreate(prefillIso?: string) {
    setEditing(null);
    setForm(prefillIso ? { ...emptyForm, scheduled_at: dayKey(prefillIso) } : emptyForm);
    setDialogOpen(true);
  }

  function openEdit(a: Appointment) {
    setEditing(a);
    setForm({
      patient_id: a.patient_id,
      treatment: a.treatment,
      scheduled_at: toDatetimeLocal(a.scheduled_at),
      status: a.status,
    });
    setDialogOpen(true);
  }

  async function save() {
    if (!form.patient_id || !form.treatment.trim() || !form.scheduled_at) return;
    setSaving(true);
    const payload = {
      patient_id: form.patient_id,
      treatment: form.treatment.trim(),
      scheduled_at: new Date(form.scheduled_at).toISOString(),
      status: form.status,
    };
    if (editing) {
      await supabase.from("appointments").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("appointments").insert(payload);
    }
    setSaving(false);
    setDialogOpen(false);
    load();
  }

  async function remove() {
    if (!deleteTarget) return;
    await supabase.from("appointments").delete().eq("id", deleteTarget.id);
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
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setWeekDirection(-1);
                  setWeekAnchor((d) => addDays(d, -7));
                }}
                aria-label="Semana anterior"
                className="transition-transform hover:-translate-x-0.5"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setWeekDirection(1);
                  setWeekAnchor((d) => addDays(d, 7));
                }}
                aria-label="Próxima semana"
                className="transition-transform hover:translate-x-0.5"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setWeekDirection(1);
                  setWeekAnchor(new Date());
                }}
              >
                Hoje
              </Button>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold capitalize">
                {format(weekStart, "d 'de' MMMM", { locale: ptBR })} —{" "}
                {format(addDays(weekStart, 6), "d 'de' MMMM", { locale: ptBR })}
              </p>
              <p className="text-xs text-muted-foreground">
                {weekAppointmentCount} consulta{weekAppointmentCount === 1 ? "" : "s"} nesta semana
              </p>
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
          ) : (
            <div
              key={weekStart.toISOString()}
              className={`animate-in fade-in mt-3 grid grid-cols-1 gap-3 overflow-x-auto duration-300 sm:grid-cols-2 lg:grid-cols-7 ${
                weekDirection === 1 ? "slide-in-from-right-4" : "slide-in-from-left-4"
              }`}
            >
              {weekDays.map((day, i) => {
                const dayAppointments = appointmentsByDay[i] ?? [];
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
                      <div>
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
                      </div>
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
                      {dayAppointments.length === 0 ? (
                        <p className="py-4 text-center text-xs text-muted-foreground">
                          Sem consultas
                        </p>
                      ) : (
                        dayAppointments.map((a, ai) => (
                          <button
                            key={a.id}
                            onClick={() => openEdit(a)}
                            style={{ animationDelay: `${i * 40 + ai * 60}ms` }}
                            className="animate-in fade-in w-full rounded-lg border border-border bg-background p-2 text-left text-xs fill-mode-both transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-accent hover:shadow-sm"
                          >
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar consulta" : "Nova consulta"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Paciente</Label>
              <Select
                value={form.patient_id}
                onValueChange={(patient_id) => setForm((f) => ({ ...f, patient_id }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o paciente" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="a-treatment">Tratamento</Label>
              <Input
                id="a-treatment"
                value={form.treatment}
                onChange={(e) => setForm((f) => ({ ...f, treatment: e.target.value }))}
                placeholder="Ex: Limpeza, Avaliação..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="a-date">Data e hora</Label>
              <Input
                id="a-date"
                type="datetime-local"
                value={form.scheduled_at}
                onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(status) =>
                  setForm((f) => ({ ...f, status: status as AppointmentStatus }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={save}
              disabled={!form.patient_id || !form.treatment.trim() || !form.scheduled_at || saving}
            >
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
