import { useEffect, useRef, useState } from "react";
import { Check, Columns3, Maximize2, Minimize2, MoveHorizontal } from "lucide-react";
import {
  readPreference,
  refreshPreferences,
  savePreference,
  subscribePreferences,
} from "@/lib/preferences";
import { CashBar, ClosedCash } from "@/components/admin/finance/CashRegister";
import { useCashStatus } from "@/lib/use-cash-status";
import { Pdv } from "@/components/admin/finance/Pdv";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Layout = "largo" | "centro" | "compacto";

const LAYOUTS: {
  id: Layout;
  label: string;
  hint: string;
  icon: typeof Maximize2;
  width: string;
}[] = [
  {
    id: "largo",
    label: "Tela toda",
    hint: "Usa toda a largura",
    icon: Maximize2,
    width: "max-w-none",
  },
  {
    id: "centro",
    label: "Centralizado",
    hint: "Mais para o meio",
    icon: Columns3,
    width: "max-w-6xl",
  },
  {
    id: "compacto",
    label: "Compacto",
    hint: "Bem no centro, mais estreito",
    icon: Minimize2,
    width: "max-w-5xl",
  },
];

/** Aba Caixa (PDV): exige caixa do dia aberto e permite ajustar a largura. */
export function CaixaTab({
  patients,
  onSale,
  budgetId,
  onBudgetHandled,
}: {
  patients: { id: string; name: string }[];
  onSale: () => void;
  budgetId?: string | null | undefined;
  onBudgetHandled?: (() => void) | undefined;
}) {
  const { status, error, refresh } = useCashStatus();
  const [layout, setLayoutState] = useState<Layout>(() => readPreference("pdvLayout") ?? "centro");
  useEffect(() => {
    const sync = () => setLayoutState(readPreference("pdvLayout") ?? "centro");
    const unsubscribe = subscribePreferences(sync);
    void refreshPreferences().then(sync);
    return unsubscribe;
  }, []);
  function setLayout(next: Layout) {
    setLayoutState(next);
    void savePreference({ key: "pdvLayout", value: next });
  }
  const current = LAYOUTS.find((l) => l.id === layout) ?? LAYOUTS[1]!;
  const rootRef = useRef<HTMLDivElement>(null);
  const isOpen = !!status?.open;
  const loaded = !!status;
  useEffect(() => {
    const el = rootRef.current;
    if (!loaded || !el) return;
    // Encosta o caixa logo abaixo da barra fixa do topo.
    const top = el.getBoundingClientRect().top + window.scrollY - 76;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }, [isOpen, loaded]);

  const adjust = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="bg-card">
          <MoveHorizontal className="h-4 w-4" /> Ajustar tela:{" "}
          <span className="font-bold">{current.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>Largura do caixa</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LAYOUTS.map((l) => (
          <DropdownMenuItem key={l.id} onClick={() => setLayout(l.id)} className="gap-3 py-2">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                layout === l.id ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}
            >
              <l.icon className="h-4 w-4" />
            </span>
            <span className="flex-1">
              <span className="block font-semibold">{l.label}</span>
              <span className="block text-xs text-muted-foreground">{l.hint}</span>
            </span>
            {layout === l.id && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div
      ref={rootRef}
      className={`mx-auto w-full scroll-mt-20 space-y-4 transition-[max-width] duration-500 ease-out ${current.width}`}
    >
      {error ? (
        <div
          role="alert"
          className="space-y-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive"
        >
          <p>{error}</p>
          <Button variant="outline" onClick={() => void refresh()}>
            Tentar novamente
          </Button>
        </div>
      ) : !status ? (
        <div className="h-72 animate-pulse rounded-3xl border border-border bg-card" />
      ) : status.open && status.summary ? (
        <>
          <div className="flex flex-wrap items-stretch gap-3">
            <div className="min-w-0 flex-1">
              <CashBar status={status} onChanged={refresh} />
            </div>
            <div className="flex items-center">{adjust}</div>
          </div>
          <Pdv
            patients={patients}
            cashSessionId={status.open.id}
            budgetId={budgetId}
            onBudgetHandled={onBudgetHandled}
            onFinished={() => {
              onSale();
              void refresh();
            }}
          />
        </>
      ) : (
        <>
          <div className="flex justify-end">{adjust}</div>
          <ClosedCash
            history={status.history}
            onOpened={refresh}
            notice={
              budgetId
                ? "Há um orçamento esperando para ser finalizado. Abra o caixa do dia e ele aparece em seguida."
                : null
            }
          />
        </>
      )}
    </div>
  );
}
