import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Environment checks
  checkNode: () => ipcRenderer.invoke('check-node'),
  checkPackageManager: (manager: string) => ipcRenderer.invoke('check-package-manager', manager),
  checkGit: () => ipcRenderer.invoke('check-git'),

  // Installation
  installOpenClaw: () => ipcRenderer.invoke('install-openclaw'),
  onInstallLog: (callback: (log: string) => void) => {
    ipcRenderer.on('install-log', (_, log) => callback(log));
  },

  // Configuration
  readConfig: () => ipcRenderer.invoke('read-config'),
  writeConfig: (config: any) => ipcRenderer.invoke('write-config', config),
  testApiConnection: (provider: string, apiKey: string) =>
    ipcRenderer.invoke('test-api-connection', provider, apiKey),

  // Service management
  startOpenClaw: () => ipcRenderer.invoke('start-openclaw'),
  stopOpenClaw: () => ipcRenderer.invoke('stop-openclaw'),
  getServiceStatus: () => ipcRenderer.invoke('get-service-status'),
  onServiceLog: (callback: (log: string) => void) => {
    ipcRenderer.on('service-log', (_, log) => callback(log));
  },

  // Auto-updater
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateChecking: (callback: () => void) => {
    ipcRenderer.on('update-checking', () => callback());
  },
  onUpdateAvailable: (callback: (info: any) => void) => {
    ipcRenderer.on('update-available', (_, info) => callback(info));
  },
  onUpdateNotAvailable: (callback: (info: any) => void) => {
    ipcRenderer.on('update-not-available', (_, info) => callback(info));
  },
  onUpdateError: (callback: (error: string) => void) => {
    ipcRenderer.on('update-error', (_, error) => callback(error));
  },
  onUpdateDownloadProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on('update-download-progress', (_, progress) => callback(progress));
  },
  onUpdateDownloaded: (callback: (info: any) => void) => {
    ipcRenderer.on('update-downloaded', (_, info) => callback(info));
  }
});
