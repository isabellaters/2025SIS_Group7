import React, { useEffect, useRef } from 'react';

interface TranscriptDisplayProps {
  transcriptLines: string[];
  interimTranscript: string;
  cursor: number;
  isDocked: boolean;
}

/**
 * TranscriptDisplay - Shows final and interim transcription results
 * Final transcripts are permanent, interim shown in brackets
 * Auto-scrolls to bottom when new content is added
 */
export function TranscriptDisplay({
  transcriptLines,
  interimTranscript,
  cursor,
  isDocked
}: TranscriptDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when transcript changes
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [transcriptLines, interimTranscript]);

  const transcriptText = transcriptLines.slice(0, Math.min(cursor, transcriptLines.length)).join("\n") || "";

  // Add interim transcript to display (in brackets to indicate it's not final)
  const displayText = transcriptText
    ? `${transcriptText}\n${interimTranscript ? `[${interimTranscript}]` : ''}`
    : (interimTranscript ? `[${interimTranscript}]` : "Waiting for audio...");

  return (
    <div
      ref={containerRef}
      className={
        (isDocked ? "h-48" : "h-[60vh]") +
        " w-full overflow-auto rounded-lg border border-neutral-200 bg-white p-3 text-sm leading-relaxed text-neutral-800 whitespace-pre-wrap"
      }
    >
      {displayText}
    </div>
  );
}
