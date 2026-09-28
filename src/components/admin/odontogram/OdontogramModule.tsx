import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Camera, Check, Info, MoreHorizontal, Pencil, Trash2, X } from "lucide-react";
import { db } from "@/integrations/mysql/client";
import {
  UPPER_TEETH,
  LOWER_TEETH,
  primaryCondition,
  toothType,
  type Dentition,
  type ToothCondition,
} from "@/lib/odontogram";
import {
  PROCEDURES,
  SITUATIONS,
  STATUSES,
  SURFACES,
  legacySituation,
  procedureLabel,
  situationOf,
  sortProcedures,
  statusOf,
  surfaceLabel,
  type ProcedureStatus,
  type Situation,
  type Surface,
  type ToothAttachment,
  type ToothProcedure,
} from "@/lib/odontogram-pro";
import {
  deleteToothAttachment,
  toothAttachmentUrl,
  uploadToothAttachment,
} from "@/lib/tooth-attachments.functions";
import { SurfaceDiagram, ToothGraphic } from "./ToothGraphic";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type View = "completa" | "superior" | "inferior";

const POSITION_NAME: Record<Dentition, Record<number, string>> = {
  permanente: {
    1: "Incisivo Central",
    2: "Incisivo Lateral",
    3: "Canino",
    4: "1º Pré-molar",
    5: "2º Pré-molar",
    6: "1º Molar",
    7: "2º Molar",
    8: "3º Molar",
  },
  deciduo: {
    1: "Incisivo Central Decíduo",
    2: "Incisivo Lateral Decíduo",
    3: "Canino Decíduo",
    4: "1º Molar Decíduo",
    5: "2º Molar Decíduo",
  },
};

function toothName(n: number) {
  const quadrant = Math.floor(n / 10);
  const dentition: Dentition = quadrant >= 5 ? "deciduo" : "permanente";
  const upper = [1, 2, 5, 6].includes(quadrant);
  const right = [1, 4, 5, 8].includes(quadrant);
  return `${POSITION_NAME[dentition][n % 10] ?? "Dente"} ${upper ? "Superior" : "Inferior"} ${
    right ? "Direito" : "Esquerdo"
  }`;
}

const today = () => new Date().toLocaleDateString("en-CA");
const formatDate = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR");

type FormState = {
  editingId: string | null;
  surfaces: Surface[];
  situation: Situation;
  planned_procedure: string;
  status: ProcedureStatus;
  notes: string;
  record_date: string;
  dentist: string;
};

