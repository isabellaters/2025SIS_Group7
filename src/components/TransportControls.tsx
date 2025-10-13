import React from 'react';

interface TransportControlsProps {
  isCapturing: boolean;
  onToggle: () => void | Promise<void>;      // <-- allow async
  onEndSession: () => void | Promise<void>;  // <-- add + allow async
}

export function TransportControls({
  isCapturing,
  onToggle,
  onEndSession,
}: TransportControlsProps) {
  return (
    <div className="flex items-center justify-center gap-3">
      <button
        onClick={onToggle}
        className={
          "px-6 py-2 rounded-md font-medium text-sm transition " +
          (isCapturing
            ? "bg-red-500 text-white hover:bg-red-600"
            : "bg-sky-500 text-white hover:bg-sky-600")
        }
        aria-label={isCapturing ? "Stop Recording" : "Start Recording"}
      >
        {isCapturing ? (
          <span className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" />
            </svg>
            Stop Recording
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <circle cx="12" cy="12" r="4" />
            </svg>
            Start Recording
          </span>
        )}
      </button>

      <button
        onClick={onEndSession}
        className="px-6 py-2 rounded-md font-medium text-sm transition bg-rose-600 text-white hover:bg-rose-700"
        aria-label="End Session"
      >
        <span className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11 3h2v10h-2z" />
            <path d="M7.05 5.05a7 7 0 1 0 9.9 0l-1.41 1.41a5 5 0 1 1-7.07 0L7.05 5.05z" />
          </svg>
          End Session
        </span>
      </button>
    </div>
  );
}
