import { useEffect, useState } from "react";
import { ExternalLink, FileText, ImageIcon, Pill, X } from "lucide-react";
import { db } from "@/integrations/mysql/client";
import { toothAttachmentUrl } from "@/lib/tooth-attachments.functions";
import { EmptyState } from "@/components/admin/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type DocumentRow = {
  id: string;
  title: string;
  category: string | null;
  url: string | null;
  created_at: string;
};
type Prescription = {
  id: string;
  medication: string;
  instructions: string | null;
  issued_at: string;
};
type Attachment = { id: string; tooth_number: number; title: string | null; created_at: string };

const date = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

/** Todos os documentos de um paciente: arquivos/links, receitas e fotos/radiografias. */
export function PatientDocumentsDialog({
  patientId,
  patientName,
  open,
  onOpenChange,
}: {
  patientId: string | null;
  patientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [images, setImages] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewing, setViewing] = useState<Attachment | null>(null);

  useEffect(() => {
    if (!open || !patientId) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      db
        .from("documents")
        .select("id, title, category, url, created_at")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false }),
      db
        .from("prescriptions")
        .select("id, medication, instructions, issued_at")
        .eq("patient_id", patientId)
        .order("issued_at", { ascending: false }),
      db
        .from("tooth_attachments")
        .select("id, tooth_number, title, created_at")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false }),
    ]).then(([docs, rx, files]) => {
      if (cancelled) return;
      setDocuments((docs.data ?? []) as DocumentRow[]);
      setPrescriptions((rx.data ?? []) as Prescription[]);
      setImages((files.data ?? []) as Attachment[]);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, patientId]);

  const total = documents.length + prescriptions.length + images.length;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Documentos de {patientName}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {loading ? "Carregando..." : `${total} item(ns) no total`}
            </p>
          </DialogHeader>

          <Tabs defaultValue="arquivos">
            <TabsList className="flex h-auto flex-wrap justify-start gap-1">
              <TabsTrigger value="arquivos">
                <FileText className="h-3.5 w-3.5" /> Arquivos ({documents.length})
              </TabsTrigger>
              <TabsTrigger value="receitas">
                <Pill className="h-3.5 w-3.5" /> Receitas ({prescriptions.length})
              </TabsTrigger>
              <TabsTrigger value="imagens">
                <ImageIcon className="h-3.5 w-3.5" /> Fotos e radiografias ({images.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="arquivos" className="space-y-2">
              {documents.length === 0 ? (
                <EmptyState icon={FileText} title="Nenhum arquivo cadastrado." />
              ) : (
                documents.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{d.title}</p>
                      <p className="text-xs text-muted-foreground">{date(d.created_at)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {d.category && <Badge variant="outline">{d.category}</Badge>}
                      {d.url && (
                        <a
                          href={d.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> Abrir
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="receitas" className="space-y-2">
              {prescriptions.length === 0 ? (
                <EmptyState icon={Pill} title="Nenhuma receita emitida." />
              ) : (
                prescriptions.map((rx) => (
                  <div key={rx.id} className="rounded-xl border border-border px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">{rx.medication}</p>
                      <span className="text-xs text-muted-foreground">{date(rx.issued_at)}</span>
                    </div>
                    {rx.instructions && (
                      <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                        {rx.instructions}
                      </p>
                    )}
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="imagens">
              {images.length === 0 ? (
                <EmptyState
                  icon={ImageIcon}
                  title="Nenhuma foto ou radiografia. Anexe pelo odontograma."
                />
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {images.map((img) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => setViewing(img)}
                      className="group overflow-hidden rounded-xl border border-border text-left"
                    >
                      <img
                        src={toothAttachmentUrl(img.id)}
                        alt={img.title ?? `Dente ${img.tooth_number}`}
                        className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
                        loading="lazy"
                      />
                      <p className="px-2 py-1.5 text-xs">
                        <span className="font-bold">Dente {img.tooth_number}</span> ·{" "}
                        {date(img.created_at)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-h-[95vh] max-w-6xl bg-black p-2 [&>button]:hidden">
          {viewing && (
            <div className="relative">
              <img
                src={toothAttachmentUrl(viewing.id)}
                alt={viewing.title ?? `Dente ${viewing.tooth_number}`}
                className="mx-auto max-h-[88vh] w-auto rounded"
              />
              <button
                type="button"
                onClick={() => setViewing(null)}
                aria-label="Fechar"
                className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-black"
              >
                <X className="h-4 w-4" />
              </button>
              <p className="mt-2 text-center text-sm text-white">
                Dente {viewing.tooth_number} · {date(viewing.created_at)}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
