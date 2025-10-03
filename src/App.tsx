import { useHashRouter } from './hooks/useHashRouter';
import { NewMeetingPage } from './components/NewMeetingPage';
import { LiveSessionPage } from './components/LiveSessionPage';

/**
 * LiveLecture App - Main entry point
 * Uses hash routing for Electron compatibility
 */
export default function App() {
  const [route, navigate] = useHashRouter();

  if (route === "/live") {
    return <LiveSessionPage />;
  }

  return <NewMeetingPage onStart={() => navigate("/live")} />;
}
