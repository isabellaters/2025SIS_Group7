import { useState, useEffect, useRef } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

export interface KeywordWithDefinition {
  term: string;
  definition: string;
}

/**
 * useLiveKeywords - Custom hook for extracting keywords from live transcription
 *
 * Features:
 * - Processes keywords incrementally based on time or content thresholds
 * - Extracts keywords even before final transcription is complete
 * - Auto-detects technical terms and jargon
 * - Provides definitions for each keyword
 * - Caches keywords to avoid duplicates
 *
 * Thresholds:
 * - Time-based: Processes every 15 seconds of new content
 * - Content-based: Processes after 100+ characters of new text
 */
export function useLiveKeywords(transcriptLines: string[], enabled: boolean = true) {
  const [keywords, setKeywords] = useState<KeywordWithDefinition[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const lastExtractedText = useRef('');
  const lastExtractionTime = useRef(0);
  const extractionTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const currentText = transcriptLines.join(' ');
    const newTextLength = currentText.length - lastExtractedText.current.length;
    const timeSinceLastExtraction = Date.now() - lastExtractionTime.current;

    // Thresholds for extraction
    const MIN_TEXT_THRESHOLD = 100; // characters
    const TIME_THRESHOLD = 15000; // 15 seconds
    const DEBOUNCE_DELAY = 3000; // 3 second debounce after content changes

    // Check if we should extract based on content or time
    const hasEnoughNewText = newTextLength >= MIN_TEXT_THRESHOLD;
    const hasEnoughTimePassed = timeSinceLastExtraction >= TIME_THRESHOLD && newTextLength > 0;

    if (!hasEnoughNewText && !hasEnoughTimePassed) {
      return; // Not enough new content or time hasn't passed yet
    }

    // Clear existing timeout
    if (extractionTimeout.current) {
      clearTimeout(extractionTimeout.current);
    }

    // Debounce: wait a bit after content changes before extracting
    extractionTimeout.current = setTimeout(async () => {
      try {
        setIsExtracting(true);

        // Get recent transcript (last 10 lines for context)
        const recentTranscript = transcriptLines.slice(-10).join(' ');

        if (recentTranscript.trim().length < 50) {
          // Not enough content to extract meaningful keywords
          setIsExtracting(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/live-keywords`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ transcript: recentTranscript }),
        });

        if (!response.ok) {
          throw new Error('Failed to extract keywords');
        }

        const data = await response.json();

        // Merge new keywords with existing ones, avoiding duplicates
        setKeywords((prev) => {
          const existingTerms = new Set(prev.map(k => k.term.toLowerCase()));
          const newKeywords = data.keywords.filter(
            (k: KeywordWithDefinition) => !existingTerms.has(k.term.toLowerCase())
          );
          return [...prev, ...newKeywords];
        });

        lastExtractedText.current = currentText;
        lastExtractionTime.current = Date.now();
      } catch (error) {
        console.error('Error extracting live keywords:', error);
      } finally {
        setIsExtracting(false);
      }
    }, DEBOUNCE_DELAY);

    return () => {
      if (extractionTimeout.current) {
        clearTimeout(extractionTimeout.current);
      }
    };
  }, [transcriptLines, enabled]);

  // Clear keywords when starting fresh
  const clearKeywords = () => {
    setKeywords([]);
    lastExtractedText.current = '';
    lastExtractionTime.current = 0;
  };

  return {
    keywords,
    isExtracting,
    clearKeywords,
  };
}
