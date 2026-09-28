import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  CloudUpload,
  Database,
  Minus,
  Monitor,
  Moon,
  Plus,
  RotateCcw,
  Sun,
} from "lucide-react";
import { refreshPreferences, subscribePreferences } from "@/lib/preferences";
import {
  THEME_COLORS,
  applyThemePrefs,
  loadThemePrefs,
  saveThemePrefs,
  type ThemeMode,
  type ThemePrefs,
} from "@/lib/theme";
import {
  ZOOM_DEFAULT,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
  loadZoom,
  saveZoom,
  type ZoomScope,
} from "@/lib/zoom";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

type SaveState =
  { kind: "idle" } | { kind: "saving" } | { kind: "saved"; at: Date } | { kind: "error" };

const MODES: { id: ThemeMode; label: string; icon: typeof Sun; preview: string }[] = [
  { id: "light", label: "Claro", icon: Sun, preview: "bg-white" },
  { id: "dark", label: "Escuro", icon: Moon, preview: "bg-slate-900" },
  {
    id: "system",
    label: "Automático",
    icon: Monitor,
    preview: "bg-[linear-gradient(135deg,#ffffff_50%,#0f172a_50%)]",
  },
];

/** Miniatura do painel com a cor escolhida (tema claro: fundo 50% branco + 50% cor). */
function PanelPreview({ color }: { color: string }) {
  return (
    <div
      className="overflow-hidden rounded-xl border border-border shadow-sm transition-colors duration-500"
      style={{ background: `color-mix(in oklch, white 50%, ${color})` }}
    >
      <div className="flex items-center justify-between bg-white/90 px-3 py-2">
        <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800">
          <span className="h-3 w-3 rounded" style={{ background: color }} /> Dentista do Povo
        </span>
        <span className="h-2 w-10 rounded-full bg-slate-200" />
      </div>
      <div className="grid grid-cols-3 gap-2 p-3">
        {["Agenda", "Pacientes", "Financeiro"].map((label) => (
          <div key={label} className="rounded-lg bg-white p-2 text-center shadow-sm">
            <span
              className="mx-auto block h-5 w-5 rounded-md opacity-90"
              style={{ background: `color-mix(in oklch, white 80%, ${color})` }}
            />
            <span className="mt-1 block text-[9px] font-semibold text-slate-700">{label}</span>
          </div>
        ))}
        <div className="col-span-3 flex items-center justify-between rounded-lg bg-white p-2 shadow-sm">
          <span className="h-2 w-20 rounded-full bg-slate-200" />
          <span
            className="rounded-md px-2 py-1 text-[9px] font-bold text-white"
            style={{ background: color }}
          >
            Salvar
          </span>
        </div>
      </div>
    </div>
  );
}

