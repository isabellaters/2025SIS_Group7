import React, { useEffect, useRef, useState } from 'react';

export interface KeywordWithDefinition {
  term: string;
  definition: string;
}

interface TranscriptDisplayProps {
  transcriptLines: string[];
  interimTranscript: string;
  cursor: number;
  isDocked: boolean;
  keywords?: KeywordWithDefinition[];
  highlightEnabled?: boolean;
}

/**
 * TranscriptDisplay - Shows final and interim transcription results
 * Final transcripts are permanent, interim shown in brackets
 * Auto-scrolls to bottom when new content is added
 * Highlights detected keywords with hover definitions
 */
export function TranscriptDisplay({
  transcriptLines,
  interimTranscript,
  cursor,
  isDocked,
  keywords = [],
  highlightEnabled = true
}: TranscriptDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredKeyword, setHoveredKeyword] = useState<KeywordWithDefinition | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  // Auto-scroll to bottom when transcript changes
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [transcriptLines, interimTranscript]);

  const transcriptText = transcriptLines.slice(0, Math.min(cursor, transcriptLines.length)).join("\n") || "";

  // Highlight keywords in the transcript text
  const highlightKeywords = (text: string): React.ReactNode => {
    if (!highlightEnabled || keywords.length === 0 || !text) {
      return text;
    }

    // Create a regex pattern to match all keywords (case-insensitive, whole words)
    const keywordPattern = keywords
      .map(k => k.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) // Escape special regex chars
      .join('|');

    if (!keywordPattern) return text;

    const regex = new RegExp(`\\b(${keywordPattern})\\b`, 'gi');
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }

      // Find the keyword definition
      const matchedTerm = match[0];
      const keyword = keywords.find(
        k => k.term.toLowerCase() === matchedTerm.toLowerCase()
      );

      // Add highlighted keyword
      if (keyword) {
        parts.push(
          <span
            key={`${match.index}-${matchedTerm}`}
            className="bg-yellow-200 px-1 rounded cursor-pointer hover:bg-yellow-300 transition-colors"
            onMouseEnter={(e) => {
              setHoveredKeyword(keyword);
              const rect = e.currentTarget.getBoundingClientRect();
              setTooltipPosition({ x: rect.left, y: rect.bottom + 5 });
            }}
            onMouseLeave={() => {
              setHoveredKeyword(null);
              setTooltipPosition(null);
            }}
          >
            {matchedTerm}
          </span>
        );
      } else {
        parts.push(matchedTerm);
      }

      lastIndex = regex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts;
  };

  // Add interim transcript to display (in brackets to indicate it's not final)
  const displayText = transcriptText
    ? `${transcriptText}\n${interimTranscript ? `[${interimTranscript}]` : ''}`
    : (interimTranscript ? `[${interimTranscript}]` : "Waiting for audio...");

  return (
    <>
      <div
        ref={containerRef}
        className={
          (isDocked ? "h-48" : "h-[60vh]") +
          " w-full overflow-auto rounded-lg border border-neutral-200 bg-white p-3 text-sm leading-relaxed text-neutral-800 whitespace-pre-wrap"
        }
      >
        {highlightKeywords(displayText)}
      </div>

      {/* Keyword definition tooltip */}
      {hoveredKeyword && tooltipPosition && (
        <div
          className="fixed z-50 max-w-sm bg-gray-900 text-white text-xs rounded-lg shadow-lg p-3 pointer-events-none"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
          }}
        >
          <div className="font-bold mb-1">{hoveredKeyword.term}</div>
          <div className="text-gray-300">{hoveredKeyword.definition}</div>
        </div>
      )}
    </>
  );
}
