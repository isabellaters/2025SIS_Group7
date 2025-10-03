import React from 'react';

interface LanguageSelectorProps {
  targetLanguage: string;
  onLanguageChange: (languageCode: string) => void;
  translationEnabled: boolean;
  onToggleTranslation: () => void;
  disabled?: boolean;
}

const COMMON_LANGUAGES = [
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'zh-TW', name: 'Chinese (Traditional)' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'bn', name: 'Bengali' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
  { code: 'tr', name: 'Turkish' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'th', name: 'Thai' },
  { code: 'id', name: 'Indonesian' },
  { code: 'ms', name: 'Malay' },
];

export function LanguageSelector({
  targetLanguage,
  onLanguageChange,
  translationEnabled,
  onToggleTranslation,
  disabled = false
}: LanguageSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onToggleTranslation}
        disabled={disabled}
        className={
          "rounded-md border px-2 py-1 text-xs font-medium transition " +
          (translationEnabled
            ? "border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            : "border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50") +
          " disabled:opacity-50 disabled:cursor-not-allowed"
        }
        title={translationEnabled ? "Translation enabled" : "Translation disabled"}
      >
        {translationEnabled ? "Translation ON" : "Translation OFF"}
      </button>
      {translationEnabled && (
        <>
          <label htmlFor="target-language" className="text-xs font-medium text-neutral-700">
            to:
          </label>
          <select
            id="target-language"
            value={targetLanguage}
            onChange={(e) => onLanguageChange(e.target.value)}
            disabled={disabled}
            className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-700 focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:bg-neutral-100 disabled:cursor-not-allowed"
          >
            {COMMON_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </>
      )}
    </div>
  );
}
