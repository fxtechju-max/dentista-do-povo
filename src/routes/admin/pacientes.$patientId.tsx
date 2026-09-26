import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Receipt,
  DollarSign,
  ClipboardList,
  FileText,
  Mail,
  Phone,
  Plus,
  Sparkles,
  Stethoscope,
  Smile,
  NotebookPen,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { summarizePatientHistory } from "@/lib/admin/functions";
import {
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_STATUS_VARIANT,
  BUDGET_STATUS_LABEL,
  BUDGET_STATUS_VARIANT,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_VARIANT,
  formatCurrency,
  type AppointmentStatus,
  type BudgetStatus,
  type PaymentStatus,
} from "@/lib/admin/labels";
import {
  TOOTH_CONDITIONS,
  TOOTH_CONDITION_LABEL,
  TOOTH_CONDITION_COLOR,
  UPPER_TEETH,
  LOWER_TEETH,
  type ToothCondition,
} from "@/lib/odontogram";
import { EmptyState } from "@/components/admin/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin/pacientes/$patientId")({
  component: Prontuario,
});

type Patient = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  created_at: string;
};
type Appointment = {
  id: string;
  treatment: string;
  scheduled_at: string;
  status: AppointmentStatus;
};
type Budget = { id: string; treatment: string; value: number; status: BudgetStatus };
type Payment = {
  id: string;
  amount: number;
  status: PaymentStatus;
  paid_at: string | null;
  created_at: string;
};
type Prescription = {
  id: string;
  medication: string;
  instructions: string | null;
  issued_at: string;
};
type DocumentRow = {
  id: string;
  title: string;
  category: string | null;
  url: string | null;
  created_at: string;
};
type Anamnesis = {
  allergies: string | null;
  current_medications: string | null;
  systemic_conditions: string | null;
  previous_surgeries: string | null;
  is_smoker: boolean;
  is_pregnant: boolean;
  has_diabetes: boolean;
  has_hypertension: boolean;
  has_heart_condition: boolean;
  additional_notes: string | null;
};
type ToothRecord = { tooth_number: number; condition: ToothCondition; notes: string | null };
type ClinicalNote = { id: string; note: string; created_at: string };

const emptyAnamnesis: Anamnesis = {
  allergies: "",
  current_medications: "",
  systemic_conditions: "",
  previous_surgeries: "",
  is_smoker: false,
  is_pregnant: false,
  has_diabetes: false,
  has_hypertension: false,
  has_heart_condition: false,
  additional_notes: "",
};

