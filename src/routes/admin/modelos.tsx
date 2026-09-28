import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Copy,
  FileDown,
  FileText,
  FileType,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import { db } from "@/integrations/mysql/client";
import { PageHeader } from "@/components/admin/PageHeader";
import { DocumentPage } from "@/components/admin/documents/DocumentPage";
import { PAGE_HEIGHT, PAGE_WIDTH } from "@/lib/document-page";
import {
  DOCUMENT_LAYOUTS,
  PLACEHOLDERS,
  clinicFromRow,
  fileName,
  fillTemplate,
  placeholderValues,
  type ClinicInfo,
  type DocumentLayout,
  type DocumentPatient,
  type DocumentTemplate,
} from "@/lib/document-templates";
import { exportDocx, exportPdf, printDocument } from "@/lib/document-export";
import { patientCode } from "@/lib/admin/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export const Route = createFileRoute("/admin/modelos")({
  validateSearch: (search: Record<string, unknown>): { paciente?: string; modelo?: string } => ({
    ...(typeof search["paciente"] === "string" ? { paciente: search["paciente"] } : {}),
    ...(typeof search["modelo"] === "string" ? { modelo: search["modelo"] } : {}),
  }),
  component: Modelos,
});

type Patient = DocumentPatient & { id: string; code: number | null };

const SAMPLE_PATIENT: DocumentPatient = {
  name: "Maria da Silva (exemplo)",
  cpf: "000.000.000-00",
  address: "Rua Exemplo, 100 - Centro",
  birth_date: "1990-05-10",
  phone: "(69) 90000-0000",
  guardian_name: null,
};

function ScaledPage(props: {
  scale: number;
  layout: DocumentLayout;
  clinic: ClinicInfo;
  title: string;
  body: string;
  pageRef?: React.Ref<HTMLDivElement>;
}) {
  const { scale: maxScale, pageRef, ...page } = props;
  // Diminui a folha para caber na largura disponível (celular), sem passar de maxScale.
  const boxRef = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState<number | null>(null);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setAvailable(entry?.contentRect.width ?? null),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const scale = available ? Math.min(maxScale, available / PAGE_WIDTH) : maxScale;
  return (
    <div ref={boxRef} className="w-full" style={{ maxWidth: PAGE_WIDTH * maxScale }}>
      <div
        className="overflow-hidden rounded-md shadow-xl ring-1 ring-black/10"
        style={{ width: PAGE_WIDTH * scale, height: PAGE_HEIGHT * scale }}
      >
        <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <DocumentPage ref={pageRef} {...page} />
        </div>
      </div>
    </div>
  );
}

function LayoutPicker({
  value,
  onChange,
}: {
  value: DocumentLayout;
  onChange: (layout: DocumentLayout) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {DOCUMENT_LAYOUTS.map((l) => (
        <button
          key={l.id}
          type="button"
          onClick={() => onChange(l.id)}
          className={`rounded-lg border-2 p-2 text-left transition-colors ${
            value === l.id ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
          }`}
        >
          <p className="text-xs font-bold">{l.name}</p>
          <p className="text-[10px] leading-tight text-muted-foreground">{l.description}</p>
        </button>
      ))}
    </div>
  );
}

