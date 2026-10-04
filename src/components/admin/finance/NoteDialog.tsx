import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Check,
  FileDown,
  FileText,
  Printer,
  Receipt as ReceiptIcon,
  ScrollText,
} from "lucide-react";
import { db } from "@/integrations/mysql/client";
import { formatCurrency } from "@/lib/admin/labels";
import { clinicFromRow, type ClinicInfo } from "@/lib/document-templates";
import { exportPdf, printDocument } from "@/lib/document-export";
import { PAGE_HEIGHT, PAGE_WIDTH } from "@/lib/document-page";
import { noteNumber, type NoteData, type NoteKind, type NotePatient } from "@/lib/note";
import { saleTotals, type CartItem } from "@/lib/pdv";
import { noAdjust } from "@/lib/admin/finance-adjust";
import { printHtml, receiptHtml } from "@/lib/receipt";
import { A4Note } from "@/components/admin/finance/A4Note";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

/** O que vai ser emitido: orçamentos de um paciente ou um pagamento já pronto. */
export type NoteSource =
  | { type: "budget"; budgetId: string }
  | {
      type: "data";
      kind: NoteKind;
      id: string;
      patientId: string | null;
      patientName: string;
      items: CartItem[];
      discount: number;
      surcharge: number;
      method?: string | null | undefined;
      installments?: number | null | undefined;
      received?: boolean | undefined;
      date?: Date | undefined;
    };

type BudgetRow = {
  id: string;
  patient_id: string;
  treatment: string;
  value: number | string;
  status: string;
  created_at: string;
  payment_id: string | null;
};

/**
 * Emitir documento: nota grande A4 (imprimir ou PDF) ou cupom não fiscal 80 mm,
 * de orçamento ou de recibo.
 */
