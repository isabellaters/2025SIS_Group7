import { useState } from "react";

// Mock glossary (come from backend API later)
const glossary: Record<string, string> = {
  "algorithm": "Step-by-step process for solving a problem",
  "runtime": "The time taken for a program to execute",
  "complexity": "Measure of efficiency of an algorithm"
};

// Function to highlight glossary terms in transcript text
function highlightTranscript(text: string): string {
  let highlighted = text;
  for (const term in glossary) {
    const regex = new RegExp(`\\b${term}\\b`, "gi");
    highlighted = highlighted.replace(
      regex,
      `<mark title="${glossary[term]}">${term}</mark>`
    );
  }
  return highlighted;
}

function App() {
  // Mock transcript text (come from backend websocket / API)
  const [transcript] = useState(
    "This algorithm has low runtime and low complexity, making it efficient."
  );

  return (
    <div className="App" style={{ padding: "20px" }}>
      <h1>LiveLecture Transcript</h1>

      {/* Transcript with glossary highlights */}
      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: "8px",
          padding: "16px",
          background: "#f9f9f9",
          lineHeight: "1.6"
        }}
        dangerouslySetInnerHTML={{ __html: highlightTranscript(transcript) }}
      />

      {/* Glossary section (for testing) */}
      <h2 style={{ marginTop: "20px" }}>Glossary</h2>
      <ul>
        {Object.entries(glossary).map(([term, definition]) => (
          <li key={term}>
            <b>{term}</b>: {definition}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
