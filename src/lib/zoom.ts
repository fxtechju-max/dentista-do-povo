import {
  readPreference,
  savePreference,
  subscribePreferences,
  refreshPreferences,
} from "./preferences";
export const ZOOM_MIN = 80;
export const ZOOM_MAX = 150;
export const ZOOM_STEP = 10;
export const ZOOM_DEFAULT = 100;

export type ZoomScope = "admin" | "public";

const KEYS = { admin: "adminZoom", public: "publicZoom" } as const;

function clamp(value: number) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value));
}

export function loadZoom(scope: ZoomScope): number {
  return readPreference(KEYS[scope]) ?? ZOOM_DEFAULT;
}
export function saveZoom(scope: ZoomScope, value: number) {
  return savePreference({ key: KEYS[scope], value: clamp(value) });
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
  const unsubscribe = subscribePreferences(refresh);
  void refreshPreferences();
  return () => {
    unsubscribe();
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
