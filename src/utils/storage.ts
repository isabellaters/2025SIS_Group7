/**
 * LocalStorage utilities with safe fallbacks for SSR/non-browser environments
 */

const hasWindow: boolean = typeof window !== "undefined";

export function lsGet(key: string): string | null {
  if (!hasWindow) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function lsSet(key: string, value: string): void {
  if (!hasWindow) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {}
}

export const UI_PREF_KEY = "ll:ui";
