// Kit visual compartilhado por Orçamentos, Financeiro e Contas a Pagar/Receber.
import type { ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PeriodId } from "@/lib/admin/finance-period";
import { PERIODS } from "@/lib/admin/finance-period";

export type Tone = "blue" | "green" | "amber" | "red" | "slate" | "violet";

const TONES: Record<Tone, { icon: string; bar: string; text: string; ring: string }> = {
  blue: {
    icon: "bg-blue-100 text-blue-700",
    bar: "bg-blue-500",
    text: "text-blue-700",
    ring: "ring-blue-200",
  },
  green: {
    icon: "bg-emerald-100 text-emerald-700",
    bar: "bg-emerald-500",
    text: "text-emerald-700",
    ring: "ring-emerald-200",
  },
  amber: {
    icon: "bg-amber-100 text-amber-700",
    bar: "bg-amber-500",
    text: "text-amber-700",
    ring: "ring-amber-200",
  },
  red: {
    icon: "bg-red-100 text-red-700",
    bar: "bg-red-500",
    text: "text-red-600",
    ring: "ring-red-200",
  },
  slate: {
    icon: "bg-slate-100 text-slate-700",
    bar: "bg-slate-500",
    text: "text-slate-800",
    ring: "ring-slate-200",
  },
  violet: {
    icon: "bg-violet-100 text-violet-700",
    bar: "bg-violet-500",
    text: "text-violet-700",
    ring: "ring-violet-200",
  },
};

/** Indicador do topo: ícone, valor grande, legenda e barra de progresso opcional. */
export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "slate",
  progress,
  onClick,
  active,
}: {
  icon: typeof MoreHorizontal;
  label: string;
  value: string;
  hint?: ReactNode;
  tone?: Tone;
  progress?: number;
  onClick?: () => void;
  active?: boolean;
}) {
  const t = TONES[tone];
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`animate-in fade-in slide-in-from-bottom-2 fill-mode-both flex flex-col rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-all duration-200 ${
        onClick ? "hover:-translate-y-0.5 hover:shadow-md" : ""
      } ${active ? `ring-2 ${t.ring}` : ""}`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${t.icon}`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
      <p className={`mt-3 text-2xl font-extrabold tracking-tight ${t.text}`}>{value}</p>
      {progress !== undefined && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full ${t.bar} transition-all duration-700`}
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      )}
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </Wrapper>
  );
}

export type ChipOption<T extends string> = { id: T; label: string; count?: number; dot?: string };

/** Filtro por status em botões clicáveis (com contagem). */
export function StatusChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              active
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-card hover:bg-accent"
            }`}
          >
            {o.dot && <span className={`h-2 w-2 rounded-full ${o.dot}`} />}
            {o.label}
            {o.count !== undefined && (
              <span
                className={`rounded-full px-1.5 text-[10px] ${active ? "bg-white/25" : "bg-muted text-muted-foreground"}`}
              >
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Períodos prontos + intervalo personalizado. */
export function PeriodFilter({
  value,
  from,
  to,
  onChange,
}: {
  value: PeriodId;
  from: string;
  to: string;
  onChange: (next: { period: PeriodId; from: string; to: string }) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={value}
        onChange={(e) => onChange({ period: e.target.value as PeriodId, from, to })}
        className="h-9 rounded-lg border border-border bg-card px-3 text-sm font-medium"
        aria-label="Período"
      >
        {PERIODS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
      {value === "personalizado" && (
        <>
          <Input
            type="date"
            value={from}
            onChange={(e) => onChange({ period: value, from: e.target.value, to })}
            className="h-9 w-40"
            aria-label="Data inicial"
          />
          <Input
            type="date"
            value={to}
            onChange={(e) => onChange({ period: value, from, to: e.target.value })}
            className="h-9 w-40"
            aria-label="Data final"
          />
        </>
      )}
    </div>
  );
}

/** Etiqueta de status com bolinha colorida. */
export function StatusPill({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

/** Campo de valor com "R$" fixo. */
export function MoneyInput({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
        R$
      </span>
      <Input
        id={id}
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d,.]/g, ""))}
        placeholder="0,00"
        className="pl-10 text-base font-semibold"
      />
    </div>
  );
}

/** Escolha por botões (ex.: status no formulário). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string; dot?: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${
            value === o.id
              ? "border-primary bg-primary/10 text-primary"
              : "border-border hover:bg-accent"
          }`}
        >
          {o.dot && <span className={`h-2 w-2 rounded-full ${o.dot}`} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Menu "⋯" com ações secundárias. */
export function RowMenu({
  items,
}: {
  items: { label: string; icon?: typeof MoreHorizontal; onClick: () => void; danger?: boolean }[];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Mais ações">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items.map((item) => (
          <DropdownMenuItem
            key={item.label}
            onClick={item.onClick}
            className={item.danger ? "text-destructive focus:text-destructive" : undefined}
          >
            {item.icon && <item.icon className="h-4 w-4" />}
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Iniciais do paciente num círculo. */
export function Initial({ name }: { name: string | null | undefined }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">
      {(name ?? "?").charAt(0).toUpperCase()}
    </span>
  );
}
