// electron/main/main.js
const path = require("path");
const fs = require("fs");
const { app, BrowserWindow, screen, ipcMain, desktopCapturer } = require("electron");
const { SpeechClient } = require("@google-cloud/speech");

let win = null;
const isDev = !app.isPackaged;

// Google Cloud Speech-to-Text client
let speechClient = null;
let speechClientInitialized = false;

// Check if Google Cloud credentials are available
function hasGoogleCloudCredentials() {
  // Check for common credential environment variables
  const hasEnvCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
                           process.env.GOOGLE_CLOUD_PROJECT ||
                           process.env.GCLOUD_PROJECT;
  
  // Check for default credentials file
  const os = require('os');
  const credentialsPath = path.join(os.homedir(), '.config', 'gcloud', 'application_default_credentials.json');
  const hasCredentialsFile = fs.existsSync(credentialsPath);
  
  return hasEnvCredentials || hasCredentialsFile;
}

// Initialize Google Cloud Speech-to-Text
function initializeSpeechToText() {
  try {
    // Check if credentials are available before initializing
    if (!hasGoogleCloudCredentials()) {
      console.log('⚠️ Google Cloud credentials not found, skipping Speech-to-Text initialization');
      console.log('💡 To enable real transcription, set up Google Cloud authentication (see GOOGLE_CLOUD_SETUP.md)');
      speechClientInitialized = false;
      return;
    }

    speechClient = new SpeechClient({
      // This will use Application Default Credentials (ADC) or environment variables
    });
    speechClientInitialized = true;
    console.log('✅ Google Cloud Speech-to-Text service initialized in main process');
  } catch (error) {
    console.error('❌ Failed to initialize Google Cloud Speech-to-Text service:', error);
    speechClientInitialized = false;
  }
}

/** Create the single app window */
function createWindow() {
  if (win && !win.isDestroyed()) return;

  // Size & position so it can sit near the bottom of the screen (under Teams)
  const { workArea } = screen.getPrimaryDisplay();
  const WIDTH = Math.min(1100, workArea.width - 24);
  const HEIGHT = 260;
  const X = Math.round(workArea.x + (workArea.width - WIDTH) / 2);
  const Y = Math.round(workArea.y + workArea.height - HEIGHT - 24);

  // Optional preload (only if the file exists)
  const preloadPath = path.resolve(__dirname, "../../electron/preload/preload.js");
  const hasPreload = fs.existsSync(preloadPath);
  console.log('Preload path:', preloadPath);
  console.log('Preload exists:', hasPreload);

  win = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    x: X,
    y: Y,
    show: false,             // show after first paint
    frame: true,             // keep the native titlebar (no duplicate custom bar)
    titleBarStyle: "default",
    backgroundColor: "#ffffff",
    resizable: true,
    fullscreenable: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      enableRemoteModule: false,
      ...(hasPreload ? { preload: preloadPath } : {}),
    },
  });

  win.once("ready-to-show", () => win.show());
  win.on("closed", () => { win = null; });

  if (isDev) {
    // Vite dev server (hash router)
    win.loadURL("http://localhost:5173/#/");
    // Uncomment if you want to inspect:
    // win.webContents.openDevTools({ mode: "detach" });
  } else {
    // Load the built renderer (hash router still works on file://)
    const indexHtml = path.resolve(__dirname, "../../dist/index.html");
    // `hash: '/'` ensures we land on your app's root
    win.loadFile(indexHtml, { hash: "/" });
  }
}

