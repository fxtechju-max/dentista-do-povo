import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EyeOff } from "lucide-react";
import { formatCurrency } from "@/lib/admin/labels";

export type ChartPayment = {
  amount: number | string;
  status: string;
  paid_at: string | null;
  created_at: string;
};

type Point = { key: string; label: string; recebido: number; receber: number };

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Agrupa por dia (até ~2 meses) ou por mês, e preenche os intervalos vazios. */
function buildSeries(payments: ChartPayment[], range: [number | null, number | null]): Point[] {
  const dated = payments
    .filter((p) => p.status !== "cancelado")
    .map((p) => ({
      t: new Date(p.status === "pago" ? (p.paid_at ?? p.created_at) : p.created_at).getTime(),
      paid: p.status === "pago",
      v: Number(p.amount) || 0,
    }));
  if (!dated.length) return [];
  const start = range[0] ?? Math.min(...dated.map((d) => d.t));
  const end = range[1] ?? Math.max(...dated.map((d) => d.t));
  const daily = end - start <= 62 * 24 * 3600 * 1000;
  const keyOf = (t: number) => {
    const d = new Date(t);
    return daily
      ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      : `${d.getFullYear()}-${d.getMonth()}`;
  };
  const points = new Map<string, Point>();
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  if (!daily) cursor.setDate(1);
  for (let i = 0; cursor.getTime() <= end && i < 400; i++) {
    const t = cursor.getTime();
    const d = new Date(t);
    points.set(keyOf(t), {
      key: keyOf(t),
      label: daily
        ? `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`
        : `${MONTHS[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
      recebido: 0,
      receber: 0,
    });
    if (daily) cursor.setDate(cursor.getDate() + 1);
    else cursor.setMonth(cursor.getMonth() + 1);
  }
  for (const d of dated) {
    const point = points.get(keyOf(d.t));
    if (!point) continue;
    if (d.paid) point.recebido += d.v;
    else point.receber += d.v;
  }
  return [...points.values()];
}

const compact = (v: number) =>
  v >= 1000
    ? `R$ ${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`
    : `R$ ${v}`;

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { dataKey: string; value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const get = (k: string) => payload.find((p) => p.dataKey === k)?.value ?? 0;
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-bold">{label}</p>
      <p className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-emerald-500" /> Recebido:{" "}
        <b className="tabular-nums">{formatCurrency(get("recebido"))}</b>
      </p>
      <p className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-amber-500" /> A receber:{" "}
        <b className="tabular-nums">{formatCurrency(get("receber"))}</b>
      </p>
    </div>
  );
}

/** Gráfico animado do Financeiro: recebido × a receber no período. */
export type ChartSize = "pequeno" | "medio" | "grande";

const SIZES: { id: ChartSize; label: string; title: string; height: string }[] = [
  { id: "pequeno", label: "P", title: "Gráfico pequeno", height: "h-36 sm:h-40" },
  { id: "medio", label: "M", title: "Gráfico médio", height: "h-60 sm:h-72" },
  { id: "grande", label: "G", title: "Gráfico grande", height: "h-80 sm:h-[26rem]" },
];

export default function FinanceChart({
  payments,
  range,
  size = "medio",
  onSizeChange,
  onHide,
}: {
  payments: ChartPayment[];
  range: [number | null, number | null];
  size?: ChartSize;
  onSizeChange?: (size: ChartSize) => void;
  onHide?: () => void;
}) {
  const [kind, setKind] = useState<"area" | "barras">("area");
  const data = useMemo(() => buildSeries(payments, range), [payments, range]);
  const totals = useMemo(
    () =>
      data.reduce(
        (acc, p) => ({ recebido: acc.recebido + p.recebido, receber: acc.receber + p.receber }),
        { recebido: 0, receber: 0 },
      ),
    [data],
  );
  // Muda a chave ao trocar filtro/tipo para a animação rodar de novo.
  const animKey = `${kind}-${data.length}-${totals.recebido}-${totals.receber}`;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold">Evolução no período</p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Recebido{" "}
              <b className="text-foreground tabular-nums">{formatCurrency(totals.recebido)}</b>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> A receber{" "}
              <b className="text-foreground tabular-nums">{formatCurrency(totals.receber)}</b>
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex gap-1 rounded-lg border border-border bg-background p-0.5"
            role="group"
            aria-label="Tamanho do gráfico"
          >
            {SIZES.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => onSizeChange?.(o.id)}
                title={o.title}
                aria-label={o.title}
                aria-pressed={size === o.id}
                className={`w-8 rounded-md py-1 text-xs font-bold transition-colors ${
                  size === o.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 rounded-lg border border-border bg-background p-0.5">
            {(
              [
                ["area", "Área"],
                ["barras", "Barras"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setKind(id)}
                className={`rounded-md px-3 py-1 text-xs font-bold transition-colors ${
                  kind === id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {onHide && (
            <button
              type="button"
              onClick={onHide}
              title="Ocultar gráfico"
              aria-label="Ocultar gráfico"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <EyeOff className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {data.length === 0 ? (
        <p className="py-14 text-center text-sm text-muted-foreground">
          Sem lançamentos no período para mostrar no gráfico.
        </p>
      ) : (
        <div
          className={`mt-4 w-full transition-[height] duration-500 ease-out ${
            (SIZES.find((o) => o.id === size) ?? SIZES[1]!).height
          }`}
        >
          <ResponsiveContainer width="100%" height="100%">
            {kind === "area" ? (
              <AreaChart
                key={animKey}
                data={data}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="fin-recebido" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="fin-receber" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={16}
                />
                <YAxis
                  tickFormatter={compact}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  width={72}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--border)" }} />
                <Area
                  type="monotone"
                  dataKey="receber"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  fill="url(#fin-receber)"
                  animationDuration={1100}
                  animationEasing="ease-out"
                  activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)" }}
                />
                <Area
                  type="monotone"
                  dataKey="recebido"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fill="url(#fin-recebido)"
                  animationDuration={1100}
                  animationBegin={200}
                  animationEasing="ease-out"
                  activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)" }}
                />
              </AreaChart>
            ) : (
              <BarChart key={animKey} data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={16}
                />
                <YAxis
                  tickFormatter={compact}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  width={72}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ fill: "var(--muted)", opacity: 0.5 }}
                />
                <Bar
                  dataKey="recebido"
                  stackId="a"
                  fill="#10b981"
                  animationDuration={900}
                  animationEasing="ease-out"
                />
                <Bar
                  dataKey="receber"
                  stackId="a"
                  fill="#f59e0b"
                  radius={[6, 6, 0, 0]}
                  animationDuration={900}
                  animationBegin={150}
                  animationEasing="ease-out"
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
