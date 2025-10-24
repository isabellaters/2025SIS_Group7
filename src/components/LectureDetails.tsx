// src/components/LectureDetail.tsx
import React, { useEffect, useState } from "react";
import axios from "axios";

interface LectureDetailProps {
  sidebarCollapsed: boolean;
  lectureId: string;
  subjectId: string;
  onBack: () => void;
}

type Tab = "transcription" | "translation" | "notes";

const mockTranscription = `Welcome to today's lecture on Neural Networks...`;
const mockTranslation = `Bienvenue à la conférence d'aujourd'hui sur les réseaux de neurones...`;
const mockNotes = `## Key Concepts\n\n### Perceptron\n- Simplest neural network unit...`;

export default function LectureDetail({
  sidebarCollapsed,
  lectureId,
  subjectId,
  onBack,
}: LectureDetailProps) {
  const [activeTab, setActiveTab] = useState<Tab>("transcription");
  const [lecture, setLecture] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ Fetch real lecture from backend
  useEffect(() => {
    async function fetchLecture() {
      try {
        const res = await axios.get(`http://localhost:3001/api/lectures/${lectureId}`);
        setLecture(res.data);
      } catch (err) {
        console.error("Error fetching lecture:", err);
        setLecture(null);
      } finally {
        setIsLoading(false);
      }
    }
    fetchLecture();
  }, [lectureId]);

  // ✅ Handle loading & not found
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

  // ✅ Safe date formatter
  function formatDate(date: any): string {
    try {
      const d = new Date(date.seconds ? date.seconds * 1000 : date);
      return d.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }

  function getTabContent(): string {
    switch (activeTab) {
      case "transcription":
        return mockTranscription;
      case "translation":
        return mockTranslation;
      case "notes":
        return mockNotes;
    }
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "transcription", label: "Transcription", icon: "📝" },
    { id: "translation", label: "Translation", icon: "🌐" },
    { id: "notes", label: "Notes", icon: "📋" },
  ];

  return (
    <div style={{ display: "flex", height: "100vh", flex: 1 }}>
      {/* Main content area */}
      <section
        style={{
          flex: 1,
          background: "#fafafa",
          overflowY: "auto",
          padding: sidebarCollapsed
            ? "48px 24px 24px 24px"
            : "48px 56px 24px 48px",
          transition: "padding 0.2s",
        }}
      >
        {/* Back button */}
        <button
          onClick={onBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "#666",
            background: "transparent",
            border: "none",
            fontSize: "0.95rem",
            fontWeight: 500,
            marginBottom: 24,
            cursor: "pointer",
            padding: "4px 0",
          }}
        >
          <span style={{ fontSize: 20 }}>←</span>
          Back to Dashboard
        </button>

        {/* Lecture header */}
        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              fontSize: "0.9rem",
              color: "#2563eb",
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            {lecture.subjectId || "Unknown Subject"}
          </div>
          <h1
            style={{
              fontWeight: 700,
              fontSize: "2.3rem",
              marginBottom: 16,
              lineHeight: 1.2,
            }}
          >
            {lecture.title || "Untitled Lecture"}
          </h1>

          {/* Metadata row */}
          <div
            style={{
              display: "flex",
              gap: 24,
              flexWrap: "wrap",
              color: "#666",
              fontSize: "0.95rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span>📅</span>
              {lecture.createdAt ? formatDate(lecture.createdAt) : "—"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span>📄</span>
              {lecture.transcriptId ? `Transcript: ${lecture.transcriptId}` : "No transcript"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span>⚙️</span>
              {lecture.status || "Processing"}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 24,
            borderBottom: "2px solid #e5e5e5",
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "12px 20px",
                background: "transparent",
                border: "none",
                borderBottom:
                  activeTab === tab.id
                    ? "3px solid #2563eb"
                    : "3px solid transparent",
                color: activeTab === tab.id ? "#2563eb" : "#666",
                fontSize: "0.95rem",
                fontWeight: 600,
                cursor: "pointer",
                marginBottom: -2,
                transition: "all 0.15s",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e5e5",
            borderRadius: 12,
            padding: activeTab === "notes" ? 32 : 40,
            minHeight: 500,
            maxWidth: 900,
            lineHeight: 1.8,
            fontSize: "1.05rem",
            color: "#222",
            whiteSpace: "pre-wrap",
          }}
        >
          {getTabContent()}
        </div>
      </section>
    </div>
  );
}