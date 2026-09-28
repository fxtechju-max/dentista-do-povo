import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  LogOut,
  ChevronDown,
  Bell,
  BellOff,
  ExternalLink,
  Clock,
  User,
  ArrowLeft,
} from "lucide-react";
import { db } from "@/integrations/mysql/client";
import {
  ADMIN_MODULES,
  DASHBOARD_MODULE,
  SETTINGS_MODULE,
  TUTORIAL_MODULE,
  sortModules,
} from "@/lib/modules";
import { ToothIcon } from "@/components/ToothIcon";
import { mountAdminTheme } from "@/lib/theme";
import { mountAdminZoom } from "@/lib/zoom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

type NotifState = NotificationPermission | "unsupported";

function AdminLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [status, setStatus] = useState<"loading" | "denied" | "ok">("loading");
  const [email, setEmail] = useState<string | null>(null);
  const [disabledModules, setDisabledModules] = useState<string[]>([]);
  const [moduleOrder, setModuleOrder] = useState<string[]>([]);
  const [notifPermission, setNotifPermission] = useState<NotifState>("default");

  useEffect(() => {
    db.from("clinic_settings")
      .select("disabled_modules, module_order")
      .eq("id", "default")
      .maybeSingle()
      .then(({ data }) => {
        setDisabledModules(data?.disabled_modules ?? []);
        setModuleOrder(data?.module_order ?? []);
      });
  }, []);

  useLayoutEffect(() => mountAdminTheme(), []);
  useLayoutEffect(() => mountAdminZoom(), []);

  const allModules = useMemo(() => {
    const modules = ADMIN_MODULES.filter((m) => !disabledModules.includes(m.id));
    return sortModules(
      [DASHBOARD_MODULE, ...modules, SETTINGS_MODULE, TUTORIAL_MODULE],
      moduleOrder,
    );
  }, [disabledModules, moduleOrder]);

  useEffect(() => {
    (async () => {
      const { data } = await db.auth.getUser();
      if (!data.user) {
        navigate({ to: "/entrar" });
        return;
      }
      const { data: isAdmin } = await db.rpc("has_role", {
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
    await db.auth.signOut();
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
  const isLauncher = pathname === "/admin";
  const currentModule = allModules.find((m) => pathname.startsWith(m.to));

  return (
    <div className="min-h-screen bg-[var(--admin-surface,var(--muted))] print:bg-white">
      {/* Anúncios nunca aparecem no painel, mesmo vindo do site público. */}
      <style>
        {"ins.adsbygoogle,.google-auto-placed,.adsbygoogle-noablate{display:none!important}"}
      </style>
      {isLauncher ? (
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-card px-6 py-4 sm:px-10 print:hidden">
          <Link to="/admin" className="flex items-center gap-3">
            <ToothIcon className="h-10 w-10 text-primary" />
            <span className="text-xl font-extrabold tracking-tight">
              <span className="text-foreground">DENTISTA </span>
              <span className="text-primary">DO POVO</span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <LiveClock />
            <div className="h-8 w-px bg-border" />
            <AccountMenu
              displayName={displayName}
              notifPermission={notifPermission}
              onRequestNotif={requestNotifPermission}
              onSignOut={signOut}
            />
          </div>
        </header>
      ) : (
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 sm:px-6 print:hidden">
          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              aria-label="Voltar ao painel"
              title="Voltar ao painel"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            {currentModule && (
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${currentModule.iconBg} ${currentModule.iconColor}`}
                >
                  <currentModule.icon className="h-4 w-4" />
                </span>
                <span className="font-bold">{currentModule.name}</span>
              </div>
            )}
          </div>
          <AccountMenu
            displayName={displayName}
            notifPermission={notifPermission}
            onRequestNotif={requestNotifPermission}
            onSignOut={signOut}
          />
        </header>
      )}

      <main className={`${isLauncher ? "p-6 sm:p-10" : "p-4 sm:p-6"} print:p-0`}>
        <Outlet />
      </main>
    </div>
  );
}

function LiveClock() {
  const now = useNow(30_000);
  const dateLabel = now.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const timeLabel = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-primary/5 px-4 py-2">
      <Clock className="h-5 w-5 text-primary" />
      <div className="leading-tight">
        <p className="text-xs capitalize text-muted-foreground">{dateLabel}</p>
        <p className="text-lg font-extrabold">{timeLabel}</p>
      </div>
    </div>
  );
}

function AccountMenu({
  displayName,
  notifPermission,
  onRequestNotif,
  onSignOut,
}: {
  displayName: string;
  notifPermission: NotifState;
  onRequestNotif: () => void;
  onSignOut: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-2 py-1.5 outline-none hover:bg-accent">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          <User className="h-4 w-4" />
        </span>
        <span className="hidden text-sm font-bold capitalize sm:inline">{displayName}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="capitalize">{displayName}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/" target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4" /> Ver site
          </a>
        </DropdownMenuItem>
        {notifPermission === "default" && (
          <DropdownMenuItem onClick={onRequestNotif}>
            <Bell className="h-4 w-4" /> Ativar notificações
          </DropdownMenuItem>
        )}
        {notifPermission === "granted" && (
          <DropdownMenuItem disabled>
            <Bell className="h-4 w-4" /> Notificações ativadas
          </DropdownMenuItem>
        )}
        {notifPermission === "denied" && (
          <DropdownMenuItem disabled>
            <BellOff className="h-4 w-4" /> Notificações bloqueadas
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut} className="text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
