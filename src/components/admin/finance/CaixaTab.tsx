import { useEffect, useState } from "react";
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
}: {
  patients: { id: string; name: string }[];
  onSale: () => void;
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

  return (
    <div
      className={`mx-auto w-full space-y-4 transition-[max-width] duration-500 ease-out ${current.width}`}
    >
      <div className="flex justify-end">
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
      </div>

      {error ? (
        <p className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
          {error}
        </p>
      ) : !status ? (
        <div className="h-72 animate-pulse rounded-3xl border border-border bg-card" />
      ) : status.open && status.summary ? (
        <>
          <CashBar status={status} onChanged={refresh} />
          <Pdv
            patients={patients}
            cashSessionId={status.open.id}
            onFinished={() => {
              onSale();
              void refresh();
            }}
          />
        </>
      ) : (
        <ClosedCash history={status.history} onOpened={refresh} />
      )}
    </div>
  );
}
