import React, { useState } from 'react';

interface SaveLectureButtonProps {
  title: string;
  transcriptLines: string[];
  translationLines: string[];
  targetLanguage?: string;
  disabled?: boolean;
  onSuccess?: (result: any) => void;
}

export function SaveLectureButton({
  title,
  transcriptLines,
  translationLines,
  targetLanguage,
  disabled = false,
  onSuccess,
}: SaveLectureButtonProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');

    try {
      const transcriptText = transcriptLines.join('\n');
      const translationText = translationLines.join('\n');

      const response = await fetch('http://localhost:3001/api/lectures/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          transcript: transcriptText,
          translation: translationText || undefined,
          translationLanguage: targetLanguage || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Lecture saved:', result);
      setSaveStatus('success');

      // Reset status after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error saving lecture:', error);
      setSaveStatus('error');

      // Reset status after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const getButtonText = () => {
    if (isSaving) return 'Saving...';
    if (saveStatus === 'success') return '✓ Saved';
    if (saveStatus === 'error') return '✗ Failed';
    return 'Save';
  };

  const getButtonClass = () => {
    const baseClass = "rounded-md px-3 py-1 text-sm font-medium transition-colors ";

    if (saveStatus === 'success') {
      return baseClass + "bg-green-500 text-white cursor-default";
    }
    if (saveStatus === 'error') {
      return baseClass + "bg-red-500 text-white cursor-default";
    }
    if (disabled || isSaving) {
      return baseClass + "bg-neutral-300 text-neutral-500 cursor-not-allowed";
    }
    return baseClass + "bg-sky-500 text-white hover:bg-sky-600";
  };

  return (
    <button
      onClick={handleSave}
      disabled={disabled || isSaving || saveStatus !== 'idle'}
      className={getButtonClass()}
      title="Save lecture to database"
    >
      {getButtonText()}
    </button>
  );
}
