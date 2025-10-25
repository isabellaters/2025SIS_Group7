import React, { useEffect, useState} from 'react';
import { useAudioCapture } from '../hooks/useAudioCapture';
import { AudioLevelIndicator } from './AudioLevelIndicator';
import { TranscriptDisplay } from './TranscriptDisplay';
import { TransportControls } from './TransportControls';
import { LanguageSelector } from './LanguageSelector';
import { ExportButton } from './ExportButton';
import { lsGet, lsSet, UI_PREF_KEY } from '../utils/storage';
import { isElectron } from '../utils/environment';
import type { TranscriptController } from '../types';

interface LiveSessionPageProps {
  controller?: TranscriptController;
}

const SAMPLE_TRANSCRIPT = [
  "Welcome to Introduction to Computer Science. Today we'll be discussing fundamental programming concepts and data structures.",
  "Let's start with Variables. A variable is a named storage location in memory that holds a value. In most programming languages, you need to declare a variable before using it.",
  "Next, we have Data Structures. These are specialized formats for organizing, processing, and storing data. Common examples include arrays, linked lists, stacks, and queues.",
  "An Algorithm is a step-by-step procedure for solving a problem or accomplishing a task. Good algorithms are efficient and solve problems correctly.",
  "Object-Oriented Programming, or OOP, is a programming paradigm based on the concept of objects, which contain data in the form of fields and code in the form of methods.",
  "Recursion is a programming technique where a function calls itself to solve a problem by breaking it down into smaller, similar sub-problems.",
  "Time Complexity measures how the runtime of an algorithm grows as the input size increases. We use Big O Notation to express this mathematically.",
  "Space Complexity refers to the amount of memory an algorithm uses relative to the input size. It's important to balance time and space efficiency.",
  "A Hash Table is a data structure that implements an associative array, mapping keys to values for highly efficient lookup operations.",
  "Binary Search is an efficient algorithm for finding an item in a sorted list by repeatedly dividing the search interval in half.",
  "The Stack is a Last-In-First-Out (LIFO) data structure where elements are added and removed from the same end, called the top.",
  "Conversely, a Queue is a First-In-First-Out (FIFO) data structure where elements are added at one end and removed from the other.",
  "In conclusion, understanding these fundamental concepts is crucial for becoming a proficient programmer. Practice implementing these data structures and algorithms to solidify your understanding."
];

