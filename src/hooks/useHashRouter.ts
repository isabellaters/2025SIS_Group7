import { useState, useEffect } from 'react';
import { hasWindow } from '../utils/environment';

/**
 * Parse hash route from URL
 */
export function parseHashRoute(hash: string): string {
  let h = String(hash || "").trim();
  if (h.startsWith("#")) h = h.slice(1);
  if (h === "" || h === "/" || h === "#/") return "/";
  if (!h.startsWith("/")) h = "/" + h;
  return h;
}

/**
 * Electron-friendly hash router hook
 */
export function useHashRouter(): [string, (to: string) => void] {
  const [route, setRoute] = useState<string>(hasWindow ? parseHashRoute(window.location.hash) : "/");

  useEffect(() => {
    if (!hasWindow) return;
    const onHash = () => setRoute(parseHashRoute(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = (to: string) => {
    if (!hasWindow) return;
    const target = to.startsWith("#") ? to : (to.startsWith("/") ? `#${to}` : `#/${to}`);
    window.location.hash = target;
  };

  return [route, navigate];
}
