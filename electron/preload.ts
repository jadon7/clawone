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
  }
});
