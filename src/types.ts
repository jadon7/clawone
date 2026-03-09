export interface ElectronAPI {
  openExternal: (url: string) => Promise<void>;
  checkNode: () => Promise<{ installed: boolean; version: string | null; valid: boolean; debug?: string }>;
  checkPackageManager: (manager: string) => Promise<{ installed: boolean; version: string | null; debug?: string }>;
  checkGit: () => Promise<{ installed: boolean; version: string | null; debug?: string }>;
  installOpenClaw: () => Promise<{ success: boolean }>;
  onInstallLog: (callback: (log: string) => void) => void;
  readConfig: () => Promise<OpenClawConfig | null>;
  writeConfig: (config: OpenClawConfig) => Promise<{ success: boolean; error?: string }>;
  getAuthOptions: () => Promise<AuthOptionDefinition[]>;
  testApiConnection: (config: AISetup) => Promise<{ success: boolean; message: string; details?: string }>;
  startOpenClaw: () => Promise<{ success: boolean }>;
  stopOpenClaw: () => Promise<{ success: boolean; error?: string }>;
  uninstallOpenClaw: () => Promise<{ success: boolean; error?: string }>;
  getServiceStatus: () => Promise<{ running: boolean; output: string }>;
  downloadOnlineConfig: (sourceUrl: string) => Promise<{ success: boolean; error?: string }>;
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
  getPlugins: () => Promise<Plugin[]>;
  installPlugin: (spec: string) => Promise<{ success: boolean; error?: string }>;
  uninstallPlugin: (pluginId: string) => Promise<{ success: boolean; error?: string }>;
  setPluginEnabled: (pluginId: string, enabled: boolean) => Promise<{ success: boolean; error?: string }>;
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
  installed: boolean;
  enabled: boolean;
  version?: string;
  origin?: string;
  status?: string;
  source?: string;
  packageSpec?: string;
}

export interface SelectOptionDefinition {
  value: string;
  label: string;
  labelZh: string;
}

export interface ChannelFieldDefinition {
  id: string;
  label: string;
  labelZh: string;
  placeholder: string;
  cliFlag?: string;
  configPath?: string;
  required?: boolean;
  secret?: boolean;
  inputType?: 'text' | 'password' | 'textarea' | 'select';
  options?: SelectOptionDefinition[];
  help?: string;
  helpZh?: string;
}

export interface ChannelDefinition {
  id: string;
  name: string;
  nameZh: string;
  setupLabel: string;
  setupLabelZh: string;
  summary: string;
  summaryZh: string;
  docsUrl: string;
  commandMode: 'login' | 'add' | 'plugin' | 'manual';
  fields: ChannelFieldDefinition[];
  steps: string[];
  stepsZh: string[];
}

export interface ChannelDraft {
  enabled: boolean;
  values: Record<string, string>;
}

export type ChannelDraftMap = Record<string, ChannelDraft>;

export interface AISetup {
  authChoice: string;
  provider: string;
  providerId?: string;
  values: Record<string, string>;
  apiKey?: string;
}

export interface AuthOptionDefinition {
  id: string;
  label: string;
  labelZh: string;
  description: string;
  descriptionZh: string;
  providerId?: string;
  fieldFlagMap: Record<string, string>;
  fields: ChannelFieldDefinition[];
  probeProvider?: string;
  probeMode?: 'probe' | 'stage-only';
}

export interface OpenClawConfig {
  ai: AISetup;
  workspace: string;
  channels?: ChannelDraftMap;
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