/** Keep a single instance only */
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

      app.whenReady().then(() => {
        createWindow();
        setupIpcHandlers();
        initializeSpeechToText();
        
        // Log the current speech-to-text status
        if (speechClientInitialized) {
          console.log('🎤 Speech-to-Text: Google Cloud Speech-to-Text enabled');
        } else {
          console.log('🎭 Speech-to-Text: Using mock service (Google Cloud credentials not found)');
        }
      });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  app.on("window-all-closed", () => {
    // Quit on all platforms except macOS (standard behavior)
    if (process.platform !== "darwin") app.quit();
  });

      // IPC handlers for desktop audio capture and speech-to-text
      function setupIpcHandlers() {
        // Get available desktop sources (windows and screens)
        ipcMain.handle('get-desktop-sources', async () => {
          try {
            console.log('Getting desktop sources...');
            const sources = await desktopCapturer.getSources({
              types: ['screen', 'window'],
              thumbnailSize: { width: 150, height: 150 }
            });
            console.log('Found sources:', sources.length);
            return sources.map(source => ({
              id: source.id,
              name: source.name,
              thumbnail: source.thumbnail.toDataURL()
            }));
          } catch (error) {
            console.error('Error getting desktop sources:', error);
            return []; // Return empty array instead of throwing
          }
        });

        // Start desktop capture for a specific source
        ipcMain.handle('start-desktop-capture', async (_, sourceId) => {
          try {
            console.log('Starting desktop capture for source:', sourceId);
            const sources = await desktopCapturer.getSources({
              types: ['screen', 'window'],
              thumbnailSize: { width: 150, height: 150 }
            });
            
            const source = sources.find(s => s.id === sourceId);
            if (!source) {
              throw new Error('Source not found');
            }

            console.log('Source found:', source.name);
            return {
              id: source.id,
              name: source.name,
              stream: source.id // This will be used to create MediaStream in renderer
            };
          } catch (error) {
            console.error('Error starting desktop capture:', error);
            throw error;
          }
        });

        // Speech-to-text transcription
        ipcMain.handle('transcribe-audio', async (_, audioData, mimeType) => {
          try {
            if (!speechClientInitialized || !speechClient) {
              return {
                text: '',
                confidence: 0,
                timestamp: Date.now(),
                error: 'Google Cloud Speech-to-Text service not available (credentials not found)'
              };
            }

            // Double-check that the service is still available
            if (!speechClient) {
              return {
                text: '',
                confidence: 0,
                timestamp: Date.now(),
                error: 'Google Cloud Speech-to-Text service not available (credentials not found)'
              };
            }

            console.log('🎤 Starting Google Cloud Speech-to-Text transcription in main process...');
            console.log('📦 Audio data length:', audioData.length, 'characters');
            console.log('🎵 MIME type:', mimeType);

            // Configure the request
            const request = {
              audio: {
                content: audioData,
              },
              config: {
                encoding: getAudioEncoding(mimeType),
                sampleRateHertz: 16000,
                languageCode: 'en-US',
                enableAutomaticPunctuation: true,
                enableWordTimeOffsets: false,
                model: 'latest_long',
              },
            };

            console.log('🔄 Sending request to Google Cloud Speech-to-Text...');

            // Perform the transcription
            const [response] = await speechClient.recognize(request);
            
            if (!response.results || response.results.length === 0) {
              console.log('🔇 No speech detected in audio');
              return {
                text: '',
                confidence: 0,
                timestamp: Date.now()
              };
            }

            // Get the best result
            const result = response.results[0];
            const alternative = result.alternatives?.[0];
            
            if (!alternative) {
              console.log('🔇 No transcription alternatives found');
              return {
                text: '',
                confidence: 0,
                timestamp: Date.now()
              };
            }

            const text = alternative.transcript || '';
            const confidence = alternative.confidence || 0;

            console.log('✅ Transcription completed successfully');
            console.log('📝 Text:', text);
            console.log('🎯 Confidence:', confidence);

            return {
              text: text,
              confidence: confidence,
              timestamp: Date.now()
            };

          } catch (error) {
            // Check if it's an authentication error
            if (error.message.includes('credentials') || error.message.includes('authentication')) {
              console.log('⚠️ Google Cloud authentication error, service will use fallback');
              return {
                text: '',
                confidence: 0,
                timestamp: Date.now(),
                error: 'Google Cloud Speech-to-Text service not available (credentials not found)'
              };
            }
            
            console.error('❌ Error transcribing audio with Google Cloud Speech-to-Text:', error);
            return {
              text: '',
              confidence: 0,
              timestamp: Date.now(),
              error: `Transcription failed: ${error.message}`
            };
          }
        });
      }

      // Helper function to convert MIME type to Google Cloud Speech encoding
      function getAudioEncoding(mimeType) {
        if (mimeType.includes('webm')) {
          return 'WEBM_OPUS';
        } else if (mimeType.includes('wav')) {
          return 'LINEAR16';
        } else if (mimeType.includes('mp3')) {
          return 'MP3';
        } else if (mimeType.includes('flac')) {
          return 'FLAC';
        } else {
          // Default to WEBM_OPUS for unknown types
          return 'WEBM_OPUS';
        }
      }
}
