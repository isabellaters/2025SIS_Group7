import { useEffect, useCallback } from 'react';

export const useElectron = () => {
  const isElectron = typeof window !== 'undefined' && window.electronAPI;

  const getAppVersion = useCallback(async () => {
    if (!isElectron) return null;
    return await window.electronAPI.getAppVersion();
  }, [isElectron]);

  const getAppName = useCallback(async () => {
    if (!isElectron) return null;
    return await window.electronAPI.getAppName();
  }, [isElectron]);

  const quitApp = useCallback(async () => {
    if (!isElectron) return;
    await window.electronAPI.quitApp();
  }, [isElectron]);

  const onMenuNewLecture = useCallback((callback: () => void) => {
    if (!isElectron) return;
    window.electronAPI.onMenuNewLecture(callback);
  }, [isElectron]);

  const onMenuAbout = useCallback((callback: () => void) => {
    if (!isElectron) return;
    window.electronAPI.onMenuAbout(callback);
  }, [isElectron]);

  const removeAllListeners = useCallback((channel: string) => {
    if (!isElectron) return;
    window.electronAPI.removeAllListeners(channel);
  }, [isElectron]);

  // Cleanup listeners on unmount
  useEffect(() => {
    return () => {
      if (isElectron) {
        window.electronAPI.removeAllListeners('menu-new-lecture');
        window.electronAPI.removeAllListeners('menu-about');
      }
    };
  }, [isElectron]);

  return {
    isElectron,
    getAppVersion,
    getAppName,
    quitApp,
    onMenuNewLecture,
    onMenuAbout,
    removeAllListeners,
  };
};
