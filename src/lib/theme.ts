export type ThemeMode = "light" | "dark" | "system";
export type ThemeColorId = "azul" | "roxo" | "teal" | "verde" | "laranja" | "rosa" | "vermelho";

export type ThemeColor = { id: ThemeColorId; name: string; primary: string };

export const THEME_COLORS: ThemeColor[] = [
  { id: "azul", name: "Azul", primary: "oklch(0.546 0.215 262.9)" },
  { id: "roxo", name: "Roxo", primary: "oklch(0.55 0.24 300)" },
  { id: "teal", name: "Teal", primary: "oklch(0.6 0.12 195)" },
  { id: "verde", name: "Verde", primary: "oklch(0.6 0.16 150)" },
  { id: "laranja", name: "Laranja", primary: "oklch(0.65 0.19 50)" },
  { id: "rosa", name: "Rosa", primary: "oklch(0.6 0.2 350)" },
  { id: "vermelho", name: "Vermelho", primary: "oklch(0.58 0.22 25)" },
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
      mode: parsed.mode ?? DEFAULT_PREFS.mode,
      color: parsed.color ?? DEFAULT_PREFS.color,
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

export function applyThemePrefs(prefs: ThemePrefs) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  const isDark =
    prefs.mode === "dark" ||
    (prefs.mode === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", isDark);

  const color = THEME_COLORS.find((c) => c.id === prefs.color) ?? THEME_COLORS[0];
  root.style.setProperty("--primary", color!.primary);
  root.style.setProperty("--primary-foreground", PRIMARY_FOREGROUND);
  root.style.setProperty("--ring", color!.primary);
  root.style.setProperty("--sidebar-primary", color!.primary);
  root.style.setProperty("--sidebar-ring", color!.primary);
}
