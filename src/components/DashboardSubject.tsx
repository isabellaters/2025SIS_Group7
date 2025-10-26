import React, { useEffect, useState } from "react";
import axios from "axios";
import { useSubject, useSubjects, invalidateSubjectsCache } from "../hooks/useSubjects";
import { ConfirmModal } from "./ConfirmModal";
import { AlertModal } from "./AlertModal";
import { LectureService } from "../apis/lecture";

const API_BASE_URL = "http://localhost:3001";

interface SubjectDashboardProps {
  sidebarCollapsed: boolean;
  subjectId: string;
  onBackToDashboard: () => void;
  onViewLecture: (lectureId: string) => void;
  onNewRecording: () => void;
}

interface KeywordDefinition {
  term: string;
  definition: string;
}

export default function SubjectDashboard({
  sidebarCollapsed,
  subjectId,
  onBackToDashboard,
  onViewLecture,
  onNewRecording,
}: SubjectDashboardProps) {
  // ✅ Use optimized hook for single subject fetch
  const { subject, loading: subjectLoading, error: subjectError } = useSubject(subjectId);
  const { subjects } = useSubjects(); // For move lecture dropdown
  const [lectures, setLectures] = useState<any[]>([]);
  const [lecturesLoading, setLecturesLoading] = useState(true);
  const [movingLecture, setMovingLecture] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"lectures" | "glossary">("lectures");
  const [megaGlossary, setMegaGlossary] = useState<KeywordDefinition[]>([]);
  const [loadingLectureId, setLoadingLectureId] = useState<string | null>(null);

  // --- Custom modal states ---
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "info";
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
  });

  // Fetch lectures for this subject
  const fetchLectures = async () => {
    setLecturesLoading(true);
    try {
      const lecRes = await axios.get(`${API_BASE_URL}/lectures/subject/${subjectId}`);
      const lecturesData = lecRes.data || [];
      setLectures(lecturesData);

      // Build mega glossary from all lectures
      buildMegaGlossary(lecturesData);
    } catch (err) {
      console.error("Error loading lectures:", err);
    } finally {
      setLecturesLoading(false);
    }
  };

  // Build mega glossary combining all lecture keywords
  const buildMegaGlossary = (lecturesData: any[]) => {
    const glossaryMap = new Map<string, string>();

    lecturesData.forEach(lecture => {
      if (lecture.keywords && Array.isArray(lecture.keywords)) {
        lecture.keywords.forEach((kwStr: string) => {
          // Parse keyword format: "term: definition"
          const colonIndex = kwStr.indexOf(':');
          if (colonIndex > 0) {
            const term = kwStr.substring(0, colonIndex).trim();
            const definition = kwStr.substring(colonIndex + 1).trim();
            const termLower = term.toLowerCase();

            // Only add if not already present (avoid duplicates, case-insensitive)
            if (!glossaryMap.has(termLower)) {
              glossaryMap.set(termLower, JSON.stringify({ term, definition }));
            }
          }
        });
      }
    });

    // Convert map back to array and sort alphabetically
    const glossaryArray = Array.from(glossaryMap.values())
      .map(jsonStr => JSON.parse(jsonStr) as KeywordDefinition)
      .sort((a, b) => a.term.localeCompare(b.term));

    setMegaGlossary(glossaryArray);
  };

  useEffect(() => {
    if (subjectId) {
      fetchLectures();
    }
  }, [subjectId]);

  // Handle deleting lecture
  const handleDeleteLecture = async (lectureId: string, lectureTitle: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Lecture",
      message: `Are you sure you want to delete "${lectureTitle}"? This action cannot be undone.`,
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        try {
          await LectureService.deleteLecture(lectureId);

          // Invalidate subjects cache to update lecture count on main dashboard
          invalidateSubjectsCache();

          setAlertModal({
            isOpen: true,
            title: "Success",
            message: "Lecture deleted successfully",
            type: "success",
          });
          fetchLectures(); // Refresh the list
        } catch (err) {
          setAlertModal({
            isOpen: true,
            title: "Error",
            message: "Failed to delete lecture. Please try again.",
            type: "error",
          });
        }
      },
    });
  };

  // Handle moving lecture to different subject
  const handleMoveLecture = (lectureId: string, toSubjectId: string) => {
    if (!toSubjectId || toSubjectId === subjectId) {
      return;
    }

    const targetSubject = subjects.find(s => s.id === toSubjectId);
    if (!targetSubject) return;

    setConfirmModal({
      isOpen: true,
      title: "Move Lecture?",
      message: `Move this lecture to "${targetSubject.name}"?`,
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        setMovingLecture(lectureId);

        try {
          await axios.patch(`${API_BASE_URL}/lectures/${lectureId}/move`, {
            fromSubjectId: subjectId,
            toSubjectId: toSubjectId,
          });

          // Invalidate subjects cache to update lecture count on main dashboard
          invalidateSubjectsCache();

          // Refresh lectures list
          await fetchLectures();

          setAlertModal({
            isOpen: true,
            title: "Moved!",
            message: `Lecture moved to "${targetSubject.name}" successfully!`,
            type: "success",
          });
        } catch (err: any) {
          console.error("Error moving lecture:", err);
          setAlertModal({
            isOpen: true,
            title: "Error",
            message: `Failed to move lecture: ${err.response?.data?.error || err.message}`,
            type: "error",
          });
        } finally {
          setMovingLecture(null);
        }
      },
    });
  };

  const isLoading = subjectLoading || lecturesLoading;

  if (subjectLoading) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "#fafafa",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 48,
              height: 48,
              border: "4px solid #e5e7eb",
              borderTop: "4px solid #2563eb",
              borderRadius: "50%",
              margin: "0 auto 16px",
              animation: "spin 1s linear infinite",
            }}
          />
          <div style={{ color: "#666", fontSize: "1rem" }}>Loading subject...</div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (subjectError || !subject) {
    return (
      <div
        style={{
          flex: 1,
          padding: 48,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "#fafafa",
        }}
      >
        <div style={{ color: "#ef4444", fontSize: "1.2rem", marginBottom: 16 }}>
          {subjectError ? "Error loading subject" : "Subject not found"}
        </div>
        <button
          onClick={onBackToDashboard}
          style={{
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: 8,
            padding: "10px 24px",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: "0.95rem",
          }}
        >
          Back to Dashboard
        </button>
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

      {/* View toggle tabs */}
      <div style={{ display: "flex", gap: 12, marginBottom: 32, borderBottom: "2px solid #e5e5e5" }}>
        <button
          onClick={() => setActiveView("lectures")}
          style={{
            background: "transparent",
            border: "none",
            padding: "12px 24px",
            fontSize: "1.1rem",
            fontWeight: 600,
            cursor: "pointer",
            borderBottom: activeView === "lectures" ? "3px solid #2563eb" : "3px solid transparent",
            color: activeView === "lectures" ? "#2563eb" : "#666",
            marginBottom: "-2px",
            transition: "all 0.2s",
          }}
        >
          📚 My Files
        </button>
        <button
          onClick={() => setActiveView("glossary")}
          style={{
            background: "transparent",
            border: "none",
            padding: "12px 24px",
            fontSize: "1.1rem",
            fontWeight: 600,
            cursor: "pointer",
            borderBottom: activeView === "glossary" ? "3px solid #2563eb" : "3px solid transparent",
            color: activeView === "glossary" ? "#2563eb" : "#666",
            marginBottom: "-2px",
            transition: "all 0.2s",
          }}
        >
          📖 Glossary ({megaGlossary.length})
        </button>
      </div>

      {/* Lectures view */}
      {activeView === "lectures" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 24,
            maxWidth: 1400,
          }}
        >
        {lecturesLoading ? (
          <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px 0" }}>
            <div
              style={{
                width: 40,
                height: 40,
                border: "3px solid #e5e7eb",
                borderTop: "3px solid #2563eb",
                borderRadius: "50%",
                margin: "0 auto 12px",
                animation: "spin 1s linear infinite",
              }}
            />
            <p style={{ color: "#777", fontSize: "0.95rem" }}>Loading lectures...</p>
          </div>
        ) : lectures.length === 0 ? (
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
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              <div
                style={{
                  cursor: "pointer",
                  opacity: loadingLectureId === lecture.id ? 0.6 : 1,
                  pointerEvents: loadingLectureId === lecture.id ? "none" : "auto",
                  position: "relative"
                }}
                onClick={() => {
                  setLoadingLectureId(lecture.id);
                  onViewLecture(lecture.id);
                }}
              >
                {loadingLectureId === lecture.id && (
                  <div style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    zIndex: 10
                  }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        border: "3px solid #e5e7eb",
                        borderTop: "3px solid #2563eb",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                      }}
                    />
                  </div>
                )}
                <div style={{ fontWeight: 700, fontSize: "1.2rem", marginBottom: 12 }}>
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

              {/* Actions row */}
              <div style={{ marginTop: 8, paddingTop: 12, borderTop: "1px solid #eee", display: "flex", gap: 8 }}>
                {/* Move to subject dropdown */}
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "0.85rem", color: "#666", marginBottom: 4, display: "block" }}>
                    Move to:
                  </label>
                  <select
                    value=""
                    onChange={(e) => handleMoveLecture(lecture.id, e.target.value)}
                    disabled={movingLecture === lecture.id}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: "100%",
                      padding: "6px 8px",
                      fontSize: "0.85rem",
                      border: "1px solid #ddd",
                      borderRadius: 6,
                      background: movingLecture === lecture.id ? "#f5f5f5" : "#fff",
                      cursor: movingLecture === lecture.id ? "not-allowed" : "pointer",
                    }}
                  >
                    <option value="">Select subject...</option>
                    {subjects
                      .filter(s => s.id !== subjectId)
                      .sort((a, b) => {
                        if (a.code === "MISC") return -1;
                        if (b.code === "MISC") return 1;
                        return a.name.localeCompare(b.name);
                      })
                      .map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.code !== "MISC" ? `(${s.code})` : ""}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteLecture(lecture.id, lecture.title || "Untitled Lecture");
                  }}
                  style={{
                    alignSelf: "flex-end",
                    padding: "6px 12px",
                    fontSize: "0.85rem",
                    background: "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                  title="Delete lecture"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
        </div>
      )}

      {/* Glossary view */}
      {activeView === "glossary" && (
        <div style={{ maxWidth: 1400 }}>
          {lecturesLoading ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  border: "3px solid #e5e7eb",
                  borderTop: "3px solid #2563eb",
                  borderRadius: "50%",
                  margin: "0 auto 12px",
                  animation: "spin 1s linear infinite",
                }}
              />
              <p style={{ color: "#777", fontSize: "0.95rem" }}>Loading glossary...</p>
            </div>
          ) : megaGlossary.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: "3rem", marginBottom: 16 }}>📚</div>
              <p style={{ color: "#777", fontSize: "1.1rem", marginBottom: 8 }}>No glossary terms yet</p>
              <p style={{ color: "#999", fontSize: "0.95rem" }}>
                Glossary terms will appear here once you have lectures with keywords
              </p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 24, color: "#666", fontSize: "0.95rem" }}>
                Showing {megaGlossary.length} unique terms from all lectures in this subject
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                  gap: 20,
                }}
              >
                {megaGlossary.map((keyword, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: "1px solid #e5e5e5",
                      borderRadius: 12,
                      background: "#fff",
                      padding: 20,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                      transition: "box-shadow 0.2s, transform 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <div
                      style={{
                        fontSize: "1.1rem",
                        fontWeight: 700,
                        color: "#2563eb",
                        marginBottom: 12,
                      }}
                    >
                      {keyword.term}
                    </div>
                    <div
                      style={{
                        fontSize: "0.95rem",
                        color: "#666",
                        lineHeight: "1.6",
                      }}
                    >
                      {keyword.definition}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Custom Modals */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.title === "Delete Lecture" ? "Delete" : "Move"}
        cancelText="Cancel"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />

      <AlertModal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
      />
    </section>
  );
}