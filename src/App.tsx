
// /**
//  * LiveLecture App - Main entry point
//  * Uses hash routing for Electron compatibility
//  */
// export default function App() {
//   const [route, navigate] = useHashRouter();

//   if (route === "/live") {
//     return <LiveSessionPage />;
//   }

//   if (route === "/review") return <ReviewPage />;


//   return <NewMeetingPage onStart={() => navigate("/live")} />;
// }

import React, { useState } from "react";
import { useHashRouter } from './hooks/useHashRouter';
import Sidebar from './components/Sidebar';
import DashboardMain from './components/DashboardMain';
import DashboardSubject from './components/DashboardSubject';
import LectureDetails from './components/LectureDetails';
import NewRecording from './components/NewRecording';
import { LiveSessionPage } from './components/LiveSessionPage';
import { NewMeetingPage } from "./components/NewMeetingPage";
import { ReviewPage } from './components/ReviewPage';
import { VideoUploadPage } from './components/VideoUploadPage';

// Dashboard screen types
type Screen =
  | { type: 'dashboard' }
  | { type: 'subject'; subjectId: string }
  | { type: 'lecture'; lectureId: string; fromSubjectId: string };

export default function App() {

  console.log("inside app.tsx function app()")
  const [route, navigate] = useHashRouter(); // hash routing for LiveSessionPage
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [showNewMeetingModal, setShowNewMeetingModal] = useState(false);
  const [showVideoUploadModal, setShowVideoUploadModal] = useState(false); 
  const [currentScreen, setCurrentScreen] = useState<Screen>({ type: 'dashboard' });
  
  // dashboard navigation handlers
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
    if (currentScreen.type === 'lecture') {
      setCurrentScreen({ type: 'subject', subjectId: currentScreen.fromSubjectId });
    } else {
      setCurrentScreen({ type: 'dashboard' });
    }
  }
  
  // Modal handlers
  function openRecordingModal() {
    setShowRecordingModal(true);
  }
  function closeRecordingModal() {
    setShowRecordingModal(false);
  }
  function openNewMeetingModal() {
    setShowNewMeetingModal(true); 
  }
  function closeNewMeetingModal() {
    setShowNewMeetingModal(false); 
  }
  function openVideoUploadModal() {
    setShowVideoUploadModal(true);
  }
  function closeVideoUploadModal() {
    setShowVideoUploadModal(false);
  }

  // If route is /live, always show LiveSessionPage
  if (route === "/live") {
    return <LiveSessionPage />;
  }

  // If route is /review, show ReviewPage
  if (route === "/review") {
    return <ReviewPage />;
  }

  // Otherwise, dashboard/homepage flow
  function renderScreen() {
    switch (currentScreen.type) {
      case 'dashboard':
        return (
          <DashboardMain
            sidebarCollapsed={sidebarCollapsed}
            onSubjectClick={navigateToSubject}
            onNewRecording={openRecordingModal}
          />
        );
      case 'subject':
        return (
          <DashboardSubject
            sidebarCollapsed={sidebarCollapsed}
            subjectId={currentScreen.subjectId}
            onBackToDashboard={navigateToDashboard}
            onViewLecture={(lectureId) => navigateToLecture(lectureId, currentScreen.subjectId)}
            onNewRecording={openRecordingModal}
          />
        );
      case 'lecture':
        return (
          <LectureDetails
            sidebarCollapsed={sidebarCollapsed}
            lectureId={currentScreen.lectureId}
            subjectId={currentScreen.fromSubjectId}
            onBack={navigateBackFromLecture}
          />
        );
    }
  }

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(x => !x)}
        onNewRecording={openNewMeetingModal}
        onVideoUpload={openVideoUploadModal}
      />
      {renderScreen()}
      
      {/* NewRecording Modal */}
      {showRecordingModal && (
        <div
          className="modal-overlay"
          onClick={e => {
            if (e.target === e.currentTarget) {
              closeRecordingModal();
            }
          }}
        >
          <NewRecording onClose={closeRecordingModal} />
        </div>
      )}

      {/* NewMeeting Modal */}
      {showNewMeetingModal && (
        <div
          className="modal-overlay"
          onClick={e => {
            if (e.target === e.currentTarget) {
              closeNewMeetingModal();
            }
          }}
        >
          <NewMeetingPage 
            onClose={closeNewMeetingModal}
            onStart={() => {
              closeNewMeetingModal();
              navigate("/live");
            }}
          />
        </div>
      )}

      {/* Video Upload Modal */}
      {showVideoUploadModal && (
        <div
          className="modal-overlay"
          onClick={e => {
            if (e.target === e.currentTarget) {
              closeVideoUploadModal();
            }
          }}
        >
          <VideoUploadPage 
            onClose={closeVideoUploadModal}
            onStart={() => {
              closeVideoUploadModal();
              navigate("/live");
            }}
          />
        </div>
      )}
    </div>
  );
}