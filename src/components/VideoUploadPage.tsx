import React, { useState, useRef } from 'react';
import { lsGet, lsSet, UI_PREF_KEY } from '../utils/storage';

interface VideoUploadPageProps {
  onClose?: () => void;
  onStart?: () => void;
}

export function VideoUploadPage({ onClose, onStart }: VideoUploadPageProps) {
  const [lectureTitle, setLectureTitle] = useState<string>("");
  const [subjects, setSubjects] = useState<string[]>(["No Subject", "COMP123 – Algorithms", "FEIT Orientation", "ENG Entrepreneurship"]);
  const [subject, setSubject] = useState<string>("No Subject");
  const [isDocked, setIsDocked] = useState<boolean>(true);
  const [justSaved, setJustSaved] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [transcriptionStatus, setTranscriptionStatus] = useState<string>("");
  const [transcript, setTranscript] = useState<string>("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved state
  React.useEffect(() => {
    const ui = lsGet(UI_PREF_KEY);
    if (ui) {
      try { setIsDocked(!!JSON.parse(ui).docked); } catch {}
    }
    const saved = lsGet("ll:videoUpload");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as any;
        setLectureTitle(parsed.lectureTitle ?? "");
        setSubjects(parsed.subjects ?? subjects);
        setSubject(parsed.subject ?? "No Subject");
        if (!ui) setIsDocked(parsed.isDocked ?? true);
      } catch {}
    }
  }, []);

  // Save state
  const saveState = React.useMemo(() => {
    let t: any;
    return () => {
      clearTimeout(t);
      t = setTimeout(() => {
        lsSet("ll:videoUpload", JSON.stringify({ lectureTitle, subjects, subject, isDocked }));
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 800);
      }, 250);
    };
  }, [lectureTitle, subjects, subject, isDocked]);

  React.useEffect(() => { saveState(); }, [lectureTitle, subjects, subject, isDocked, saveState]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'video/mp4') {
      setSelectedFile(file);
      setTranscript("");
      setTranscriptionStatus("");
    } else {
      alert('Please select a valid MP4 video file.');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !lectureTitle.trim()) {
      alert('Please select a video file and enter a lecture title.');
      return;
    }

    console.log('Starting video upload...', { 
      fileName: selectedFile.name, 
      fileSize: selectedFile.size, 
      title: lectureTitle 
    });

    setIsUploading(true);
    setUploadProgress(0);
    setTranscriptionStatus("Uploading video...");

    try {
      const formData = new FormData();
      formData.append('video', selectedFile);
      formData.append('title', lectureTitle);
      formData.append('subject', subject);

      console.log('Sending request to backend...');
      const response = await fetch('http://localhost:3001/api/video/upload', {
        method: 'POST',
        body: formData,
      });

      console.log('Response received:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload failed:', errorText);
        throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      setUploadProgress(50);
      setTranscriptionStatus("Processing video...");

      // Get videoId from response
      const responseData = await response.json();
      console.log('Response data:', responseData);
      const videoId = responseData.videoId;

      // Poll for transcription status
      const pollTranscription = async () => {
        try {
          const statusResponse = await fetch(`http://localhost:3001/api/video/status/${videoId}`);
          const statusData = await statusResponse.json();
          
          if (statusData.status === 'completed') {
            setUploadProgress(100);
            setTranscriptionStatus("Transcription completed!");
            setTranscript(statusData.transcript);
          } else if (statusData.status === 'failed') {
            setTranscriptionStatus("Transcription failed. Please try again.");
            setIsUploading(false);
          } else {
            // Still processing, poll again
            setTimeout(pollTranscription, 2000);
          }
        } catch (error) {
          console.error('Error checking transcription status:', error);
          setTranscriptionStatus("Error checking status. Please try again.");
          setIsUploading(false);
        }
      };

      // Start polling after a short delay
      setTimeout(pollTranscription, 2000);

    } catch (error) {
      console.error('Upload error:', error);
      setTranscriptionStatus(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleStartSession = () => {
    if (transcript) {
      // Save the transcript to localStorage for the live session
      lsSet("ll:videoTranscript", JSON.stringify({
        transcript,
        title: lectureTitle,
        subject
      }));
      onStart?.();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '32px',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, color: '#1f2937' }}>
            Upload Video for Transcription
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '4px'
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#374151' }}>
            Lecture Title
          </label>
          <input
            type="text"
            value={lectureTitle}
            onChange={(e) => setLectureTitle(e.target.value)}
            placeholder="Enter lecture title..."
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '1rem',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#374151' }}>
            Subject
          </label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '1rem',
              boxSizing: 'border-box'
            }}
          >
            {subjects.map((sub) => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#374151' }}>
            Video File (MP4)
          </label>
          <div style={{
            border: '2px dashed #d1d5db',
            borderRadius: '8px',
            padding: '24px',
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: selectedFile ? '#f0f9ff' : '#f9fafb'
          }} onClick={() => fileInputRef.current?.click()}>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            {selectedFile ? (
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 500, color: '#1f2937', marginBottom: '4px' }}>
                  {selectedFile.name}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 500, color: '#6b7280', marginBottom: '4px' }}>
                  Click to select MP4 video file
                </div>
                <div style={{ fontSize: '0.9rem', color: '#9ca3af' }}>
                  Supported format: MP4
                </div>
              </div>
            )}
          </div>
        </div>

        {isUploading && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.9rem', color: '#374151' }}>{transcriptionStatus}</span>
              <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>{uploadProgress}%</span>
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#e5e7eb',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${uploadProgress}%`,
                height: '100%',
                backgroundColor: '#3b82f6',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        )}

        {transcript && (
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#374151' }}>
              Transcription Preview
            </label>
            <div style={{
              maxHeight: '200px',
              overflowY: 'auto',
              padding: '12px',
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '0.9rem',
              lineHeight: '1.5',
              color: '#374151'
            }}>
              {transcript}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={isUploading}
            style={{
              padding: '12px 24px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              backgroundColor: 'white',
              color: '#374151',
              fontSize: '1rem',
              cursor: isUploading ? 'not-allowed' : 'pointer',
              opacity: isUploading ? 0.5 : 1
            }}
          >
            Cancel
          </button>
          
          {!transcript ? (
            <button
              onClick={handleUpload}
              disabled={!selectedFile || !lectureTitle.trim() || isUploading}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: (!selectedFile || !lectureTitle.trim() || isUploading) ? '#9ca3af' : '#3b82f6',
                color: 'white',
                fontSize: '1rem',
                cursor: (!selectedFile || !lectureTitle.trim() || isUploading) ? 'not-allowed' : 'pointer'
              }}
            >
              {isUploading ? 'Processing...' : 'Upload & Transcribe'}
            </button>
          ) : (
            <button
              onClick={handleStartSession}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: '#10b981',
                color: 'white',
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              Start Session
            </button>
          )}
        </div>

        {justSaved && (
          <div style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            backgroundColor: '#10b981',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '0.9rem'
          }}>
            Saved
          </div>
        )}
      </div>
    </div>
  );
}
