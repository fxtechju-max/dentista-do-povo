import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { GripVertical, RotateCcw } from "lucide-react";
import { db } from "@/integrations/mysql/client";
import {
  ADMIN_MODULES,
  DASHBOARD_MODULE,
  SETTINGS_MODULE,
  TUTORIAL_MODULE,
  sortModules,
} from "@/lib/modules";
import { ModuleGrid } from "@/components/admin/ModuleGrid";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/")({
  component: Launcher,
});

function Launcher() {
  const [disabledModules, setDisabledModules] = useState<string[]>([]);
  const [order, setOrder] = useState<string[]>([]);

  useEffect(() => {
    db.from("clinic_settings")
      .select("disabled_modules, module_order")
      .eq("id", "default")
      .maybeSingle()
      .then(({ data }) => {
        setDisabledModules(data?.disabled_modules ?? []);
        setOrder(data?.module_order ?? []);
      });
  }, []);

  const tiles = sortModules(
    [
      DASHBOARD_MODULE,
      ...ADMIN_MODULES.filter((m) => !disabledModules.includes(m.id)),
      SETTINGS_MODULE,
      TUTORIAL_MODULE,
    ],
    order,
  );

  async function saveOrder(next: string[]) {
    const previous = order;
    setOrder(next);
    const { error } = await db.from("clinic_settings").upsert({
      id: "default",
      module_order: next,
      updated_at: new Date().toISOString(),
    });
    if (error) setOrder(previous);
    else toast.success("Ordem dos módulos salva no projeto.");
  }

  function handleReorder(ids: string[]) {
    // Guarda também os módulos desativados, para não perderem a posição.
    const hidden = order.filter((id) => !ids.includes(id));
    void saveOrder([...ids, ...hidden]);
  }

  return (
    <div className="animate-in fade-in mx-auto max-w-5xl duration-300">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight">Bem-vindo ao seu painel</h1>
        <p className="mt-2 text-muted-foreground">Acesse as áreas do sistema</p>
        <p className="mt-3 inline-flex flex-wrap items-center justify-center gap-2 rounded-full bg-primary/5 px-4 py-1.5 text-xs text-muted-foreground">
          <GripVertical className="h-3.5 w-3.5 text-primary" />
          Segure e arraste um módulo para mudar a ordem — salva automaticamente no projeto.
          {order.length > 0 && (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={() => saveOrder([])}
            >
              <RotateCcw className="h-3 w-3" /> Ordem padrão
            </Button>
          )}
        </p>
      </div>

      <div className="mt-8">
        <ModuleGrid modules={tiles} onReorder={handleReorder} />
      </div>
    </div>
  );
}
