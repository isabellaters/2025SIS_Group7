// import React, { useEffect, useMemo, useState } from 'react';
// import { lsGet, lsSet, UI_PREF_KEY } from '../utils/storage';
// import { hasWindow, isElectron } from '../utils/environment';

// interface NewMeetingPageProps {
//   onStart?: () => void;
//   onClose?: () => void; 
// }

// export function NewMeetingPage({ onStart, onClose }: NewMeetingPageProps) {
//   const [lectureTitle, setLectureTitle] = useState<string>("");
//   const [subjects, setSubjects] = useState<string[]>(["No Subject", "COMP123 – Algorithms", "FEIT Orientation", "ENG Entrepreneurship"]);
//   const [subject, setSubject] = useState<string>("No Subject");
//   const [isDocked, setIsDocked] = useState<boolean>(true);
//   const [justSaved, setJustSaved] = useState<boolean>(false);



//   // load (client-only)
//   useEffect(() => {
//     // UI preference takes precedence
//     const ui = lsGet(UI_PREF_KEY);
//     if (ui) {
//       try { setIsDocked(!!JSON.parse(ui).docked); } catch {}
//     }
//     const saved = lsGet("ll:newMeeting");
//     if (saved) {
//       try {
//         const parsed = JSON.parse(saved) as any;
//         setLectureTitle(parsed.lectureTitle ?? "");
//         setSubjects(parsed.subjects ?? subjects);
//         setSubject(parsed.subject ?? "No Subject");
//         if (!ui) setIsDocked(parsed.isDocked ?? true);
//       } catch {}
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   // persist dock preference cross-screens
//   useEffect(() => {
//     lsSet(UI_PREF_KEY, JSON.stringify({ docked: isDocked }));
//   }, [isDocked]);

//   // save (debounced, client-only)
//   const saveState = useMemo(() => {
//     let t: any;
//     return () => {
//       clearTimeout(t);
//       t = setTimeout(() => {
//         lsSet("ll:newMeeting", JSON.stringify({ lectureTitle, subjects, subject, isDocked }));
//         setJustSaved(true);
//         setTimeout(() => setJustSaved(false), 800);
//       }, 250);
//     };
//   }, [lectureTitle, subjects, subject, isDocked]);

//   useEffect(() => { saveState(); }, [lectureTitle, subjects, subject, isDocked, saveState]);

//   function addNewSubject(): void {
//     if (!hasWindow) return;
//     const name = window.prompt("New subject/course name");
//     if (!name) return;
//     setSubjects((prev) => (prev.includes(name) ? prev : [...prev, name]));
//     setSubject(name);
//   }

//   const containerClasses = isElectron
//     ? "w-full h-full rounded-2xl shadow-2xl border border-neutral-200 bg-white/95 backdrop-blur p-4"
//     : isDocked
//       ? "fixed left-1/2 -translate-x-1/2 bottom-3 z-50 w-[min(1100px,90vw)] rounded-2xl shadow-2xl border border-neutral-200 bg-white/95 backdrop-blur p-4"
//       : "mx-auto my-10 max-w-4xl rounded-2xl shadow-2xl border border-neutral-200 bg-white p-6";

//   return (
//     <div
//     style={{
//       background: "#fff",
//       borderRadius: 16,
//       padding: 32,
//       minWidth: 500,
//       maxWidth: "90vw",
//       boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
//       position: "relative",
//     }}
//   >
//     {/* Close button (X) */}
//     <button
//       onClick={onClose}
//       style={{
//         position: "absolute",
//         top: 16,
//         right: 16,
//         background: "transparent",
//         border: "none",
//         fontSize: 24,
//         color: "#999",
//         cursor: "pointer",
//         width: 32,
//         height: 32,
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "center",
//         borderRadius: 6,
//       }}
//       onMouseOver={e => {
//         e.currentTarget.style.background = "#f0f0f0";
//         e.currentTarget.style.color = "#333";
//       }}
//       onMouseOut={e => {
//         e.currentTarget.style.background = "transparent";
//         e.currentTarget.style.color = "#999";
//       }}
//       title="Close"
//     >
//       ×
//     </button>

