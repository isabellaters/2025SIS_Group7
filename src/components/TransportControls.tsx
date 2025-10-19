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
            ? "bg-primary-700 text-white hover:bg-primary-800"
            : "bg-primary text-white hover:bg-primary-600")
        }
      >
        {isCapturing ? "Stop Recording" : "Start Recording"}
      </button>

      <button
        onClick={onEndSession}
        className="px-6 py-2 rounded-md font-medium text-sm transition bg-primary text-white hover:bg-primary-600"
      >
        End Session
      </button>
    </div>
  );
}
