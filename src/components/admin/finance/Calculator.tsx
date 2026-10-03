import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Delete } from "lucide-react";
import { CALC_START, calcPress, marginCalc, type CalcState, type MarginTarget } from "@/lib/pdv";
import { parseMoney } from "@/lib/admin/finance-period";
import { formatCurrency } from "@/lib/admin/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

type Mode = "livre" | "margem";

const KEYS: { k: string; kind: "fn" | "num" | "op" | "eq" }[] = [
  { k: "C", kind: "fn" },
  { k: "⌫", kind: "fn" },
  { k: "%", kind: "fn" },
  { k: "÷", kind: "op" },
  { k: "7", kind: "num" },
  { k: "8", kind: "num" },
  { k: "9", kind: "num" },
  { k: "×", kind: "op" },
  { k: "4", kind: "num" },
  { k: "5", kind: "num" },
  { k: "6", kind: "num" },
  { k: "-", kind: "op" },
  { k: "1", kind: "num" },
  { k: "2", kind: "num" },
  { k: "3", kind: "num" },
  { k: "+", kind: "op" },
  { k: "0", kind: "num" },
  { k: "00", kind: "num" },
  { k: ",", kind: "num" },
  { k: "=", kind: "eq" },
];

const KEYBOARD: Record<string, string> = {
  "*": "×",
  x: "×",
  X: "×",
  "/": "÷",
  ".": ",",
  ",": ",",
  Enter: "=",
  "=": "=",
  Backspace: "⌫",
  Delete: "C",
  Escape: "",
  "+": "+",
  "-": "-",
  "%": "%",
};

