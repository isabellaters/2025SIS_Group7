declare global {
  interface Window {
    electronAPI: {
      // App information
      getAppVersion: () => Promise<string>;
      getAppName: () => Promise<string>;
      
      // App control
      quitApp: () => Promise<void>;
      
      // Menu events
      onMenuNewLecture: (callback: () => void) => void;
      onMenuAbout: (callback: () => void) => void;
      
      // Remove listeners
      removeAllListeners: (channel: string) => void;
    };
  }
}

export {};