function Prontuario() {
  const { patientId } = Route.useParams();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [anamnesis, setAnamnesis] = useState<Anamnesis>(emptyAnamnesis);
  const [toothRecords, setToothRecords] = useState<Map<number, ToothRecord>>(new Map());
  const [clinicalNotes, setClinicalNotes] = useState<ClinicalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingAnamnesis, setSavingAnamnesis] = useState(false);
  const [anamnesisSaved, setAnamnesisSaved] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const [apptDialog, setApptDialog] = useState(false);
  const [apptForm, setApptForm] = useState({
    treatment: "",
    scheduled_at: "",
    status: "agendado" as AppointmentStatus,
  });
  const [rxDialog, setRxDialog] = useState(false);
  const [rxForm, setRxForm] = useState({ medication: "", instructions: "" });
  const [saving, setSaving] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [
      { data: patientData },
      { data: appointmentsData },
      { data: budgetsData },
      { data: paymentsData },
      { data: prescriptionsData },
      { data: documentsData },
      { data: anamnesisData },
      { data: toothData },
      { data: notesData },
    ] = await Promise.all([
      supabase
        .from("patients")
        .select("id, name, phone, email, created_at")
        .eq("id", patientId)
        .single(),
      supabase
        .from("appointments")
        .select("id, treatment, scheduled_at, status")
        .eq("patient_id", patientId)
        .order("scheduled_at", { ascending: false }),
      supabase.from("budgets").select("id, treatment, value, status").eq("patient_id", patientId),
      supabase
        .from("payments")
        .select("id, amount, status, paid_at, created_at")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false }),
      supabase
        .from("prescriptions")
        .select("id, medication, instructions, issued_at")
        .eq("patient_id", patientId)
        .order("issued_at", { ascending: false }),
      supabase
        .from("documents")
        .select("id, title, category, url, created_at")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false }),
      supabase.from("patient_anamnesis").select("*").eq("patient_id", patientId).maybeSingle(),
      supabase
        .from("tooth_records")
        .select("tooth_number, condition, notes")
        .eq("patient_id", patientId),
      supabase
        .from("clinical_notes")
        .select("id, note, created_at")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false }),
    ]);
    setPatient((patientData as Patient) ?? null);
    setAppointments((appointmentsData ?? []) as Appointment[]);
    setBudgets((budgetsData ?? []) as Budget[]);
    setPayments((paymentsData ?? []) as Payment[]);
    setPrescriptions((prescriptionsData ?? []) as Prescription[]);
    setDocuments((documentsData ?? []) as DocumentRow[]);
    setAnamnesis(anamnesisData ? (anamnesisData as Anamnesis) : emptyAnamnesis);
    setToothRecords(
      new Map(((toothData ?? []) as ToothRecord[]).map((t) => [t.tooth_number, t] as const)),
    );
    setClinicalNotes((notesData ?? []) as ClinicalNote[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  async function saveAppointment() {
    if (!apptForm.treatment.trim() || !apptForm.scheduled_at) return;
    setSaving(true);
    await supabase.from("appointments").insert({
      patient_id: patientId,
      treatment: apptForm.treatment.trim(),
      scheduled_at: new Date(apptForm.scheduled_at).toISOString(),
      status: apptForm.status,
    });
    setSaving(false);
    setApptDialog(false);
    setApptForm({ treatment: "", scheduled_at: "", status: "agendado" });
    load();
  }

  async function saveRx() {
    if (!rxForm.medication.trim()) return;
    setSaving(true);
    await supabase.from("prescriptions").insert({
      patient_id: patientId,
      medication: rxForm.medication.trim(),
      instructions: rxForm.instructions.trim() || null,
    });
    setSaving(false);
    setRxDialog(false);
    setRxForm({ medication: "", instructions: "" });
    load();
  }

  async function saveAnamnesis() {
    setSavingAnamnesis(true);
    await supabase.from("patient_anamnesis").upsert({
      patient_id: patientId,
      allergies: anamnesis.allergies?.trim() || null,
      current_medications: anamnesis.current_medications?.trim() || null,
      systemic_conditions: anamnesis.systemic_conditions?.trim() || null,
      previous_surgeries: anamnesis.previous_surgeries?.trim() || null,
      is_smoker: anamnesis.is_smoker,
      is_pregnant: anamnesis.is_pregnant,
      has_diabetes: anamnesis.has_diabetes,
      has_hypertension: anamnesis.has_hypertension,
      has_heart_condition: anamnesis.has_heart_condition,
      additional_notes: anamnesis.additional_notes?.trim() || null,
      updated_at: new Date().toISOString(),
    });
    setSavingAnamnesis(false);
    setAnamnesisSaved(true);
    setTimeout(() => setAnamnesisSaved(false), 2000);
  }

  async function saveTooth(toothNumber: number, condition: ToothCondition, notes: string) {
    await supabase.from("tooth_records").upsert(
      {
        patient_id: patientId,
        tooth_number: toothNumber,
        condition,
        notes: notes.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "patient_id,tooth_number" },
    );
    setToothRecords((prev) => {
      const next = new Map(prev);
      next.set(toothNumber, { tooth_number: toothNumber, condition, notes: notes.trim() || null });
      return next;
    });
  }

  async function addClinicalNote() {
    if (!newNote.trim() || savingNote) return;
    setSavingNote(true);
    await supabase.from("clinical_notes").insert({ patient_id: patientId, note: newNote.trim() });
    setNewNote("");
    setSavingNote(false);
    load();
  }

  async function removeClinicalNote(id: string) {
    await supabase.from("clinical_notes").delete().eq("id", id);
    setClinicalNotes((prev) => prev.filter((n) => n.id !== id));
  }

  async function summarizeWithAI() {
    if (!patient || aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    setAiSummary(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Sessão expirada. Faça login novamente.");
      const result = await summarizePatientHistory({
        data: {
          patientName: patient.name,
          appointments: appointments.map((a) => ({
            treatment: a.treatment,
            scheduled_at: a.scheduled_at,
            status: a.status,
          })),
          budgets: budgets.map((b) => ({
            treatment: b.treatment,
            value: Number(b.value),
            status: b.status,
          })),
          payments: payments.map((p) => ({ amount: Number(p.amount), status: p.status })),
          prescriptions: prescriptions.map((rx) => ({
            medication: rx.medication,
            instructions: rx.instructions,
          })),
        },
        headers: { Authorization: `Bearer ${token}` },
      });
      setAiSummary(result.summary);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Não foi possível gerar o resumo.");
    } finally {
      setAiLoading(false);
    }
  }

  if (loading) {
    return (
      <p className="p-8 text-center text-sm text-muted-foreground">Carregando prontuário...</p>
    );
  }

  if (!patient) {
    return (
      <div className="rounded-2xl border border-border bg-card">
        <EmptyState icon={FileText} title="Paciente não encontrado." />
      </div>
    );
  }

  const totalPaid = payments
    .filter((p) => p.status === "pago")
    .reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="animate-in fade-in space-y-4 duration-300">
      <Link
        to="/admin/pacientes"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar para pacientes
      </Link>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-xl font-extrabold text-primary">
              {patient.name.charAt(0).toUpperCase()}
            </span>
            <div>
              <h1 className="text-xl font-extrabold">{patient.name}</h1>
              <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
                {patient.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" /> {patient.phone}
                  </span>
                )}
                {patient.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" /> {patient.email}
                  </span>
                )}
                <span>
                  Paciente desde {new Date(patient.created_at).toLocaleDateString("pt-BR")}
                </span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-extrabold">{appointments.length}</p>
              <p className="text-xs text-muted-foreground">Consultas</p>
            </div>
            <div>
              <p className="text-lg font-extrabold text-emerald-600">{formatCurrency(totalPaid)}</p>
              <p className="text-xs text-muted-foreground">Pago</p>
            </div>
            <div>
              <p className="text-lg font-extrabold">{documents.length}</p>
              <p className="text-xs text-muted-foreground">Documentos</p>
            </div>
          </div>
        </div>

        <div className="mt-4 border-t border-border pt-4">
          <Button variant="outline" size="sm" onClick={summarizeWithAI} disabled={aiLoading}>
            <Sparkles className={aiLoading ? "animate-pulse" : undefined} />
            {aiLoading ? "Gerando resumo..." : "Resumir histórico com IA"}
          </Button>
          {aiError && <p className="mt-2 text-xs font-semibold text-destructive">{aiError}</p>}
          {aiSummary && (
            <p className="mt-3 whitespace-pre-line rounded-lg bg-muted/50 p-3 text-sm">
              {aiSummary}
            </p>
          )}
        </div>
      </div>

      <Tabs defaultValue="anamnese">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="anamnese">
            <Stethoscope className="h-3.5 w-3.5" /> Anamnese
          </TabsTrigger>
          <TabsTrigger value="odontograma">
            <Smile className="h-3.5 w-3.5" /> Odontograma
          </TabsTrigger>
          <TabsTrigger value="evolucao">
            <NotebookPen className="h-3.5 w-3.5" /> Evolução
          </TabsTrigger>
          <TabsTrigger value="consultas">📅 Consultas</TabsTrigger>
          <TabsTrigger value="orcamentos">🧾 Orçamentos</TabsTrigger>
          <TabsTrigger value="financeiro">💰 Financeiro</TabsTrigger>
          <TabsTrigger value="receitas">💊 Receitas</TabsTrigger>
          <TabsTrigger value="documentos">📄 Documentos</TabsTrigger>
        </TabsList>

        <TabsContent value="anamnese" className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 text-sm font-bold">Condições de saúde</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(
                [
                  ["is_smoker", "Fumante"],
                  ["is_pregnant", "Gestante"],
                  ["has_diabetes", "Diabetes"],
                  ["has_hypertension", "Hipertensão"],
                  ["has_heart_condition", "Problema cardíaco"],
                ] as const
              ).map(([key, label]) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                >
                  <Label htmlFor={key}>{label}</Label>
                  <Switch
                    id={key}
                    checked={anamnesis[key]}
                    onCheckedChange={(checked) => setAnamnesis((a) => ({ ...a, [key]: checked }))}
                  />
                </div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="an-allergies">Alergias</Label>
                <Textarea
                  id="an-allergies"
                  value={anamnesis.allergies ?? ""}
                  onChange={(e) => setAnamnesis((a) => ({ ...a, allergies: e.target.value }))}
                  placeholder="Ex: penicilina, látex..."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="an-meds">Medicamentos em uso</Label>
                <Textarea
                  id="an-meds"
                  value={anamnesis.current_medications ?? ""}
                  onChange={(e) =>
                    setAnamnesis((a) => ({ ...a, current_medications: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="an-systemic">Outras condições sistêmicas</Label>
                <Textarea
                  id="an-systemic"
                  value={anamnesis.systemic_conditions ?? ""}
                  onChange={(e) =>
                    setAnamnesis((a) => ({ ...a, systemic_conditions: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="an-surgeries">Cirurgias anteriores</Label>
                <Textarea
                  id="an-surgeries"
                  value={anamnesis.previous_surgeries ?? ""}
                  onChange={(e) =>
                    setAnamnesis((a) => ({ ...a, previous_surgeries: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              <Label htmlFor="an-notes">Observações adicionais</Label>
              <Textarea
                id="an-notes"
                value={anamnesis.additional_notes ?? ""}
                onChange={(e) => setAnamnesis((a) => ({ ...a, additional_notes: e.target.value }))}
              />
            </div>
            <Button className="mt-4" onClick={saveAnamnesis} disabled={savingAnamnesis}>
              {anamnesisSaved ? "Salvo ✅" : savingAnamnesis ? "Salvando..." : "Salvar anamnese"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="odontograma" className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 text-sm font-bold">Odontograma</p>
            <div className="space-y-2 overflow-x-auto">
              <div className="flex min-w-max justify-center gap-1">
                {UPPER_TEETH.map((n) => (
                  <ToothButton key={n} number={n} record={toothRecords.get(n)} onSave={saveTooth} />
                ))}
              </div>
              <div className="flex min-w-max justify-center gap-1">
                {LOWER_TEETH.map((n) => (
                  <ToothButton key={n} number={n} record={toothRecords.get(n)} onSave={saveTooth} />
                ))}
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3 border-t border-border pt-4">
              {TOOTH_CONDITIONS.map((c) => (
                <span key={c} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={`h-3 w-3 rounded-full border ${TOOTH_CONDITION_COLOR[c]}`} />
                  {TOOTH_CONDITION_LABEL[c]}
                </span>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="evolucao" className="space-y-3">
          <div className="rounded-2xl border border-border bg-card p-4">
            <Label htmlFor="new-note">Nova anotação</Label>
            <Textarea
              id="new-note"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Descreva o que foi observado ou realizado nesta evolução..."
              className="mt-1.5"
            />
            <Button
              className="mt-2"
              size="sm"
              onClick={addClinicalNote}
              disabled={!newNote.trim() || savingNote}
            >
              <Plus /> {savingNote ? "Salvando..." : "Adicionar anotação"}
            </Button>
          </div>
          {clinicalNotes.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card">
              <EmptyState icon={NotebookPen} title="Nenhuma anotação registrada ainda." />
            </div>
          ) : (
            clinicalNotes.map((n) => (
              <div
                key={n.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
              >
                <div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(n.created_at).toLocaleString("pt-BR")}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm">{n.note}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeClinicalNote(n.id)}
                  aria-label="Excluir anotação"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="consultas" className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setApptDialog(true)}>
              <Plus /> Nova consulta
            </Button>
          </div>
          {appointments.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card">
              <EmptyState icon={Calendar} title="Nenhuma consulta registrada." />
            </div>
          ) : (
            appointments.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
              >
                <div>
                  <p className="font-semibold">{a.treatment}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(a.scheduled_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                <Badge variant={APPOINTMENT_STATUS_VARIANT[a.status]}>
                  {APPOINTMENT_STATUS_LABEL[a.status]}
                </Badge>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="orcamentos" className="space-y-3">
          {budgets.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card">
              <EmptyState icon={Receipt} title="Nenhum orçamento registrado." />
            </div>
          ) : (
            budgets.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
              >
                <div>
                  <p className="font-semibold">{b.treatment}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(Number(b.value))}</p>
                </div>
                <Badge variant={BUDGET_STATUS_VARIANT[b.status]}>
                  {BUDGET_STATUS_LABEL[b.status]}
                </Badge>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="financeiro" className="space-y-3">
          {payments.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card">
              <EmptyState icon={DollarSign} title="Nenhum lançamento registrado." />
            </div>
          ) : (
            payments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
              >
                <div>
                  <p className="font-semibold">{formatCurrency(Number(p.amount))}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(p.paid_at ?? p.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <Badge variant={PAYMENT_STATUS_VARIANT[p.status]}>
                  {PAYMENT_STATUS_LABEL[p.status]}
                </Badge>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="receitas" className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setRxDialog(true)}>
              <Plus /> Nova receita
            </Button>
          </div>
          {prescriptions.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card">
              <EmptyState icon={ClipboardList} title="Nenhuma receita emitida." />
            </div>
          ) : (
            prescriptions.map((rx) => (
              <div key={rx.id} className="rounded-xl border border-border bg-card px-4 py-3">
                <p className="font-semibold">{rx.medication}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(rx.issued_at).toLocaleDateString("pt-BR")}
                </p>
                {rx.instructions && (
                  <p className="mt-1 whitespace-pre-line text-sm">{rx.instructions}</p>
                )}
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="documentos" className="space-y-3">
          {documents.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card">
              <EmptyState icon={FileText} title="Nenhum documento anexado." />
            </div>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
              >
                <div>
                  <p className="font-semibold">{doc.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                {doc.category && <Badge variant="outline">{doc.category}</Badge>}
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={apptDialog} onOpenChange={setApptDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova consulta para {patient.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="pr-treatment">Tratamento</Label>
              <Input
                id="pr-treatment"
                value={apptForm.treatment}
                onChange={(e) => setApptForm((f) => ({ ...f, treatment: e.target.value }))}
                placeholder="Ex: Limpeza"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pr-date">Data e hora</Label>
              <Input
                id="pr-date"
                type="datetime-local"
                value={apptForm.scheduled_at}
                onChange={(e) => setApptForm((f) => ({ ...f, scheduled_at: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={apptForm.status}
                onValueChange={(status) =>
                  setApptForm((f) => ({ ...f, status: status as AppointmentStatus }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(APPOINTMENT_STATUS_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApptDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={saveAppointment}
              disabled={!apptForm.treatment.trim() || !apptForm.scheduled_at || saving}
            >
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rxDialog} onOpenChange={setRxDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova receita para {patient.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="pr-med">Medicação</Label>
              <Input
                id="pr-med"
                value={rxForm.medication}
                onChange={(e) => setRxForm((f) => ({ ...f, medication: e.target.value }))}
                placeholder="Ex: Amoxicilina 500mg"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pr-instructions">Instruções</Label>
              <Textarea
                id="pr-instructions"
                value={rxForm.instructions}
                onChange={(e) => setRxForm((f) => ({ ...f, instructions: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRxDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={saveRx} disabled={!rxForm.medication.trim() || saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ToothButton({
  number,
  record,
  onSave,
}: {
  number: number;
  record: ToothRecord | undefined;
  onSave: (toothNumber: number, condition: ToothCondition, notes: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [condition, setCondition] = useState<ToothCondition>(record?.condition ?? "saudavel");
  const [notes, setNotes] = useState(record?.notes ?? "");
  const [saving, setSaving] = useState(false);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setCondition(record?.condition ?? "saudavel");
          setNotes(record?.notes ?? "");
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          title={`Dente ${number}${record ? ` — ${TOOTH_CONDITION_LABEL[record.condition]}` : ""}`}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-xs font-bold transition-transform hover:scale-110 ${TOOTH_CONDITION_COLOR[record?.condition ?? "saudavel"]}`}
        >
          {number}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <p className="mb-2 text-sm font-bold">Dente {number}</p>
        <div className="space-y-1.5">
          <Label>Condição</Label>
          <Select value={condition} onValueChange={(v) => setCondition(v as ToothCondition)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TOOTH_CONDITIONS.map((c) => (
                <SelectItem key={c} value={c}>
                  {TOOTH_CONDITION_LABEL[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="mt-2 space-y-1.5">
          <Label htmlFor={`tooth-notes-${number}`}>Observações</Label>
          <Textarea
            id={`tooth-notes-${number}`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-16"
          />
        </div>
        <Button
          size="sm"
          className="mt-3 w-full"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            await onSave(number, condition, notes);
            setSaving(false);
            setOpen(false);
          }}
        >
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
