import React, { useState, useEffect } from "react";
import axios from "axios";
// import { getAllSubjects } from "../lib/mockData";

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
  const [subjects, setSubjects] = useState<any[]>([]);
  
  // --- Fetch subjects from backend ---
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await axios.get("http://localhost:3001/subjects");
        console.log("📡 subjects from backend:", res.data);
        setSubjects(res.data);
      } catch (err) {
        console.error("Error fetching subjects:", err);
      }
    };
    fetchSubjects();
  }, []);

  // --- Add Subject Modal state ---
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    code: "",
    term: "",
  });

  // ✅ UPDATED handleAddSubject: now refreshes subjects immediately
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

      // Refresh subjects list after adding
      const res2 = await axios.get("http://localhost:3001/subjects");
      setSubjects(res2.data);

      alert("Subject added successfully!");
      setShowModal(false);
      setForm({ name: "", code: "", term: "" });
    } catch (err) {
      console.error(err);
      setError("Failed to add subject. Please try again.");
    } finally {
      setLoading(false);
    }
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
        <h1 style={{ fontWeight: 700, fontSize: "2.3rem", marginBottom: 8 }}>Dashboard</h1>
        <div style={{ color: "#686868", marginBottom: 38, fontSize: "1.05rem" }}>
          Welcome back, John! Here are your subjects and recent activity.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
          {subjects.map((s) => (
            <div
              key={s.id}
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
              }}
              onClick={() => onSubjectClick(s.id)}
              onMouseOver={(e) =>
                (e.currentTarget.style.boxShadow = "0 4px 18px rgba(37,99,235,0.08)")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.03)")
              }
            >
              <div style={{ fontWeight: 700, fontSize: "1.17rem", marginBottom: 7 }}>{s.name}</div>
              <div style={{ color: "#777", fontWeight: 500, fontSize: "0.97rem" }}>
                {s.code} · {s.term || "No term"} · {s.recordings || 0} recordings
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
    </div>
  );
}