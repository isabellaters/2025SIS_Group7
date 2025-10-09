import React, { useState } from "react";
import Sidebar from './components/Sidebar';
import DashboardMain from './components/DashboardMain';
import SubjectDashboard from './components/DashboardSubject';
import LectureDetails from './components/LectureDetails';
import NewRecording from './components/NewRecording';

// Navigation types
type Screen = 
  | { type: 'dashboard' }
  | { type: 'subject'; subjectId: string }
  | { type: 'lecture'; lectureId: string; fromSubjectId: string }; // Track where we came from!

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<Screen>({ type: 'dashboard' });

  // Navigation handlers
  function navigateToDashboard() {
    setCurrentScreen({ type: 'dashboard' });
  }

  function navigateToSubject(subjectId: string) {
    setCurrentScreen({ type: 'subject', subjectId });
  }

  function navigateToLecture(lectureId: string, fromSubjectId: string) {
    setCurrentScreen({ type: 'lecture', lectureId, fromSubjectId });
  }

  function navigateBackFromLecture() {
    // If we're on a lecture, go back to the subject it came from
    if (currentScreen.type === 'lecture') {
      setCurrentScreen({ type: 'subject', subjectId: currentScreen.fromSubjectId });
    } else {
      // Fallback to dashboard
      setCurrentScreen({ type: 'dashboard' });
    }
  }

  function openRecordingModal() {
    setShowRecordingModal(true);
  }

  function closeRecordingModal() {
    setShowRecordingModal(false);
  }

  // Render the appropriate screen
  function renderScreen() {
    switch (currentScreen.type) {
      case 'dashboard':
        return (
          <DashboardMain 
            sidebarCollapsed={sidebarCollapsed}
            onSubjectClick={navigateToSubject}
          />
        );
      
      case 'subject':
        return (
          <SubjectDashboard
            sidebarCollapsed={sidebarCollapsed}
            subjectId={currentScreen.subjectId}
            onBackToDashboard={navigateToDashboard}
            onViewLecture={(lectureId) => navigateToLecture(lectureId, currentScreen.subjectId)}
            onNewRecording={openRecordingModal}
          />
        );
      
      case 'lecture':
        // Placeholder for lecture detail view
        return (
          <div style={{ padding: 48, flex: 1, background: '#fafafa', overflowY: 'auto' }}>
            <button 
              onClick={navigateBackFromLecture}
              style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 32,
                padding: '8px 0',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: 500,
                color: '#666',
              }}
              onMouseOver={(e) => (e.currentTarget.style.color = '#222')}
              onMouseOut={(e) => (e.currentTarget.style.color = '#666')}
            >
              <span style={{ fontSize: 20 }}>←</span>
              Back to Dashboard
            </button>
            
            <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 16 }}>
              Lecture Detail View
            </h1>
            <p style={{ fontSize: '1.1rem', marginBottom: 8 }}>
              Lecture ID: {currentScreen.lectureId}
            </p>
            <p style={{ color: '#666', marginTop: 20, fontSize: '1rem' }}>
              This view will show lecture transcription, translation, notes, etc.
            </p>
          </div>
        );
    }
  }

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(x => !x)}
        onNewRecording={openRecordingModal}
      />
      
      {renderScreen()}

      {/* Recording Modal */}
      {showRecordingModal && (
        <div
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
          onClick={(e) => {
            // Close if clicking the overlay (not the modal itself)
            if (e.target === e.currentTarget) {
              closeRecordingModal();
            }
          }}
        >
          <NewRecording onClose={closeRecordingModal} />
        </div>
      )}
    </div>
  );
}