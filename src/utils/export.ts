// Export utilities for generating PDF and TXT files
import jsPDF from 'jspdf';

export interface ExportData {
  transcriptLines: string[];
  translationLines: string[];
  title: string;
  timestamp: string;
  summary?: string;
  keywords?: string[];
  keyPoints?: string[];
}

export function generateTXTContent(data: ExportData): string {
  const { transcriptLines, translationLines, title, timestamp, summary, keywords, keyPoints } = data;

  let content = `LiveLecture Export\n`;
  content += `Title: ${title}\n`;
  content += `Exported: ${timestamp}\n`;
  content += `\n${'='.repeat(50)}\n\n`;

  if (summary) {
    content += `SUMMARY:\n`;
    content += `${'-'.repeat(20)}\n`;
    content += `${summary}\n\n`;
  }

  if (keyPoints && keyPoints.length > 0) {
    content += `KEY POINTS:\n`;
    content += `${'-'.repeat(20)}\n`;
    keyPoints.forEach((point) => {
      content += `• ${point}\n`;
    });
    content += `\n`;
  }

  if (keywords && keywords.length > 0) {
    content += `KEYWORDS:\n`;
    content += `${'-'.repeat(20)}\n`;
    keywords.forEach((keyword) => {
      content += `• ${keyword}\n`;
    });
    content += `\n`;
  }

  if (transcriptLines.length > 0) {
    content += `TRANSCRIPTION:\n`;
    content += `${'-'.repeat(20)}\n`;
    transcriptLines.forEach((line, index) => {
      content += `${index + 1}. ${line}\n`;
    });
    content += `\n`;
  }

  if (translationLines.length > 0) {
    content += `TRANSLATION:\n`;
    content += `${'-'.repeat(20)}\n`;
    translationLines.forEach((line, index) => {
      content += `${index + 1}. ${line}\n`;
    });
  }

  return content;
}

export function generatePDFContent(data: ExportData): jsPDF {
  const { transcriptLines, translationLines, title, timestamp, summary, keywords, keyPoints } = data;

  // Create new PDF document
  const doc = new jsPDF();

  // Set up fonts and colors
  const primaryColor = '#2c3e50';
  const secondaryColor = '#3498db';

  // Add title
  doc.setFontSize(20);
  doc.setTextColor(primaryColor);
  doc.text(title, 20, 30);

  // Add timestamp
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(`Exported: ${timestamp}`, 20, 40);

  let yPosition = 60;

  // Add summary section
  if (summary) {
    doc.setFontSize(16);
    doc.setTextColor(primaryColor);
    doc.text('SUMMARY', 20, yPosition);

    doc.setDrawColor(secondaryColor);
    doc.line(20, yPosition + 2, 190, yPosition + 2);
    yPosition += 15;

    doc.setFontSize(11);
    doc.setTextColor(0);

    const splitSummary = doc.splitTextToSize(summary, 170);
    doc.text(splitSummary, 25, yPosition);
    yPosition += splitSummary.length * 5 + 15;
  }

  // Add key points section
  if (keyPoints && keyPoints.length > 0) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(16);
    doc.setTextColor(primaryColor);
    doc.text('KEY POINTS', 20, yPosition);

    doc.setDrawColor(secondaryColor);
    doc.line(20, yPosition + 2, 190, yPosition + 2);
    yPosition += 15;

    doc.setFontSize(11);
    doc.setTextColor(0);

    keyPoints.forEach((point) => {
      if (yPosition > 280) {
        doc.addPage();
        yPosition = 20;
      }
      const splitPoint = doc.splitTextToSize(`• ${point}`, 170);
      doc.text(splitPoint, 25, yPosition);
      yPosition += splitPoint.length * 5 + 3;
    });

    yPosition += 10;
  }

  // Add keywords section
  if (keywords && keywords.length > 0) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(16);
    doc.setTextColor(primaryColor);
    doc.text('KEYWORDS', 20, yPosition);

    doc.setDrawColor(secondaryColor);
    doc.line(20, yPosition + 2, 190, yPosition + 2);
    yPosition += 15;

    doc.setFontSize(11);
    doc.setTextColor(0);

    keywords.forEach((keyword) => {
      if (yPosition > 280) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(`• ${keyword}`, 25, yPosition);
      yPosition += 7;
    });

    yPosition += 10;
  }
  
  // Add transcription section
  if (transcriptLines.length > 0) {
    doc.setFontSize(16);
    doc.setTextColor(primaryColor);
    doc.text('TRANSCRIPTION', 20, yPosition);
    
    // Draw line under section title
    doc.setDrawColor(secondaryColor);
    doc.line(20, yPosition + 2, 190, yPosition + 2);
    yPosition += 15;
    
    doc.setFontSize(11);
    doc.setTextColor(0);
    
    transcriptLines.forEach((line, index) => {
      // Check if we need a new page
      if (yPosition > 280) {
        doc.addPage();
        yPosition = 20;
      }
      
      // Add line number and text
      const lineText = `${index + 1}. ${line}`;
      const splitLines = doc.splitTextToSize(lineText, 170);
      doc.text(splitLines, 25, yPosition);
      yPosition += splitLines.length * 5 + 3;
    });
    
    yPosition += 10;
  }
  
  // Add translation section
  if (translationLines.length > 0) {
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFontSize(16);
    doc.setTextColor(primaryColor);
    doc.text('TRANSLATION', 20, yPosition);
    
    // Draw line under section title
    doc.setDrawColor(secondaryColor);
    doc.line(20, yPosition + 2, 190, yPosition + 2);
    yPosition += 15;
    
    doc.setFontSize(11);
    doc.setTextColor(0);
    
    translationLines.forEach((line, index) => {
      // Check if we need a new page
      if (yPosition > 280) {
        doc.addPage();
        yPosition = 20;
      }
      
      // Add line number and text
      const lineText = `${index + 1}. ${line}`;
      const splitLines = doc.splitTextToSize(lineText, 170);
      doc.text(splitLines, 25, yPosition);
      yPosition += splitLines.length * 5 + 3;
    });
  }
  
  return doc;
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

export function exportAsTXT(data: ExportData) {
  const content = generateTXTContent(data);
  const filename = `${data.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.txt`;
  downloadFile(content, filename, 'text/plain');
}

export function exportAsPDF(data: ExportData) {
  const doc = generatePDFContent(data);
  const filename = `${data.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.pdf`;
  
  // Save the PDF
  doc.save(filename);
}
