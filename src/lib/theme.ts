export type ThemeMode = "light" | "dark" | "system";
export type ThemeColorId =
  | "azul"
  | "indigo"
  | "violeta"
  | "roxo"
  | "fucsia"
  | "rosa"
  | "vinho"
  | "vermelho"
  | "laranja"
  | "ambar"
  | "amarelo"
  | "lima"
  | "verde"
  | "esmeralda"
  | "teal"
  | "ciano"
  | "celeste"
  | "marrom"
  | "grafite";

export type ThemeColor = { id: ThemeColorId; name: string; primary: string };

// Every color is a hand-tuned oklch(L C H) triplet — lightness/chroma tuned per
// hue so all swatches read as similarly saturated and "professional" rather
// than some looking neon and others washed out.
export const THEME_COLORS: ThemeColor[] = [
  { id: "azul", name: "Azul", primary: "oklch(0.546 0.215 262.9)" },
  { id: "indigo", name: "Índigo", primary: "oklch(0.55 0.21 275)" },
  { id: "violeta", name: "Violeta", primary: "oklch(0.56 0.23 291)" },
  { id: "roxo", name: "Roxo", primary: "oklch(0.55 0.24 300)" },
  { id: "fucsia", name: "Fúcsia", primary: "oklch(0.58 0.25 328)" },
  { id: "rosa", name: "Rosa", primary: "oklch(0.6 0.2 350)" },
  { id: "vinho", name: "Vinho", primary: "oklch(0.46 0.17 10)" },
  { id: "vermelho", name: "Vermelho", primary: "oklch(0.58 0.22 25)" },
  { id: "laranja", name: "Laranja", primary: "oklch(0.65 0.19 50)" },
  { id: "ambar", name: "Âmbar", primary: "oklch(0.7 0.17 70)" },
  { id: "amarelo", name: "Amarelo", primary: "oklch(0.75 0.15 95)" },
  { id: "lima", name: "Lima", primary: "oklch(0.68 0.18 125)" },
  { id: "verde", name: "Verde", primary: "oklch(0.6 0.16 150)" },
  { id: "esmeralda", name: "Esmeralda", primary: "oklch(0.6 0.14 165)" },
  { id: "teal", name: "Teal", primary: "oklch(0.6 0.12 195)" },
  { id: "ciano", name: "Ciano", primary: "oklch(0.62 0.13 210)" },
  { id: "celeste", name: "Azul-céu", primary: "oklch(0.6 0.16 230)" },
  { id: "marrom", name: "Marrom", primary: "oklch(0.5 0.09 45)" },
  { id: "grafite", name: "Grafite", primary: "oklch(0.4 0.02 264)" },
];

const PRIMARY_FOREGROUND = "oklch(0.984 0.003 247.858)";

export type ThemePrefs = { mode: ThemeMode; color: ThemeColorId };

const DEFAULT_PREFS: ThemePrefs = { mode: "system", color: "azul" };
const STORAGE_KEY = "ddp-admin-theme";

export function loadThemePrefs(): ThemePrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<ThemePrefs>;
    return {
      mode: ["light", "dark", "system"].includes(parsed.mode ?? "")
        ? parsed.mode!
        : DEFAULT_PREFS.mode,
      color: THEME_COLORS.some((color) => color.id === parsed.color)
        ? parsed.color!
        : DEFAULT_PREFS.color,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function saveThemePrefs(prefs: ThemePrefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Storage unavailable (private mode, etc.) — the choice just won't persist.
  }
}

function hueOf(oklchValue: string): number {
  const match = /oklch\(\s*[\d.]+\s+[\d.]+\s+([\d.]+)/.exec(oklchValue);
  return match ? Number(match[1]) : 262.9;
}

export function applyThemePrefs(prefs: ThemePrefs) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (!root.hasAttribute("data-admin-theme")) return;

  const isDark =
    prefs.mode === "dark" ||
    (prefs.mode === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", isDark);

  const color = THEME_COLORS.find((c) => c.id === prefs.color) ?? THEME_COLORS[0]!;
  const hue = hueOf(color.primary);

  // The accent/brand color drives buttons, links, focus rings and the active
  // sidebar item in both panels.
  root.style.setProperty("--primary", color.primary);
  const foreground = ["amarelo", "ambar", "lima"].includes(color.id)
    ? "oklch(0.2 0.02 264)"
    : PRIMARY_FOREGROUND;
  root.style.setProperty("--primary-foreground", foreground);
  root.style.setProperty("--ring", color.primary);
  root.style.setProperty("--sidebar-primary", color.primary);
  root.style.setProperty("--sidebar-primary-foreground", foreground);
  root.style.setProperty("--sidebar-ring", color.primary);
  root.style.setProperty("--chart-1", color.primary);

  // A soft tint of the same hue carries the color into hover states, active
  // tabs, selected menu items and dropdown highlights — this is what makes a
  // color choice feel like it re-skins the whole platform instead of just
  // the primary buttons.
  const accent = isDark ? `oklch(0.32 0.07 ${hue})` : `oklch(0.955 0.03 ${hue})`;
  const accentForeground = isDark ? `oklch(0.93 0.02 ${hue})` : `oklch(0.32 0.09 ${hue})`;
  root.style.setProperty("--accent", accent);
  root.style.setProperty("--accent-foreground", accentForeground);
  root.style.setProperty("--sidebar-accent", accent);
  root.style.setProperty("--sidebar-accent-foreground", accentForeground);
}

const THEME_PROPERTIES = [
  "--primary",
  "--primary-foreground",
  "--ring",
  "--sidebar-primary",
  "--sidebar-primary-foreground",
  "--sidebar-ring",
  "--chart-1",
  "--accent",
  "--accent-foreground",
  "--sidebar-accent",
  "--sidebar-accent-foreground",
] as const;

/** Scope the theme to the admin route lifetime, including dialogs portaled to body. */
export function mountAdminTheme() {
  const root = document.documentElement;
  root.setAttribute("data-admin-theme", "");
  const refresh = () => applyThemePrefs(loadThemePrefs());
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) refresh();
  };
  refresh();
  media.addEventListener("change", refresh);
  window.addEventListener("storage", onStorage);
  return () => {
    media.removeEventListener("change", refresh);
    window.removeEventListener("storage", onStorage);
    root.removeAttribute("data-admin-theme");
    root.classList.remove("dark");
    for (const name of THEME_PROPERTIES) root.style.removeProperty(name);
  };
}
