// electron/preload/preload.js
const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script loaded');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Desktop capture APIs
  getDesktopSources: () => {
    console.log('getDesktopSources called from renderer');
    return ipcRenderer.invoke('get-desktop-sources');
  },
  startDesktopCapture: (sourceId) => {
    console.log('startDesktopCapture called from renderer with sourceId:', sourceId);
    return ipcRenderer.invoke('start-desktop-capture', sourceId);
  },
  
  // Speech-to-text API
  transcribeAudio: (audioData, mimeType) => {
    console.log('transcribeAudio called from renderer');
    return ipcRenderer.invoke('transcribe-audio', audioData, mimeType);
  },
  
  // General IPC methods
  send: (channel, data) => ipcRenderer.send(channel, data),
  receive: (channel, func) => {
    const validChannels = ['main-process-message'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
  removeAllListeners: (channel) => {
    const validChannels = ['main-process-message'];
    if (validChannels.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
    }
  }
});

console.log('electronAPI exposed to renderer');
