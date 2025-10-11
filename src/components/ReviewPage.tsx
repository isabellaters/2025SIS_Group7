import React, { useEffect, useState } from "react";

/** LocalStorage keys (shared with the rest of the app) */
const SESSION_KEY = "ll:session"; // { title, transcriptLines, translationLines, updatedAt }
const DEFS_KEY = "ll:defs";       // { [term: string]: definition }

/** Small helpers (self-contained) */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function extractKeyTerms(text: string, maxTerms = 8): string[] {
  const terms: string[] = [];
  const set = new Set<string>();

  // Capitalized multi-word phrases
  const phraseRe = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g;
  let m: RegExpExecArray | null;
  while ((m = phraseRe.exec(text)) !== null) {
    const t = m[1].trim();
    if (!set.has(t)) { set.add(t); terms.push(t); }
  }

  // Word frequency (exclude common stopwords)
  const STOP = new Set(["the","and","to","of","in","a","is","that","for","on","with","it","as","this","are","be","we","you","your","our","an","at","by","from","or","so","can"]);
  const counts: Record<string, number> = {};
  for (const w of text.toLowerCase().match(/[a-z][a-z\-]{3,}/g) || []) {
    if (STOP.has(w)) continue;
    counts[w] = (counts[w] || 0) + 1;
  }
  const topWords = Object.entries(counts)
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w);

  for (const w of topWords) {
    const t = w.replace(/\b\w/g, (l) => l.toUpperCase());
    if (!set.has(t)) { set.add(t); terms.push(t); }
  }
  return terms.slice(0, maxTerms);
}
function timeOf(index: number, stepSec = 5): string {
  const s = index * stepSec; const m = Math.floor(s / 60); const ss = (s % 60).toString().padStart(2, "0");
  return `${m}:${ss}`;
}

export function ReviewPage() {
  const [session, setSession] = useState<{ title: string; transcriptLines: string[]; translationLines: string[] } | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<string>("");
  const [defs, setDefs] = useState<Record<string, string>>({});
  const [fontScale, setFontScale] = useState<number>(1);

  useEffect(() => {
    try {
      const s = localStorage.getItem(SESSION_KEY);
      if (s) setSession(JSON.parse(s));
    } catch {}
    try {
      const d = localStorage.getItem(DEFS_KEY);
      const parsed = d ? JSON.parse(d) : {};
      if (!parsed["Vibe Coding"]) {
        parsed["Vibe Coding"] =
          "A software development approach that uses natural language prompts to have an AI assistant generate, refine, and debug code, shifting the developer's role from manual coding to guiding the AI.";
      }
      setDefs(parsed);
    } catch {}
  }, []);

  const fullText = (session?.transcriptLines || []).join("\n");
  const keyTerms = extractKeyTerms(fullText);
  const summaryPoints = (session?.transcriptLines || []).filter((l) => l.trim().length > 0).slice(0, 3);

  function saveDef(term: string, def: string) {
    const next = { ...defs, [term]: def };
    setDefs(next);
    try { localStorage.setItem(DEFS_KEY, JSON.stringify(next)); } catch {}
  }

  function highlight(text: string, term: string): React.ReactNode {
    if (!term) return <>{text}</>;
    const re = new RegExp(`\\b${escapeRegExp(term)}\\b`, "gi");
    const parts = text.split(re);
    const matches = text.match(re) || [];
    const out: React.ReactNode[] = [];
    for (let i = 0; i < parts.length; i++) {
      out.push(parts[i]);
      if (i < parts.length - 1) out.push(
        <mark key={`m${i}`} className="bg-yellow-200 px-0.5 rounded-sm">{matches[i] || term}</mark>
      );
    }
    return <>{out}</>;
  }

  return (
    <div id="ll-container" data-page="review" className="mx-auto my-4 max-w-6xl px-3">
      <div className="grid grid-cols-12 gap-4">
        {/* Left column: transcript */}
        <div className="col-span-8">
          <h2 className="text-lg font-semibold mb-2">{session?.title || "Lecture Review"}</h2>
          <div className="rounded-xl border border-neutral-300 bg-white p-3 shadow-sm min-h-[300px] max-h-[70vh] overflow-auto">
            {(session?.transcriptLines || []).map((line, idx) => (
              <div
                key={idx}
                className="mb-3 text-[clamp(12px,calc(14px_*_var(--fs,1)),20px)] leading-relaxed"
                style={{ ["--fs" as any]: fontScale }}
              >
                <div className="text-neutral-400 text-xs mb-1">{timeOf(idx)}</div>
                <div className="cursor-text" onDoubleClick={() => setSelectedTerm("")}>
                  {highlight(line, selectedTerm)}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-3">
            <button className="rounded border px-2 py-1 text-sm" onClick={() => setFontScale((s) => Math.min(1.4, +(s + 0.1).toFixed(2)))}>A+</button>
            <button className="rounded border px-2 py-1 text-sm" onClick={() => setFontScale((s) => Math.max(0.8, +(s - 0.1).toFixed(2)))}>A-</button>
            <div className="text-sm text-neutral-500">Double-click text to clear highlight</div>
          </div>
        </div>

        {/* Right column: definitions + key points */}
        <div className="col-span-4">
          {/* Term selector */}
          <div className="mb-3">
            <label className="text-sm font-medium text-neutral-700">Key Terms</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {keyTerms.length === 0 && <span className="text-neutral-400 text-sm">No terms detected.</span>}
              {keyTerms.map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTerm(t)}
                  className={`px-2 py-1 rounded-md border text-sm ${selectedTerm === t ? "border-sky-500 bg-sky-50 text-sky-700" : "border-neutral-300 hover:bg-neutral-50"}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Definition card */}
          <div className="rounded-xl border border-sky-300 bg-sky-50/40 p-3 mb-4">
            <div className="text-sm font-medium mb-1">Definition</div>
            {selectedTerm ? (
              <>
                <div className="mb-2"><span className="font-semibold">{selectedTerm}</span></div>
                <textarea
                  className="w-full rounded-md border border-neutral-300 p-2 text-sm min-h-[100px]"
                  value={defs[selectedTerm] || ""}
                  placeholder="Type or paste a definition here…"
                  onChange={(e) => saveDef(selectedTerm, e.target.value)}
                />
              </>
            ) : (
              <div className="text-sm text-neutral-500">Select a key term to see or edit its definition.</div>
            )}
          </div>

          {/* Key Points */}
          <div className="rounded-xl border border-neutral-300 bg-white p-3">
            <div className="text-sm font-semibold mb-2">Key Points</div>
            <ul className="list-disc ml-5 text-sm">
              {(summaryPoints.length === 0) && <li className="text-neutral-500">No content captured yet.</li>}
              {summaryPoints.map((p, i) => (<li key={i}>{p}</li>))}
            </ul>
          </div>
        </div>
      </div>

      {/* Footer nav */}
      <div className="mt-4 flex justify-between">
        <button onClick={() => { window.location.hash = "#/live"; }} className="rounded-md border px-3 py-2 text-sm">Back to Live</button>
        <button onClick={() => { window.location.hash = "#/"; }} className="rounded-md bg-sky-500 text-white px-4 py-2 text-sm">New Meeting</button>
      </div>
    </div>
  );
}

export default ReviewPage;
