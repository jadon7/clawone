import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Open external URL
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),

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
  getAuthOptions: () => ipcRenderer.invoke('get-auth-options'),
  testApiConnection: (config: any) =>
    ipcRenderer.invoke('test-api-connection', config),

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
  },

  // Plugin management
  getPlugins: () => ipcRenderer.invoke('get-plugins'),
  installPlugin: (spec: string) => ipcRenderer.invoke('install-plugin', spec),
  uninstallPlugin: (pluginId: string) => ipcRenderer.invoke('uninstall-plugin', pluginId),
  setPluginEnabled: (pluginId: string, enabled: boolean) => ipcRenderer.invoke('set-plugin-enabled', pluginId, enabled),
  onPluginLog: (callback: (log: string) => void) => {
    ipcRenderer.on('plugin-log', (_, log) => callback(log));
  }
});
