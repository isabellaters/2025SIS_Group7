import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE_URL = "http://localhost:3001";

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
  const [subject, setSubject] = useState<any>(null);
  const [lectures, setLectures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  const fetchData = async () => {
    try {
      // ✅ Fetch all subjects
      const subjRes = await axios.get("http://localhost:3001/subjects");
      const allSubjects = subjRes.data || [];

      console.log("✅ All subjects:", allSubjects);
      console.log("🧩 subjectId type and value:", subjectId, typeof subjectId);
      console.log("🔍 Looking for subjectId:", subjectId);

      // ✅ Match subject by ID
      const matched = allSubjects.find((s: any) => s.id === subjectId);
      console.log("🎯 Matched subject:", matched);

      setSubject(matched);

      // ✅ Fetch all lectures under that subject
      const lecRes = await axios.get(`http://localhost:3001/lectures/subject/${subjectId}`);
      setLectures(lecRes.data || []);
    } catch (err) {
      console.error("Error loading subject page:", err);
      setSubject(null);
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, [subjectId]);

  if (loading) {
    return (
      <div style={{ padding: 48, flex: 1 }}>
        <h2>Loading...</h2>
      </div>
    );
  }

  if (!subject) {
    return (
      <div style={{ padding: 48, flex: 1 }}>
        <h2>Subject not found</h2>
        <button onClick={onBackToDashboard}>Back to Dashboard</button>
      </div>
    );
  }

  function formatDate(raw: any): string {
    try {
      const date = raw && raw._seconds ? new Date(raw._seconds * 1000) : new Date(raw);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "Unknown date";
    }
  }

  return (
    <section
      style={{
        flex: 1,
        background: "#fafafa",
        overflowY: "auto",
        padding: sidebarCollapsed ? "48px 24px 24px 24px" : "48px 56px 24px 48px",
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
      >
        <span style={{ fontSize: 20 }}>←</span>
        Back to Dashboard
      </button>

      <h1 style={{ fontWeight: 700, fontSize: "2.3rem", marginBottom: 8 }}>
        {subject.name}
      </h1>
      <div style={{ color: "#666", marginBottom: 38, fontSize: "1.05rem" }}>
        {subject.code} · {subject.term || "No term"}
      </div>

      <h2 style={{ fontWeight: 700, fontSize: "1.4rem", marginBottom: 24 }}>My Files</h2>

      {/* Lectures grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: 24,
          maxWidth: 1400,
        }}
      >
        {lectures.length === 0 ? (
          <p style={{ color: "#777" }}>No lectures yet.</p>
        ) : (
          lectures.map((lecture) => (
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
                cursor: "pointer",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
              onClick={() => onViewLecture(lecture.id)}
            >
              <div style={{ fontWeight: 700, fontSize: "1.2rem" }}>
                {lecture.title || "Untitled Lecture"}
              </div>

              <div style={{ color: "#666", fontSize: "0.95rem" }}>
                📅 {formatDate(lecture.date || lecture.createdAt)}
              </div>
              <div style={{ color: "#666", fontSize: "0.95rem" }}>
                ⏱️ {lecture.duration || "Unknown duration"}
              </div>
              <div style={{ color: "#666", fontSize: "0.95rem" }}>
                📄 {lecture.wordCount || 0} words
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}