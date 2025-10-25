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

export default function LectureDetail({
  sidebarCollapsed,
  lectureId,
  subjectId,
  onBack,
}: LectureDetailProps) {
  const [activeTab, setActiveTab] = useState<Tab>("transcription");
  const [lecture, setLecture] = useState<any | null>(null);
  const [transcript, setTranscript] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch lecture and transcript
  useEffect(() => {
    async function fetchData() {
      try {
        const lectureRes = await axios.get(`http://localhost:3001/api/lectures/${lectureId}`);
        const lectureData = lectureRes.data;
        setLecture(lectureData);

        if (lectureData?.transcriptId) {
          const transcriptRes = await axios.get(`http://localhost:3001/api/transcripts/${lectureData.transcriptId}`);
          setTranscript(transcriptRes.data);
        }
      } catch (err) {
        console.error("Error fetching lecture or transcript:", err);
        setLecture(null);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [lectureId]);

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
    if (activeTab === "transcription") {
      return transcript?.text || "No transcription available.";
    }
    if (activeTab === "translation") {
      return transcript?.translation || "No translation available.";
    }
    if (activeTab === "notes") {
      return lecture?.notes || "No notes available.";
    }
    return "";
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "transcription", label: "Transcription" },
    { id: "translation", label: "Translation" },
    { id: "notes", label: "Notes" },
  ];

  return (
    <div style={{ display: "flex", height: "100vh", flex: 1 }}>
      <section
        style={{
          flex: activeTab === "transcription" && lecture?.keywords?.length ? 0.7 : 1,
          background: "#fafafa",
          overflowY: "auto",
          padding: sidebarCollapsed
            ? "48px 24px 24px 24px"
            : "48px 56px 24px 48px",
          transition: "padding 0.2s",
        }}
      >
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
              {tab.label}
            </button>
          ))}
        </div>

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

      {activeTab === "transcription" && lecture?.keywords?.length > 0 && (
        <aside
          style={{
            flex: 0.3,
            background: "#fff",
            borderLeft: "1px solid #e5e5e5",
            padding: "48px 32px",
            overflowY: "auto",
          }}
        >
          <div style={{ marginBottom: 48 }}>
            <h3
              style={{
                fontWeight: 700,
                fontSize: "1.25rem",
                marginBottom: 16,
                color: "#111",
              }}
            >
              Glossary
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {lecture.keywords.map((item: any, i: number) => (
                <div key={i}>
                  <div
                    style={{
                      fontWeight: 600,
                      color: "#2563eb",
                      marginBottom: 4,
                    }}
                  >
                    {item.term}
                  </div>
                  <div
                    style={{
                      color: "#444",
                      fontSize: "0.95rem",
                      lineHeight: 1.5,
                    }}
                  >
                    {item.definition}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {lecture.timestamps && lecture.timestamps.length > 0 && (
            <div>
              <h3
                style={{
                  fontWeight: 700,
                  fontSize: "1.25rem",
                  marginBottom: 16,
                  color: "#111",
                }}
              >
                Key Timestamps
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {lecture.timestamps.map((t: any, i: number) => (
                  <div key={i} style={{ display: "flex", gap: 12 }}>
                    <div style={{ color: "#2563eb", fontWeight: 600, minWidth: 50 }}>
                      {t.time}
                    </div>
                    <div style={{ color: "#444", fontSize: "0.95rem" }}>
                      {t.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      )}
    </div>
  );
}