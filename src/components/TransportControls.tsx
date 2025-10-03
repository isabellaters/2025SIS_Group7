import React from 'react';

interface TransportControlsProps {
  isCapturing: boolean;
  onToggle: () => void;
}

/**
 * TransportControls - Simple start/stop control for live transcription
 */
export function TransportControls({
  isCapturing,
  onToggle
}: TransportControlsProps) {
  return (
    <div className="flex items-center justify-center">
      <button
        onClick={onToggle}
        className={
          "px-6 py-2 rounded-md font-medium text-sm transition " +
          (isCapturing
            ? "bg-red-500 text-white hover:bg-red-600"
            : "bg-sky-500 text-white hover:bg-sky-600")
        }
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
    </div>
  );
}