function Modelos() {
  const search = Route.useSearch();
  const [clinicRow, setClinicRow] = useState<Record<string, string | null> | null>(null);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const clinic = useMemo(() => clinicFromRow(clinicRow), [clinicRow]);

  async function loadTemplates() {
    const { data } = await db
      .from("document_templates")
      .select("*")
      .order("sort_order", { ascending: true });
    setTemplates((data ?? []) as DocumentTemplate[]);
  }

  async function loadClinic() {
    const { data } = await db
      .from("clinic_settings")
      .select(
        "clinic_name, dentist_name, dentist_cro, phone, whatsapp_number, clinic_email, address, clinic_city, instagram_url",
      )
      .eq("id", "default")
      .maybeSingle();
    setClinicRow((data as Record<string, string | null> | null) ?? null);
  }

  useEffect(() => {
    loadTemplates();
    loadClinic();
    db.from("patients")
      .select("id, name, cpf, address, birth_date, phone, guardian_name, code")
      .order("name", { ascending: true })
      .then(({ data }) => setPatients((data ?? []) as Patient[]));
  }, []);

  return (
    <div className="animate-in fade-in space-y-4 duration-300">
      <PageHeader
        title="🖨️ Modelos de Documentos"
        description="Receituário, atestado, declaração e outros — com os dados da clínica e do paciente. Imprima ou exporte em PDF/DOCX."
      />
      <Tabs defaultValue="gerar">
        <TabsList>
          <TabsTrigger value="gerar">Gerar documento</TabsTrigger>
          <TabsTrigger value="modelos">Modelos</TabsTrigger>
          <TabsTrigger value="clinica">Dados da clínica</TabsTrigger>
        </TabsList>
        <TabsContent value="gerar">
          <Generate
            clinic={clinic}
            templates={templates}
            patients={patients}
            initialPatient={search.paciente}
            initialTemplate={search.modelo}
          />
        </TabsContent>
        <TabsContent value="modelos">
          <TemplateEditor clinic={clinic} templates={templates} onChanged={loadTemplates} />
        </TabsContent>
        <TabsContent value="clinica">
          <ClinicForm clinic={clinic} onSaved={loadClinic} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Generate({
  clinic,
  templates,
  patients,
  initialPatient,
  initialTemplate,
}: {
  clinic: ClinicInfo;
  templates: DocumentTemplate[];
  patients: Patient[];
  initialPatient: string | undefined;
  initialTemplate: string | undefined;
}) {
  const [templateId, setTemplateId] = useState<string | null>(initialTemplate ?? null);
  const [patientId, setPatientId] = useState<string | null>(initialPatient ?? null);
  const [patientQuery, setPatientQuery] = useState("");
  const [layout, setLayout] = useState<DocumentLayout>("classico");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  const template = templates.find((t) => t.id === templateId) ?? templates[0] ?? null;
  const patient = patients.find((p) => p.id === patientId) ?? null;

  // Recria o texto quando muda o modelo, o paciente ou os dados da clínica.
  useEffect(() => {
    if (!template) return;
    const values = placeholderValues(clinic, patient);
    setTitle(template.title);
    setBody(fillTemplate(template.body, values));
    setLayout(template.layout);
  }, [template, patient, clinic]);

  const matches = useMemo(() => {
    const q = patientQuery.trim().toLowerCase();
    if (!q) return [];
    return patients
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) || p.cpf?.includes(q) || patientCode(p.code).includes(q),
      )
      .slice(0, 8);
  }, [patients, patientQuery]);

  const name = fileName(title, patient?.name ?? null);

  async function run(kind: "print" | "pdf" | "docx") {
    if (!pageRef.current) return;
    setBusy(kind);
    try {
      if (kind === "print") printDocument(pageRef.current, name);
      else if (kind === "pdf") await exportPdf(pageRef.current, name);
      else await exportDocx({ layout, clinic, title, body, name });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível exportar.");
    } finally {
      setBusy(null);
    }
  }

  if (!templates.length)
    return <p className="p-8 text-center text-sm text-muted-foreground">Carregando modelos...</p>;

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[minmax(0,1fr)_auto]">
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <Label>1. Escolha o modelo</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTemplateId(t.id)}
                className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm font-semibold transition-colors ${
                  template?.id === t.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-accent"
                }`}
              >
                <FileText className="h-4 w-4" /> {t.name}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <Label>2. Escolha o paciente</Label>
          {patient ? (
            <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-primary/10 px-3 py-2">
              <span className="text-sm">
                <b>{patient.name}</b>{" "}
                <span className="text-muted-foreground">{patientCode(patient.code)}</span>
              </span>
              <Button variant="ghost" size="sm" onClick={() => setPatientId(null)}>
                Trocar
              </Button>
            </div>
          ) : (
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-[18px] h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={patientQuery}
                onChange={(e) => setPatientQuery(e.target.value)}
                placeholder="Buscar paciente por nome, CPF ou código..."
                className="pl-9"
              />
              {matches.length > 0 && (
                <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
                  {matches.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setPatientId(p.id);
                        setPatientQuery("");
                      }}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                    >
                      {p.name}{" "}
                      <span className="text-xs text-muted-foreground">
                        {patientCode(p.code)} {p.cpf ? `· ${p.cpf}` : ""}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                Sem paciente, os campos ficam em branco para preencher à mão.
              </p>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <Label>3. Layout</Label>
          <div className="mt-2">
            <LayoutPicker value={layout} onChange={setLayout} />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label>4. Revise e edite o texto</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (!template) return;
                setTitle(template.title);
                setBody(fillTemplate(template.body, placeholderValues(clinic, patient)));
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Recarregar do modelo
            </Button>
          </div>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-2" />
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            className="mt-2 font-mono text-sm"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            As mudanças aqui valem só para este documento. Para mudar o modelo, use a aba Modelos.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => run("print")} disabled={!!busy}>
            <Printer className="h-4 w-4" /> Imprimir
          </Button>
          <Button variant="outline" onClick={() => run("pdf")} disabled={!!busy}>
            <FileDown className="h-4 w-4" /> {busy === "pdf" ? "Gerando PDF..." : "Baixar PDF"}
          </Button>
          <Button variant="outline" onClick={() => run("docx")} disabled={!!busy}>
            <FileType className="h-4 w-4" /> {busy === "docx" ? "Gerando DOCX..." : "Baixar DOCX"}
          </Button>
        </div>
      </div>

      <div className="xl:sticky xl:top-4 xl:self-start">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Pré-visualização (A4)
        </p>
        <ScaledPage
          scale={0.62}
          layout={layout}
          clinic={clinic}
          title={title}
          body={body}
          pageRef={pageRef}
        />
      </div>
    </div>
  );
}

function TemplateEditor({
  clinic,
  templates,
  onChanged,
}: {
  clinic: ClinicInfo;
  templates: DocumentTemplate[];
  onChanged: () => Promise<void>;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DocumentTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const current = templates.find((t) => t.id === selectedId) ?? templates[0] ?? null;
  useEffect(() => {
    setDraft(current ? { ...current } : null);
  }, [current]);

  function insert(key: string) {
    if (!draft) return;
    const el = bodyRef.current;
    const token = `{{${key}}}`;
    const start = el?.selectionStart ?? draft.body.length;
    const end = el?.selectionEnd ?? draft.body.length;
    const body = draft.body.slice(0, start) + token + draft.body.slice(end);
    setDraft({ ...draft, body });
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  }

  async function save() {
    if (!draft || !draft.name.trim() || !draft.title.trim()) return;
    setSaving(true);
    const { error } = await db
      .from("document_templates")
      .update({
        name: draft.name.trim(),
        title: draft.title.trim(),
        body: draft.body,
        layout: draft.layout,
        updated_at: new Date().toISOString(),
      })
      .eq("id", draft.id);
    setSaving(false);
    if (!error) {
      toast.success("Modelo salvo.");
      await onChanged();
    }
  }

  async function create(from: DocumentTemplate | null) {
    const { data, error } = await db
      .from("document_templates")
      .insert({
        kind: from?.kind ?? "personalizado",
        name: from ? `${from.name} (cópia)` : "Novo modelo",
        title: from?.title ?? "Título do documento",
        body:
          from?.body ?? "Escreva o texto aqui. Use os campos automáticos, como {{paciente_nome}}.",
        layout: from?.layout ?? "classico",
        sort_order: templates.length + 1,
      })
      .select("id")
      .single();
    if (!error && data) {
      await onChanged();
      setSelectedId(data.id);
      toast.success("Modelo criado.");
    }
  }

  async function remove() {
    if (!draft) return;
    await db.from("document_templates").delete().eq("id", draft.id);
    setConfirmDelete(false);
    setSelectedId(null);
    await onChanged();
  }

  const preview = draft ? fillTemplate(draft.body, placeholderValues(clinic, SAMPLE_PATIENT)) : "";

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_auto]">
      <div className="space-y-2">
        {templates.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSelectedId(t.id)}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold ${
              current?.id === t.id ? "bg-primary text-primary-foreground" : "hover:bg-accent"
            }`}
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span className="truncate">{t.name}</span>
          </button>
        ))}
        <Button variant="outline" size="sm" className="w-full" onClick={() => create(null)}>
          <Plus className="h-4 w-4" /> Novo modelo
        </Button>
      </div>

      {draft ? (
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-name">Nome do modelo</Label>
              <Input
                id="tpl-name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-title">Título impresso</Label>
              <Input
                id="tpl-title"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Layout padrão</Label>
            <LayoutPicker
              value={draft.layout}
              onChange={(layout) => setDraft({ ...draft, layout })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tpl-body">Texto</Label>
            <Textarea
              id="tpl-body"
              ref={bodyRef}
              rows={12}
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              className="font-mono text-sm"
            />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">
              Campos automáticos (clique para inserir onde está o cursor):
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {PLACEHOLDERS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => insert(p.key)}
                  className="rounded-md border border-border bg-background px-2 py-1 text-[11px] font-semibold hover:border-primary hover:text-primary"
                  title={`{{${p.key}}}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            <Button onClick={save} disabled={saving}>
              <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar modelo"}
            </Button>
            <Button variant="outline" onClick={() => create(draft)}>
              <Copy className="h-4 w-4" /> Duplicar
            </Button>
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-4 w-4" /> Excluir
            </Button>
          </div>
        </div>
      ) : (
        <p className="p-8 text-center text-sm text-muted-foreground">Carregando modelos...</p>
      )}

      {draft && (
        <div className="hidden xl:block">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Prévia com paciente de exemplo
          </p>
          <ScaledPage
            scale={0.5}
            layout={draft.layout}
            clinic={clinic}
            title={draft.title}
            body={preview}
          />
        </div>
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir o modelo “{draft?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Documentos já impressos ou baixados não são afetados.
            </AlertDialogDescription>
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

const CLINIC_FIELDS: { key: keyof ClinicInfo; label: string; placeholder?: string }[] = [
  { key: "clinic_name", label: "Nome da clínica" },
  { key: "dentist_name", label: "Nome do dentista" },
  { key: "dentist_cro", label: "CRO", placeholder: "CRO/RO 0000" },
  { key: "phone", label: "Telefone / agendamentos" },
  { key: "whatsapp_number", label: "WhatsApp" },
  { key: "clinic_email", label: "Email" },
  { key: "address", label: "Endereço completo" },
  { key: "clinic_city", label: "Cidade (usada na data do documento)", placeholder: "Cujubim - RO" },
];

function ClinicForm({ clinic, onSaved }: { clinic: ClinicInfo; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState<ClinicInfo>(clinic);
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm(clinic), [clinic]);

  async function save() {
    setSaving(true);
    const values = Object.fromEntries(
      CLINIC_FIELDS.map(({ key }) => [key, form[key].trim() || null]),
    );
    const { error } = await db
      .from("clinic_settings")
      .upsert({ id: "default", ...values, updated_at: new Date().toISOString() });
    setSaving(false);
    if (!error) {
      toast.success("Dados da clínica salvos.");
      await onSaved();
    }
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[minmax(0,1fr)_auto]">
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">
          Estes dados aparecem no cabeçalho, na assinatura e no rodapé de todos os documentos.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {CLINIC_FIELDS.map((f) => (
            <div
              key={f.key}
              className={`space-y-1.5 ${f.key === "address" ? "sm:col-span-2" : ""}`}
            >
              <Label htmlFor={`clinic-${f.key}`}>{f.label}</Label>
              <Input
                id={`clinic-${f.key}`}
                value={form[f.key]}
                placeholder={f.placeholder}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              />
            </div>
          ))}
        </div>
        <Button className="mt-4" onClick={save} disabled={saving}>
          <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar dados"}
        </Button>
      </div>
      <div className="hidden xl:block">
        <ScaledPage
          scale={0.45}
          layout="moderno"
          clinic={form}
          title="Prévia"
          body="Os dados da clínica aparecem assim nos documentos."
        />
      </div>
    </div>
  );
}