export function OdontogramModule({
  patientId,
  defaultDentist,
  legacyConditions,
}: {
  patientId: string;
  defaultDentist: string;
  legacyConditions: Map<number, ToothCondition[]>;
}) {
  const [dentition, setDentition] = useState<Dentition>("permanente");
  const [view, setView] = useState<View>("completa");
  const [showLegend, setShowLegend] = useState(true);
  const [procedures, setProcedures] = useState<ToothProcedure[]>([]);
  const [attachments, setAttachments] = useState<ToothAttachment[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [pendingFiles, setPendingFiles] = useState<{ file: File; preview: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  // Celular: a folha deslizante abre ao tocar no dente; fechar mantém o dente
  // selecionado para ver o histórico logo abaixo.
  const [sheetOpen, setSheetOpen] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1280px)");
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  async function load() {
    const [{ data: procs }, { data: files }] = await Promise.all([
      db
        .from("tooth_procedures")
        .select("*")
        .eq("patient_id", patientId)
        .order("record_date", { ascending: false }),
      db
        .from("tooth_attachments")
        .select("id, procedure_id, tooth_number, title, created_at")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false }),
    ]);
    setProcedures(sortProcedures((procs ?? []) as ToothProcedure[]));
    setAttachments((files ?? []) as ToothAttachment[]);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  // Libera as prévias locais das fotos ainda não enviadas.
  useEffect(
    () => () => pendingFiles.forEach((p) => URL.revokeObjectURL(p.preview)),
    [pendingFiles],
  );

  const byTooth = useMemo(() => {
    const map = new Map<number, ToothProcedure[]>();
    for (const p of procedures) map.set(p.tooth_number, [...(map.get(p.tooth_number) ?? []), p]);
    return map;
  }, [procedures]);

  function currentSituation(n: number): Situation | null {
    const latest = byTooth.get(n)?.[0];
    if (latest) return latest.situation;
    return legacySituation(primaryCondition(legacyConditions.get(n) ?? []));
  }

  function surfaceFills(n: number): Partial<Record<Surface, string>> {
    const fills: Partial<Record<Surface, string>> = {};
    // Do mais antigo para o mais recente: o registro mais novo de cada face vence.
    for (const p of [...(byTooth.get(n) ?? [])].reverse())
      for (const s of p.surfaces)
        fills[s] = p.situation === "saudavel" ? "#ffffff" : situationOf(p.situation).color;
    return fills;
  }

  function blankForm(n: number): FormState {
    return {
      editingId: null,
      surfaces: [],
      situation: currentSituation(n) ?? "saudavel",
      planned_procedure: "",
      status: "planejado",
      notes: "",
      record_date: today(),
      dentist: defaultDentist,
    };
  }

  function selectTooth(n: number) {
    setSheetOpen(true);
    setSelected(n);
    setForm(blankForm(n));
    setPendingFiles([]);
  }

  function editProcedure(p: ToothProcedure) {
    setSheetOpen(true);
    setSelected(p.tooth_number);
    setPendingFiles([]);
    setForm({
      editingId: p.id,
      surfaces: p.surfaces,
      situation: p.situation,
      planned_procedure: p.planned_procedure ?? "",
      status: p.status,
      notes: p.notes ?? "",
      record_date: p.record_date.slice(0, 10),
      dentist: p.dentist ?? "",
    });
  }

  function closePanel() {
    setSelected(null);
    setForm(null);
    setPendingFiles([]);
  }

  function toggleSurface(s: Surface) {
    setForm((f) =>
      f
        ? {
            ...f,
            surfaces: f.surfaces.includes(s)
              ? f.surfaces.filter((x) => x !== s)
              : [...f.surfaces, s],
          }
        : f,
    );
  }

  async function save() {
    if (!form || selected == null || saving) return;
    setSaving(true);
    const values = {
      surfaces: form.surfaces,
      situation: form.situation,
      planned_procedure: form.planned_procedure || null,
      status: form.status,
      notes: form.notes.trim() || null,
      record_date: form.record_date || today(),
      dentist: form.dentist.trim() || null,
    };
    let procedureId = form.editingId;
    if (procedureId) {
      const { error } = await db.from("tooth_procedures").update(values).eq("id", procedureId);
      if (error) return setSaving(false);
    } else {
      const { data, error } = await db
        .from("tooth_procedures")
        .insert({ ...values, patient_id: patientId, tooth_number: selected })
        .select("id")
        .single();
      if (error || !data) return setSaving(false);
      procedureId = data.id;
    }
    for (const { file } of pendingFiles) {
      const body = new FormData();
      body.set("file", file);
      body.set("patient_id", patientId);
      body.set("tooth_number", String(selected));
      body.set("procedure_id", procedureId);
      const result = await uploadToothAttachment({ data: body });
      if (result.error) toast.error(`${file.name}: ${result.error.message}`);
    }
    setSaving(false);
    toast.success(`Registro do dente ${selected} salvo.`);
    setSheetOpen(false);
    await load();
    setPendingFiles([]);
    setForm(blankForm(selected));
  }

  async function removeProcedure(p: ToothProcedure) {
    if (!confirm(`Excluir o registro de ${formatDate(p.record_date)} do dente ${p.tooth_number}?`))
      return;
    await db.from("tooth_procedures").delete().eq("id", p.id);
    if (form?.editingId === p.id) setForm(blankForm(p.tooth_number));
    load();
  }

  async function removeAttachment(a: ToothAttachment) {
    if (!confirm("Excluir este anexo?")) return;
    const result = await deleteToothAttachment({ data: { id: a.id } });
    if (result.error) toast.error(result.error.message);
    load();
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = Array.from(list)
      .filter((f) => /^image\/(jpeg|png|webp)$/.test(f.type) && f.size <= 10 * 1024 * 1024)
      .map((file) => ({ file, preview: URL.createObjectURL(file) }));
    if (next.length < list.length) toast.error("Use imagens JPG, PNG ou WEBP de até 10MB.");
    setPendingFiles((prev) => [...prev, ...next]);
  }

  const history = selected != null ? (byTooth.get(selected) ?? []) : [];
  const toothFiles = selected != null ? attachments.filter((a) => a.tooth_number === selected) : [];

  function renderArch(teeth: number[], lower: boolean) {
    const half = teeth.length / 2;
    const sides = [teeth.slice(0, half), teeth.slice(half)];
    return (
      <div className="grid gap-3 md:flex md:justify-center md:gap-0">
        {sides.map((side, i) => (
          <div key={i} className={`md:px-2 ${i === 0 ? "md:border-r-2 md:border-border" : ""}`}>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground md:hidden">
              {i === 0 ? "Lado direito do paciente" : "Lado esquerdo do paciente"}
            </p>
            {/* Celular: grade que ocupa a largura; computador: dentes lado a lado */}
            <div
              className="grid gap-0.5 md:flex md:gap-1"
              style={{ gridTemplateColumns: `repeat(${side.length}, minmax(0, 1fr))` }}
            >
              {side.map((n) => {
                const situation = currentSituation(n);
                const active = selected === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => selectTooth(n)}
                    title={`Dente ${n} — ${situation ? situationOf(situation).label : "Sem registro"}`}
                    className={`flex min-w-0 flex-col items-center gap-0.5 rounded-lg border-2 px-0 py-1 transition-all hover:bg-accent md:w-14 md:gap-1 md:px-0.5 md:hover:-translate-y-0.5 ${
                      active ? "border-primary bg-primary/5 shadow-md" : "border-transparent"
                    }`}
                  >
                    <span
                      className={`text-[10px] font-bold md:text-[11px] ${active ? "text-primary" : "text-muted-foreground"}`}
                    >
                      {n}
                    </span>
                    <ToothGraphic
                      type={toothType(n, dentition)}
                      lower={lower}
                      situation={situation}
                      className="h-14 w-full max-w-9 md:h-24 md:w-12 md:max-w-none"
                    />
                    <SurfaceDiagram
                      toothNumber={n}
                      fills={surfaceFills(n)}
                      className="h-5 w-5 md:h-7 md:w-7"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const panel: ReactNode = (
    <>
      {selected == null || !form ? (
        <div className="flex h-full min-h-64 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
          <ToothGraphic type="molar" lower={false} situation={null} className="h-20 w-12" />
          Selecione um dente no odontograma para registrar situação, procedimento e anexos.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-base font-extrabold">Dente {selected}</p>
              <p className="text-xs text-muted-foreground">{toothName(selected)}</p>
              {form.editingId && (
                <p className="mt-1 text-xs font-semibold text-primary">Editando registro</p>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={closePanel} aria-label="Fechar">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex flex-1 items-center justify-center gap-3 rounded-xl bg-muted/40 p-3">
              <ToothGraphic
                type={toothType(selected, selected >= 50 ? "deciduo" : "permanente")}
                lower={[3, 4, 7, 8].includes(Math.floor(selected / 10))}
                situation={form.situation}
                className="h-28 w-14"
              />
              <SurfaceDiagram
                toothNumber={selected}
                fills={Object.fromEntries(
                  form.surfaces.map((s) => [
                    s,
                    form.situation === "saudavel" ? "#ffffff" : situationOf(form.situation).color,
                  ]),
                )}
                selected={form.surfaces}
                onToggle={toggleSurface}
                className="h-20 w-20"
              />
            </div>
            <div className="flex w-28 flex-col gap-1">
              {SURFACES.map((s) => {
                const on = form.surfaces.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSurface(s)}
                    className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold transition-colors ${
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:bg-accent"
                    }`}
                  >
                    {on ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <span className="h-3 w-3 rounded-sm border" />
                    )}
                    {surfaceLabel(s, selected)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Situação atual</Label>
            <Select
              value={form.situation}
              onValueChange={(v) => setForm({ ...form, situation: v as Situation })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SITUATIONS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full border border-stone-400"
                        style={{ background: s.color }}
                      />
                      {s.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Procedimento planejado</Label>
            <Select
              value={form.planned_procedure || "nenhum"}
              onValueChange={(v) =>
                setForm({ ...form, planned_procedure: v === "nenhum" ? "" : v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhum">Nenhum</SelectItem>
                {PROCEDURES.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Procedimento realizado</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm({ ...form, status: v as ProcedureStatus })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                      {s.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="odo-notes">Observações clínicas</Label>
            <Textarea
              id="odo-notes"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Ex: cárie na face oclusal, planejada restauração em resina composta."
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="odo-date">Data do registro</Label>
              <Input
                id="odo-date"
                type="date"
                value={form.record_date}
                onChange={(e) => setForm({ ...form, record_date: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="odo-dentist">Dentista responsável</Label>
              <Input
                id="odo-dentist"
                value={form.dentist}
                onChange={(e) => setForm({ ...form, dentist: e.target.value })}
                placeholder="Dr(a)."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Anexos / Fotos / Radiografias</Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 text-center text-[10px] font-semibold text-primary hover:bg-primary/10"
              >
                <Camera className="h-5 w-5" />
                Adicionar foto
                <span className="font-normal text-muted-foreground">JPG/PNG até 10MB</span>
              </button>
              {toothFiles.map((a) => (
                <div key={a.id} className="group relative aspect-square">
                  <a href={toothAttachmentUrl(a.id)} target="_blank" rel="noreferrer">
                    <img
                      src={toothAttachmentUrl(a.id)}
                      alt={a.title ?? `Anexo do dente ${a.tooth_number}`}
                      className="h-full w-full rounded-lg border border-border object-cover"
                    />
                  </a>
                  <button
                    type="button"
                    onClick={() => removeAttachment(a)}
                    aria-label="Excluir anexo"
                    className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-foreground text-background group-hover:flex"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {pendingFiles.map((p, i) => (
                <div key={p.preview} className="relative aspect-square">
                  <img
                    src={p.preview}
                    alt={p.file.name}
                    className="h-full w-full rounded-lg border-2 border-dashed border-primary object-cover opacity-80"
                  />
                  <button
                    type="button"
                    onClick={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))}
                    aria-label="Remover"
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            {pendingFiles.length > 0 && (
              <p className="text-[11px] text-muted-foreground">
                {pendingFiles.length} foto(s) serão enviadas ao salvar o registro.
              </p>
            )}
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              hidden
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-3">
            <Button variant="outline" onClick={() => selectTooth(selected)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={saving}>
              <Check className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar Registro"}
            </Button>
          </div>
        </div>
      )}
    </>
  );

  const segmented = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
      active
        ? "bg-primary text-primary-foreground shadow-sm"
        : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1 rounded-lg border border-border bg-background p-0.5">
              <button
                className={segmented(dentition === "permanente")}
                onClick={() => setDentition("permanente")}
              >
                Dentição Permanente
              </button>
              <button
                className={segmented(dentition === "deciduo")}
                onClick={() => setDentition("deciduo")}
              >
                Dentição Decídua
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-1 rounded-lg border border-border bg-background p-0.5">
                {(
                  [
                    ["completa", "Vista Completa"],
                    ["superior", "Vista Superior"],
                    ["inferior", "Vista Inferior"],
                  ] as const
                ).map(([id, label]) => (
                  <button key={id} className={segmented(view === id)} onClick={() => setView(id)}>
                    {label}
                  </button>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowLegend((v) => !v)}>
                <Info className="h-3.5 w-3.5" /> Legenda
              </Button>
            </div>
          </div>

          <div className="mt-5 space-y-6 overflow-x-auto pb-2">
            {view !== "inferior" && (
              <div>
                <p className="mb-2 text-center text-xs font-extrabold tracking-wide">
                  ARCO SUPERIOR (MAXILA)
                </p>
                {renderArch(UPPER_TEETH[dentition], false)}
              </div>
            )}
            {view !== "superior" && (
              <div>
                <p className="mb-2 text-center text-xs font-extrabold tracking-wide">
                  ARCO INFERIOR (MANDÍBULA)
                </p>
                {renderArch(LOWER_TEETH[dentition], true)}
              </div>
            )}
          </div>
        </div>

        {showLegend && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-bold">Legenda - Situações e Tratamentos</p>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4 lg:grid-cols-7">
              {SITUATIONS.map((s) => (
                <span key={s.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span
                    className="h-3.5 w-3.5 shrink-0 rounded border border-stone-400"
                    style={{ background: s.color }}
                  />
                  {s.label}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-bold">
            {selected != null ? `Histórico do Dente ${selected}` : "Histórico do dente"}
          </p>
          {selected == null ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Clique em um dente para ver o histórico e registrar procedimentos.
            </p>
          ) : history.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Nenhum registro para o dente {selected} ainda.
            </p>
          ) : (
            <>
              {/* Celular: cartões */}
              <ul className="mt-3 space-y-2 md:hidden">
                {history.map((p) => (
                  <li key={p.id} className="rounded-xl border border-border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex items-center gap-2 text-sm font-bold">
                        <span
                          className="h-3.5 w-3.5 shrink-0 rounded border border-stone-400"
                          style={{ background: situationOf(p.situation).color }}
                        />
                        {situationOf(p.situation).label}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDate(p.record_date)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {procedureLabel(p.planned_procedure)}
                      {p.surfaces.length
                        ? ` · ${p.surfaces.map((s) => surfaceLabel(s, p.tooth_number)).join(", ")}`
                        : ""}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs">
                      <span className={`h-2 w-2 rounded-full ${statusOf(p.status).dot}`} />
                      {statusOf(p.status).label}
                      {p.dentist ? ` · ${p.dentist}` : ""}
                    </p>
                    {p.notes && <p className="mt-1.5 text-xs">{p.notes}</p>}
                    <div className="mt-2 flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => editProcedure(p)}>
                        <Pencil className="h-3.5 w-3.5" /> Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => removeProcedure(p)}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Excluir
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
              {/* Computador: tabela */}
              <div className="mt-3 hidden overflow-x-auto md:block">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead className="bg-muted/60 text-muted-foreground">
                    <tr>
                      {[
                        "Data",
                        "Situação",
                        "Procedimento",
                        "Superfície",
                        "Status",
                        "Observações",
                        "Profissional",
                        "",
                      ].map((h) => (
                        <th key={h} className="px-3 py-2 font-semibold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((p) => (
                      <tr key={p.id} className="border-b border-border last:border-0">
                        <td className="px-3 py-2">{formatDate(p.record_date)}</td>
                        <td className="px-3 py-2">
                          <span className="flex items-center gap-1.5">
                            <span
                              className="h-3 w-3 rounded border border-stone-400"
                              style={{ background: situationOf(p.situation).color }}
                            />
                            {situationOf(p.situation).label}
                          </span>
                        </td>
                        <td className="px-3 py-2">{procedureLabel(p.planned_procedure)}</td>
                        <td className="px-3 py-2">
                          {p.surfaces.length
                            ? p.surfaces.map((s) => surfaceLabel(s, p.tooth_number)).join(", ")
                            : "—"}
                        </td>
                        <td className="px-3 py-2">
                          <span className="flex items-center gap-1.5">
                            <span className={`h-2 w-2 rounded-full ${statusOf(p.status).dot}`} />
                            {statusOf(p.status).label}
                          </span>
                        </td>
                        <td className="max-w-56 px-3 py-2 text-muted-foreground">
                          {p.notes || "—"}
                        </td>
                        <td className="px-3 py-2">{p.dentist || "—"}</td>
                        <td className="px-3 py-2 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => editProcedure(p)}>
                                <Pencil className="h-3.5 w-3.5" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => removeProcedure(p)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {isDesktop ? (
        <aside className="rounded-2xl border border-border bg-card p-4 xl:sticky xl:top-4 xl:self-start">
          {panel}
        </aside>
      ) : (
        <Sheet open={sheetOpen && selected != null && !!form} onOpenChange={setSheetOpen}>
          <SheetContent
            side="bottom"
            className="max-h-[92dvh] overflow-y-auto rounded-t-3xl px-4 pb-6 pt-3 [&>button]:hidden"
          >
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted-foreground/30" />
            <SheetTitle className="sr-only">
              {selected != null ? `Registro do dente ${selected}` : "Registro do dente"}
            </SheetTitle>
            {panel}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