/** Calculadora do caixa: livre e margem de lucro. Teclado físico funciona. */
export function Calculator({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [mode, setMode] = useState<Mode>("livre");
  const [calc, setCalc] = useState<CalcState>(CALC_START);
  const [pressed, setPressed] = useState<string | null>(null);

  function press(key: string) {
    setCalc((s) => calcPress(s, key));
    setPressed(key);
    setTimeout(() => setPressed((p) => (p === key ? null : p)), 120);
  }

  useEffect(() => {
    if (!open || mode !== "livre") return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      const key = /^\d$/.test(e.key) ? e.key : KEYBOARD[e.key];
      if (key) {
        e.preventDefault();
        press(key);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, mode]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(calc.display);
      toast.success(`${calc.display} copiado.`);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  const expression =
    calc.stored != null && calc.op
      ? `${String(calc.stored).replace(".", ",")} ${calc.op}${calc.fresh ? "" : ` ${calc.display}`}`
      : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm gap-4 rounded-2xl p-5">
        <div>
          <DialogTitle className="text-lg">Calculadora</DialogTitle>
          <DialogDescription className="sr-only">
            Calculadora livre e de margem de lucro
          </DialogDescription>
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
          {(
            [
              ["livre", "Livre"],
              ["margem", "Margem de lucro"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={`rounded-lg py-2 text-sm font-bold transition-all ${
                mode === id ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "livre" ? (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div className="rounded-xl bg-muted/70 px-4 py-3 text-right">
              <p className="h-5 truncate text-xs font-semibold text-muted-foreground tabular-nums">
                {expression}
              </p>
              <p
                className={`truncate font-extrabold tabular-nums ${calc.display.length > 12 ? "text-2xl" : "text-4xl"}`}
                aria-live="polite"
              >
                {calc.display}
              </p>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {KEYS.map(({ k, kind }) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => press(k)}
                  aria-label={k === "⌫" ? "Apagar" : k === "C" ? "Limpar" : k}
                  className={`flex h-12 items-center justify-center rounded-xl border text-lg font-bold transition-all active:scale-95 ${
                    pressed === k ? "scale-95" : ""
                  } ${
                    kind === "eq"
                      ? "border-transparent bg-emerald-600 text-white shadow-md shadow-emerald-600/25 hover:bg-emerald-700"
                      : kind === "op"
                        ? `border-border bg-card text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 ${calc.op === k && calc.fresh ? "ring-2 ring-emerald-500/50" : ""}`
                        : kind === "fn"
                          ? "border-border bg-muted/60 text-muted-foreground hover:bg-muted"
                          : "border-border bg-card hover:bg-accent"
                  }`}
                >
                  {k === "⌫" ? <Delete className="h-5 w-5" /> : k === "-" ? "−" : k}
                </button>
              ))}
            </div>
            <p className="text-center text-[11px] text-muted-foreground">
              Dá para usar o teclado: números, + − * / , Enter e Backspace.
            </p>
          </div>
        ) : (
          <MarginCalculator />
        )}

        <div className="flex justify-between gap-2 border-t border-border pt-3">
          {mode === "livre" ? (
            <Button variant="ghost" size="sm" onClick={copy}>
              <Copy className="h-4 w-4" /> Copiar resultado
            </Button>
          ) : (
            <span />
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const TARGETS: { id: MarginTarget; label: string }[] = [
  { id: "preco", label: "Preço de venda" },
  { id: "margem", label: "Margem (%)" },
  { id: "custo", label: "Custo" },
];

function MarginCalculator() {
  const [target, setTarget] = useState<MarginTarget>("preco");
  const [cost, setCost] = useState("");
  const [margin, setMargin] = useState("");
  const [price, setPrice] = useState("");

  const parse = (v: string) => (v.trim() ? parseMoney(v) : null);
  const result = useMemo(
    () => marginCalc(target, { cost: parse(cost), margin: parse(margin), price: parse(price) }),
    [target, cost, margin, price],
  );

  const values = {
    cost: target === "custo" ? result : parse(cost),
    margin: target === "margem" ? result : parse(margin),
    price: target === "preco" ? result : parse(price),
  };
  const profit = values.price != null && values.cost != null ? values.price - values.cost : null;
  const markup =
    values.price != null && values.cost ? ((values.price - values.cost) / values.cost) * 100 : null;

  const field = (
    id: MarginTarget,
    label: string,
    value: string,
    set: (v: string) => void,
    suffix: string,
  ) => {
    const calculated = target === id;
    const shown =
      calculated && result != null
        ? id === "margem"
          ? result.toFixed(2).replace(".", ",")
          : result.toFixed(2).replace(".", ",")
        : value;
    return (
      <div className="space-y-1.5">
        <Label htmlFor={`m-${id}`} className="text-sm">
          {label}
          {calculated && <span className="text-emerald-600"> — calculado</span>}
        </Label>
        <div className="relative">
          <Input
            id={`m-${id}`}
            inputMode="decimal"
            readOnly={calculated}
            value={calculated ? shown : value}
            onChange={(e) => set(e.target.value.replace(/[^\d,.]/g, ""))}
            placeholder="0,00"
            className={`h-11 pr-12 text-base ${calculated ? "border-emerald-500/50 bg-emerald-50/60 font-extrabold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300" : ""}`}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
            {suffix}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      <div>
        <p className="mb-1.5 text-sm text-muted-foreground">O que você quer descobrir?</p>
        <div className="grid grid-cols-3 gap-2">
          {TARGETS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTarget(t.id)}
              className={`rounded-lg border px-2 py-2 text-xs font-bold transition-colors ${
                target === t.id
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  : "border-border hover:bg-accent"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {field("custo", "Custo (R$)", cost, setCost, "R$")}
      {field("margem", "Margem sobre o preço (%)", margin, setMargin, "%")}
      {field("preco", "Preço de venda (R$)", price, setPrice, "R$")}
      <div className="rounded-xl bg-muted/70 p-3 text-sm">
        {result == null ? (
          <p className="text-muted-foreground">Preencha os outros dois campos para calcular.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 animate-in fade-in duration-200">
            <p>
              <span className="block text-xs text-muted-foreground">Lucro por venda</span>
              <b className="tabular-nums">{profit != null ? formatCurrency(profit) : "—"}</b>
            </p>
            <p>
              <span className="block text-xs text-muted-foreground">Markup sobre o custo</span>
              <b className="tabular-nums">
                {markup != null ? `${markup.toFixed(1).replace(".", ",")}%` : "—"}
              </b>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
