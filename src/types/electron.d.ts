export interface IpcRenderer {
  on(channel: string, listener: (event: any, ...args: any[]) => void): void;
  off(channel: string, listener: (event: any, ...args: any[]) => void): void;
  send(channel: string, ...args: any[]): void;
  invoke(channel: string, ...args: any[]): Promise<any>;
  getDesktopSources?: () => Promise<any[]>;
  startDesktopCapture?: (sourceId: string) => Promise<any>;
}

export interface ElectronAPI {
  getDesktopSources: () => Promise<any[]>;
  startDesktopCapture: (sourceId: string) => Promise<any>;
  transcribeAudio: (audioData: string, mimeType: string) => Promise<{
    text: string;
    confidence: number;
    timestamp: number;
    error?: string;
  }>;
  send: (channel: string, data: any) => void;
  receive: (channel: string, func: (...args: any[]) => void) => void;
  removeAllListeners: (channel: string) => void;
}

declare global {
  interface Window {
    ipcRenderer?: IpcRenderer;
    electronAPI?: ElectronAPI;
  }
}
