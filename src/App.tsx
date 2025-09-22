import React, { useEffect, useMemo, useState } from "react";

/**
 * LiveLecture – New Meeting + Live Session + Review (Electron-friendly)
 * - Hash routing: #/, #/live, #/review
 * - Dock/Undock persists across screens
 * - End button navigates to Review page with full transcript, key term highlight,
 *   definition panel, and simple key points summary.
 */

// ---------------- Types ----------------
export type UpdateKind = "transcript" | "translation";
export interface TextUpdate { kind: UpdateKind; text: string }
export interface TranscriptController {
  start: () => Promise<void> | void;
  pause: () => Promise<void> | void;
  stop: () => Promise<void> | void;
  seekBy: (deltaSeconds: number) => Promise<void> | void;
  onUpdate?: (cb: (update: TextUpdate) => void) => () => void;
}
export type TestResult = { name: string; ok: boolean; error?: string };

// ---------------- Environment-safe utilities ----------------
const hasWindow: boolean = typeof window !== "undefined";
const isElectron: boolean = hasWindow && /electron/i.test(navigator.userAgent || "");
const UI_PREF_KEY = "ll:ui"; // { docked: boolean }
const SESSION_KEY = "ll:session"; // { title, transcriptLines, translationLines, updatedAt }
const DEFS_KEY = "ll:defs"; // { [term: string]: definition }

function lsGet(key: string): string | null {
  if (!hasWindow) return null;
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function lsSet(key: string, value: string): void {
  if (!hasWindow) return;
  try { window.localStorage.setItem(key, value); } catch {}
}

// ---------------- Small pure helpers ----------------
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
export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Key term extraction (simple heuristic: capitalized phrases + top frequent words >=2)
export function extractKeyTerms(text: string, maxTerms = 8): string[] {
  const terms: string[] = [];
  const set = new Set<string>();

  // Capitalized multi-word phrases
  const phraseRe = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g;
  let m: RegExpExecArray | null;
  while ((m = phraseRe.exec(text)) !== null) {
    const t = m[1].trim();
    if (!set.has(t)) { set.add(t); terms.push(t); }
  }

  // Word frequency (exclude stopwords)
  const STOP = new Set(["the","and","to","of","in","a","is","that","for","on","with","it","as","this","are","be","we","you","your","our","an","at","by","from","or","so","can"]);
  const counts: Record<string, number> = {};
  for (const w of text.toLowerCase().match(/[a-z][a-z\-]{3,}/g) || []) {
    if (STOP.has(w)) continue;
    counts[w] = (counts[w] || 0) + 1;
  }
  const topWords = Object.entries(counts).filter(([,c]) => c >= 2).sort((a,b) => b[1]-a[1]).map(([w]) => w);
  for (const w of topWords) {
    const t = w.replace(/\b\w/g, (l) => l.toUpperCase()); // Title Case for display
    if (!set.has(t)) { set.add(t); terms.push(t); }
  }

  return terms.slice(0, maxTerms);
}

// ---------------- Hash Router (Electron-friendly) ----------------
export function parseHashRoute(hash: string): string {
  let h = String(hash || "").trim();
  if (h.startsWith("#")) h = h.slice(1);
  if (h === "" || h === "/" || h === "#/") return "/";
  if (!h.startsWith("/")) h = "/" + h;
  return h;
}

function useHashRouter(): [string, (to: string) => void] {
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
    window.location.hash = target; // triggers hashchange -> route update
  };
  return [route, navigate];
}

