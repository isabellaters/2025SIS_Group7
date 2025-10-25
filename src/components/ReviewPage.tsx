import React, { useEffect, useState } from "react";
import { LectureService } from "../apis/lecture";
import { API_BASE_URL } from "../apis/config";

/** LocalStorage keys (shared with the rest of the app) */
const SESSION_KEY = "ll:session"; // { title, transcriptLines, translationLines, updatedAt }

/** Small helpers (self-contained) */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function timeOf(index: number, stepSec = 5): string {
  const s = index * stepSec; const m = Math.floor(s / 60); const ss = (s % 60).toString().padStart(2, "0");
  return `${m}:${ss}`;
}

interface AIGeneratedContent {
  summary: string;
  keywords: string[];
  keyPoints: string[];
  questions: string[];
}

export function ReviewPage() {
  const [session, setSession] = useState<{ title: string; transcriptLines: string[]; translationLines: string[] } | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<string>("");
  const [defs, setDefs] = useState<Record<string, string>>({});
  const [fontScale, setFontScale] = useState<number>(1);
  const [aiContent, setAiContent] = useState<AIGeneratedContent | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string>("");
  const [isLoadingDef, setIsLoadingDef] = useState<boolean>(false);

  useEffect(() => {
    try {
      const s = localStorage.getItem(SESSION_KEY);
      if (s) {
        const sessionData = JSON.parse(s);
        setSession(sessionData);

        // Automatically generate AI content when session loads
        if (sessionData.transcriptLines && sessionData.transcriptLines.length > 0) {
          generateAIContent(sessionData.transcriptLines.join("\n"));
        }
      }
    } catch (e) {
      console.error("Error loading session:", e);
    }
  }, []);

  // Helper function to check if AI response is valid data vs error message
  function isValidAIData(data: any): boolean {
    // Check if keywords is an array with actual terms (not error messages)
    if (!Array.isArray(data.keywords)) return false;

    // Check if keywords contains response-like text instead of actual terms
    const invalidPhrases = [
      'sorry', 'cannot', 'unable', 'error', 'transcript is too short',
      'need more', 'insufficient', 'please provide', 'i apologize'
    ];

    const allText = [
      data.summary || '',
      ...(data.keywords || []),
      ...(data.keyPoints || []),
      ...(data.questions || [])
    ].join(' ').toLowerCase();

    // If the response contains common error phrases, it's invalid
    if (invalidPhrases.some(phrase => allText.includes(phrase))) {
      return false;
    }

    // Check if we have at least some valid content
    const hasContent = data.keywords.length > 0 ||
                      data.keyPoints.length > 0 ||
                      data.questions.length > 0;

    return hasContent;
  }

  async function generateAIContent(transcript: string) {
    // Check if transcript is too short
    if (transcript.length < 100) {
      console.log("Transcript too short for AI generation");
      setAiContent({
        summary: "",
        keywords: [],
        keyPoints: [],
        questions: []
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate AI content");
      }

      const data = await response.json();

      // Validate that we got actual data, not error messages
      if (!isValidAIData(data)) {
        console.log("AI returned invalid or insufficient data");
        setAiContent({
          summary: "",
          keywords: [],
          keyPoints: [],
          questions: []
        });
        return;
      }

      setAiContent({
        summary: data.summary || "",
        keywords: data.keywords || [],
        keyPoints: data.keyPoints || [],
        questions: data.questions || []
      });
    } catch (error) {
      console.error("Error generating AI content:", error);
      setAiContent({
        summary: "",
        keywords: [],
        keyPoints: [],
        questions: []
      });
    } finally {
      setIsGenerating(false);
    }
  }

  async function generateDefinition(term: string) {
    if (!session) return;

    setIsLoadingDef(true);
    try {
      const context = session.transcriptLines.join("\n");
      const response = await fetch(`${API_BASE_URL}/definition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term, context }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate definition");
      }

      const data = await response.json();
      const definition = data.definition || "";

      // Save definition
      const next = { ...defs, [term]: definition };
      setDefs(next);
    } catch (error) {
      console.error("Error generating definition:", error);
      const next = { ...defs, [term]: "Failed to generate definition. Please try again." };
      setDefs(next);
    } finally {
      setIsLoadingDef(false);
    }
  }

  function highlight(text: string, term: string): React.ReactNode {
    if (!term) return <>{text}</>;
    const re = new RegExp(`\\b${escapeRegExp(term)}\\b`, "gi");
    const parts = text.split(re);
    const matches = text.match(re) || [];
    const out: React.ReactNode[] = [];
    for (let i = 0; i < parts.length; i++) {
      out.push(parts[i]);
      if (i < parts.length - 1) out.push(
        <mark key={`m${i}`} className="bg-yellow-200 px-0.5 rounded-sm">{matches[i] || term}</mark>
      );
    }
    return <>{out}</>;
  }

  // Save current session snapshot to localStorage and Firebase, then navigate to Dashboard
  async function handleSaveAndExit() {
    if (!session || !aiContent) {
      window.location.hash = "#/dashboard";
      return;
    }

    setIsSaving(true);
    setSaveStatus("Saving...");

    try {
      // Save to localStorage first
      const toSave = { ...session, updatedAt: new Date().toISOString() };
      localStorage.setItem(SESSION_KEY, JSON.stringify(toSave));
      localStorage.setItem("ll:lastReview", JSON.stringify({
        title: session?.title || "Untitled",
        savedAt: new Date().toISOString()
      }));

      // ✅ Get subjectId from NewMeeting session data
      let subjectId: string | undefined;
      try {
        const newMeetingData = localStorage.getItem("ll:newMeeting");
        if (newMeetingData) {
          const parsed = JSON.parse(newMeetingData);
          subjectId = parsed.subjectId || undefined;
        }
      } catch (err) {
        console.log("No subject selected for this lecture");
      }

      // ✅ If no subject, fetch Miscellaneous subject
      if (!subjectId) {
        try {
          const miscRes = await fetch("http://localhost:3001/subjects/misc/get-or-create");
          const miscSubject = await miscRes.json();
          subjectId = miscSubject.id;
          console.log("Using Miscellaneous subject:", subjectId);
        } catch (err) {
          console.error("Failed to get Miscellaneous subject:", err);
        }
      }

      // Save to Firebase
      const transcriptText = session.transcriptLines.join("\n");
      const translationText = session.translationLines.join("\n");

      // First create the transcript
      const transcriptId = await LectureService.createTranscript({
        text: transcriptText,
        translation: translationText || undefined,
        translationLanguage: translationText ? "auto" : undefined,
        status: "completed",
      });

      // Prepare keywords from AI-generated keywords and their definitions
      const keywordsWithDefs = aiContent.keywords
        .filter(term => defs[term])
        .map(term => `${term}: ${defs[term]}`);

      // Create the lecture with all AI-generated review data
      const lectureData: any = {
        title: session.title,
        transcriptId: transcriptId,
        summary: aiContent.summary || undefined,
        keywords: keywordsWithDefs.length > 0 ? keywordsWithDefs : aiContent.keywords,
        questions: aiContent.questions.length > 0 ? aiContent.questions : undefined,
        status: "completed",
      };

      // ✅ Add subjectId if available
      if (subjectId) {
        lectureData.subjectId = subjectId;
      }

      await LectureService.createLecture(lectureData);

      setSaveStatus("Saved successfully!");
      setTimeout(() => {
        window.location.hash = "#/dashboard";
      }, 1000);
    } catch (e) {
      console.error("Failed to save session", e);
      setSaveStatus("Save failed. Please try again.");
      setIsSaving(false);
    }
  }

  const keyTerms = aiContent?.keywords || [];

  return (
    <div id="ll-container" data-page="review" className="mx-auto my-4 max-w-6xl px-3">
      <div className="grid grid-cols-12 gap-4">
        {/* Left column: transcript */}
        <div className="col-span-8">
          <h2 className="text-lg font-semibold mb-2">{session?.title || "Lecture Review"}</h2>
          <div className="rounded-xl border border-neutral-300 bg-white p-3 shadow-sm min-h-[300px] max-h-[70vh] overflow-auto">
            {(session?.transcriptLines || []).length === 0 ? (
              <div className="flex items-center justify-center h-full text-neutral-500">
                <div className="text-sm">No transcript available.</div>
              </div>
            ) : (
              (session?.transcriptLines || []).map((line, idx) => (
                <div
                  key={idx}
                  className="mb-3 text-[clamp(12px,calc(14px_*_var(--fs,1)),20px)] leading-relaxed"
                  style={{ ["--fs" as any]: fontScale }}
                >
                  <div className="text-neutral-400 text-xs mb-1">{timeOf(idx)}</div>
                  <div className="cursor-text" onDoubleClick={() => setSelectedTerm("")}>
                    {highlight(line, selectedTerm)}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-2 flex items-center gap-3">
            <button className="rounded border px-2 py-1 text-sm" onClick={() => setFontScale((s) => Math.min(1.4, +(s + 0.1).toFixed(2)))}>A+</button>
            <button className="rounded border px-2 py-1 text-sm" onClick={() => setFontScale((s) => Math.max(0.8, +(s - 0.1).toFixed(2)))}>A-</button>
            <div className="text-sm text-neutral-500">Double-click text to clear highlight</div>
          </div>

          {/* Action buttons */}
          <div className="mt-4 flex justify-between items-center">
            <button onClick={() => { window.location.hash = "#/live"; }} className="rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50">
              Back to Live
            </button>
            <div className="flex gap-2 items-center">
              {saveStatus && (
                <div className={`text-sm ${saveStatus.includes('failed') ? 'text-red-600' : saveStatus.includes('success') ? 'text-green-600' : 'text-neutral-600'}`}>
                  {saveStatus}
                </div>
              )}
              <button
                onClick={async () => {
                  // Save current data before starting new meeting
                  if (session && aiContent) {
                    await handleSaveAndExit();
                  } else {
                    window.location.hash = "#/";
                  }
                }}
                className="rounded-md bg-sky-500 text-white px-4 py-2 text-sm hover:bg-sky-600"
              >
                New Meeting
              </button>
              <button
                onClick={handleSaveAndExit}
                disabled={isSaving || isGenerating}
                className={`rounded-md bg-sky-600 text-white px-3 py-2 text-sm hover:bg-sky-700 ${(isSaving || isGenerating) ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="Save this review and go to Dashboard"
              >
                {isSaving ? "Saving..." : "Save & Exit"}
              </button>
            </div>
          </div>
        </div>

        {/* Right column: AI-generated content */}
        <div className="col-span-4">
          {/* Summary */}
          <div className="rounded-xl border border-neutral-300 bg-white p-3 mb-3">
            <div className="text-sm font-semibold mb-2">Summary</div>
            {isGenerating ? (
              <div className="text-sm text-neutral-500">Generating summary...</div>
            ) : (
              <div className="text-sm text-neutral-700 leading-relaxed">
                {aiContent?.summary || "No summary available."}
              </div>
            )}
          </div>

          {/* Key Terms */}
          <div className="mb-3">
            <label className="text-sm font-medium text-neutral-700">Key Terms</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {isGenerating ? (
                <span className="text-neutral-400 text-sm">Extracting key terms...</span>
              ) : keyTerms.length === 0 ? (
                <span className="text-neutral-400 text-sm">No terms detected.</span>
              ) : (
                keyTerms.map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setSelectedTerm(t);
                      if (!defs[t]) {
                        generateDefinition(t);
                      }
                    }}
                    className={`px-2 py-1 rounded-md border text-sm ${selectedTerm === t ? "border-sky-500 bg-sky-50 text-sky-700" : "border-neutral-300 hover:bg-neutral-50"}`}
                  >
                    {t}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Definition card */}
          <div className="rounded-xl border border-neutral-300 bg-white p-3 mb-3">
            <div className="text-sm font-medium mb-1">Definition</div>
            {selectedTerm ? (
              <>
                <div className="mb-2"><span className="font-semibold">{selectedTerm}</span></div>
                {isLoadingDef ? (
                  <div className="text-sm text-neutral-500">Generating definition...</div>
                ) : (
                  <div className="text-sm text-neutral-700 leading-relaxed">
                    {defs[selectedTerm] || "Click a term above to generate its definition."}
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-neutral-500">Select a key term to see its AI-generated definition.</div>
            )}
          </div>

          {/* Key Points */}
          <div className="rounded-xl border border-neutral-300 bg-white p-3 mb-3">
            <div className="text-sm font-semibold mb-2">Key Points</div>
            {isGenerating ? (
              <div className="text-sm text-neutral-500">Generating key points...</div>
            ) : (
              <ul className="list-disc ml-5 text-sm space-y-1">
                {(aiContent?.keyPoints.length === 0) && <li className="text-neutral-500">No key points generated.</li>}
                {aiContent?.keyPoints.map((p, i) => (<li key={i}>{p}</li>))}
              </ul>
            )}
          </div>

          {/* Review Questions */}
          <div className="rounded-xl border border-neutral-300 bg-white p-3">
            <div className="text-sm font-semibold mb-2">Review Questions</div>
            {isGenerating ? (
              <div className="text-sm text-neutral-500">Generating questions...</div>
            ) : (
              <ol className="list-decimal ml-5 text-sm space-y-2">
                {(aiContent?.questions.length === 0) && <li className="text-neutral-500">No questions generated.</li>}
                {aiContent?.questions.map((q, i) => (<li key={i}>{q}</li>))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReviewPage;
