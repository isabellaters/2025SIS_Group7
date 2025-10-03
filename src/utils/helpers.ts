/**
 * Pure utility functions
 */

export function appendLine(prev: string, next: string): string {
  return prev ? `${prev}\n${next}` : next;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function padToSameLength(a: string[], b: string[]): [string[], string[]] {
  const max = Math.max(a.length, b.length);
  const pad = (arr: string[]) => (arr.length < max ? arr.concat(Array(max - arr.length).fill("")) : arr);
  return [pad(a), pad(b)];
}
