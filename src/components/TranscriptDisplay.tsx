import React from 'react';

interface TranscriptDisplayProps {
  transcriptLines: string[];
  interimTranscript: string;
  cursor: number;
  isDocked: boolean;
}

/**
 * TranscriptDisplay - Shows final and interim transcription results
 * Final transcripts are permanent, interim shown in brackets
 */
export function TranscriptDisplay({
  transcriptLines,
  interimTranscript,
  cursor,
  isDocked
}: TranscriptDisplayProps) {
  const transcriptText = transcriptLines.slice(0, Math.min(cursor, transcriptLines.length)).join("\n") || "";

  // Add interim transcript to display (in brackets to indicate it's not final)
  const displayText = transcriptText
    ? `${transcriptText}\n${interimTranscript ? `[${interimTranscript}]` : ''}`
    : (interimTranscript ? `[${interimTranscript}]` : "Waiting for audio...");

  return (
    <div
      className={
        (isDocked ? "h-32" : "h-64") +
        " w-full overflow-auto rounded-lg border border-neutral-200 bg-white p-3 text-sm leading-relaxed text-neutral-800 whitespace-pre-wrap"
      }
    >
      {displayText}
    </div>
  );
}
