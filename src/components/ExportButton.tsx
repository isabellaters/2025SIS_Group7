import React, { useState } from 'react';
import { ExportModal } from './ExportModal';
import { exportAsTXT, exportAsPDF, type ExportData } from '../utils/export';

interface ExportButtonProps {
  transcriptLines: string[];
  translationLines: string[];
  title: string;
  className?: string;
}

export function ExportButton({ 
  transcriptLines, 
  translationLines, 
  title, 
  className = "" 
}: ExportButtonProps) {
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  const handleExport = (fileType: 'PDF' | 'TXT') => {
    const exportData: ExportData = {
      transcriptLines,
      translationLines,
      title,
      timestamp: new Date().toLocaleString()
    };

    if (fileType === 'PDF') {
      exportAsPDF(exportData);
    } else {
      exportAsTXT(exportData);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsExportModalOpen(true)}
        className={`rounded-md border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors ${className}`}
        title="Export transcript"
      >
        Export
      </button>

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleExport}
      />
    </>
  );
}