export function LiveSessionPage() {
  const [isDocked, setIsDocked] = React.useState<boolean>(true);
  const [activeTab, setActiveTab] = React.useState<"Transcription" | "Translation">("Transcription");
  const [title, setTitle] = React.useState<string>("Untitled Session");
  const [displayTranscript, setDisplayTranscript] = React.useState<string[]>(SAMPLE_TRANSCRIPT);
  const [fontScale, setFontScale] = useState<number>(1);
  

  // Use audio capture hook for all audio/transcription functionality
  const {
    isCapturing,
    audioLevel,
    transcriptLines,
    interimTranscript,
    translationLines,
    interimTranslation,
    targetLanguage,
    translationEnabled,
    changeTargetLanguage,
    toggleTranslation,
    startCapture,
    stopCapture,
  } = useAudioCapture();

  // Update display transcript when real transcription starts
  React.useEffect(() => {
    if (transcriptLines.length > 0) {
      if (!cameFromReview.current) {
        // Fresh session: just use the hook's transcriptLines
        setDisplayTranscript(transcriptLines);
      } else {
        // Came from review: append NEW lines to the restored transcript
        setDisplayTranscript((prev) => {
          // Get the restored transcript (first N lines)
          const restoredLines = prev.slice(0, restoredLineCount.current);
          // Append the new transcription from the hook
          const newLines = [...restoredLines, ...transcriptLines];
          console.log(`Appending transcription: ${restoredLines.length} restored + ${transcriptLines.length} new = ${newLines.length} total`);
          return newLines;
        });
      }
    }
  }, [transcriptLines]);

  // Clear sample transcript when recording starts (but only if it's the sample data)
  const hasStartedRecordingOnce = React.useRef(false);

  React.useEffect(() => {
    if (isCapturing && !hasStartedRecordingOnce.current) {
      // First time starting capture in this session
      hasStartedRecordingOnce.current = true;

      // Only clear if we're showing the default sample data
      const isSampleData = displayTranscript.length === SAMPLE_TRANSCRIPT.length &&
                          displayTranscript.every((line, idx) => line === SAMPLE_TRANSCRIPT[idx]);

      // Only clear if it's sample data
      if (isSampleData) {
        setDisplayTranscript([]);
      }
    }
  }, [isCapturing, displayTranscript]);

  // Track if we came from review page (to distinguish from fresh page load)
  const cameFromReview = React.useRef(false);
  // Track the number of lines we had when we restored (to know what's new)
  const restoredLineCount = React.useRef(0);

  // pull title + dock saved by NewMeetingPage / UI prefs (client-only)
  // Also restore session data if coming back from review page
  useEffect(() => {
    const ui = lsGet(UI_PREF_KEY);
    if (ui) {
      try { setIsDocked(!!JSON.parse(ui).docked); } catch {}
    }
    const saved = lsGet("ll:newMeeting");
    if (saved) {
      try { setTitle((JSON.parse(saved) as any).lectureTitle || "Untitled Session"); } catch {}
    }

    // Check if there's saved session data from a previous session
    const sessionData = lsGet("ll:session");

    if (sessionData) {
      try {
        const session = JSON.parse(sessionData);
        // Restore transcript if it exists and is not empty
        if (session.transcriptLines && session.transcriptLines.length > 0) {
          console.log("Restoring previous session transcript:", session.transcriptLines.length, "lines");
          setDisplayTranscript(session.transcriptLines);
          cameFromReview.current = true; // Mark that we restored data
          restoredLineCount.current = session.transcriptLines.length; // Remember how many lines we restored
        }
        // Restore title if it exists
        if (session.title) {
          setTitle(session.title);
        }
      } catch (error) {
        console.error("Error restoring session data:", error);
      }
    }
  }, []);

  // persist dock preference cross-screens
  useEffect(() => {
    lsSet(UI_PREF_KEY, JSON.stringify({ docked: isDocked }));
  }, [isDocked]);

  // Start/stop using the hook’s capture functions (no local isCapturing state)
  const handleToggle = async (): Promise<void> => {
    if (isCapturing) {
      await stopCapture();
    } else {
      await startCapture();
    }
  };

  // End Session: stop if needed, save session data, then go to Review via hash
  const handleEndSession = async () => {
    if (isCapturing) {
      await stopCapture();
    }

    // Save session data to localStorage for ReviewPage
    // Use displayTranscript which contains either sample data or real captured data
    const sessionData = {
      title: title,
      transcriptLines: displayTranscript.length > 0 ? displayTranscript : transcriptLines,
      translationLines: translationLines,
      updatedAt: new Date().toISOString()
    };

    try {
      localStorage.setItem('ll:session', JSON.stringify(sessionData));
      console.log("Session data saved:", sessionData);
    } catch (error) {
      console.error("Error saving session data:", error);
    }

    console.log("Session ended — redirecting to Review Page");
    window.location.hash = '#/review';
  };

  const containerClasses = isElectron
    ? "w-full h-full rounded-2xl shadow-2xl border border-neutral-200 bg-brand-50/95 backdrop-blur p-4"
    : "mx-auto my-10 max-w-4xl rounded-2xl shadow-2xl border border-neutral-200 bg-brand-50 p-6";

  const translationText = translationLines.join("\n") +
    (interimTranslation ? `\n[${interimTranslation}]` : '');
  const displayText = translationText.trim() || "Translation stream…";

  const tabs = ["Transcription", "Translation"] as const;

  return (
    <div
      id="ll-container"
      data-page="live"
      className="min-h-screen h-screen overflow-auto bg-transparent mx-auto my-4 max-w-6xl px-3 py-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1 text-sm font-medium text-neutral-700 truncate px-2" title={title}>
          <h1 className="heading-brand" style={{ fontWeight: 700, fontSize: '2.3rem', marginBottom: 8 }}>
            {title || "Live Session"}
          </h1>
         </div>
        <div className="flex items-center gap-2">
          <LanguageSelector
            targetLanguage={targetLanguage}
            onLanguageChange={changeTargetLanguage}
            translationEnabled={translationEnabled}
            onToggleTranslation={toggleTranslation}
            disabled={isCapturing}
          />
          <ExportButton
            transcriptLines={displayTranscript}
            translationLines={translationLines}
            title={title}
          />
          <AudioLevelIndicator audioLevel={audioLevel} isCapturing={isCapturing} />
          <button
            onClick={() => setIsDocked((v) => !v)}
            className="rounded-md border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-50"
            title={isDocked ? "Undock to full window" : "Dock to bottom"}
          >
            {isDocked ? "Undock" : "Dock"}
          </button>
        </div>
      </div>

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
      <div className="mt-3">
        {activeTab === "Transcription" ? (
          <TranscriptDisplay
            transcriptLines={displayTranscript}
            interimTranscript={interimTranscript}
            cursor={displayTranscript.length}
            isDocked={isDocked}
            fontScale={fontScale}
          />
        ) : (
          <div
            className={(isDocked ? "h-32" : "h-64") + " w-full overflow-auto rounded-lg border border-neutral-200 bg-white p-3 leading-relaxed text-neutral-800 whitespace-pre-wrap"}
            style={{ fontSize: `${14 * fontScale}px` }}
          >
            {displayText}
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center gap-3">
          <button className="rounded border px-2 py-1 text-sm" onClick={() => setFontScale((s) => Math.min(1.4, +(s + 0.1).toFixed(2)))}>A+</button>
          <button className="rounded border px-2 py-1 text-sm" onClick={() => setFontScale((s) => Math.max(0.8, +(s - 0.1).toFixed(2)))}>A-</button>
      </div>

      {/* Transport controls */}
      <div className="mt-3">
        <TransportControls
          isCapturing={isCapturing}
          onToggle={handleToggle}
          onEndSession={handleEndSession}
        />
      </div>
    </div>
  );
}
