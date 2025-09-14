import { useState } from "react";
import ElectronDesktopTranscription from "./components/ElectronDesktopTranscription";

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
  const [liveTranscript, setLiveTranscript] = useState("");
  const [showLiveTranscription, setShowLiveTranscription] = useState(false);

  // Mock transcript text (come from backend websocket / API)
  const [mockTranscript] = useState(
    "This algorithm has low runtime and low complexity, making it efficient."
  );

  const handleTranscriptUpdate = (transcript: string) => {
    setLiveTranscript(transcript);
  };

  return (
    <div className="App" style={{ padding: "20px" }}>
      <h1>LiveLecture Transcript</h1>

      {/* Live Transcription Toggle */}
      <div className="mb-6">
        <button
          onClick={() => setShowLiveTranscription(!showLiveTranscription)}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
        >
          {showLiveTranscription ? 'Hide' : 'Show'} Desktop Audio Transcription
        </button>
      </div>

      {/* Live Transcription Component */}
      {showLiveTranscription && (
        <div className="mb-8">
          <ElectronDesktopTranscription 
            onTranscriptUpdate={handleTranscriptUpdate}
            className="mb-6"
          />
        </div>
      )}

      {/* Current Transcript Display */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3">
          {liveTranscript ? 'Live Transcript' : 'Sample Transcript'}
        </h2>
        <div
          className="border border-gray-300 rounded-lg p-4 bg-gray-50"
          style={{ lineHeight: "1.6" }}
          dangerouslySetInnerHTML={{ 
            __html: highlightTranscript(liveTranscript || mockTranscript) 
          }}
        />
      </div>

      {/* Glossary section (for testing) */}
      <h2 className="text-xl font-semibold mb-3">Glossary</h2>
      <ul className="space-y-1">
        {Object.entries(glossary).map(([term, definition]) => (
          <li key={term} className="text-sm">
            <b className="font-medium">{term}</b>: {definition}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