//     {/* Header */}
//     <div style={{ marginBottom: 24 }}>
//       <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 8 }}>
//         New Meeting
//       </h2>
//       <div style={{ fontSize: "0.85rem", color: "#999" }}>
//         {justSaved ? (
//           <span style={{ color: "#10b981" }}>✓ Saved</span>
//         ) : (
//           <span>Auto-saving...</span>
//         )}
//       </div>
//     </div>

//     {/* Form */}
//     <div style={{ marginBottom: 20 }}>
//       <label style={{ display: "block", marginBottom: 8, fontWeight: 500, fontSize: "0.95rem" }}>
//         Lecture Title (Optional)
//       </label>
//       <input
//         value={lectureTitle}
//         onChange={e => setLectureTitle(e.target.value)}
//         placeholder="Enter lecture title"
//         style={{
//           width: "100%",
//           padding: "10px 12px",
//           border: "1px solid #ddd",
//           borderRadius: 8,
//           fontSize: "0.95rem",
//           outline: "none",
//         }}
//         onFocus={e => (e.currentTarget.style.borderColor = "#2563eb")}
//         onBlur={e => (e.currentTarget.style.borderColor = "#ddd")}
//       />
//     </div>

//     <div style={{ marginBottom: 24 }}>
//       <label style={{ display: "block", marginBottom: 8, fontWeight: 500, fontSize: "0.95rem" }}>
//         Subject/Course (Optional)
//         <button
//           type="button"
//           onClick={addNewSubject}
//           style={{
//             marginLeft: 8,
//             padding: "4px 10px",
//             fontSize: "0.8rem",
//             background: "#e0f2fe",
//             color: "#0369a1",
//             border: "1px solid #0369a1",
//             borderRadius: 6,
//             cursor: "pointer",
//           }}
//         >
//           + New
//         </button>
//       </label>
//       <select
//         value={subject}
//         onChange={e => setSubject(e.target.value)}
//         style={{
//           width: "100%",
//           padding: "10px 12px",
//           border: "1px solid #ddd",
//           borderRadius: 8,
//           fontSize: "0.95rem",
//           background: "#f9f9f9",
//           cursor: "pointer",
//           outline: "none",
//         }}
//       >
//         {subjects.map(s => (
//           <option key={s} value={s}>
//             {s}
//           </option>
//         ))}
//       </select>
//     </div>

//     {/* Actions */}
//     <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
//       <button
//         onClick={onClose}
//         style={{
//           padding: "10px 20px",
//           background: "#f5f5f5",
//           border: "1px solid #ddd",
//           borderRadius: 8,
//           fontSize: "0.95rem",
//           fontWeight: 500,
//           cursor: "pointer",
//           transition: "all 0.15s",
//         }}
//         onMouseOver={e => (e.currentTarget.style.background = "#e5e5e5")}
//         onMouseOut={e => (e.currentTarget.style.background = "#f5f5f5")}
//       >
//         Cancel
//       </button>
//       <button
//         onClick={() => {
//           lsSet("ll:newMeeting", JSON.stringify({ lectureTitle, subjects, subject, isDocked }));
//           if (typeof onStart === "function") {
//             onStart();
//             return;
//           }
//           if (hasWindow) {
//             window.location.hash = "live";
//           }
//         }}
//         style={{
//           padding: "10px 24px",
//           background: "#2563eb",
//           color: "#fff",
//           border: "none",
//           borderRadius: 8,
//           fontSize: "0.95rem",
//           fontWeight: 600,
//           cursor: "pointer",
//           transition: "all 0.15s",
//         }}
//         onMouseOver={e => (e.currentTarget.style.background = "#1d4ed8")}
//         onMouseOut={e => (e.currentTarget.style.background = "#2563eb")}
//       >
//         Start Meeting
//       </button>
//     </div>
//   </div>

//   );
// }

