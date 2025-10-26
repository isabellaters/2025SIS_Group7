// src/components/LectureDetail.tsx
import React, { useEffect, useState } from "react";
import { LectureService } from "../apis/lecture";
import type { Lecture, Transcript } from "../types";
import { exportAsPDF, type ExportData } from "../utils/export";
import { useSubject } from "../hooks/useSubjects";

interface LectureDetailProps {
  sidebarCollapsed: boolean;
  lectureId: string;
  subjectId: string;
  onBack: () => void;
}

interface KeywordDefinition {
  term: string;
  definition: string;
}

type Tab = "transcription" | "translation" | "notes" | "ai-summary";

// Helper to format timestamps (5 seconds per line)
function timeOf(index: number, stepSec = 5): string {
  const s = index * stepSec;
  const m = Math.floor(s / 60);
  const ss = (s % 60).toString().padStart(2, "0");
  return `${m}:${ss}`;
}

// Helper to escape regex special characters
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default function LectureDetail({
  sidebarCollapsed,
  lectureId,
  subjectId,
  onBack,
}: LectureDetailProps) {
  const [activeTab, setActiveTab] = useState<Tab>("transcription");
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [editedTranscript, setEditedTranscript] = useState("");
  const [keywords, setKeywords] = useState<KeywordDefinition[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<string>("");
  const [fontScale, setFontScale] = useState<number>(1);
  const [isAddingKeyword, setIsAddingKeyword] = useState(false);
  const [newKeywordTerm, setNewKeywordTerm] = useState("");
  const [newKeywordDef, setNewKeywordDef] = useState("");
  const [notes, setNotes] = useState("");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Fetch subject data using the hook
  const { subject } = useSubject(subjectId);

  // Fetch lecture and transcript data
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch lecture
        const lectureData = await LectureService.findLecture(lectureId);
        if (!lectureData) {
          setLecture(null);
          setIsLoading(false);
          return;
        }
        setLecture(lectureData);
        setEditedTitle(lectureData.title || "");
        setNotes(lectureData.notes || "");

        // Debug: Log lecture data to see if keyPoints exist
        console.log("Loaded lecture data:", lectureData);
        console.log("Key Points:", lectureData.keyPoints);

        // Fetch transcript using transcriptId
        if (lectureData.transcriptId) {
          const transcriptData = await LectureService.findTranscript(lectureData.transcriptId);
          setTranscript(transcriptData);
          setEditedTranscript(transcriptData?.text || "");
        }

        // Parse keywords with definitions for glossary
        if (lectureData.keywords && lectureData.keywords.length > 0) {
          const keywordsWithDefs: KeywordDefinition[] = lectureData.keywords.map(kwStr => {
            // Check if keyword contains a definition (format: "term: definition")
            const colonIndex = kwStr.indexOf(':');
            if (colonIndex > 0) {
              const term = kwStr.substring(0, colonIndex).trim();
              const definition = kwStr.substring(colonIndex + 1).trim();
              return {
                term,
                definition: definition || "No definition available"
              };
            }
            return {
              term: kwStr.trim(),
              definition: "No definition available"
            };
          });
          setKeywords(keywordsWithDefs);

          // Auto-generate missing definitions in the background
          const missingDefinitions = keywordsWithDefs.filter(
            kw => kw.definition === "No definition available"
          );

          if (missingDefinitions.length > 0 && transcriptData?.text) {
            console.log(`Auto-generating ${missingDefinitions.length} missing definitions...`);
            generateMissingDefinitions(missingDefinitions, transcriptData.text, lectureData);
          }
        }
      } catch (err) {
        console.error("Error fetching lecture data:", err);
        setLecture(null);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [lectureId]);

  // Handle loading & not found
  if (isLoading) {
    return (
      <div style={{ padding: 48, flex: 1 }}>
        <h2>Loading lecture...</h2>
      </div>
    );
  }

  if (!lecture) {
    return (
      <div style={{ padding: 48, flex: 1 }}>
        <h2>Lecture not found</h2>
        <button onClick={onBack}>Back</button>
      </div>
    );
  }

  // Format date for display
  function formatDate(date: any): string {
    if (!date) return "—";
    try {
      let d: Date;
      if (date.seconds) {
        // Firebase Timestamp
        d = new Date(date.seconds * 1000);
      } else if (date.toDate) {
        // Firestore Timestamp with toDate method
        d = date.toDate();
      } else {
        // Regular Date or timestamp
        d = new Date(date);
      }

      // Check if date is valid
      if (isNaN(d.getTime())) {
        return "—";
      }

      return d.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
      }) + " at " + d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      });
    } catch {
      return "—";
    }
  }

  // Format duration (seconds to readable format)
  function formatDuration(seconds?: number): string {
    if (!seconds) return "";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  // Calculate word count
  function getWordCount(text?: string): number {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  // Handle title save
  async function handleSaveTitle() {
    if (!lecture || !editedTitle.trim()) return;
    try {
      await LectureService.updateLecture(lectureId, { title: editedTitle });
      setLecture({ ...lecture, title: editedTitle });
      setIsEditingTitle(false);
    } catch (err) {
      console.error("Error updating title:", err);
      alert("Failed to update title");
    }
  }

  // Handle transcript save
  async function handleSaveTranscript() {
    if (!lecture || !transcript || !editedTranscript.trim()) return;
    try {
      await LectureService.updateTranscript(lecture.transcriptId, { text: editedTranscript });
      setTranscript({ ...transcript, text: editedTranscript });
      setIsEditingTranscript(false);
    } catch (err) {
      console.error("Error updating transcript:", err);
      alert("Failed to update transcript");
    }
  }

  // Handle notes save
  async function handleSaveNotes() {
    if (!lecture) return;
    setIsSavingNotes(true);
    try {
      await LectureService.updateLecture(lectureId, { notes });
      setLecture({ ...lecture, notes });
      setIsEditingNotes(false);
    } catch (err) {
      console.error("Error updating notes:", err);
      alert("Failed to update notes");
    } finally {
      setIsSavingNotes(false);
    }
  }

  // Handle export
  function handleExport() {
    if (!lecture || !transcript) return;

    const exportData: ExportData = {
      transcriptLines: transcript.text.split('\n'),
      translationLines: transcript.translation ? transcript.translation.split('\n') : [],
      title: lecture.title,
      timestamp: new Date().toLocaleString(),
      summary: lecture.summary,
      keywords: lecture.keywords,
      keyPoints: lecture.keyPoints
    };

    exportAsPDF(exportData);
  }

  // Handle delete lecture
  async function handleDelete() {
    if (!lecture) return;

    const confirmed = confirm(`Are you sure you want to delete "${lecture.title}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      await LectureService.deleteLecture(lectureId);
      alert("Lecture deleted successfully");
      onBack(); // Navigate back to dashboard/subject
    } catch (err) {
      console.error("Error deleting lecture:", err);
      alert("Failed to delete lecture");
    }
  }

  // Handle add keyword to glossary
  async function handleAddKeyword() {
    if (!lecture || !newKeywordTerm.trim() || !newKeywordDef.trim()) return;

    try {
      const newKeyword: KeywordDefinition = {
        term: newKeywordTerm.trim(),
        definition: newKeywordDef.trim()
      };

      // Add to local state
      const updatedKeywords = [...keywords, newKeyword];
      setKeywords(updatedKeywords);

      // Save to backend (format: "term: definition")
      const keywordsForBackend = updatedKeywords.map(kw => `${kw.term}: ${kw.definition}`);
      await LectureService.updateLecture(lectureId, { keywords: keywordsForBackend });

      // Clear inputs
      setNewKeywordTerm("");
      setNewKeywordDef("");
      setIsAddingKeyword(false);
    } catch (err) {
      console.error("Error adding keyword:", err);
      alert("Failed to add keyword");
    }
  }

  // Handle remove keyword from glossary
  async function handleRemoveKeyword(index: number) {
    if (!lecture) return;

    const confirmed = confirm(`Are you sure you want to remove "${keywords[index].term}" from the glossary?`);
    if (!confirmed) return;

    try {
      // Remove from local state
      const updatedKeywords = keywords.filter((_, i) => i !== index);
      setKeywords(updatedKeywords);

      // Save to backend
      const keywordsForBackend = updatedKeywords.map(kw => `${kw.term}: ${kw.definition}`);
      await LectureService.updateLecture(lectureId, { keywords: keywordsForBackend });
    } catch (err) {
      console.error("Error removing keyword:", err);
      alert("Failed to remove keyword");
    }
  }

  // Auto-generate missing definitions in the background
  async function generateMissingDefinitions(
    missingDefs: KeywordDefinition[],
    context: string,
    lectureData: Lecture
  ) {
    try {
      const defPromises = missingDefs.map(async (kw) => {
        try {
          const response = await fetch("http://localhost:3001/definition", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ term: kw.term, context }),
          });
          const data = await response.json();
          return { term: kw.term, definition: data.definition || "Definition not available" };
        } catch (err) {
          console.error(`Error generating definition for ${kw.term}:`, err);
          return { term: kw.term, definition: "Definition not available" };
        }
      });

      const generatedDefs = await Promise.all(defPromises);

      // Update keywords with new definitions
      const updatedKeywords = keywords.map(kw => {
        const generated = generatedDefs.find(g => g.term === kw.term);
        if (generated && generated.definition !== "Definition not available") {
          return { ...kw, definition: generated.definition };
        }
        return kw;
      });

      setKeywords(updatedKeywords);

      // Save to backend
      const keywordsForBackend = updatedKeywords.map(kw => `${kw.term}: ${kw.definition}`);
      await LectureService.updateLecture(lectureId, { keywords: keywordsForBackend });

      console.log(`Successfully generated and saved ${generatedDefs.length} definitions`);
    } catch (err) {
      console.error("Error auto-generating definitions:", err);
    }
  }

  // Highlight selected term in text
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

  // Get content for active tab
  function getTabContent(): React.ReactNode {
    switch (activeTab) {
      case "transcription":
        if (isEditingTranscript) {
          return (
            <div>
              <textarea
                value={editedTranscript}
                onChange={(e) => setEditedTranscript(e.target.value)}
                className="w-full min-h-[400px] p-4 text-base leading-relaxed border border-gray-300 rounded-lg font-inherit"
              />
              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleSaveTranscript}
                  className="px-4 py-2 bg-blue-600 text-white border-0 rounded-md cursor-pointer font-semibold hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditingTranscript(false);
                    setEditedTranscript(transcript?.text || "");
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 border-0 rounded-md cursor-pointer font-semibold hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          );
        }

        const transcriptLines = transcript?.text.split('\n') || [];
        return (
          <div>
            {transcriptLines.length === 0 ? (
              <div className="text-gray-500">No transcript available</div>
            ) : (
              transcriptLines.map((line, idx) => (
                <div
                  key={idx}
                  className="mb-3 leading-relaxed"
                  style={{ fontSize: `${14 * fontScale}px` }}
                >
                  <div className="text-gray-400 text-xs mb-1">{timeOf(idx)}</div>
                  <div className="cursor-text" onDoubleClick={() => setSelectedTerm("")}>
                    {highlight(line, selectedTerm)}
                  </div>
                </div>
              ))
            )}
          </div>
        );

      case "translation":
        return transcript?.translation ? (
          <div className="text-base leading-relaxed whitespace-pre-wrap">
            {transcript.translation}
          </div>
        ) : (
          <div className="text-gray-500">No translation available</div>
        );

      case "notes":
        return (
          <div className="h-full flex flex-col">
            {/* Notes header with edit/save buttons */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <span className="text-xl">📝</span>
                <h3 className="text-lg font-semibold text-gray-800">My Notes</h3>
              </div>
              <div className="flex gap-2">
                {isEditingNotes ? (
                  <>
                    <button
                      onClick={handleSaveNotes}
                      disabled={isSavingNotes}
                      className="px-4 py-1.5 bg-blue-600 text-white border-0 rounded-md cursor-pointer text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSavingNotes ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingNotes(false);
                        setNotes(lecture?.notes || "");
                      }}
                      disabled={isSavingNotes}
                      className="px-4 py-1.5 bg-gray-200 text-gray-800 border-0 rounded-md cursor-pointer text-sm font-semibold hover:bg-gray-300 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditingNotes(true)}
                    className="px-4 py-1.5 bg-white text-gray-600 border border-gray-300 rounded-md cursor-pointer text-sm font-semibold hover:bg-gray-50"
                  >
                    ✏️ Edit
                  </button>
                )}
              </div>
            </div>

            {/* Notes content */}
            {isEditingNotes ? (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Write your notes here..."
                className="w-full flex-1 p-4 text-base leading-relaxed border border-gray-300 rounded-lg resize-none font-inherit focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            ) : (
              <div className="flex-1 p-4 text-base text-gray-700 leading-relaxed whitespace-pre-wrap">
                {notes || (
                  <div className="text-gray-400 italic">
                    No notes yet. Click "Edit" to start writing.
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case "ai-summary":
        return (
          <div className="space-y-6">
            {/* Summary Section */}
            {lecture.summary && (
              <div>
                <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-gray-200">
                  <span className="text-xl">✨</span>
                  <h2 className="text-xl font-bold text-gray-800">Summary</h2>
                </div>
                <div className="text-base text-gray-700 leading-relaxed">
                  {lecture.summary}
                </div>
              </div>
            )}

            {/* Key Points Section */}
            {lecture.keyPoints && lecture.keyPoints.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-gray-200">
                  <span className="text-xl">💡</span>
                  <h2 className="text-xl font-bold text-gray-800">Key Points</h2>
                </div>
                <ul className="list-disc ml-6 space-y-2 text-base text-gray-700">
                  {lecture.keyPoints.map((point, i) => (
                    <li key={i} className="leading-relaxed">{point}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Review Questions Section */}
            {lecture.questions && lecture.questions.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-gray-200">
                  <span className="text-xl">❓</span>
                  <h2 className="text-xl font-bold text-gray-800">Review Questions</h2>
                </div>
                <ol className="list-decimal ml-6 space-y-3 text-base text-gray-700">
                  {lecture.questions.map((q, i) => (
                    <li key={i} className="leading-relaxed">{q}</li>
                  ))}
                </ol>
              </div>
            )}

            {/* Glossary Section */}
            {keywords.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-gray-200">
                  <span className="text-xl">📚</span>
                  <h2 className="text-xl font-bold text-gray-800">Glossary</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {keywords.map((keyword, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="text-base font-semibold text-blue-600 mb-2">
                        {keyword.term}
                      </div>
                      <div className="text-sm text-gray-600 leading-relaxed">
                        {keyword.definition}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No content message */}
            {!lecture.summary && (!lecture.keyPoints || lecture.keyPoints.length === 0) && keywords.length === 0 && (!lecture.questions || lecture.questions.length === 0) && (
              <div className="text-center text-gray-500 py-12">
                <div className="text-4xl mb-3">🤖</div>
                <div className="text-lg">No AI-generated content available for this lecture</div>
              </div>
            )}
          </div>
        );
    }
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "transcription", label: "Transcription", icon: "📝" },
    { id: "translation", label: "Translation", icon: "🌐" },
    { id: "notes", label: "Notes", icon: "📋" },
    { id: "ai-summary", label: "AI Summary", icon: "✨" },
  ];

  return (
    <div className="flex h-screen flex-1">
      {/* Main content area */}
      <section
        className="flex-1 bg-gray-50 overflow-y-auto transition-all"
        style={{
          padding: sidebarCollapsed
            ? "48px 24px 24px 24px"
            : "48px 56px 24px 48px",
        }}
      >
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 bg-transparent border-0 text-base font-medium mb-6 cursor-pointer p-1 hover:text-gray-800"
        >
          <span className="text-xl">←</span>
          Back to {subject?.name || "Subject"}
        </button>

        {/* Main grid layout: 8 cols for content, 4 cols for sidebar */}
        <div className="grid grid-cols-12 gap-4 max-w-7xl">
          {/* Left column: Lecture content (8 columns / 66%, or 12 columns / 100% when AI Summary tab is active) */}
          <div className={activeTab === "ai-summary" ? "col-span-12" : "col-span-8"}>
            {/* Lecture header */}
            <div className="mb-8">
              <div className="text-sm text-blue-600 font-semibold mb-2">
                {subject?.name ? `${subject.code ? subject.code + " - " : ""}${subject.name}` : ""}
              </div>

              {/* Title - editable */}
              {isEditingTitle ? (
                <div className="mb-4">
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="w-full text-4xl font-bold p-2 border-2 border-blue-600 rounded-md font-inherit leading-tight"
                    autoFocus
                  />
                  <div className="mt-2 flex gap-3">
                    <button
                      onClick={handleSaveTitle}
                      className="px-3 py-1.5 bg-blue-600 text-white border-0 rounded-md cursor-pointer text-sm font-semibold hover:bg-blue-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingTitle(false);
                        setEditedTitle(lecture?.title || "");
                      }}
                      className="px-3 py-1.5 bg-gray-200 text-gray-800 border-0 rounded-md cursor-pointer text-sm font-semibold hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <h1 className="font-bold text-4xl mb-4 leading-tight">
                  {lecture.title || "Untitled Lecture"}
                </h1>
              )}

              {/* Metadata row */}
              <div className="flex gap-6 flex-wrap text-gray-600 text-sm mb-4">
                <div className="flex items-center gap-2">
                  <span>📅</span>
                  {formatDate(lecture.createdAt)}
                </div>
                {transcript?.duration && (
                  <div className="flex items-center gap-2">
                    <span>⏱️</span>
                    {formatDuration(transcript.duration)}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span>📄</span>
                  {getWordCount(transcript?.text)} words
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white border-0 rounded-lg text-sm font-semibold cursor-pointer transition-colors hover:bg-blue-700"
                >
                  📥 Export
                </button>
                <button
                  onClick={() => {
                    if (activeTab === "transcription") {
                      setIsEditingTranscript(true);
                    } else {
                      setIsEditingTitle(true);
                    }
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-600 border border-gray-300 rounded-lg text-sm font-semibold cursor-pointer transition-colors hover:bg-gray-50"
                >
                  ✏️ Edit
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b-2 border-gray-200">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-3 bg-transparent border-0 text-sm font-semibold cursor-pointer transition-all mb-[-2px] flex items-center gap-2 ${
                    activeTab === tab.id
                      ? "border-b-3 border-blue-600 text-blue-600"
                      : "border-b-3 border-transparent text-gray-600 hover:text-gray-800"
                  }`}
                  style={{
                    borderBottomWidth: "3px",
                    borderBottomColor: activeTab === tab.id ? "#2563eb" : "transparent",
                  }}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content area with improved styling */}
            <div className="bg-white border border-gray-200 rounded-xl p-8 min-h-[500px] max-h-[70vh] overflow-auto leading-relaxed text-base text-gray-800">
              {getTabContent()}
            </div>

            {/* Font size controls (only show for transcription) */}
            {activeTab === "transcription" && !isEditingTranscript && (
              <div className="mt-3 flex items-center gap-3">
                <button
                  className="rounded border border-gray-300 px-2 py-1 text-sm hover:bg-gray-50"
                  onClick={() => setFontScale((s) => Math.min(1.4, +(s + 0.1).toFixed(2)))}
                >
                  A+
                </button>
                <button
                  className="rounded border border-gray-300 px-2 py-1 text-sm hover:bg-gray-50"
                  onClick={() => setFontScale((s) => Math.max(0.8, +(s - 0.1).toFixed(2)))}
                >
                  A-
                </button>
                <div className="text-sm text-gray-500">Double-click text to clear highlight</div>
              </div>
            )}
          </div>

          {/* Right column: Sidebar (4 columns / 33%) - Hidden when AI Summary tab is active */}
          {activeTab !== "ai-summary" && (
            <div className="col-span-4">
              {/* Glossary Card */}
              <div className="rounded-xl border border-gray-300 bg-white p-4 mb-3 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📚</span>
                  <h3 className="text-base font-semibold text-gray-800">Glossary</h3>
                </div>
                <button
                  onClick={() => setIsAddingKeyword(!isAddingKeyword)}
                  className="text-blue-600 text-xl font-bold hover:text-blue-700 cursor-pointer"
                  title="Add new term"
                >
                  +
                </button>
              </div>

              {/* Add keyword form */}
              {isAddingKeyword && (
                <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="text"
                    placeholder="Term"
                    value={newKeywordTerm}
                    onChange={(e) => setNewKeywordTerm(e.target.value)}
                    className="w-full px-2 py-1 mb-2 text-sm border border-gray-300 rounded"
                  />
                  <textarea
                    placeholder="Definition"
                    value={newKeywordDef}
                    onChange={(e) => setNewKeywordDef(e.target.value)}
                    className="w-full px-2 py-1 mb-2 text-sm border border-gray-300 rounded resize-none"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddKeyword}
                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setIsAddingKeyword(false);
                        setNewKeywordTerm("");
                        setNewKeywordDef("");
                      }}
                      className="px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {keywords.length > 0 ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {keywords.map((keyword, idx) => (
                    <div key={idx} className="pb-3 border-b border-gray-100 last:border-0 group">
                      <div className="flex items-start justify-between">
                        <button
                          onClick={() => {
                            setSelectedTerm(selectedTerm === keyword.term ? "" : keyword.term);
                            setActiveTab("transcription");
                          }}
                          className={`text-left flex-1 text-sm font-semibold mb-1 cursor-pointer transition-colors ${
                            selectedTerm === keyword.term ? "text-blue-600" : "text-blue-600 hover:text-blue-700"
                          }`}
                        >
                          {keyword.term}
                        </button>
                        <button
                          onClick={() => handleRemoveKeyword(idx)}
                          className="text-red-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                          title="Remove term"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="text-xs text-gray-600 leading-relaxed">
                        {keyword.definition}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No keywords available for this lecture</p>
              )}
            </div>

            {/* Summary Card */}
            {lecture.summary && (
              <div className="rounded-xl border border-gray-300 bg-white p-4 mb-3 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">✨</span>
                  <h3 className="text-base font-semibold text-gray-800">Summary</h3>
                </div>
                <div className="text-sm text-gray-700 leading-relaxed">
                  {lecture.summary}
                </div>
              </div>
            )}

            {/* Key Points Card */}
            {lecture.keyPoints && lecture.keyPoints.length > 0 && (
              <div className="rounded-xl border border-gray-300 bg-white p-4 mb-3 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">💡</span>
                  <h3 className="text-base font-semibold text-gray-800">Key Points</h3>
                </div>
                <ul className="list-disc ml-5 text-sm space-y-1 text-gray-700">
                  {lecture.keyPoints.map((point, i) => (
                    <li key={i} className="leading-relaxed">{point}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Review Questions Card */}
            {lecture.questions && lecture.questions.length > 0 && (
              <div className="rounded-xl border border-gray-300 bg-white p-4 mb-3 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">❓</span>
                  <h3 className="text-base font-semibold text-gray-800">Review Questions</h3>
                </div>
                <ol className="list-decimal ml-5 text-sm space-y-2 text-gray-700">
                  {lecture.questions.map((q, i) => (
                    <li key={i} className="leading-relaxed">{q}</li>
                  ))}
                </ol>
              </div>
            )}

            {/* Key Timestamps */}
            <div className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">⚡</span>
                <h3 className="text-base font-semibold text-gray-800">Key Timestamps</h3>
              </div>
              <div className="text-sm text-gray-700 space-y-2">
                <div className="flex gap-2">
                  <span className="text-blue-600 font-mono">00:00</span>
                  <span>Introduction</span>
                </div>
                {keywords.length > 0 && (
                  <div className="flex gap-2">
                    <span className="text-blue-600 font-mono">05:23</span>
                    <span>{keywords[0]?.term || "Key concept"}</span>
                  </div>
                )}
                {keywords.length > 1 && (
                  <div className="flex gap-2">
                    <span className="text-blue-600 font-mono">12:45</span>
                    <span>{keywords[1]?.term || "Main topic"}</span>
                  </div>
                )}
              </div>
            </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
