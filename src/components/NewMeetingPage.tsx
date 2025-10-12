import React, { useEffect, useMemo, useState } from 'react';
import { lsGet, lsSet, UI_PREF_KEY } from '../utils/storage';
import { hasWindow, isElectron } from '../utils/environment';

interface NewMeetingPageProps {
  onStart?: () => void;
}

export function NewMeetingPage({ onStart }: NewMeetingPageProps) {
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
      <div className="mt-4 flex justify-end gap-2">
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
  );
}