export function NoteDialog({
  source,
  onClose,
}: {
  source: NoteSource | null;
  onClose: () => void;
}) {
  const [clinic, setClinic] = useState<ClinicInfo>(clinicFromRow(null));
  const [patient, setPatient] = useState<NotePatient>({ name: "" });
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [kind, setKind] = useState<NoteKind>("orcamento");
  const [validity, setValidity] = useState("15");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [boxWidth, setBoxWidth] = useState(0);

  useEffect(() => {
    if (!source) return;
    setNotes("");
    setValidity("15");
    void (async () => {
      const { data: c } = await db
        .from("clinic_settings")
        .select(
          "clinic_name, dentist_name, dentist_cro, phone, whatsapp_number, clinic_email, address, clinic_city, instagram_url",
        )
        .eq("id", "default")
        .maybeSingle();
      setClinic(clinicFromRow((c as Record<string, string | null> | null) ?? null));
      let patientId: string | null = null;
      if (source.type === "budget") {
        const { data: one } = await db
          .from("budgets")
          .select("id, patient_id, created_at")
          .eq("id", source.budgetId)
          .maybeSingle();
        const first = one as { id: string; patient_id: string; created_at: string } | null;
        if (!first) return;
        patientId = first.patient_id;
        const { data: rows } = await db
          .from("budgets")
          .select("id, patient_id, treatment, value, status, created_at, payment_id")
          .eq("patient_id", first.patient_id)
          .order("created_at");
        const list = ((rows ?? []) as BudgetRow[]).filter((b) => b.status !== "recusado");
        setBudgets(list);
        // Começa com o orçamento clicado e os do mesmo dia.
        const day = first.created_at.slice(0, 10);
        setChecked(
          new Set(
            list
              .filter((b) => b.id === first.id || b.created_at.slice(0, 10) === day)
              .map((b) => b.id),
          ),
        );
        setKind("orcamento");
      } else {
        patientId = source.patientId;
        setBudgets([]);
        setKind(source.kind);
        setPatient({ name: source.patientName });
      }
      if (patientId) {
        const { data: p } = await db
          .from("patients")
          .select("name, cpf, phone, address")
          .eq("id", patientId)
          .maybeSingle();
        if (p) setPatient(p as NotePatient);
      }
    })();
  }, [source]);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBoxWidth(e?.contentRect.width ?? 0));
    ro.observe(el);
    return () => ro.disconnect();
  }, [source]);

  const note: NoteData | null = useMemo(() => {
    if (!source) return null;
    if (source.type === "budget") {
      const items: CartItem[] = budgets
        .filter((b) => checked.has(b.id))
        .map((b) => ({ key: b.id, name: b.treatment, price: Number(b.value), qty: 1, note: "" }));
      const t = saleTotals(items, noAdjust, noAdjust);
      return {
        kind,
        number: noteNumber(kind, new Date(), source.budgetId),
        date: new Date(),
        patient,
        items,
        subtotal: t.subtotal,
        discount: 0,
        surcharge: 0,
        total: t.total,
        received: true,
        validityDays: Number(validity) || 15,
        notes: notes.trim() || undefined,
      };
    }
    const sub = source.items.reduce((s, i) => s + i.price * i.qty, 0);
    return {
      kind,
      number: noteNumber(kind, source.date ?? new Date(), source.id),
      date: source.date ?? new Date(),
      patient,
      items: source.items,
      subtotal: Math.round(sub * 100) / 100,
      discount: source.discount,
      surcharge: source.surcharge,
      total: Math.round((sub - source.discount + source.surcharge) * 100) / 100,
      method: source.method,
      installments: source.installments,
      received: source.received,
      validityDays: Number(validity) || 15,
      notes: notes.trim() || undefined,
    };
  }, [source, budgets, checked, kind, patient, validity, notes]);

  const scale = boxWidth ? Math.min(1, boxWidth / PAGE_WIDTH) : 0.6;
  const fileName = note
    ? `${kind === "orcamento" ? "Orcamento" : "Recibo"}_${note.number}`
    : "documento";
  const empty = !note || note.items.length === 0;

  async function run(action: "a4" | "pdf" | "cupom") {
    if (!note || empty) return;
    setBusy(action);
    try {
      if (action === "cupom") {
        printHtml(
          receiptHtml(
            {
              kind: kind === "orcamento" ? "orcamento" : "venda",
              number: 1,
              code: note.number,
              patient: note.patient.name || "Cliente",
              items: note.items,
              subtotal: note.subtotal,
              discount: note.discount,
              surcharge: note.surcharge,
              total: note.total,
              method: note.method ?? undefined,
              installments: note.installments,
              received: note.received !== false,
              validityDays: note.validityDays,
              date: note.date,
            },
            { name: clinic.clinic_name, phone: clinic.phone, address: clinic.address },
          ),
        );
      } else if (pageRef.current) {
        if (action === "a4") printDocument(pageRef.current, fileName);
        else await exportPdf(pageRef.current, fileName);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível emitir.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog open={!!source} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-full max-w-none flex-col gap-0 overflow-hidden p-0 sm:h-[92dvh] sm:max-w-6xl sm:rounded-2xl">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ScrollText className="h-5 w-5" />
          </span>
          <div>
            <DialogTitle className="text-lg">Emitir documento</DialogTitle>
            <DialogDescription>
              Nota grande A4 (imprimir ou PDF) ou cupom não fiscal 80 mm.
            </DialogDescription>
          </div>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_340px] lg:overflow-hidden">
          {/* Pré-visualização */}
          <div ref={boxRef} className="bg-muted/50 p-4 lg:overflow-y-auto lg:p-6">
            {note && (
              <div
                className="mx-auto overflow-hidden rounded-md shadow-xl ring-1 ring-black/10"
                style={{ width: PAGE_WIDTH * scale, height: PAGE_HEIGHT * scale }}
              >
                <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
                  <A4Note ref={pageRef} note={note} clinic={clinic} />
                </div>
              </div>
            )}
          </div>

          {/* Opções */}
          <div className="flex min-h-0 flex-col border-t border-border lg:border-l lg:border-t-0">
            <div className="flex-1 space-y-5 p-5 lg:overflow-y-auto">
              <div className="space-y-1.5">
                <Label>Tipo de documento</Label>
                <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
                  {(
                    [
                      ["orcamento", "Orçamento", FileText],
                      ["recibo", "Recibo", ReceiptIcon],
                    ] as const
                  ).map(([id, label, Icon]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setKind(id)}
                      className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-bold transition-all ${
                        kind === id
                          ? "bg-card shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" /> {label}
                    </button>
                  ))}
                </div>
              </div>

              {source?.type === "budget" && budgets.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Itens do paciente</Label>
                  <ul className="space-y-1.5">
                    {budgets.map((b) => {
                      const on = checked.has(b.id);
                      return (
                        <li key={b.id}>
                          <button
                            type="button"
                            onClick={() =>
                              setChecked((prev) => {
                                const next = new Set(prev);
                                if (next.has(b.id)) next.delete(b.id);
                                else next.add(b.id);
                                return next;
                              })
                            }
                            className={`flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left text-sm transition-colors ${
                              on ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
                            }`}
                          >
                            <span
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                on
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-muted-foreground/40"
                              }`}
                            >
                              {on && <Check className="h-3 w-3" />}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium">{b.treatment}</span>
                              <span className="block text-[11px] text-muted-foreground">
                                {new Date(b.created_at).toLocaleDateString("pt-BR")}
                                {b.payment_id ? " · no Financeiro" : ""}
                              </span>
                            </span>
                            <span className="shrink-0 font-semibold tabular-nums">
                              {formatCurrency(Number(b.value))}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {kind === "orcamento" && (
                <div className="space-y-1.5">
                  <Label htmlFor="note-validity">Validade (dias)</Label>
                  <Input
                    id="note-validity"
                    inputMode="numeric"
                    value={validity}
                    onChange={(e) => setValidity(e.target.value.replace(/\D/g, "").slice(0, 3))}
                    className="w-28"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="note-notes">Observações (opcional)</Label>
                <Textarea
                  id="note-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex.: pagamento em 3x no cartão, retorno em 15 dias..."
                />
              </div>

              {note && (
                <div className="rounded-xl bg-muted/60 p-3 text-sm">
                  <div className="flex justify-between">
                    <span>{note.items.length} item(ns)</span>
                    <b className="tabular-nums">{formatCurrency(note.total)}</b>
                  </div>
                  <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                    {note.number}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2 border-t border-border p-4">
              <Button className="h-11 w-full" onClick={() => run("a4")} disabled={empty || !!busy}>
                <Printer className="h-4 w-4" /> Imprimir folha A4
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => run("pdf")} disabled={empty || !!busy}>
                  <FileDown className="h-4 w-4" /> {busy === "pdf" ? "Gerando..." : "Baixar PDF"}
                </Button>
                <Button variant="outline" onClick={() => run("cupom")} disabled={empty || !!busy}>
                  <ReceiptIcon className="h-4 w-4" /> Cupom 80 mm
                </Button>
              </div>
              <Button variant="ghost" className="w-full" onClick={onClose}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
