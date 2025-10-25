import React, { useState } from "react";
import axios from "axios";
import { useSubjects, invalidateSubjectsCache } from "../hooks/useSubjects";
import { ConfirmModal } from "./ConfirmModal";
import { AlertModal } from "./AlertModal";

interface DashboardMainProps {
  sidebarCollapsed: boolean;
  onSubjectClick: (subjectId: string) => void;
  onNewRecording: () => void;
}

const recents = [
  { title: "Lecture 12: Graph Algorithms", subject: "Data Structures & Algorithms", time: "2 hours ago" },
  { title: "Neural Networks Introduction", subject: "Machine Learning", time: "Yesterday" },
  { title: "Agile Methodology", subject: "Software Engineering", time: "2 days ago" }
];

export default function DashboardMain({ sidebarCollapsed, onSubjectClick }: DashboardMainProps) {
  // ✅ Use optimized hook with caching
  const { subjects, loading: subjectsLoading, error: subjectsError, refetch } = useSubjects();

  // --- Add Subject Modal state ---
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    code: "",
    term: "",
  });

  // --- Custom modal states ---
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    danger: false,
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

  // ✅ UPDATED handleAddSubject: invalidates cache and refetches
  const handleAddSubject = async () => {
    if (!form.name || !form.code) {
      setError("Please enter name and code");
      return;
    }

    setLoading(true);
    setError("");
    try {
      // Create subject in backend
      const res = await axios.post("http://localhost:3001/subjects", form);
      console.log("Subject added:", res.data);

      // Invalidate cache and refresh subjects list
      invalidateSubjectsCache();
      await refetch();

      setShowModal(false);
      setForm({ name: "", code: "", term: "" });

      // Show success alert
      setAlertModal({
        isOpen: true,
        title: "Success!",
        message: "Subject added successfully!",
        type: "success",
      });
    } catch (err) {
      console.error(err);
      setError("Failed to add subject. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle delete subject
  const handleDeleteSubject = (subjectId: string, subjectName: string, lectureCount: number) => {
    const message = lectureCount > 0
      ? `This will permanently delete this subject and all ${lectureCount} ${lectureCount === 1 ? 'lecture' : 'lectures'} saved inside it.\n\nAll recordings, transcripts, and data associated with ${lectureCount === 1 ? 'this lecture' : 'these lectures'} will be lost.\n\nThis action cannot be undone.`
      : `This will permanently delete this subject.\n\nThis action cannot be undone.`;

    setConfirmModal({
      isOpen: true,
      title: `Delete "${subjectName}"?`,
      message,
      danger: true,
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });

        try {
          await axios.delete(`http://localhost:3001/subjects/${subjectId}`);

          // Invalidate cache and refresh
          invalidateSubjectsCache();
          await refetch();

          setAlertModal({
            isOpen: true,
            title: "Deleted!",
            message: `Subject "${subjectName}" deleted successfully!`,
            type: "success",
          });
        } catch (err: any) {
          console.error("Error deleting subject:", err);
          setAlertModal({
            isOpen: true,
            title: "Error",
            message: `Failed to delete subject: ${err.response?.data?.error || err.message}`,
            type: "error",
          });
        }
      },
    });
  };

  return (
    <div style={{ display: "flex", height: "100vh", flex: 1 }}>
      {/* Main dashboard content */}
      <section
        style={{
          flex: 2.1,
          padding: sidebarCollapsed ? "48px 24px 24px 24px" : "48px 56px 24px 48px",
          transition: "padding 0.2s",
          overflowY: "auto",
        }}
      >
        <h1 className="heading-brand"style={{ fontWeight: 700, fontSize: "2.3rem", marginBottom: 8 }}>Dashboard</h1>
        <div style={{ color: "#686868", marginBottom: 38, fontSize: "1.05rem" }}>
          Welcome back, John! Here are your subjects and recent activity.
        </div>

        {subjectsLoading ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div
              style={{
                width: 56,
                height: 56,
                border: "4px solid #e5e7eb",
                borderTop: "4px solid #2563eb",
                borderRadius: "50%",
                margin: "0 auto 20px",
                animation: "spin 1s linear infinite",
              }}
            />
            <div style={{ color: "#666", fontSize: "1.1rem" }}>Loading subjects...</div>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        ) : subjectsError ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ color: "#ef4444", fontSize: "1.1rem", marginBottom: 12 }}>
              Failed to load subjects
            </div>
            <button
              onClick={() => refetch()}
              style={{
                background: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: 8,
                padding: "10px 20px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
            {subjects.map((s) => (
            <div
              key={s.id || s.docId}
              style={{
                border: "1px solid #eee",
                borderRadius: 16,
                background: "#fff",
                padding: "24px",
                minHeight: 120,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                cursor: "pointer",
                transition: "box-shadow 0.12s",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                position: "relative",
              }}
              onClick={() => {
                console.log("🖱️ Subject clicked:", s);
                onSubjectClick(s.id || s.docId);
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.boxShadow = "0 4px 18px rgba(37,99,235,0.08)")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.03)")
              }
            >
              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteSubject(s.id, s.name, s.lectureIds?.length || 0);
                }}
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  background: "transparent",
                  border: "none",
                  color: "#999",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.15s",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "#fee";
                  e.currentTarget.style.color = "#ef4444";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#999";
                }}
                title="Delete subject"
              >
                ×
              </button>

              <div style={{ fontWeight: 700, fontSize: "1.17rem", marginBottom: 7 }}>{s.name}</div>
              <div style={{ color: "#777", fontWeight: 500, fontSize: "0.97rem" }}>
                {s.code} · {s.term || "No term"} · {s.lectureIds?.length || 0} {s.lectureIds?.length === 1 ? "lecture" : "lectures"}
              </div>
            </div>
          ))}

          {/* Add New Subject card */}
          <div
            style={{
              border: "1.5px dashed #cacaca",
              borderRadius: 16,
              background: "#f9f9f9",
              padding: "24px",
              minHeight: 120,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#2563eb",
              fontWeight: 600,
              fontSize: "1.1rem",
              flexDirection: "column",
              gap: 5,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onClick={() => setShowModal(true)}
            onMouseOver={(e) => (e.currentTarget.style.background = "#f1f5ff")}
            onMouseOut={(e) => (e.currentTarget.style.background = "#f9f9f9")}
          >
            <span style={{ fontSize: "2rem", marginBottom: 4 }}>+</span>
            Add New Subject
          </div>
          </div>
        )}
      </section>

      {/* --- Add Subject Modal --- */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 999,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: "32px 40px",
              width: "400px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <h2 style={{ fontWeight: 700, fontSize: "1.5rem" }}>
              Add New Subject
            </h2>

            <input
              placeholder="Subject Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #ddd",
              }}
            />
            <input
              placeholder="Subject Code"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #ddd",
              }}
            />
            <input
              placeholder="Term (Optional)"
              value={form.term}
              onChange={(e) => setForm({ ...form, term: e.target.value })}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #ddd",
              }}
            />

            {error && (
              <div style={{ color: "red", fontSize: "0.9rem" }}>{error}</div>
            )}

            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <button
                onClick={handleAddSubject}
                disabled={loading}
                style={{
                  flex: 1,
                  background: "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 0",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {loading ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  flex: 1,
                  background: "#e5e7eb",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 0",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Modals */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        danger={confirmModal.danger}
        confirmText="Delete"
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
    </div>
  );
}