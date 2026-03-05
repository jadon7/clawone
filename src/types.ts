export interface ElectronAPI {
  checkNode: () => Promise<{ installed: boolean; version: string | null; valid: boolean }>;
  checkPackageManager: (manager: string) => Promise<{ installed: boolean; version: string | null }>;
  checkGit: () => Promise<{ installed: boolean; version: string | null }>;
  installOpenClaw: () => Promise<{ success: boolean }>;
  onInstallLog: (callback: (log: string) => void) => void;
  readConfig: () => Promise<OpenClawConfig | null>;
  writeConfig: (config: OpenClawConfig) => Promise<{ success: boolean; error?: string }>;
  testApiConnection: (provider: string, apiKey: string) => Promise<{ success: boolean; message: string }>;
  startOpenClaw: () => Promise<{ success: boolean }>;
  stopOpenClaw: () => Promise<{ success: boolean; error?: string }>;
  getServiceStatus: () => Promise<{ running: boolean; output: string }>;
  onServiceLog: (callback: (log: string) => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
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
}

export type Page =
  | 'welcome'
  | 'environment'
  | 'install'
  | 'config-step1'
  | 'config-step2'
  | 'config-step3'
  | 'config-step4'
  | 'dashboard';
