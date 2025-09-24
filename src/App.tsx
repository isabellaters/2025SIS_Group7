import React, { useEffect, useMemo, useState } from "react";
import SpeechToTextInterface from "./components/SpeechToTextInterface";
import ConsoleSpeechTest from "./components/ConsoleSpeechTest";

/**
 * LiveLecture – New Meeting + Live Session (Electron-friendly, hash routing)
 * TypeScript-safe (noImplicitAny) version
 */

// ---------------- Types ----------------
export type UpdateKind = "transcript" | "translation";
export interface TextUpdate { kind: UpdateKind; text: string }
export interface TranscriptController {
  start: () => Promise<void> | void;
  pause: () => Promise<void> | void;
  stop: () => Promise<void> | void;
  // Kept for compatibility (not used for text-only seek)
  seekBy: (deltaSeconds: number) => Promise<void> | void;
  onUpdate?: (cb: (update: TextUpdate) => void) => () => void;
}
export type TestResult = { name: string; ok: boolean; error?: string };

// ---------------- Environment-safe utilities ----------------
const hasWindow: boolean = typeof window !== "undefined";
const isElectron: boolean = hasWindow && /electron/i.test(navigator.userAgent || "");
const UI_PREF_KEY = "ll:ui"; // { docked: boolean }

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
    // UI preference takes precedence
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

  // save (debounced, client-only)
  const saveState = useMemo(() => {
    let t: any;
    return () => {
      clearTimeout(t);
      t = setTimeout(() => {
        lsSet("ll:newMeeting", JSON.stringify({ lectureTitle, subjects, subject, isDocked }));
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 800);
      }, 250);
    };
  }, [lectureTitle, subjects, subject, isDocked]);

  useEffect(() => { saveState(); }, [lectureTitle, subjects, subject, isDocked, saveState]);

  function addNewSubject(): void {
    if (!hasWindow) return;
    const name = window.prompt("New subject/course name");
    if (!name) return;
    setSubjects((prev) => (prev.includes(name) ? prev : [...prev, name]));
    setSubject(name);
  }

  const containerClasses = isElectron
    ? "w-full h-full rounded-2xl shadow-2xl border border-neutral-200 bg-white/95 backdrop-blur p-4"
    : isDocked
      ? "fixed left-1/2 -translate-x-1/2 bottom-3 z-50 w-[min(1100px,90vw)] rounded-2xl shadow-2xl border border-neutral-200 bg-white/95 backdrop-blur p-4"
      : "mx-auto my-10 max-w-4xl rounded-2xl shadow-2xl border border-neutral-200 bg-white p-6";

  return (
    <div className={containerClasses}>
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
      <div className="mt-4 flex justify-between">
            <button
              onClick={() => {
                if (hasWindow) { window.location.hash = "#/speech"; }
              }}
              className="rounded-md border border-neutral-300 px-3 py-2 text-xs hover:bg-neutral-50"
            >
              🎤 Speech-to-Text Demo
            </button>
            <button
              onClick={() => {
                if (hasWindow) { window.location.hash = "#/console-test"; }
              }}
              className="rounded-md border border-neutral-300 px-3 py-2 text-xs hover:bg-neutral-50"
            >
              🧪 Console Test
            </button>
        <div className="flex gap-2">
          <button
            onClick={() => setIsDocked((v) => !v)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-xs hover:bg-neutral-50"
          >
            {isDocked ? "Undock" : "Dock"}
          </button>
          <button
            onClick={() => {
              lsSet("ll:newMeeting", JSON.stringify({ lectureTitle, subjects, subject, isDocked }));
              if (typeof onStart === "function") { onStart(); return; }
              if (hasWindow) { window.location.hash = "#/live"; }
            }}
            className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
          >
            Start
          </button>
        </div>
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
  const [showSpeechControls, setShowSpeechControls] = useState<boolean>(false);

  // Maintain 1:1 arrays and a TEXT cursor for seek-only behavior
  const [transcriptLines, setTranscriptLines] = useState<string[]>([]);
  const [translationLines, setTranslationLines] = useState<string[]>([]);
  const [cursor, setCursor] = useState<number>(0); // number of lines visible (applies to both tabs)

  // pull title + dock saved by NewMeetingPage / UI prefs (client-only)
  useEffect(() => {
    const ui = lsGet(UI_PREF_KEY);
    if (ui) {
      try { setIsDocked(!!JSON.parse(ui).docked); } catch {}
    }
    const saved = lsGet("ll:newMeeting");
    if (saved) {
      try { setTitle((JSON.parse(saved) as any).lectureTitle || "Untitled Session"); } catch {}
    }
  }, []);

  // persist dock preference cross-screens
  useEffect(() => {
    lsSet(UI_PREF_KEY, JSON.stringify({ docked: isDocked }));
  }, [isDocked]);

  // subscribe to backend text updates, if provided (client-only)
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

  // subscribe to speech-to-text updates
  useEffect(() => {
    if (!hasWindow) return;
    const handleSpeechTranscription = (event: CustomEvent) => {
      const { text } = event.detail;
      setTranscriptLines((prevT) => {
        const nextT = [...prevT, text];
        setTranslationLines((prevR) => padToSameLength(nextT, prevR)[1]);
        return nextT;
      });
    };
    
    window.addEventListener('speechTranscription', handleSpeechTranscription as EventListener);
    return () => window.removeEventListener('speechTranscription', handleSpeechTranscription as EventListener);
  }, []);

  // Auto-advance cursor to end when playing and new lines arrive
  const totalLines = Math.max(transcriptLines.length, translationLines.length);
  useEffect(() => {
    if (isPlaying) setCursor(totalLines);
  }, [totalLines, isPlaying]);

  // keyboard shortcuts (client-only)
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

  // control handlers (call through to controller if provided)
  const handlePlay = async (): Promise<void> => { setIsPlaying(true); setCursor(totalLines); await controller?.start?.(); };
  const handlePause = async (): Promise<void> => { setIsPlaying(false); await controller?.pause?.(); };
  const handleStop = async (): Promise<void> => { setIsPlaying(false); await controller?.stop?.(); /* keep text visible */ };
  // TEXT-ONLY seek: move the cursor; do NOT touch audio/controller
  const handleSeek = (delta: number): void => { setCursor((c) => clamp(c + delta, 0, totalLines)); };
  const togglePlay = (): void => { void (isPlaying ? handlePause() : handlePlay()); };

  const containerClasses = isElectron
    ? "w-full h-full rounded-2xl shadow-2xl border border-neutral-200 bg-white/95 backdrop-blur p-4"
    : isDocked
      ? "fixed left-1/2 -translate-x-1/2 bottom-3 z-50 w-[min(1100px,90vw)] rounded-2xl shadow-2xl border border-neutral-200 bg-white/95 backdrop-blur p-4"
      : "mx-auto my-10 max-w-4xl rounded-2xl shadow-2xl border border-neutral-200 bg-white p-6";

  const transcriptText = transcriptLines.slice(0, Math.min(cursor, transcriptLines.length)).join("\n") || "Transcription stream…";
  const translationText = translationLines.slice(0, Math.min(cursor, translationLines.length)).join("\n") || "Translation stream…";

  const tabs = ["Transcription", "Translation"] as const;

  return (
    <div className={containerClasses}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 cursor-default">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowSpeechControls((v) => !v)}
            className="rounded-md border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-50"
            title="Toggle Speech-to-Text Controls"
          >
            🎤 {showSpeechControls ? "Hide" : "Show"} Audio
          </button>
        </div>
        <div className="flex-1 text-center text-sm font-medium text-neutral-700 truncate px-2" title={title}>
          {title}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDocked((v) => !v)}
            className="rounded-md border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-50"
            title={isDocked ? "Undock to full window" : "Dock to bottom"}
          >
            {isDocked ? "Undock" : "Dock"}
          </button>
        </div>
      </div>

      {/* Speech-to-Text Controls */}
      {showSpeechControls && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <SpeechToTextInterface />
        </div>
      )}

      {/* Tabs */}
      <div className="mt-3 flex items-center gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={
              "rounded-full px-3 py-1 text-sm border transition " +
              (activeTab === t
                ? "border-sky-500 bg-sky-50 text-sky-700"
                : "border-neutral-300 text-neutral-600 hover:bg-neutral-50")
            }
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className={(isDocked ? "h-32" : "h-64") + " mt-3 w-full overflow-auto rounded-lg border border-neutral-200 bg-white p-3 text-sm leading-relaxed text-neutral-800 whitespace-pre-wrap"}>
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
        </div>
      </div>
    </div>
  );
}

