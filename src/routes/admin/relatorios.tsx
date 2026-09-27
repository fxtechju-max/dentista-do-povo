import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { db } from "@/integrations/mysql/client";
import { PageHeader } from "@/components/admin/PageHeader";
import {
  APPOINTMENT_STATUS_LABEL,
  LEAD_STATUS_LABEL,
  formatCurrency,
  type AppointmentStatus,
  type LeadStatus,
} from "@/lib/admin/labels";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin/relatorios")({
  component: Relatorios,
});

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year ?? 2000, (month ?? 1) - 1, 1).toLocaleDateString("pt-BR", {
    month: "short",
    year: "2-digit",
  });
}

function Relatorios() {
  const [months, setMonths] = useState<6 | 12>(6);
  const [revenueByMonth, setRevenueByMonth] = useState<{ month: string; total: number }[]>([]);
  const [appointmentsByStatus, setAppointmentsByStatus] = useState<
    { status: AppointmentStatus; count: number }[]
  >([]);
  const [leadsByStatus, setLeadsByStatus] = useState<{ status: LeadStatus; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const since = new Date();
      since.setMonth(since.getMonth() - (months - 1));
      since.setDate(1);
      since.setHours(0, 0, 0, 0);

      const [{ data: payments }, { data: appointments }, { data: leads }] = await Promise.all([
        db
          .from("payments")
          .select("amount, status, paid_at")
          .eq("status", "pago")
          .gte("paid_at", since.toISOString()),
        db.from("appointments").select("status"),
        db.from("leads").select("status"),
      ]);

      const buckets = new Map<string, number>();
      for (let i = 0; i < months; i++) {
        const d = new Date(since);
        d.setMonth(d.getMonth() + i);
        buckets.set(monthKey(d), 0);
      }
      for (const p of payments ?? []) {
        if (!p.paid_at) continue;
        const key = monthKey(new Date(p.paid_at));
        if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + Number(p.amount));
      }
      setRevenueByMonth(
        Array.from(buckets.entries()).map(([month, total]) => ({
          month: monthLabel(month),
          total,
        })),
      );

      const apptCounts = new Map<AppointmentStatus, number>();
      for (const a of (appointments ?? []) as { status: AppointmentStatus }[]) {
        apptCounts.set(a.status, (apptCounts.get(a.status) ?? 0) + 1);
      }
      setAppointmentsByStatus(
        Array.from(apptCounts.entries()).map(([status, count]) => ({ status, count })),
      );

      const leadCounts = new Map<LeadStatus, number>();
      for (const l of (leads ?? []) as { status: LeadStatus }[]) {
        leadCounts.set(l.status, (leadCounts.get(l.status) ?? 0) + 1);
      }
      setLeadsByStatus(
        Array.from(leadCounts.entries()).map(([status, count]) => ({ status, count })),
      );

      setLoading(false);
    })();
  }, [months]);

  const totalRevenue = useMemo(
    () => revenueByMonth.reduce((s, m) => s + m.total, 0),
    [revenueByMonth],
  );

  return (
    <div className="animate-in fade-in space-y-4 duration-300">
      <PageHeader
        title="📈 Relatórios"
        description={`Receita no período: ${formatCurrency(totalRevenue)}`}
        action={
          <Select value={String(months)} onValueChange={(v) => setMonths(Number(v) as 6 | 12)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6">Últimos 6 meses</SelectItem>
              <SelectItem value="12">Últimos 12 meses</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {loading ? (
        <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Carregando relatórios...
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
            <h2 className="font-bold">Receita por mês</h2>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => formatCurrency(Number(v)).replace(",00", "")}
                    width={80}
                  />
                  <Tooltip formatter={(value: number) => formatCurrency(Number(value))} />
                  <Bar dataKey="total" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-bold">Consultas por status</h2>
            <div className="mt-4 flex h-64 items-center justify-center">
              {appointmentsByStatus.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem consultas registradas.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={appointmentsByStatus}
                      dataKey="count"
                      nameKey="status"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {appointmentsByStatus.map((entry, i) => (
                        <Cell key={entry.status} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, _name, entry) => [
                        value,
                        APPOINTMENT_STATUS_LABEL[entry.payload.status as AppointmentStatus],
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-bold">Leads por status</h2>
            <div className="mt-4 h-64">
              {leadsByStatus.length === 0 ? (
                <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Sem leads registrados.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={leadsByStatus.map((l) => ({ ...l, label: LEAD_STATUS_LABEL[l.status] }))}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="label" width={90} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="var(--chart-2)" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {!loading && revenueByMonth.every((m) => m.total === 0) && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <BarChart3 className="h-4 w-4" /> Sem dados suficientes ainda — os gráficos crescem
          conforme você registra consultas, orçamentos e pagamentos.
        </p>
      )}
    </div>
  );
}
