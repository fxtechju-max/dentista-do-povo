import { BadgePercent, TrendingDown, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/admin/labels";
import { computeTotal, type Adjust } from "@/lib/admin/finance-adjust";
import { Input } from "@/components/ui/input";

function AdjustInput({
  id,
  label,
  icon: Icon,
  tone,
  value,
  onChange,
}: {
  id: string;
  label: string;
  icon: typeof TrendingDown;
  tone: "green" | "amber";
  value: Adjust;
  onChange: (value: Adjust) => void;
}) {
  const color =
    tone === "green"
      ? "text-emerald-600 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300"
      : "text-amber-700 bg-amber-100 dark:bg-amber-950 dark:text-amber-300";
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="flex items-center gap-1.5 text-sm font-medium">
        <span className={`flex h-5 w-5 items-center justify-center rounded-md ${color}`}>
          <Icon className="h-3 w-3" />
        </span>
        {label}
      </label>
      <div className="flex">
        <Input
          id={id}
          inputMode="decimal"
          value={value.value}
          onChange={(e) => onChange({ ...value, value: e.target.value.replace(/[^\d,.]/g, "") })}
          placeholder={value.mode === "percent" ? "0" : "0,00"}
          className="rounded-r-none font-semibold"
        />
        <div className="flex shrink-0 overflow-hidden rounded-r-md border border-l-0 border-input">
          {(["valor", "percent"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onChange({ ...value, mode })}
              aria-pressed={value.mode === mode}
              className={`w-10 text-xs font-bold transition-colors ${
                value.mode === mode
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-accent"
              }`}
            >
              {mode === "valor" ? "R$" : "%"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Desconto e acréscimo com o resumo do valor final. */
export function AdjustmentFields({
  base,
  discount,
  surcharge,
  onChange,
  idPrefix = "adj",
}: {
  base: number;
  discount: Adjust;
  surcharge: Adjust;
  onChange: (next: { discount: Adjust; surcharge: Adjust }) => void;
  idPrefix?: string;
}) {
  const r = computeTotal(Number.isFinite(base) ? base : 0, discount, surcharge);
  const hasAdjust = r.discount > 0 || r.surcharge > 0;
  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        <BadgePercent className="h-3.5 w-3.5" /> Desconto e acréscimo
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <AdjustInput
          id={`${idPrefix}-discount`}
          label="Desconto"
          icon={TrendingDown}
          tone="green"
          value={discount}
          onChange={(d) => onChange({ discount: d, surcharge })}
        />
        <AdjustInput
          id={`${idPrefix}-surcharge`}
          label="Acréscimo (juros, taxa)"
          icon={TrendingUp}
          tone="amber"
          value={surcharge}
          onChange={(s) => onChange({ discount, surcharge: s })}
        />
      </div>
      <div className="space-y-1 rounded-lg bg-card p-3 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Valor</span>
          <span className="tabular-nums">{formatCurrency(Number.isFinite(base) ? base : 0)}</span>
        </div>
        {r.discount > 0 && (
          <div className="flex justify-between text-emerald-600 animate-in fade-in slide-in-from-top-1 duration-200">
            <span>Desconto</span>
            <span className="tabular-nums">− {formatCurrency(r.discount)}</span>
          </div>
        )}
        {r.surcharge > 0 && (
          <div className="flex justify-between text-amber-700 animate-in fade-in slide-in-from-top-1 duration-200 dark:text-amber-300">
            <span>Acréscimo</span>
            <span className="tabular-nums">+ {formatCurrency(r.surcharge)}</span>
          </div>
        )}
        <div
          className={`flex items-center justify-between border-t border-border pt-1.5 font-extrabold ${hasAdjust ? "text-primary" : ""}`}
        >
          <span>Total final</span>
          <span key={r.total} className="text-base tabular-nums animate-in zoom-in-95 duration-200">
            {formatCurrency(r.total)}
          </span>
        </div>
      </div>
    </div>
  );
}
