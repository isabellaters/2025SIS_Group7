import React from 'react';

interface AudioLevelIndicatorProps {
  audioLevel: number; // 0.0 to 1.0
  isCapturing: boolean;
}

/**
 * AudioLevelIndicator - Visual indicator showing audio capture status and level
 * Displays a recording dot and green bar showing audio amplitude
 * Note: Audio is amplified by 3x in audioCapture service
 */
export function AudioLevelIndicator({ audioLevel, isCapturing }: AudioLevelIndicatorProps) {
  if (!isCapturing) return null;

  // Audio levels are typically 0.0-0.1 for normal speech before gain
  // After 3x gain they become 0.0-0.3, but we're seeing them before gain here
  // Scale for good visual feedback: multiply by 100
  const visualLevel = Math.min(audioLevel * 100, 100);

  // Color based on level
  const barColor = visualLevel > 70 ? 'bg-red-500' : visualLevel > 40 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-red-500">● Recording</span>
      <div className="w-16 h-2 bg-neutral-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-100`}
          style={{ width: `${visualLevel}%` }}
        />
      </div>
    </div>
  );
}
