import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Calendar,
  FileText,
  IdCard,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Smile,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { db } from "@/integrations/mysql/client";
import {
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_STATUS_VARIANT,
  BUDGET_STATUS_LABEL,
  BUDGET_STATUS_VARIANT,
  calculateAge,
  formatCurrency,
  GENDER_LABEL,
  patientCode,
  type AppointmentStatus,
  type BudgetStatus,
} from "@/lib/admin/labels";
import {
  procedureLabel,
  situationOf,
  sortProcedures,
  statusOf,
  type ToothProcedure,
} from "@/lib/odontogram-pro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type QuickViewPatient = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  cpf: string | null;
  birth_date: string | null;
  address: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  guardian_cpf: string | null;
  gender: string | null;
  responsible_dentist: string | null;
  code: number | null;
  created_at: string;
};

type Appointment = { id: string; treatment: string; scheduled_at: string; status: string };
type Budget = { id: string; treatment: string; value: number; status: string };
type Payment = { id: string; amount: number; status: string };
type Anamnesis = {
  allergies: string | null;
  current_medications: string | null;
  systemic_conditions: string | null;
  anesthesia_allergy: boolean;
  is_smoker: boolean;
  is_pregnant: boolean;
  has_diabetes: boolean;
  has_hypertension: boolean;
  has_heart_condition: boolean;
};
type Note = { id: string; note: string; created_at: string };

