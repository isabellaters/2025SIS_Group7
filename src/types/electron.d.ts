// Electron API declarations
declare global {
  interface Window {
    ipcRenderer: {
      on: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
      off: (channel: string, ...args: any[]) => void;
      send: (channel: string, ...args: any[]) => void;
      invoke: (channel: string, ...args: any[]) => Promise<any>;
      getDesktopSources: () => Promise<Array<{
        id: string;
        name: string;
        thumbnail: string;
      }>>;
      startDesktopCapture: (sourceId: string) => Promise<{
        id: string;
        name: string;
        stream: string;
      }>;
    };
  }
}

export {};
