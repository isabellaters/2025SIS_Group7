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
          "px-6 py-2 rounded-md font-medium text-sm transition shadow-md " +
          (isCapturing
            ? "bg-red-600 text-white hover:bg-red-700 border border-red-700"
            : "bg-green-600 text-white hover:bg-green-700 border border-green-700")
        }
      >
        {isCapturing ? "Stop Recording" : "Start Recording"}
      </button>

      <button
        onClick={onEndSession}
        className="px-6 py-2 rounded-md font-medium text-sm transition bg-sky-600 text-white hover:bg-sky-700 border border-sky-700 shadow-md"
      >
        End Session
      </button>
    </div>
  );
}