/** Janela grande com todos os dados do paciente, aberta ao clicar no nome. */
export function PatientQuickView({
  patient,
  open,
  onOpenChange,
  onEdit,
  onDocuments,
}: {
  patient: QuickViewPatient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDocuments: () => void;
}) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [anamnesis, setAnamnesis] = useState<Anamnesis | null>(null);
  const [procedures, setProcedures] = useState<ToothProcedure[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [docCount, setDocCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !patient) return;
    let cancelled = false;
    setLoading(true);
    const id = patient.id;
    Promise.all([
      db
        .from("appointments")
        .select("id, treatment, scheduled_at, status")
        .eq("patient_id", id)
        .order("scheduled_at", { ascending: false }),
      db.from("budgets").select("id, treatment, value, status").eq("patient_id", id),
      db.from("payments").select("id, amount, status").eq("patient_id", id),
      db.from("patient_anamnesis").select("*").eq("patient_id", id).maybeSingle(),
      db.from("tooth_procedures").select("*").eq("patient_id", id),
      db
        .from("clinical_notes")
        .select("id, note, created_at")
        .eq("patient_id", id)
        .order("created_at", { ascending: false })
        .limit(5),
      db.from("documents").select("id").eq("patient_id", id),
      db.from("prescriptions").select("id").eq("patient_id", id),
      db.from("tooth_attachments").select("id").eq("patient_id", id),
    ]).then(([appts, bud, pay, anam, procs, nts, docs, rx, files]) => {
      if (cancelled) return;
      setAppointments((appts.data ?? []) as Appointment[]);
      setBudgets((bud.data ?? []) as Budget[]);
      setPayments((pay.data ?? []) as Payment[]);
      setAnamnesis((anam.data as Anamnesis | null) ?? null);
      setProcedures(sortProcedures((procs.data ?? []) as ToothProcedure[]));
      setNotes((nts.data ?? []) as Note[]);
      setDocCount((docs.data?.length ?? 0) + (rx.data?.length ?? 0) + (files.data?.length ?? 0));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, patient]);

  if (!patient) return null;

  const age = patient.birth_date ? calculateAge(patient.birth_date) : null;
  const paid = payments.filter((p) => p.status === "pago").reduce((s, p) => s + +p.amount, 0);
  const pending = payments
    .filter((p) => p.status !== "pago" && p.status !== "cancelado")
    .reduce((s, p) => s + +p.amount, 0);
  const budgetTotal = budgets.reduce((s, b) => s + +b.value, 0);
  const now = Date.now();
  const nextAppointment = [...appointments]
    .filter((a) => new Date(a.scheduled_at).getTime() >= now && a.status !== "cancelado")
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))[0];
  const openPlan = procedures.filter((p) => p.status !== "concluido");
  const alerts = anamnesis
    ? [
        anamnesis.anesthesia_allergy && "Alergia a anestésico",
        anamnesis.allergies && `Alergias: ${anamnesis.allergies}`,
        anamnesis.has_diabetes && "Diabetes",
        anamnesis.has_hypertension && "Hipertensão",
        anamnesis.has_heart_condition && "Problema cardíaco",
        anamnesis.is_pregnant && "Gestante",
        anamnesis.is_smoker && "Fumante",
        anamnesis.current_medications && `Medicamentos: ${anamnesis.current_medications}`,
        anamnesis.systemic_conditions && `Outras condições: ${anamnesis.systemic_conditions}`,
      ].filter((x): x is string => Boolean(x))
    : [];

  const info = (icon: React.ReactNode, label: string, value: React.ReactNode) => (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="break-words text-sm font-semibold">{value || "—"}</p>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] max-w-6xl p-0">
        <div className="border-b border-border bg-muted/30 px-6 pb-5 pt-6">
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-2xl font-extrabold text-primary-foreground">
                {patient.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-2xl font-extrabold">{patient.name}</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Código: {patientCode(patient.code)} · Paciente desde{" "}
                  {new Date(patient.created_at).toLocaleDateString("pt-BR")}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {patient.gender && (
                    <Badge variant="secondary">
                      {GENDER_LABEL[patient.gender] ?? patient.gender}
                    </Badge>
                  )}
                  {age != null && (
                    <Badge variant="secondary">
                      {age} {age === 1 ? "ano" : "anos"}
                      {age < 18 ? " · menor" : ""}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={onDocuments}>
                  <FileText className="h-4 w-4" /> Documentos ({docCount})
                </Button>
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Pencil className="h-4 w-4" /> Editar
                </Button>
                <Button size="sm" asChild>
                  <Link to="/admin/pacientes/$patientId" params={{ patientId: patient.id }}>
                    Abrir prontuário
                  </Link>
                </Button>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="space-y-5 px-6 pb-6">
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-border p-4 md:grid-cols-4">
            {info(
              <Calendar className="h-4 w-4" />,
              "Nascimento",
              patient.birth_date
                ? new Date(`${patient.birth_date.slice(0, 10)}T12:00:00`).toLocaleDateString(
                    "pt-BR",
                  )
                : null,
            )}
            {info(<Phone className="h-4 w-4" />, "Telefone", patient.phone)}
            {info(<IdCard className="h-4 w-4" />, "CPF", patient.cpf)}
            {info(<Mail className="h-4 w-4" />, "Email", patient.email)}
            {info(
              <Stethoscope className="h-4 w-4" />,
              "Dentista responsável",
              patient.responsible_dentist,
            )}
            <div className="col-span-2 md:col-span-3">
              {info(<MapPin className="h-4 w-4" />, "Endereço", patient.address)}
            </div>
            {patient.guardian_name && (
              <div className="col-span-2 md:col-span-4">
                {info(
                  <UserRound className="h-4 w-4" />,
                  "Responsável",
                  [
                    patient.guardian_name,
                    patient.guardian_phone,
                    patient.guardian_cpf && `CPF ${patient.guardian_cpf}`,
                  ]
                    .filter(Boolean)
                    .join(" · "),
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {[
              ["Consultas", String(appointments.length)],
              ["Orçado", formatCurrency(budgetTotal)],
              ["Pago", formatCurrency(paid)],
              ["A receber", formatCurrency(pending)],
              ["Documentos", String(docCount)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-border bg-card p-3 text-center">
                <p className="text-lg font-extrabold">{loading ? "…" : value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          {alerts.length > 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/40">
              <p className="flex items-center gap-2 text-sm font-bold text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4" /> Alertas de saúde (anamnese)
              </p>
              <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                {alerts.map((a) => (
                  <li key={a}>• {a}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-border p-4">
              <p className="mb-2 text-sm font-bold">Consultas</p>
              {nextAppointment && (
                <p className="mb-2 rounded-lg bg-primary/10 px-3 py-2 text-sm">
                  Próxima: <b>{nextAppointment.treatment}</b> em{" "}
                  {new Date(nextAppointment.scheduled_at).toLocaleString("pt-BR")}
                </p>
              )}
              {appointments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma consulta.</p>
              ) : (
                <ul className="max-h-56 space-y-1.5 overflow-y-auto">
                  {appointments.slice(0, 10).map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate">
                        {new Date(a.scheduled_at).toLocaleDateString("pt-BR")} — {a.treatment}
                      </span>
                      <Badge variant={APPOINTMENT_STATUS_VARIANT[a.status as AppointmentStatus]}>
                        {APPOINTMENT_STATUS_LABEL[a.status as AppointmentStatus] ?? a.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-xl border border-border p-4">
              <p className="mb-2 text-sm font-bold">Orçamentos</p>
              {budgets.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum orçamento.</p>
              ) : (
                <ul className="max-h-56 space-y-1.5 overflow-y-auto">
                  {budgets.map((b) => (
                    <li key={b.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate">
                        {b.treatment} — {formatCurrency(+b.value)}
                      </span>
                      <Badge variant={BUDGET_STATUS_VARIANT[b.status as BudgetStatus]}>
                        {BUDGET_STATUS_LABEL[b.status as BudgetStatus] ?? b.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-xl border border-border p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-bold">Plano de tratamento (odontograma)</p>
                <Link
                  to="/admin/pacientes/$patientId"
                  params={{ patientId: patient.id }}
                  search={{ tab: "odontograma" }}
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  <Smile className="h-3.5 w-3.5" /> Abrir odontograma
                </Link>
              </div>
              {openPlan.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum procedimento em aberto.</p>
              ) : (
                <ul className="max-h-56 space-y-1.5 overflow-y-auto">
                  {openPlan.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-3 w-3 shrink-0 rounded border border-stone-400"
                          style={{ background: situationOf(p.situation).color }}
                        />
                        <span className="truncate">
                          Dente {p.tooth_number} — {procedureLabel(p.planned_procedure)}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1 text-xs">
                        <span className={`h-2 w-2 rounded-full ${statusOf(p.status).dot}`} />
                        {statusOf(p.status).label}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-xl border border-border p-4">
              <p className="mb-2 text-sm font-bold">Últimas evoluções</p>
              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma anotação.</p>
              ) : (
                <ul className="max-h-56 space-y-2 overflow-y-auto">
                  {notes.map((n) => (
                    <li key={n.id} className="text-sm">
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(n.created_at).toLocaleString("pt-BR")}
                      </p>
                      <p className="line-clamp-3 whitespace-pre-line">{n.note}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
