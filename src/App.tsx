import { useHashRouter } from './hooks/useHashRouter';
import { NewMeetingPage } from './components/NewMeetingPage';
import { LiveSessionPage } from './components/LiveSessionPage';
import { ReviewPage } from "./components/ReviewPage";

/**
 * LiveLecture App - Main entry point
 * Uses hash routing for Electron compatibility
 */
export default function App() {
  const [route, navigate] = useHashRouter();

  if (route === "/live") {
    return <LiveSessionPage />;
  }

  if (route === "/review") return <ReviewPage />;


  return <NewMeetingPage onStart={() => navigate("/live")} />;
}
