import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, Calendar, DollarSign, TrendingUp } from "lucide-react";
import { db } from "@/integrations/supabase/client";
import {
  APPOINTMENT_STATUS_LABEL as STATUS_LABEL,
  formatCurrency,
  type AppointmentStatus,
} from "@/lib/admin/labels";

export const Route = createFileRoute("/admin/dashboard")({
  component: Dashboard,
});

type UpcomingAppointment = {
  id: string;
  treatment: string;
  scheduled_at: string;
  status: AppointmentStatus;
  patients: { name: string } | null;
};

type Lead = {
  id: string;
  name: string;
  source: string | null;
  created_at: string;
};

type Stats = {
  patients: number;
  appointmentsToday: number;
  revenuePaid: number;
  leads: number;
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingAppointment[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const [
        { count: patientsCount },
        { count: appointmentsTodayCount },
        { data: paidPayments },
        { count: leadsCount },
        { data: upcomingData },
        { data: leadsData },
      ] = await Promise.all([
        db.from("patients").select("id", { count: "exact", head: true }),
        db
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .gte("scheduled_at", startOfDay.toISOString())
          .lte("scheduled_at", endOfDay.toISOString()),
        db.from("payments").select("amount").eq("status", "pago"),
        db.from("leads").select("id", { count: "exact", head: true }),
        db
          .from("appointments")
          .select("id, treatment, scheduled_at, status, patients(name)")
          .gte("scheduled_at", new Date().toISOString())
          .order("scheduled_at", { ascending: true })
          .limit(6),
        db
          .from("leads")
          .select("id, name, source, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      setStats({
        patients: patientsCount ?? 0,
        appointmentsToday: appointmentsTodayCount ?? 0,
        revenuePaid: (paidPayments ?? []).reduce((sum, p) => sum + Number(p.amount), 0),
        leads: leadsCount ?? 0,
      });
      setUpcoming((upcomingData ?? []) as unknown as UpcomingAppointment[]);
      setLeads((leadsData ?? []) as Lead[]);
      setLoading(false);
    })();
  }, []);

  const cards = [
    {
      label: "👥 Pacientes",
      value: stats?.patients ?? 0,
      icon: Users,
      color: "text-primary bg-primary/10",
    },
    {
      label: "📅 Consultas hoje",
      value: stats?.appointmentsToday ?? 0,
      icon: Calendar,
      color: "text-primary bg-primary/10",
    },
    {
      label: "💰 Receita paga",
      value: formatCurrency(stats?.revenuePaid ?? 0),
      icon: DollarSign,
      color: "text-primary bg-primary/10",
    },
    {
      label: "🚀 Leads",
      value: stats?.leads ?? 0,
      icon: TrendingUp,
      color: "text-primary bg-primary/10",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-extrabold">📊 Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">Visão geral · perfil Admin</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-border bg-card p-5">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.color}`}>
              <card.icon className="h-5 w-5" />
            </span>
            <p className="mt-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {card.label}
            </p>
            <p className="mt-1 text-2xl font-extrabold">{loading ? "…" : card.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-bold">📅 Próximas consultas</h2>
          <div className="mt-4 space-y-2">
            {!loading && upcoming.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma consulta agendada.</p>
            )}
            {upcoming.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{a.patients?.name ?? "Paciente"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {a.treatment} · {formatDateTime(a.scheduled_at)}
                  </p>
                </div>
                <span className="ml-3 shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {STATUS_LABEL[a.status] ?? a.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-bold">🙋 Solicitações recentes</h2>
          <div className="mt-4 space-y-2">
            {!loading && leads.length === 0 && (
              <p className="text-sm text-muted-foreground">Sem solicitações.</p>
            )}
            {leads.map((lead) => (
              <div key={lead.id} className="rounded-xl border border-border px-4 py-3">
                <p className="text-sm font-bold">{lead.name}</p>
                <p className="text-xs text-muted-foreground">
                  {lead.source ?? "Origem não informada"} · {formatDateTime(lead.created_at)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
