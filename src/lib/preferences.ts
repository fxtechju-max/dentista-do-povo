import { toast } from "sonner";
import { getPreferences, setPreference, type Preference } from "./preferences.functions";

type Preferences = Partial<{ [K in Preference["key"]]: Extract<Preference, { key: K }>["value"] }>;
let values: Preferences = {};
let request: Promise<void> | undefined;
let generation = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export function readPreference<K extends keyof Preferences>(key: K): Preferences[K] | undefined {
  return typeof window === "undefined" ? undefined : values[key];
}
export function subscribePreferences(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function resetPreferences() {
  generation++;
  values = {};
  request = undefined;
  emit();
}
export function refreshPreferences(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (request) return request;
  const current = generation;
  request = getPreferences()
    .then((rows) => {
      if (generation !== current) return;
      values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
      emit();
    })
    .catch((error) => {
      if (generation !== current) return;
      request = undefined;
      // Sem aviso na tela: a interface segue com o tema/zoom padrão, e a causa
      // (ex.: banco não configurado) já aparece no aviso principal dos dados.
      console.warn("Preferências da interface não carregadas:", error);
    });
  return request;
}

// Persist first: a failed save must not look like a successfully saved setting.
let saves = Promise.resolve();
export function savePreference(preference: Preference): Promise<void> {
  const current = generation;
  const saving = saves.then(async () => {
    await refreshPreferences();
    if (generation !== current) return;
    await setPreference({ data: preference });
    if (generation !== current) return;
    values = { ...values, [preference.key]: preference.value };
    emit();
  });
  saves = saving.catch(() => {
    toast.error("Não foi possível salvar a preferência no projeto. Tente novamente.", {
      id: "preferences-save",
    });
    emit();
  });
  return saves;
}
