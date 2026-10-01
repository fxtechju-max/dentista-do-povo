import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Eraser,
  Hash,
  PenLine,
  Type,
  UserRound,
} from "lucide-react";
import { PLACEHOLDERS, type FieldType, type FillField } from "@/lib/document-templates";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const TYPE_ICON: Record<FieldType, typeof Type> = {
  texto: Type,
  longo: PenLine,
  hora: Clock,
  data: CalendarDays,
  numero: Hash,
};

const labelOf = (key: string) => PLACEHOLDERS.find((p) => p.key === key)?.label ?? key;

/**
 * Formulário dos dados do documento: campos automáticos (clínica/paciente) já
 * preenchidos e os campos do modelo (horário, dias, CID, medicamentos...).
 */
export function FillFieldsForm({
  fields,
  values,
  onChange,
  autoKeys,
  autoValues,
  overrides,
  onOverride,
}: {
  fields: FillField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  autoKeys: string[];
  autoValues: Record<string, string>;
  overrides: Record<string, string>;
  onOverride: (key: string, value: string) => void;
}) {
  const filledAuto = autoKeys.filter((k) => autoValues[k]?.trim());
  const missingAuto = autoKeys.filter((k) => !autoValues[k]?.trim());
  const filledCount = fields.filter((f) => values[f.key]?.trim()).length;
  const progress = fields.length ? (filledCount / fields.length) * 100 : 100;

  return (
    <div className="space-y-5">
      {filledAuto.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Preenchido automaticamente
          </p>
          <div className="flex flex-wrap gap-1.5">
            {filledAuto.map((k) => (
              <span
                key={k}
                className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs dark:border-emerald-900 dark:bg-emerald-950/40"
              >
                <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                  {labelOf(k)}:
                </span>
                <span className="truncate text-foreground">{autoValues[k]}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {missingAuto.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900 dark:bg-amber-950/20">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-300">
            <UserRound className="h-3.5 w-3.5" /> Faltam no cadastro
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {missingAuto.map((k) => (
              <div key={k} className="space-y-1">
                <label htmlFor={`auto-${k}`} className="text-xs font-semibold">
                  {labelOf(k)}
                </label>
                <Input
                  id={`auto-${k}`}
                  value={overrides[k] ?? ""}
                  onChange={(e) => onOverride(k, e.target.value)}
                  placeholder="Digite aqui"
                  className="h-9 bg-background"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {fields.length > 0 ? (
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Dados do documento
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">
                {filledCount}/{fields.length}
              </span>
              <span className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </span>
              {filledCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => fields.forEach((f) => onChange(f.key, ""))}
                >
                  <Eraser className="h-3.5 w-3.5" /> Limpar
                </Button>
              )}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((f, i) => {
              const Icon = TYPE_ICON[f.type];
              const value = values[f.key] ?? "";
              const filled = !!value.trim();
              return (
                <div
                  key={f.key}
                  className={`space-y-1.5 animate-in fade-in slide-in-from-bottom-1 fill-mode-both ${
                    f.type === "longo" ? "sm:col-span-2" : ""
                  }`}
                  style={{ animationDelay: `${i * 25}ms` }}
                >
                  <label
                    htmlFor={`field-${f.key}`}
                    className="flex items-center gap-1.5 text-sm font-medium"
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-md transition-colors ${
                        filled
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                    </span>
                    {f.label}
                  </label>
                  {f.type === "longo" ? (
                    <Textarea
                      id={`field-${f.key}`}
                      rows={2}
                      value={value}
                      onChange={(e) => onChange(f.key, e.target.value)}
                      placeholder={`Digite ${f.label.toLowerCase()}`}
                      className="resize-y"
                    />
                  ) : (
                    <Input
                      id={`field-${f.key}`}
                      type={
                        f.type === "hora"
                          ? "time"
                          : f.type === "data"
                            ? "date"
                            : f.type === "numero"
                              ? "number"
                              : "text"
                      }
                      min={f.type === "numero" ? 0 : undefined}
                      inputMode={f.type === "numero" ? "numeric" : undefined}
                      value={value}
                      onChange={(e) => onChange(f.key, e.target.value)}
                      placeholder={
                        f.type === "texto" ? `Digite ${f.label.toLowerCase()}` : undefined
                      }
                    />
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Campo vazio sai com espaço para escrever à mão; itens de lista vazios (ex.: Medicamento
            3) não aparecem no documento.
          </p>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
          Este modelo não tem campos para preencher. Para adicionar (ex.: horário, CID), use a aba
          Modelos › Campos para preencher.
        </p>
      )}
    </div>
  );
}
