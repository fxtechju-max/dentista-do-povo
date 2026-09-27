import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, Upload, AlertTriangle, Check, Database } from "lucide-react";
import {
  listBackupTables,
  exportBackup,
  restoreBackup,
  wipeOperationalData,
  type OperationalTable,
} from "@/lib/backup.functions";
import { PageHeader } from "@/components/admin/PageHeader";
import { AUDIT_TABLE_LABEL } from "@/lib/admin/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export const Route = createFileRoute("/admin/backup")({
  component: Backup,
});

function tableLabel(t: string) {
  return AUDIT_TABLE_LABEL[t] ?? t;
}

function Backup() {
  const [tables, setTables] = useState<OperationalTable[]>([]);
  const [selected, setSelected] = useState<Set<OperationalTable>>(new Set());

  useEffect(() => {
    listBackupTables().then(({ data }) => {
      const list = data ?? [];
      setTables([...list]);
      setSelected(new Set(list));
    });
  }, []);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const [wipeConfirmText, setWipeConfirmText] = useState("");
  const [wipeDialogOpen, setWipeDialogOpen] = useState(false);
  const [wiping, setWiping] = useState(false);
  const [wipeError, setWipeError] = useState<string | null>(null);
  const [wiped, setWiped] = useState(false);

  function toggleTable(t: OperationalTable) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  async function handleExport() {
    if (selected.size === 0) return;
    setExportError(null);
    setExporting(true);
    const { data, error } = await exportBackup({ data: { tables: Array.from(selected) } });
    setExporting(false);
    if (error || !data) {
      setExportError(error?.message ?? "Falha ao gerar o backup.");
      return;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup-dentista-do-povo-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(file: File) {
    setImportError(null);
    setImportResult(null);
    setImporting(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as { tables?: Record<string, unknown[]> };
      if (!parsed.tables || typeof parsed.tables !== "object") {
        throw new Error("Arquivo inválido: não parece um backup desta plataforma.");
      }
      const { error, restored } = await restoreBackup({
        data: { tables: parsed.tables as Record<string, Record<string, unknown>[]> },
      });
      if (error) setImportError(error.message);
      else setImportResult(`${restored} registro(s) restaurado(s) com sucesso.`);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Não foi possível ler o arquivo.");
    } finally {
      setImporting(false);
    }
  }

  async function handleWipe() {
    setWiping(true);
    setWipeError(null);
    const { error } = await wipeOperationalData({ data: { confirm: "APAGAR" } });
    setWiping(false);
    setWipeDialogOpen(false);
    setWipeConfirmText("");
    if (error) setWipeError(error.message);
    else setWiped(true);
  }

  return (
    <div className="animate-in fade-in max-w-3xl space-y-4 duration-300">
      <PageHeader
        title="💾 Backup"
        description="Exporte, restaure ou apague os dados operacionais do sistema."
      />

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="flex items-center gap-2 font-bold">
          <Download className="h-4 w-4 text-primary" /> Exportar (baixar backup)
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Gera um arquivo .json com os dados selecionados, pronto para guardar ou restaurar depois.
          Não inclui contas de acesso, configurações da clínica/IA nem as fotos da galeria.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {tables.map((t) => (
            <label
              key={t}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={selected.has(t)}
                onChange={() => toggleTable(t)}
                className="h-4 w-4 accent-primary"
              />
              {tableLabel(t)}
            </label>
          ))}
        </div>
        {exportError && (
          <p className="mt-3 text-sm font-semibold text-destructive">{exportError}</p>
        )}
        <div className="mt-4 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelected(new Set(selected.size === tables.length ? [] : tables))}
          >
            {selected.size === tables.length ? "Desmarcar tudo" : "Selecionar tudo"}
          </Button>
          <Button onClick={handleExport} disabled={selected.size === 0 || exporting}>
            <Download className="h-4 w-4" /> {exporting ? "Gerando..." : "Baixar backup"}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="flex items-center gap-2 font-bold">
          <Upload className="h-4 w-4 text-primary" /> Restaurar (importar backup)
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Envie um arquivo .json gerado por este backup. Os registros são adicionados ou atualizados
          — nada existente é apagado durante a restauração.
        </p>
        <div className="mt-4">
          <Input
            type="file"
            accept="application/json"
            disabled={importing}
            onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])}
          />
        </div>
        {importing && <p className="mt-2 text-sm text-muted-foreground">Restaurando...</p>}
        {importResult && (
          <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
            <Check className="h-4 w-4" /> {importResult}
          </p>
        )}
        {importError && (
          <p className="mt-2 text-sm font-semibold text-destructive">{importError}</p>
        )}
      </div>

      <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6">
        <h2 className="flex items-center gap-2 font-bold text-destructive">
          <AlertTriangle className="h-4 w-4" /> Apagar dados operacionais
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Apaga permanentemente pacientes, agenda, financeiro, orçamentos, receitas, documentos,
          blog, CRM e conversas. Sua conta de administrador, outros usuários e as configurações da
          clínica/IA <strong>não</strong> são afetados — o sistema continua acessível depois.
          Recomendamos baixar um backup antes.
        </p>
        {wiped && (
          <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
            <Check className="h-4 w-4" /> Dados operacionais apagados.
          </p>
        )}
        {wipeError && <p className="mt-2 text-sm font-semibold text-destructive">{wipeError}</p>}
        <div className="mt-4 space-y-2">
          <Label htmlFor="wipe-confirm">
            Digite <strong>APAGAR</strong> para habilitar o botão
          </Label>
          <Input
            id="wipe-confirm"
            value={wipeConfirmText}
            onChange={(e) => setWipeConfirmText(e.target.value)}
            placeholder="APAGAR"
            className="max-w-40"
          />
          <div>
            <Button
              variant="destructive"
              disabled={wipeConfirmText !== "APAGAR"}
              onClick={() => setWipeDialogOpen(true)}
            >
              <Database className="h-4 w-4" /> Apagar dados operacionais
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={wipeDialogOpen} onOpenChange={setWipeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar todos os dados operacionais?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso remove permanentemente pacientes, agenda, financeiro, receitas, documentos, blog
              e conversas. Essa ação não pode ser desfeita. Sua conta de acesso continuará
              funcionando.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleWipe}
              disabled={wiping}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {wiping ? "Apagando..." : "Apagar tudo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
