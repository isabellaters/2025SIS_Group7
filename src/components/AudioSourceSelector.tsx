import React from 'react';
import type { AudioSource } from '../types';

interface AudioSourceSelectorProps {
  sources: AudioSource[];
  selectedSource: string;
  isCapturing: boolean;
  onSourceChange: (sourceId: string) => void;
}

/**
 * AudioSourceSelector - Dropdown to select desktop audio source
 * Displays available screens and windows for audio capture
 */
export function AudioSourceSelector({
  sources,
  selectedSource,
  isCapturing,
  onSourceChange
}: AudioSourceSelectorProps) {
  return (
    <select
      value={selectedSource}
      onChange={(e) => onSourceChange(e.target.value)}
      disabled={isCapturing}
      className="rounded-md border border-neutral-300 px-2 py-1 text-xs bg-white disabled:bg-neutral-100"
      title="Select audio source"
    >
      <option value="">Select audio source...</option>
      {sources.map((source) => (
        <option key={source.id} value={source.id}>
          {source.name}
        </option>
      ))}
    </select>
  );
}
