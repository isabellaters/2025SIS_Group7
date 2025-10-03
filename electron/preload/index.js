const { ipcRenderer, contextBridge } = require('electron');

// Expose IPC renderer to the main world
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args) {
    const [channel, listener] = args;
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args));
  },
  off(...args) {
    const [channel, ...omit] = args;
    return ipcRenderer.off(channel, ...omit);
  },
  send(...args) {
    const [channel, ...omit] = args;
    return ipcRenderer.send(channel, ...omit);
  },
  invoke(...args) {
    const [channel, ...omit] = args;
    return ipcRenderer.invoke(channel, ...omit);
  },
});

// Expose desktop audio capture API
contextBridge.exposeInMainWorld('electronAPI', {
  getAudioSources: () => ipcRenderer.invoke('get-audio-sources')
});

console.log('Preload script loaded - electronAPI available');
