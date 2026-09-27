import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { db } from "@/integrations/mysql/client";
import { ADMIN_MODULES, DASHBOARD_MODULE, SETTINGS_MODULE } from "@/lib/modules";

export const Route = createFileRoute("/admin/")({
  component: Launcher,
});

function Launcher() {
  const [disabledModules, setDisabledModules] = useState<string[]>([]);

  useEffect(() => {
    db.from("clinic_settings")
      .select("disabled_modules")
      .eq("id", "default")
      .maybeSingle()
      .then(({ data }) => setDisabledModules(data?.disabled_modules ?? []));
  }, []);

  const tiles = [
    DASHBOARD_MODULE,
    ...ADMIN_MODULES.filter((m) => !disabledModules.includes(m.id)),
    SETTINGS_MODULE,
  ];

  return (
    <div className="animate-in fade-in mx-auto max-w-5xl duration-300">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight">Bem-vindo ao seu painel</h1>
        <p className="mt-2 text-muted-foreground">Acesse as áreas do sistema</p>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((m, i) => (
          <Link
            key={m.id}
            to={m.to}
            style={{ animationDelay: `${i * 30}ms` }}
            className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg"
          >
            <span
              className={`flex h-14 w-14 items-center justify-center rounded-2xl ${m.iconBg} ${m.iconColor}`}
            >
              <m.icon className="h-7 w-7" />
            </span>
            <span className="font-bold">{m.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
