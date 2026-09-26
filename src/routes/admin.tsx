import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Activity,
  Receipt,
  DollarSign,
  TrendingUp,
  MessageCircle,
  Phone,
  FileText,
  ClipboardList,
  BarChart3,
  Sparkles,
  Globe,
  Settings,
  LogOut,
  ChevronLeft,
  Bell,
  BellOff,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Painel — Dentista do Povo" },
      { name: "description", content: "Sistema de gestão da clínica Dentista do Povo." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

const NAV_ITEMS = [
  { to: "/admin", label: "📊 Dashboard", icon: LayoutDashboard },
  { to: "/admin/agenda", label: "📅 Agenda", icon: Calendar },
  { to: "/admin/pacientes", label: "👥 Pacientes", icon: Users },
  { to: "/admin/tratamentos", label: "🦷 Tratamentos", icon: Activity },
  { to: "/admin/orcamentos", label: "🧾 Orçamentos", icon: Receipt },
  { to: "/admin/financeiro", label: "💰 Financeiro", icon: DollarSign },
  { to: "/admin/crm", label: "🤝 CRM", icon: TrendingUp },
  { to: "/admin/suporte", label: "💬 Suporte", icon: MessageCircle },
  { to: "/admin/whatsapp", label: "📱 WhatsApp", icon: Phone },
  { to: "/admin/documentos", label: "📄 Documentos", icon: FileText },
  { to: "/admin/receitas", label: "💊 Receitas", icon: ClipboardList },
  { to: "/admin/relatorios", label: "📈 Relatórios", icon: BarChart3 },
  { to: "/admin/ia", label: "🤖 IA", icon: Sparkles },
  { to: "/admin/cms-site", label: "🌐 CMS Site", icon: Globe },
  { to: "/admin/configuracoes", label: "⚙️ Configurações", icon: Settings },
] as const;

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "☀️ Bom dia";
  if (hour < 18) return "🌤️ Boa tarde";
  return "🌙 Boa noite";
}

function AdminLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [status, setStatus] = useState<"loading" | "denied" | "ok">("loading");
  const [email, setEmail] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">(
    "default",
  );

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate({ to: "/entrar" });
        return;
      }
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: data.user.id,
        _role: "admin",
      });
      if (!isAdmin) {
        setStatus("denied");
        return;
      }
      setEmail(data.user.email ?? null);
      setStatus("ok");
    })();
  }, [navigate]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof Notification === "undefined") {
      setNotifPermission("unsupported");
      return;
    }
    setNotifPermission(Notification.permission);
  }, []);

  async function requestNotifPermission() {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setNotifPermission(result);
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/entrar" });
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-xl font-bold">Acesso restrito</p>
        <p className="text-sm text-muted-foreground">
          Sua conta não tem permissão de administrador.
        </p>
        <button
          onClick={signOut}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-primary-foreground"
        >
          Sair
        </button>
      </div>
    );
  }

  const displayName = (email ? email.split("@")[0] : undefined) ?? "Admin";

  return (
    <div className="flex h-screen bg-muted/30">
      {/* Sidebar */}
      <aside
        className={`flex shrink-0 flex-col border-r border-border bg-card transition-all ${
          collapsed ? "w-[72px]" : "w-64"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-extrabold text-primary-foreground">
              D
            </span>
            {!collapsed && <span className="truncate font-extrabold">DDP</span>}
          </div>
          <button
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-accent"
          >
            <ChevronLeft
              className={`h-3.5 w-3.5 transition-transform ${collapsed ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {NAV_ITEMS.map((item) => {
            const active =
              item.to === "/admin" ? pathname === "/admin" : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 border-t border-border p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {displayName.charAt(0).toUpperCase()}
          </span>
          {!collapsed && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold capitalize">{displayName}</span>
              <span className="block text-xs text-muted-foreground">Admin</span>
            </span>
          )}
          <button
            onClick={signOut}
            aria-label="Sair"
            className="text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-6">
          <div>
            <p className="text-sm text-muted-foreground">{greeting()},</p>
            <p className="font-bold capitalize">{displayName}!</p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold hover:bg-accent"
            >
              <ExternalLink className="h-4 w-4" /> Ver site
            </a>
            <Link
              to="/admin/ia"
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold hover:bg-accent"
            >
              <Sparkles className="h-4 w-4" /> IA
            </Link>
            {notifPermission === "granted" ? (
              <span
                title="Notificações ativadas"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground"
              >
                <Bell className="h-4 w-4" />
              </span>
            ) : notifPermission === "denied" ? (
              <span
                title="Notificações bloqueadas nas permissões do navegador"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground"
              >
                <BellOff className="h-4 w-4" />
              </span>
            ) : notifPermission !== "unsupported" ? (
              <button
                onClick={requestNotifPermission}
                title="Ativar notificações"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Bell className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
