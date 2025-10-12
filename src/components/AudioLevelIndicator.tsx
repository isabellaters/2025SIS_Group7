import React from 'react';

interface AudioLevelIndicatorProps {
  audioLevel: number; // 0.0 to 1.0
  isCapturing: boolean;
}

/**
 * AudioLevelIndicator - Visual indicator showing audio capture status and level
 * Displays a recording dot and green bar showing audio amplitude
 */
export function AudioLevelIndicator({ audioLevel, isCapturing }: AudioLevelIndicatorProps) {
  if (!isCapturing) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-red-500">● Recording</span>
      <div className="w-16 h-2 bg-neutral-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 transition-all duration-100"
          style={{ width: `${Math.min(audioLevel * 100, 100)}%` }}
        />
      </div>
    </div>
  );
}
