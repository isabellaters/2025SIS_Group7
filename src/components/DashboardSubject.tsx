// src/components/SubjectDashboard.tsx
import React from "react";
import { getLecturesBySubjectId, getSubjectById } from "../lib/mockData";

interface SubjectDashboardProps {
  sidebarCollapsed: boolean;
  subjectId: string;
  onBackToDashboard: () => void;
  onViewLecture: (lectureId: string) => void;
  onNewRecording: () => void;
}

export default function SubjectDashboard({
  sidebarCollapsed,
  subjectId,
  onBackToDashboard,
  onViewLecture,
  onNewRecording,
}: SubjectDashboardProps) {
  const subject = getSubjectById(subjectId);
  const lectures = getLecturesBySubjectId(subjectId);

  if (!subject) {
    return (
      <div style={{ padding: 48, flex: 1 }}>
        <h2>Subject not found</h2>
        <button onClick={onBackToDashboard}>Back to Dashboard</button>
      </div>
    );
  }

  function formatDate(date: Date): string {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <section
      style={{
        flex: 1,
        background: "#fafafa",
        overflowY: "auto",
        padding: sidebarCollapsed
          ? "48px 24px 24px 24px"
          : "48px 56px 24px 48px",
        transition: "padding 0.2s",
        minHeight: "100vh",
      }}
    >
      {/* Back button */}
      <button
        onClick={onBackToDashboard}
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
        onMouseOver={(e) => (e.currentTarget.style.color = "#222")}
        onMouseOut={(e) => (e.currentTarget.style.color = "#666")}
      >
        <span style={{ fontSize: 20 }}>←</span>
        Back to Dashboard
      </button>

      {/* Subject header */}
      <h1
        style={{
          fontWeight: 700,
          fontSize: "2.3rem",
          marginBottom: 8,
          lineHeight: 1.2,
        }}
      >
        {subject.name}
      </h1>
      <div
        style={{
          color: "#666",
          marginBottom: 38,
          fontSize: "1.05rem",
        }}
      >
        {subject.code}
      </div>

      <h2 style={{ fontWeight: 700, fontSize: "1.4rem", marginBottom: 24 }}>
        My Files
      </h2>

      {/* Lectures grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: 24,
          maxWidth: 1400,
        }}
      >
        {lectures.map((lecture) => (
          <div
            key={lecture.id}
            style={{
              border: "1px solid #e5e5e5",
              borderRadius: 16,
              background: "#fff",
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              transition: "all 0.15s",
              cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.boxShadow =
                "0 4px 18px rgba(37,99,235,0.08)")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.boxShadow =
                "0 1px 3px rgba(0,0,0,0.04)")
            }
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: "1.2rem",
                marginBottom: 8,
              }}
            >
              {lecture.title}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "#666",
                fontSize: "0.95rem",
              }}
            >
              <span>📅</span>
              {formatDate(lecture.date)}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "#666",
                fontSize: "0.95rem",
              }}
            >
              <span>⏱️</span>
              {lecture.duration}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "#666",
                fontSize: "0.95rem",
              }}
            >
              <span>📄</span>
              {lecture.wordCount} words
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewLecture(lecture.id);
              }}
              style={{
                background: "#222",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "12px",
                fontSize: "1rem",
                fontWeight: 600,
                cursor: "pointer",
                marginTop: 8,
                transition: "all 0.15s",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.background = "#000")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.background = "#222")
              }
            >
              View
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}