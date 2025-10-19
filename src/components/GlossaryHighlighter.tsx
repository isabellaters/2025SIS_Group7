import React from "react";

/**
 * GlossaryHighlighter
 * -------------------
 * Highlights glossary terms and key points within text.
 * - Wraps each matched term in a <mark> with tooltip.
 * - Accepts dynamic glossary list from backend or props.
 */
interface GlossaryTerm {
  term: string;
  definition?: string;
}

interface GlossaryHighlighterProps {
  text: string;
  glossary: GlossaryTerm[];
}

export const GlossaryHighlighter: React.FC<GlossaryHighlighterProps> = ({ text, glossary }) => {
  if (!text) return null;

  // Sort longer words first to avoid partial overlaps
  const sortedTerms = [...glossary].sort((a, b) => b.term.length - a.term.length);

  let highlightedText = text;
  sortedTerms.forEach(({ term, definition }) => {
    const regex = new RegExp(`\\b(${term})\\b`, "gi");
    const tooltip = definition ? ` title="${definition}"` : "";
    highlightedText = highlightedText.replace(
      regex,
      `<mark class="bg-yellow-200 hover:bg-yellow-300 cursor-help"${tooltip}>$1</mark>`
    );
  });

  return (
    <div
      className="leading-relaxed text-neutral-800"
      dangerouslySetInnerHTML={{ __html: highlightedText }}
    />
  );
};