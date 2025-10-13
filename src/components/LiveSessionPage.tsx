import React, { useEffect } from 'react';
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

export function LiveSessionPage({ controller }: LiveSessionPageProps) {
  const [isDocked, setIsDocked] = React.useState<boolean>(true);
  const [activeTab, setActiveTab] = React.useState<"Transcription" | "Translation">("Transcription");
  const [title, setTitle] = React.useState<string>("Untitled Session");

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

  // Start/stop using the hook’s capture functions (no local isCapturing state)
  const handleToggle = async (): Promise<void> => {
    if (isCapturing) {
      await stopCapture();
    } else {
      await startCapture();
    }
  };

  // End Session: stop if needed, then go to Review via hash (consistent with your app)
  const handleEndSession = async () => {
    if (isCapturing) {
      await stopCapture();
    }
    console.log("Session ended — redirecting to Review Page");
    window.location.hash = '#/review';
  };

  const containerClasses = isElectron
    ? "w-full h-full rounded-2xl shadow-2xl border border-neutral-200 bg-white/95 backdrop-blur p-4"
    : isDocked
      ? "fixed left-1/2 -translate-x-1/2 bottom-3 z-50 w-[min(1100px,90vw)] rounded-2xl shadow-2xl border border-neutral-200 bg-white/95 backdrop-blur p-4"
      : "mx-auto my-10 max-w-4xl rounded-2xl shadow-2xl border border-neutral-200 bg-white p-6";

  const translationText = translationLines.join("\n") +
    (interimTranslation ? `\n[${interimTranslation}]` : '');
  const displayText = translationText.trim() || "Translation stream…";

  const tabs = ["Transcription", "Translation"] as const;

  return (
    <div className={containerClasses}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 cursor-default">
        <div className="flex-1 text-center text-sm font-medium text-neutral-700 truncate px-2" title={title}>
          {title}
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
            transcriptLines={transcriptLines}
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
            transcriptLines={transcriptLines}
            interimTranscript={interimTranscript}
            cursor={transcriptLines.length}
            isDocked={isDocked}
          />
        ) : (
          <div className={(isDocked ? "h-32" : "h-64") + " w-full overflow-auto rounded-lg border border-neutral-200 bg-white p-3 text-sm leading-relaxed text-neutral-800 whitespace-pre-wrap"}>
            {displayText}
          </div>
        )}
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