/** Configurações › Aparência: tema, cor e zoom — tudo salvo no projeto (banco). */
export function AppearanceSettings() {
  const [prefs, setPrefs] = useState<ThemePrefs>(() => loadThemePrefs());
  const [adminZoom, setAdminZoom] = useState(() => loadZoom("admin"));
  const [publicZoom, setPublicZoom] = useState(() => loadZoom("public"));
  const [save, setSave] = useState<SaveState>({ kind: "idle" });

  // Sempre mostra o que está realmente salvo no projeto.
  useEffect(() => {
    const refresh = () => {
      setPrefs(loadThemePrefs());
      setAdminZoom(loadZoom("admin"));
      setPublicZoom(loadZoom("public"));
    };
    const unsubscribe = subscribePreferences(refresh);
    void refreshPreferences().then(refresh);
    return unsubscribe;
  }, []);

  async function persist(run: () => Promise<boolean>) {
    setSave({ kind: "saving" });
    const ok = await run();
    if (ok) {
      setSave({ kind: "saved", at: new Date() });
    } else {
      // Não salvou: volta tudo para o que está no projeto (nada fica "só aqui").
      const saved = loadThemePrefs();
      setPrefs(saved);
      applyThemePrefs(saved);
      setAdminZoom(loadZoom("admin"));
      setPublicZoom(loadZoom("public"));
      document.documentElement.style.setProperty("zoom", `${loadZoom("admin")}%`);
      setSave({ kind: "error" });
    }
  }

  function updateTheme(patch: Partial<ThemePrefs>) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    applyThemePrefs(next);
    void persist(() => saveThemePrefs(next));
  }

  function changeZoom(scope: ZoomScope, value: number) {
    const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(value / 5) * 5));
    if (scope === "admin") {
      setAdminZoom(clamped);
      document.documentElement.style.setProperty("zoom", `${clamped}%`);
    } else setPublicZoom(clamped);
    void persist(() => saveZoom(scope, clamped));
  }

  const color = THEME_COLORS.find((c) => c.id === prefs.color) ?? THEME_COLORS[0]!;

  return (
    <div className="space-y-4">
      <div
        role="status"
        className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors ${
          save.kind === "error"
            ? "border-destructive/40 bg-destructive/5"
            : "border-primary/30 bg-primary/5"
        }`}
      >
        {save.kind === "saving" ? (
          <CloudUpload className="h-5 w-5 animate-pulse text-primary" />
        ) : save.kind === "error" ? (
          <AlertTriangle className="h-5 w-5 text-destructive" />
        ) : save.kind === "saved" ? (
          <Check className="h-5 w-5 text-emerald-600" />
        ) : (
          <Database className="h-5 w-5 text-primary" />
        )}
        <span className="flex-1">
          {save.kind === "saving" && <b>Salvando no projeto…</b>}
          {save.kind === "saved" && (
            <>
              <b>Salvo no projeto</b> às {save.at.toLocaleTimeString("pt-BR").slice(0, 5)} — já vale
              para todos os administradores, computadores e celulares.
            </>
          )}
          {save.kind === "error" && (
            <>
              <b>Não foi possível salvar no projeto.</b> Nada foi guardado no navegador: a tela
              voltou para a aparência salva. Verifique a conexão com o banco de dados e tente de
              novo.
            </>
          )}
          {save.kind === "idle" && (
            <>
              Tudo o que você muda aqui é salvo <b>no projeto (banco de dados)</b>, nunca no
              navegador — vale para todos os administradores, computadores e celulares.
            </>
          )}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-bold">Tema</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Claro, escuro ou automático (segue o celular/computador).
            </p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {MODES.map((m) => {
                const active = prefs.mode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => updateTheme({ mode: m.id })}
                    className={`group rounded-xl border-2 p-2 text-left transition-all duration-200 hover:-translate-y-0.5 ${
                      active ? "border-primary shadow-md" : "border-border hover:border-primary/40"
                    }`}
                  >
                    <span className={`block h-14 rounded-lg border border-border ${m.preview}`} />
                    <span className="mt-2 flex items-center gap-1.5 text-sm font-semibold">
                      <m.icon className="h-4 w-4" /> {m.label}
                      {active && <Check className="ml-auto h-4 w-4 text-primary" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-bold">Cor da interface</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Define botões, links, ícones e o fundo do painel (no tema claro, 50% branco + 50% da
              cor).
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
              {THEME_COLORS.map((c) => {
                const active = prefs.color === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => updateTheme({ color: c.id })}
                    className={`flex items-center gap-2 rounded-xl border-2 p-2 text-left text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5 ${
                      active
                        ? "border-foreground shadow-md"
                        : "border-border hover:border-foreground/30"
                    }`}
                  >
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg shadow-inner"
                      style={{ background: c.primary }}
                    >
                      {active && <Check className="h-4 w-4 text-white drop-shadow" />}
                    </span>
                    <span className="leading-tight">{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-bold">Zoom</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Tamanho de tudo na tela. O painel e o site público têm zooms separados.
            </p>
            <div className="mt-4 space-y-3">
              {(
                [
                  { scope: "admin", label: "Área restrita (este painel)", value: adminZoom },
                  { scope: "public", label: "Site público", value: publicZoom },
                ] as const
              ).map((z) => (
                <div key={z.scope} className="rounded-xl border border-border px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold">{z.label}</span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => changeZoom(z.scope, z.value - ZOOM_STEP)}
                        disabled={z.value <= ZOOM_MIN}
                        aria-label={`Diminuir zoom (${z.label})`}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="w-12 text-center text-sm font-bold tabular-nums">
                        {z.value}%
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => changeZoom(z.scope, z.value + ZOOM_STEP)}
                        disabled={z.value >= ZOOM_MAX}
                        aria-label={`Aumentar zoom (${z.label})`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => changeZoom(z.scope, ZOOM_DEFAULT)}
                        disabled={z.value === ZOOM_DEFAULT}
                        aria-label={`Redefinir zoom (${z.label})`}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <Slider
                    className="mt-3"
                    min={ZOOM_MIN}
                    max={ZOOM_MAX}
                    step={5}
                    value={[z.value]}
                    onValueChange={([v]) =>
                      v !== undefined && (z.scope === "admin" ? setAdminZoom(v) : setPublicZoom(v))
                    }
                    onValueCommit={([v]) => changeZoom(z.scope, v ?? ZOOM_DEFAULT)}
                    aria-label={`Zoom (${z.label})`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Pré-visualização
          </p>
          <PanelPreview color={color.primary} />
          <p className="mt-2 text-xs text-muted-foreground">
            Cor: <b className="text-foreground">{color.name}</b> · Tema:{" "}
            <b className="text-foreground">{MODES.find((m) => m.id === prefs.mode)?.label}</b>
          </p>
        </div>
      </div>
    </div>
  );
}
