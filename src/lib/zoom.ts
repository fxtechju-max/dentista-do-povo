export const ZOOM_MIN = 80;
export const ZOOM_MAX = 150;
export const ZOOM_STEP = 10;
export const ZOOM_DEFAULT = 100;

export type ZoomScope = "admin" | "public";

const KEYS: Record<ZoomScope, string> = {
  admin: "ddp-admin-zoom",
  public: "ddp-public-zoom",
};

function clamp(value: number) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value));
}

export function loadZoom(scope: ZoomScope): number {
  if (typeof localStorage === "undefined") return ZOOM_DEFAULT;
  try {
    const raw = Number(localStorage.getItem(KEYS[scope]));
    return Number.isFinite(raw) && raw > 0 ? clamp(raw) : ZOOM_DEFAULT;
  } catch {
    return ZOOM_DEFAULT;
  }
}

export function saveZoom(scope: ZoomScope, value: number) {
  try {
    localStorage.setItem(KEYS[scope], String(clamp(value)));
  } catch {
    // Storage unavailable (private mode, etc.) — the choice just won't persist.
  }
}

function applyZoomValue(value: number) {
  document.documentElement.style.setProperty("zoom", `${clamp(value)}%`);
}

/** Applies the given scope's saved zoom for as long as the caller stays
 * mounted, restoring whatever was there before on cleanup — mirrors
 * mountAdminTheme so admin and public zoom never bleed into each other. */
function mountZoom(scope: ZoomScope) {
  const previous = document.documentElement.style.getPropertyValue("zoom");
  const refresh = () => applyZoomValue(loadZoom(scope));
  refresh();
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEYS[scope] || event.key === null) refresh();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener("storage", onStorage);
    if (previous) document.documentElement.style.setProperty("zoom", previous);
    else document.documentElement.style.removeProperty("zoom");
  };
}

export function mountAdminZoom() {
  return mountZoom("admin");
}

export function mountPublicZoom() {
  return mountZoom("public");
}