/**
 <button
  onClick={() => {
    lsSet("ll:newMeeting", JSON.stringify({ lectureTitle, subjects, subject, isDocked }));
    if (typeof onStart === "function") onStart();
    if (hasWindow) window.location.hash = "live"; // <-- this updates hash!
  }}
  className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
>
  Start
</button>

 */

import React, { useEffect, useMemo, useState } from 'react';
import { lsGet, lsSet, UI_PREF_KEY } from '../utils/storage';
import { hasWindow, isElectron } from '../utils/environment';

interface NewMeetingPageProps {
  onStart?: () => void;
  onClose?: () => void; 
}

export function NewMeetingPage({ onStart, onClose }: NewMeetingPageProps) {
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

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        padding: 32,
        minWidth: 500,
        maxWidth: "90vw",
        boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        position: "relative",
        maxHeight: "90vh",
        overflowY: "auto",
      }}
    >
      {/* Close button (X) */}
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          background: "transparent",
          border: "none",
          fontSize: 24,
          color: "#999",
          cursor: "pointer",
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 6,
        }}
        onMouseOver={e => {
          e.currentTarget.style.background = "#f0f0f0";
          e.currentTarget.style.color = "#333";
        }}
        onMouseOut={e => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "#999";
        }}
        title="Close"
      >
        ×
      </button>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 8 }}>
          New Meeting
        </h2>
        <div style={{ fontSize: "0.85rem", color: "#999" }}>
          {justSaved ? (
            <span style={{ color: "#10b981" }}>✓ Saved</span>
          ) : (
            <span>Auto-saving...</span>
          )}
        </div>
      </div>

      {/* Form */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", marginBottom: 8, fontWeight: 500, fontSize: "0.95rem" }}>
          Lecture Title (Optional)
        </label>
        <input
          value={lectureTitle}
          onChange={e => setLectureTitle(e.target.value)}
          placeholder="Enter lecture title"
          style={{
            width: "100%",
            padding: "10px 12px",
            border: "1px solid #ddd",
            borderRadius: 8,
            fontSize: "0.95rem",
            outline: "none",
          }}
          onFocus={e => (e.currentTarget.style.borderColor = "#2563eb")}
          onBlur={e => (e.currentTarget.style.borderColor = "#ddd")}
        />
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={{ display: "block", marginBottom: 8, fontWeight: 500, fontSize: "0.95rem" }}>
          Subject/Course (Optional)
          <button
            type="button"
            onClick={addNewSubject}
            style={{
              marginLeft: 8,
              padding: "4px 10px",
              fontSize: "0.8rem",
              background: "#e0f2fe",
              color: "#0369a1",
              border: "1px solid #0369a1",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            + New
          </button>
        </label>
        <select
          value={subject}
          onChange={e => setSubject(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            border: "1px solid #ddd",
            borderRadius: 8,
            fontSize: "0.95rem",
            background: "#f9f9f9",
            cursor: "pointer",
            outline: "none",
          }}
        >
          {subjects.map(s => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
        <button
          onClick={onClose}
          style={{
            padding: "10px 20px",
            background: "#f5f5f5",
            border: "1px solid #ddd",
            borderRadius: 8,
            fontSize: "0.95rem",
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseOver={e => (e.currentTarget.style.background = "#e5e5e5")}
          onMouseOut={e => (e.currentTarget.style.background = "#f5f5f5")}
        >
          Cancel
        </button>
        <button
          onClick={() => {
            lsSet("ll:newMeeting", JSON.stringify({ lectureTitle, subjects, subject, isDocked }));
            if (typeof onStart === "function") {
              onStart();
              return;
            }
            if (hasWindow) {
              window.location.hash = "live";
            }
          }}
          style={{
            padding: "10px 24px",
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: "0.95rem",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseOver={e => (e.currentTarget.style.background = "#1d4ed8")}
          onMouseOut={e => (e.currentTarget.style.background = "#2563eb")}
        >
          Start Meeting
        </button>
      </div>
    </div>
  );
}