// ---------------- New Meeting (setup only) ----------------
export function NewMeetingPage({ onStart }: { onStart?: () => void }) {
  const [lectureTitle, setLectureTitle] = useState<string>("");
  const [subjects, setSubjects] = useState<string[]>(["No Subject", "COMP123 – Algorithms", "FEIT Orientation", "ENG Entrepreneurship"]);
  const [subject, setSubject] = useState<string>("No Subject");
  const [isDocked, setIsDocked] = useState<boolean>(true);
  const [justSaved, setJustSaved] = useState<boolean>(false);

  // load (client-only)
  useEffect(() => {
    const ui = lsGet(UI_PREF_KEY);
    if (ui) {
      try { setIsDocked(!!JSON.parse(ui).docked); } catch {}
    }
    const saved = lsGet("ll:newMeeting");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as any;
        setLectureTitle(parsed.lectureTitle ?? "");
        setSubjects(parsed.subjects ?? subjects);
        setSubject(parsed.subject ?? "No Subject");
        if (!ui) setIsDocked(parsed.isDocked ?? true);
      } catch {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // persist dock preference cross-screens
  useEffect(() => {
    lsSet(UI_PREF_KEY, JSON.stringify({ docked: isDocked }));
  }, [isDocked]);

  // save (debounced)
  const saveState = useMemo(() => {
    let t: any; return () => { clearTimeout(t); t = setTimeout(() => {
      lsSet("ll:newMeeting", JSON.stringify({ lectureTitle, subjects, subject, isDocked }));
      setJustSaved(true); setTimeout(() => setJustSaved(false), 800);
    }, 250); };
  }, [lectureTitle, subjects, subject, isDocked]);
  useEffect(() => { saveState(); }, [lectureTitle, subjects, subject, isDocked, saveState]);

  function addNewSubject(): void {
    if (!hasWindow) return; const name = window.prompt("New subject/course name");
    if (!name) return; setSubjects((prev) => (prev.includes(name) ? prev : [...prev, name])); setSubject(name);
  }

  const containerClasses = isElectron
    ? "w-full rounded-2xl shadow-2xl border border-neutral-200 bg-white/95 backdrop-blur p-4"
    : isDocked
      ? "fixed left-1/2 -translate-x-1/2 bottom-3 z-50 w-[min(1100px,90vw)] rounded-2xl shadow-2xl border border-neutral-200 bg-white/95 backdrop-blur p-4"
      : "mx-auto my-10 max-w-4xl rounded-2xl shadow-2xl border border-neutral-200 bg-white p-6";

  return (
    <div id="ll-container" data-page="new" className={containerClasses + " flex flex-col"}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 cursor-default">
        <div className="flex items-center gap-1.5" />
        <div className="text-sm text-neutral-600 select-none">LiveLecture – New Meeting</div>
        <div className="flex items-center gap-2">
          {justSaved ? (
            <span className="text-xs text-emerald-600">Saved</span>
          ) : (
            <span className="text-xs text-neutral-400">Auto‑saving…</span>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="mt-3 grid grid-cols-1 gap-3">
        <label className="text-xs font-medium text-neutral-700">Lecture Title (Optional)</label>
        <input
          type="text"
          placeholder="Enter Lecture Title..."
          value={lectureTitle}
          onChange={(e) => setLectureTitle(e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
        <div className="mt-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-neutral-700">Subject/Course (Optional)</label>
            <button onClick={addNewSubject} className="ml-2 inline-flex items-center gap-1 rounded-md border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-50">+ New</button>
          </div>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-sky-400"
          >
            {subjects.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Start */}
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={() => setIsDocked((v) => !v)} className="rounded-md border border-neutral-300 px-3 py-2 text-xs hover:bg-neutral-50">{isDocked ? "Undock" : "Dock"}</button>
        <button
          onClick={() => {
            lsSet("ll:newMeeting", JSON.stringify({ lectureTitle, subjects, subject, isDocked }));
            if (typeof onStart === "function") { onStart(); return; }
            if (hasWindow) { window.location.hash = "#/live"; }
          }}
          className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
        >Start</button>
      </div>
    </div>
  );
}

// ---------------- Live Session ----------------
export function LiveSessionPage({ controller }: { controller?: TranscriptController }) {
  const [isDocked, setIsDocked] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"Transcription" | "Translation">("Transcription");
  const [title, setTitle] = useState<string>("Untitled Session");
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  // Maintain 1:1 arrays and a TEXT cursor for seek-only behavior
  const [transcriptLines, setTranscriptLines] = useState<string[]>([]);
  const [translationLines, setTranslationLines] = useState<string[]>([]);
  const [cursor, setCursor] = useState<number>(0);

  // load title + dock
  useEffect(() => {
    const ui = lsGet(UI_PREF_KEY);
    if (ui) { try { setIsDocked(!!JSON.parse(ui).docked); } catch {} }
    const saved = lsGet("ll:newMeeting");
    if (saved) { try { setTitle((JSON.parse(saved) as any).lectureTitle || "Untitled Session"); } catch {} }
  }, []);

  // persist dock
  useEffect(() => { lsSet(UI_PREF_KEY, JSON.stringify({ docked: isDocked })); }, [isDocked]);

  // subscribe to backend text updates
  useEffect(() => {
    if (!controller?.onUpdate) return;
    const off = controller.onUpdate((u: TextUpdate) => {
      if (u.kind === "transcript") {
        setTranscriptLines((prevT) => {
          const nextT = [...prevT, u.text];
          setTranslationLines((prevR) => padToSameLength(nextT, prevR)[1]);
          return nextT;
        });
      } else if (u.kind === "translation") {
        setTranslationLines((prevR) => {
          const nextR = [...prevR, u.text];
          setTranscriptLines((prevT) => padToSameLength(prevT, nextR)[0]);
          return nextR;
        });
      }
    });
    return () => { if (off) off(); };
  }, [controller]);

  // persist session to localStorage for Review page
  const totalLines = Math.max(transcriptLines.length, translationLines.length);
  useEffect(() => {
    const payload = { title, transcriptLines, translationLines, updatedAt: Date.now() };
    lsSet(SESSION_KEY, JSON.stringify(payload));
    if (isPlaying) setCursor(totalLines);
  }, [title, transcriptLines, translationLines, totalLines, isPlaying]);

  // keyboard shortcuts
  useEffect(() => {
    if (!hasWindow) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e?.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const keyStr = (e.key || e.code || "").toString().toLowerCase();
      if (keyStr === " " || keyStr === "space" || keyStr === "spacebar") { e.preventDefault(); togglePlay(); }
      if (keyStr === "k") { void handleStop(); }
      if (keyStr === "j") { handleSeek(-5); }
      if (keyStr === "l") { handleSeek(5); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isPlaying]);

  // control handlers
  const handlePlay = async (): Promise<void> => { setIsPlaying(true); setCursor(totalLines); await controller?.start?.(); };
  const handlePause = async (): Promise<void> => { setIsPlaying(false); await controller?.pause?.(); };
  const handleStop = async (): Promise<void> => { setIsPlaying(false); await controller?.stop?.(); };
  const handleEnd = async (): Promise<void> => { setIsPlaying(false); await controller?.stop?.(); if (hasWindow) window.location.hash = "#/review"; };
  const handleSeek = (delta: number): void => { setCursor((c) => clamp(c + delta, 0, totalLines)); };
  const togglePlay = (): void => { void (isPlaying ? handlePause() : handlePlay()); };

  const containerClasses = isElectron
    ? "w-full rounded-2xl shadow-2xl border border-neutral-200 bg-white/95 backdrop-blur p-4"
    : isDocked
      ? "fixed left-1/2 -translate-x-1/2 bottom-3 z-50 w-[min(1100px,90vw)] rounded-2xl shadow-2xl border border-neutral-200 bg-white/95 backdrop-blur p-4"
      : "mx-auto my-10 max-w-4xl rounded-2xl shadow-2xl border border-neutral-200 bg-white p-6";

  const transcriptText = transcriptLines.slice(0, Math.min(cursor, transcriptLines.length)).join("\n") || "Transcription stream…";
  const translationText = translationLines.slice(0, Math.min(cursor, translationLines.length)).join("\n") || "Translation stream…";

  const contentHeightClass = isElectron ? "h-[220px]" : (isDocked ? "h-32" : "h-64");
  const tabs = ["Transcription", "Translation"] as const;

  return (
    <div id="ll-container" data-page="live" className={containerClasses + " flex flex-col"}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 cursor-default">
        <div className="flex items-center gap-1.5" />
        <div className="flex-1 text-center text-sm font-medium text-neutral-700 truncate px-2" title={title}>{title}</div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsDocked((v) => !v)} className="rounded-md border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-50" title={isDocked ? "Undock to full window" : "Dock to bottom"}>{isDocked ? "Undock" : "Dock"}</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-3 flex items-center gap-2">
        {tabs.map((t) => (
          <button key={t} onClick={() => setActiveTab(t)} className={"rounded-full px-3 py-1 text-sm border transition " + (activeTab === t ? "border-sky-500 bg-sky-50 text-sky-700" : "border-neutral-300 text-neutral-600 hover:bg-neutral-50")}>{t}</button>
        ))}
      </div>

      {/* Content */}
      <div className={`${contentHeightClass} mt-3 w-full overflow-auto rounded-lg border border-neutral-200 bg-white p-3 text-sm leading-relaxed text-neutral-800 whitespace-pre-wrap`}>
        {activeTab === "Transcription" ? transcriptText : translationText}
      </div>

      {/* Transport controls */}
      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-neutral-500">Space = Play/Pause · J/L = ±5s · K = Stop</div>
        <div className="flex items-center gap-2">
          <button aria-label="Back 5 lines" title="Back 5 (J)" className="h-9 w-9 grid place-items-center rounded-md border border-neutral-300 hover:bg-neutral-50" onClick={() => handleSeek(-5)}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4"><path d="M11 19l-7-7 7-7v14zM20 19l-7-7 7-7v14z" fill="currentColor" /></svg>
          </button>
          <button aria-label={isPlaying ? "Pause" : "Play"} title={isPlaying ? "Pause (Space)" : "Play (Space)"} onClick={togglePlay} className="h-9 px-4 grid place-items-center rounded-md border border-neutral-300 hover:bg-neutral-50">
            {isPlaying ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4"><path d="M8 5v14l11-7-11-7z" fill="currentColor" /></svg>
            )}
          </button>
          <button aria-label="Stop" title="Stop (K)" className="h-9 w-9 grid place-items-center rounded-md border border-neutral-300 hover:bg-neutral-50" onClick={handleStop}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4"><rect x="6" y="6" width="12" height="12" fill="currentColor" /></svg>
          </button>
          <button aria-label="Forward 5 lines" title="Forward 5 (L)" className="h-9 w-9 grid place-items-center rounded-md border border-neutral-300 hover:bg-neutral-50" onClick={() => handleSeek(5)}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4"><path d="M13 19l7-7-7-7v14zM4 19l7-7-7-7v14z" fill="currentColor" /></svg>
          </button>
          {activeTab === "Transcription" && (
            <button onClick={() => { void handleEnd(); }} className="h-9 px-3 rounded-md border border-red-300 text-red-700 hover:bg-red-50" title="End session and go to Review">End</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------- Review Page ----------------
export function ReviewPage() {
  const [session, setSession] = useState<{ title: string; transcriptLines: string[]; translationLines: string[] } | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<string>("");
  const [defs, setDefs] = useState<Record<string,string>>({});
  const [fontScale, setFontScale] = useState<number>(1);

  useEffect(() => {
    const s = lsGet(SESSION_KEY); if (s) { try { setSession(JSON.parse(s)); } catch {} }
    const d = lsGet(DEFS_KEY); let parsed: Record<string,string> = {}; if (d) { try { parsed = JSON.parse(d); } catch {} }
    if (!parsed["Vibe Coding"]) {
      parsed["Vibe Coding"] = "A software development approach that uses natural language prompts to have an AI assistant generate, refine, and debug code, shifting the developer's role from manual coding to guiding the AI.";
    }
    setDefs(parsed);
  }, []);

  const fullText = (session?.transcriptLines || []).join("\n");
  const keyTerms = extractKeyTerms(fullText);
  const summaryPoints = (session?.transcriptLines || []).filter((l) => l.trim().length > 0).slice(0, 3);

  function saveDef(term: string, def: string) {
    const next = { ...defs, [term]: def }; setDefs(next); lsSet(DEFS_KEY, JSON.stringify(next));
  }

  function highlight(text: string, term: string): React.ReactNode {
    if (!term) return <>{text}</>;
    const re = new RegExp(`\\b${escapeRegExp(term)}\\b`, "gi");
    const parts = text.split(re);
    const matches = text.match(re) || [];
    const out: React.ReactNode[] = [];
    for (let i = 0; i < parts.length; i++) {
      out.push(parts[i]);
      if (i < parts.length - 1) out.push(<mark key={`m${i}`} className="bg-yellow-200 px-0.5 rounded-sm">{matches[i] || term}</mark>);
    }
    return <>{out}</>;
  }

  function timeOf(index: number, stepSec = 5): string {
    const s = index * stepSec; const m = Math.floor(s/60); const ss = (s%60).toString().padStart(2,"0");
    return `${m}:${ss}`;
  }

  return (
    <div className="mx-auto my-4 max-w-6xl px-3">
      <div className="grid grid-cols-12 gap-4">
        {/* Left column: transcript */}
        <div className="col-span-8">
          <h2 className="text-lg font-semibold mb-2">{session?.title || "Lecture Review"}</h2>
          <div className="rounded-xl border border-neutral-300 bg-white p-3 shadow-sm min-h-[300px] max-h-[70vh] overflow-auto">
            {(session?.transcriptLines || []).map((line, idx) => (
              <div key={idx} className="mb-3 text-[clamp(12px,calc(14px_*_var(--fs,1)),20px)] leading-relaxed" style={{ ['--fs' as any]: fontScale }}>
                <div className="text-neutral-400 text-xs mb-1">{timeOf(idx)}</div>
                <div className="cursor-text" onDoubleClick={() => setSelectedTerm("")}>{highlight(line, selectedTerm)}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-3">
            <button className="rounded border px-2 py-1 text-sm" onClick={() => setFontScale((s) => Math.min(1.4, +(s + 0.1).toFixed(2)))}>A+</button>
            <button className="rounded border px-2 py-1 text-sm" onClick={() => setFontScale((s) => Math.max(0.8, +(s - 0.1).toFixed(2)))}>A-</button>
            <div className="text-sm text-neutral-500">Double‑click text to clear highlight</div>
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
                <button key={t} onClick={() => setSelectedTerm(t)} className={`px-2 py-1 rounded-md border text-sm ${selectedTerm === t ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-neutral-300 hover:bg-neutral-50'}`}>{t}</button>
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
              {summaryPoints.length === 0 && <li className="text-neutral-500">No content captured yet.</li>}
              {summaryPoints.map((p, i) => (<li key={i}>{p}</li>))}
            </ul>
          </div>
        </div>
      </div>

      {/* Footer nav */}
      <div className="mt-4 flex justify-between">
        <button onClick={() => { if (hasWindow) window.location.hash = "#/live"; }} className="rounded-md border px-3 py-2 text-sm">Back to Live</button>
        <button onClick={() => { if (hasWindow) window.location.hash = "#/"; }} className="rounded-md bg-sky-500 text-white px-4 py-2 text-sm">New Meeting</button>
      </div>
    </div>
  );
}

// ---------------- Default export for preview/build (hash router) ----------------
export default function App() {
  // Ensure there is no browser default margin or forced 100% heights adding extra space
  useEffect(() => {
    if (typeof document !== "undefined") {
      const de = document.documentElement;
      const b = document.body;
      const root = document.getElementById("root");
      if (de) { de.style.margin = "0"; de.style.background = "transparent"; de.style.height = "auto"; }
      if (b)  { b.style.margin = "0";  b.style.background = "transparent";  b.style.height = "auto"; }
      if (root) (root as HTMLElement).style.height = "auto";
    }
  }, []);
  const [route, navigate] = useHashRouter();
  if (route === "/live") return <LiveSessionPage />;
  if (route === "/review") return <ReviewPage />;
  return <NewMeetingPage onStart={() => navigate("/live")} />;
}

// ---------------- Inline tests (exported, not auto-run) ----------------
export function __runLiveLectureInlineTests(): { passed: number; total: number; results: TestResult[] } {
  const results: TestResult[] = [];

  function test(name: string, fn: () => void): void {
    try { fn(); results.push({ name, ok: true }); }
    catch (e: unknown) { results.push({ name, ok: false, error: String((e as any)?.message ?? e) }); }
  }

  // Existing tests
  test("appendLine adds newline when prev exists", () => { const out = appendLine("a", "b"); if (out !== "a\nb") throw new Error(out); });
  test("appendLine returns next when prev empty", () => { const out = appendLine("", "b"); if (out !== "b") throw new Error(out); });
  test("appendLine is associative for simple strings", () => { const out1 = appendLine(appendLine("a", "b"), "c"); const out2 = appendLine("a", appendLine("b", "c")); if (out1 !== out2) throw new Error(`${out1} !== ${out2}`); });

  // Helper tests
  test("clamp limits to range", () => { if (clamp(10, 0, 5) !== 5) throw new Error("clamp high failed"); if (clamp(-2, 0, 5) !== 0) throw new Error("clamp low failed"); if (clamp(3, 0, 5) !== 3) throw new Error("clamp mid failed"); });
  test("padToSameLength aligns arrays with blanks", () => { const [a, b] = padToSameLength(["x"], ["y","z"]); if (a.length !== 2 || b.length !== 2) throw new Error("length mismatch"); if (a[1] !== "" || b[0] !== "y" || b[1] !== "z") throw new Error("content mismatch"); });
  test("parseHashRoute basics", () => { if (parseHashRoute("") !== "/") throw new Error("empty -> /"); if (parseHashRoute("#") !== "/") throw new Error("# -> /"); if (parseHashRoute("#/") !== "/") throw new Error("#/ -> /"); if (parseHashRoute("#/live") !== "/live") throw new Error("#/live -> /live"); if (parseHashRoute("#/review") !== "/review") throw new Error("#/review -> /review"); });

  // New: key term extraction
  test("extractKeyTerms finds capitalized phrases", () => {
    const terms = extractKeyTerms("We will continue with Vibe Coding this week. Vibe Coding helps.");
    if (!terms.some(t => /Vibe Coding/i.test(t))) throw new Error("missing 'Vibe Coding'");
  });

  const passed = results.reduce((acc, r) => acc + (r.ok ? 1 : 0), 0);
  return { passed, total: results.length, results };
}
