/**
 * Environment detection utilities
 */

export const hasWindow: boolean = typeof window !== "undefined";
export const isElectron: boolean = hasWindow && /electron/i.test(navigator.userAgent || "");