// ---------------- Speech-to-Text Page ----------------
export function SpeechToTextPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Speech-to-Text Demo</h1>
      <SpeechToTextInterface />
    </div>
  );
}

// ---------------- Console Test Page ----------------
export function ConsoleTestPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Console Speech-to-Text Test</h1>
      <ConsoleSpeechTest />
    </div>
  );
}

// ---------------- Default export for preview/build (hash router) ----------------
export default function App() {
  const [route, navigate] = useHashRouter();
  if (route === "/live") return <LiveSessionPage />;
  if (route === "/speech") return <SpeechToTextPage />;
  if (route === "/console-test") return <ConsoleTestPage />;
  return <NewMeetingPage onStart={() => navigate("/live")} />;
}

// ---------------- Inline tests (exported, not auto-run) ----------------
export function __runLiveLectureInlineTests(): { passed: number; total: number; results: TestResult[] } {
  const results: TestResult[] = [];
  const test = (name: string, fn: () => void) => {
    try { fn(); results.push({ name, ok: true }); }
    catch (e: unknown) { results.push({ name, ok: false, error: String((e as any)?.message ?? e) }); }
  };

  // Existing tests (unchanged)
  test("appendLine adds newline when prev exists", () => {
    const out = appendLine("a", "b");
    if (out !== "a\nb") throw new Error(out);
  });
  test("appendLine returns next when prev empty", () => {
    const out = appendLine("", "b");
    if (out !== "b") throw new Error(out);
  });
  test("appendLine is associative for simple strings", () => {
    const out1 = appendLine(appendLine("a", "b"), "c"); // a\nb\nc
    const out2 = appendLine("a", appendLine("b", "c")); // a\nb\nc
    if (out1 !== out2) throw new Error(`${out1} !== ${out2}`);
  });

  // Extra tests
  test("appendLine handles unicode", () => {
    const out = appendLine("α", "β");
    if (out !== "α\nβ") throw new Error(out);
  });
  test("appendLine with empty next returns prev unchanged", () => {
    const out = appendLine("hello", "");
    if (out !== "hello\n") throw new Error(out);
  });
  test("appendLine with both empty returns empty", () => {
    const out = appendLine("", "");
    if (out !== "") throw new Error(out);
  });
  // Helper tests
  test("clamp limits to range", () => {
    if (clamp(10, 0, 5) !== 5) throw new Error("clamp high failed");
    if (clamp(-2, 0, 5) !== 0) throw new Error("clamp low failed");
    if (clamp(3, 0, 5) !== 3) throw new Error("clamp mid failed");
  });
  test("padToSameLength aligns arrays with blanks", () => {
    const [a, b] = padToSameLength(["x"], ["y","z"]);
    if (a.length !== 2 || b.length !== 2) throw new Error("length mismatch");
    if (a[1] !== "" || b[0] !== "y" || b[1] !== "z") throw new Error("content mismatch");
  });
  test("parseHashRoute basics", () => {
    if (parseHashRoute("") !== "/") throw new Error("empty -> /");
    if (parseHashRoute("#") !== "/") throw new Error("# -> /");
    if (parseHashRoute("#/live") !== "/live") throw new Error("#/live -> /live");
    if (parseHashRoute("#live") !== "/live") throw new Error("#live -> /live");
    if (parseHashRoute("/live") !== "/live") throw new Error("/live -> /live");
  });

  const passed = results.filter(r => r.ok).length;
  return { passed, total: results.length, results };
}
