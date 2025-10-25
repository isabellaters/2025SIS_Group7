import React, { useEffect, useRef } from 'react';

interface TranscriptDisplayProps {
  transcriptLines: string[];
  interimTranscript?: string;
  cursor?: number;
  isDocked?: boolean;
  fontScale?: number;
}

/**
 * TranscriptDisplay - Shows final and interim transcription results
 * Final transcripts are permanent, interim shown in brackets
 * Auto-scrolls to bottom when new content is added
 */
export function TranscriptDisplay({
  transcriptLines,
  interimTranscript,
  cursor = 0,
  isDocked = true,
  fontScale = 1,
}: TranscriptDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when transcript changes
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [transcriptLines, interimTranscript]);

  const heightClass = isDocked ? "h-32" : "h-64";
  const baseFontPx = 14;
  const computedFontSize = `${baseFontPx * fontScale}px`;

  const transcriptText = transcriptLines.slice(0, Math.min(cursor, transcriptLines.length)).join("\n") || "";

  // Add interim transcript to display (in brackets to indicate it's not final)
  const displayText = transcriptText
    ? `${transcriptText}\n${interimTranscript ? `[${interimTranscript}]` : ''}`
    : (interimTranscript ? `[${interimTranscript}]` : "Waiting for audio...");

  return (
    <div
      ref={containerRef}
      className={`${heightClass} w-full overflow-auto rounded-lg border border-neutral-200 bg-white p-3 leading-relaxed text-neutral-800 whitespace-pre-wrap`}
      style={{ fontSize: computedFontSize }}
    >
      {transcriptLines.map((line, i) => (
        <div key={i} className="mb-2">
          {line}
        </div>
      ))}

      {interimTranscript && (
        <div className="text-neutral-500 mt-2">[{interimTranscript}]</div>
      )}
    </div>
  );
}

export default TranscriptDisplay;
