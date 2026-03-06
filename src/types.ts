export interface ElectronAPI {
  checkNode: () => Promise<{ installed: boolean; version: string | null; valid: boolean; debug?: string }>;
  checkPackageManager: (manager: string) => Promise<{ installed: boolean; version: string | null; debug?: string }>;
  checkGit: () => Promise<{ installed: boolean; version: string | null; debug?: string }>;
  installOpenClaw: () => Promise<{ success: boolean }>;
  onInstallLog: (callback: (log: string) => void) => void;
  readConfig: () => Promise<OpenClawConfig | null>;
  writeConfig: (config: OpenClawConfig) => Promise<{ success: boolean; error?: string }>;
  testApiConnection: (provider: string, apiKey: string) => Promise<{ success: boolean; message: string }>;
  startOpenClaw: () => Promise<{ success: boolean }>;
  stopOpenClaw: () => Promise<{ success: boolean; error?: string }>;
  getServiceStatus: () => Promise<{ running: boolean; output: string }>;
  onServiceLog: (callback: (log: string) => void) => void;
  checkForUpdates: () => Promise<{ success: boolean; updateInfo?: any; error?: string }>;
  downloadUpdate: () => Promise<{ success: boolean; error?: string }>;
  installUpdate: () => void;
  onUpdateChecking: (callback: () => void) => void;
  onUpdateAvailable: (callback: (info: any) => void) => void;
  onUpdateNotAvailable: (callback: (info: any) => void) => void;
  onUpdateError: (callback: (error: string) => void) => void;
  onUpdateDownloadProgress: (callback: (progress: any) => void) => void;
  onUpdateDownloaded: (callback: (info: any) => void) => void;
  installPlugin: (pluginId: string) => Promise<{ success: boolean; error?: string }>;
  uninstallPlugin: (pluginId: string) => Promise<{ success: boolean; error?: string }>;
  getInstalledPlugins: () => Promise<string[]>;
  onPluginLog: (callback: (log: string) => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export interface Plugin {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'messaging' | 'integration' | 'utility';
  packageName: string;
  installed: boolean;
  enabled: boolean;
  version?: string;
}

export interface OpenClawConfig {
  ai: {
    provider: string;
    apiKey: string;
    model?: string;
  };
  workspace: string;
  channels?: {
    whatsapp?: boolean;
    telegram?: boolean;
    discord?: boolean;
    slack?: boolean;
  };
  plugins?: {
    [key: string]: {
      enabled: boolean;
      config?: any;
    };
  };
}

export type Page =
  | 'welcome'
  | 'environment'
  | 'install'
  | 'config-step1'
  | 'config-step2'
  | 'config-step3'
  | 'config-step4'
  | 'dashboard'
  | 'plugin-manager';
