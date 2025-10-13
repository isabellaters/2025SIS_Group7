import React from "react";
import { getAllSubjects } from "../lib/mockData";

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
  const subjects = getAllSubjects();

  return (
    <div style={{ display: 'flex', height: '100vh', flex: 1 }}>
      {/* Main dashboard content */}
      <section style={{
        flex: 2.1,
        padding: sidebarCollapsed ? '48px 24px 24px 24px' : '48px 56px 24px 48px',
        transition: 'padding 0.2s',
        overflowY: 'auto',
      }}>
        <h1 style={{ fontWeight: 700, fontSize: '2.3rem', marginBottom: 8 }}>Dashboard</h1>
        <div style={{ color: '#686868', marginBottom: 38, fontSize: '1.05rem' }}>
          Welcome back, John! Here are your subjects and recent activity.
        </div>
      
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
          {subjects.map((s) => (
            <div
              key={s.id}
              style={{
                border: '1px solid #eee',
                borderRadius: 16,
                background: '#fff',
                padding: '24px',
                minHeight: 120,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'box-shadow 0.12s',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              }}
              onClick={() => onSubjectClick(s.id)}
              onMouseOver={e => (e.currentTarget.style.boxShadow = '0 4px 18px rgba(37,99,235,0.08)')}
              onMouseOut={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)')}
            >
              <div style={{ fontWeight: 700, fontSize: '1.17rem', marginBottom: 7 }}>{s.name}</div>
              <div style={{ color: '#777', fontWeight: 500, fontSize: '0.97rem' }}>
                {s.code} · {s.term} · {s.recordings} recordings
              </div>
            </div>
          ))}
          
          {/* New Subject card */}
          <div 
            style={{ 
              border: '1.5px dashed #cacaca', 
              borderRadius: 16, 
              background: '#f9f9f9', 
              padding: '24px', 
              minHeight: 120, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: '#888', 
              fontSize: '1.11rem', 
              flexDirection: 'column', 
              gap: 5, 
              cursor: 'pointer' 
            }}
            onClick={() => alert('Add New Subject coming soon!')}
          >
            <span style={{ fontSize: '2.05rem', marginBottom: 4 }}>+</span>
            Add New Subject
          </div>
        </div>
      </section>
      
      {/* Right sidebar for recent recordings */}
      {/* <aside style={{ 
        width: 320, 
        background: '#fff', 
        borderLeft: '1px solid #eee', 
        padding: '48px 38px 24px 38px', 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100vh',
        overflowY: 'auto',
      }}>
        <h2 style={{ fontWeight: 700, fontSize: '1.19rem', marginBottom: 23 }}>Recent Recordings</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {recents.map(r => (
            <div key={r.title} style={{ cursor: 'pointer' }}>
              <div style={{ fontWeight: 500, fontSize: '1.07rem', marginBottom: 1 }}>{r.title}</div>
              <div style={{ color: '#888', fontSize: '0.95rem' }}>{r.subject} · {r.time}</div>
            </div>
          ))}
        </div>
      </aside> */}
    </div>
  );
}
