import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Check, Download, Lock, Trash2 } from "lucide-react";
import { getDeleteCounts, wipeModules } from "@/lib/backup.functions";
import {
  DELETE_MODULES,
  deletePlan,
  withRequired,
  type DeleteModuleId,
} from "@/lib/backup-modules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/** Backup › Apagar dados: o administrador escolhe quais módulos apagar. */
export function DeleteModulesCard({ onBackup }: { onBackup: () => Promise<void> | void }) {
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [chosen, setChosen] = useState<Set<DeleteModuleId>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [wiping, setWiping] = useState(false);

  const loadCounts = useCallback(async () => {
    const { data } = await getDeleteCounts();
    if (data) setCounts(data);
  }, []);
  useEffect(() => {
    void loadCounts();
  }, [loadCounts]);

  const effective = useMemo(() => withRequired([...chosen]), [chosen]);
  const autoIncluded = effective.filter((id) => !chosen.has(id));
  const total = useMemo(
    () => deletePlan([...chosen]).reduce((sum, step) => sum + (counts?.[step.table] ?? 0), 0),
    [chosen, counts],
  );

  function toggle(id: DeleteModuleId) {
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function wipe() {
    if (typed !== "APAGAR" || wiping || !chosen.size) return;
    setWiping(true);
    const { error, deleted } = await wipeModules({
      data: { modules: [...chosen], confirm: "APAGAR" },
    });
    setWiping(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${deleted} registro(s) apagado(s).`);
    setConfirmOpen(false);
    setTyped("");
    setChosen(new Set());
    void loadCounts();
  }

  const labelOf = (id: DeleteModuleId) => DELETE_MODULES.find((m) => m.id === id)?.label ?? id;

  return (
    <div className="overflow-hidden rounded-2xl border border-destructive/30 bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-destructive/20 bg-destructive/5 p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <Trash2 className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-bold">Apagar dados</h2>
            <p className="mt-0.5 max-w-lg text-xs text-muted-foreground">
              Escolha os módulos que quer zerar. Contas de acesso, configurações da clínica e a
              aparência <strong>nunca</strong> são apagadas. Baixe um backup antes.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setChosen(
                chosen.size === DELETE_MODULES.length
                  ? new Set()
                  : new Set(DELETE_MODULES.map((m) => m.id)),
              )
            }
          >
            {chosen.size === DELETE_MODULES.length ? "Limpar seleção" : "Selecionar tudo"}
          </Button>
        </div>
      </div>

      <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {DELETE_MODULES.map((m, i) => {
          const on = chosen.has(m.id);
          const auto = !on && effective.includes(m.id);
          const count = counts?.[m.main];
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => toggle(m.id)}
              disabled={auto}
              aria-pressed={on}
              className={`group relative flex items-start gap-3 rounded-xl border p-3 text-left transition-all duration-200 animate-in fade-in slide-in-from-bottom-1 fill-mode-both disabled:cursor-not-allowed ${
                on
                  ? "border-destructive bg-destructive/5 shadow-sm ring-1 ring-destructive/30"
                  : auto
                    ? "border-destructive/40 border-dashed bg-destructive/[0.03]"
                    : "border-border hover:-translate-y-0.5 hover:border-destructive/40 hover:shadow-sm"
              }`}
              style={{ animationDelay: `${i * 25}ms` }}
            >
              <span className="text-xl leading-none">{m.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold">{m.label}</span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${
                      count ? "bg-muted text-foreground" : "bg-muted/60 text-muted-foreground"
                    }`}
                  >
                    {count == null ? "…" : count}
                  </span>
                </span>
                <span className="mt-0.5 line-clamp-2 block text-[11px] text-muted-foreground">
                  {auto ? "Sai junto com Pacientes." : m.description}
                </span>
              </span>
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                  on
                    ? "border-destructive bg-destructive text-white"
                    : auto
                      ? "border-destructive/40 text-destructive"
                      : "border-border"
                }`}
              >
                {on ? (
                  <Check className="h-3.5 w-3.5 animate-in zoom-in duration-150" />
                ) : auto ? (
                  <Lock className="h-3 w-3" />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      <div
        className={`flex flex-wrap items-center justify-between gap-3 border-t border-border p-4 transition-colors ${
          chosen.size ? "bg-destructive/5" : ""
        }`}
      >
        <p className="text-sm">
          {chosen.size ? (
            <>
              <strong>{effective.length}</strong> módulo(s) ·{" "}
              <strong className="text-destructive">{total}</strong> registro(s) serão apagados
            </>
          ) : (
            <span className="text-muted-foreground">Nenhum módulo selecionado.</span>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void onBackup()}>
            <Download className="h-4 w-4" /> Baixar backup antes
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={!chosen.size}
            onClick={() => {
              setTyped("");
              setConfirmOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4" /> Apagar selecionados
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={(o) => !wiping && setConfirmOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Apagar {total} registro(s)?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <div className="flex flex-wrap gap-1.5">
                  {effective.map((id) => (
                    <span
                      key={id}
                      className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive"
                    >
                      {labelOf(id)}
                    </span>
                  ))}
                </div>
                {autoIncluded.length > 0 && (
                  <p className="text-xs">
                    Incluídos automaticamente por dependerem de Pacientes:{" "}
                    {autoIncluded.map(labelOf).join(", ")}.
                  </p>
                )}
                <p>Essa ação não pode ser desfeita.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="wipe-typed">
              Digite <strong>APAGAR</strong> para confirmar
            </Label>
            <Input
              id="wipe-typed"
              value={typed}
              onChange={(e) => setTyped(e.target.value.toUpperCase())}
              placeholder="APAGAR"
              autoComplete="off"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={wiping}>Cancelar</AlertDialogCancel>
            <Button variant="destructive" disabled={typed !== "APAGAR" || wiping} onClick={wipe}>
              <Trash2 className="h-4 w-4" /> {wiping ? "Apagando..." : "Apagar definitivamente"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
