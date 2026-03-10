import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import os from 'os';
import { spawn } from 'child_process';
import { autoUpdater } from 'electron-updater';
import { AUTH_CATALOG, AUTH_LOOKUP } from '../src/authCatalog';
import { CHANNEL_LOOKUP } from '../src/channelCatalog';
import { AISetup, AuthOptionDefinition, ChannelDraftMap, Plugin } from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);
const SUPPORTED_CHANNELS = [
  'telegram',
  'whatsapp',
  'discord',
  'irc',
  'googlechat',
  'slack',
  'signal',
  'imessage',
  'feishu',
  'nostr',
  'msteams',
  'mattermost',
  'nextcloud-talk',
  'matrix',
  'bluebubbles',
  'line',
  'zalo',
  'zalouser',
  'synology-chat',
  'tlon',
] as const;

type ChannelSetupDraft = {
  enabled?: boolean;
  values?: Record<string, string>;
};

type ModelStatus = {
  auth?: {
    providers?: Array<{ provider: string }>;
    missingProvidersInUse?: string[];
    probes?: {
      results?: Array<{
        provider: string;
        status: string;
        latencyMs?: number;
        error?: string;
      }>;
    };
  };
};

const CHANNEL_ADD_FLAGS: Partial<Record<(typeof SUPPORTED_CHANNELS)[number], Record<string, string>>> = {
  telegram: {
    token: '--token',
  },
  discord: {
    token: '--token',
  },
  googlechat: {
    webhookUrl: '--webhook-url',
    audience: '--audience',
    audienceType: '--audience-type',
  },
  slack: {
    appToken: '--app-token',
    botToken: '--bot-token',
  },
  signal: {
    cliPath: '--cli-path',
    httpUrl: '--http-url',
    signalNumber: '--signal-number',
  },
  imessage: {
    cliPath: '--cli-path',
    dbPath: '--db-path',
    service: '--service',
    region: '--region',
  },
  matrix: {
    homeserver: '--homeserver',
    userId: '--user-id',
    accessToken: '--access-token',
    password: '--password',
    deviceName: '--device-name',
  },
  bluebubbles: {
    webhookPath: '--webhook-path',
  },
  tlon: {
    ship: '--ship',
    url: '--url',
    code: '--code',
  },
};

let supportedChannelAddTargets: Set<string> | null = null;

const parseChannelAddTargets = (helpText: string): Set<string> => {
  const inlineMatch = helpText.match(/--channel\s+[^\n]*\(([^)]+)\)/);
  if (!inlineMatch?.[1]) return new Set();
  return new Set(
    inlineMatch[1]
      .split('|')
      .map((item) => item.trim())
      .filter(Boolean),
  );
};

const getSupportedChannelAddTargets = async (): Promise<Set<string> | null> => {
  if (supportedChannelAddTargets) return supportedChannelAddTargets;

  try {
    const { stdout } = await execCommand('openclaw', ['channels', 'add', '--help'], 15000);
    const parsedTargets = parseChannelAddTargets(stdout);
    if (parsedTargets.size > 0) {
      supportedChannelAddTargets = parsedTargets;
    }
  } catch {
    // Older or custom OpenClaw builds may not expose help in the same format.
  }

  return supportedChannelAddTargets;
};

const isSkippableChannelAddError = (error: unknown): boolean => {
  const message = String((error as Error)?.message || '');
  return /Unknown channel|Unknown option|unknown option|Invalid value for .*--channel/i.test(message);
};

// Get enriched PATH for finding tools installed via nvm, homebrew, volta, etc.
const getShellEnv = (): NodeJS.ProcessEnv => {
  const env = { ...process.env };
  if (process.platform !== 'win32') {
    const home = process.env.HOME || '';
    const extraPaths = [
      '/usr/local/bin',
      '/usr/bin',
      '/bin',
      '/usr/sbin',
      '/sbin',
      '/opt/homebrew/bin',
      '/opt/homebrew/sbin',
      '/usr/local/homebrew/bin',
      `${home}/.nvm/versions/node/current/bin`,
      `${home}/.volta/bin`,
      `${home}/.fnm/current/bin`,
      `${home}/.asdf/shims`,
      `${home}/n/bin`,
      '/usr/local/opt/node/bin',
    ].filter(Boolean);

    const currentPath = env.PATH || '';
    const pathSet = new Set([...extraPaths, ...currentPath.split(':')]);
    env.PATH = Array.from(pathSet).join(':');
  }
  return env;
};

// Try to source the user's shell profile to get the real PATH
const getLoginShellPath = async (): Promise<string> => {
  if (process.platform === 'win32') return process.env.PATH || '';
  try {
    const shell = process.env.SHELL || '/bin/bash';
    const { stdout } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      exec(`${shell} -l -c 'echo $PATH'`, { timeout: 5000 }, (err, stdout, stderr) => {
        if (err) reject(err); else resolve({ stdout, stderr });
      });
    });
    return stdout.trim();
  } catch {
    return process.env.PATH || '';
  }
};

// Try to find command using 'which' with different shells
const findCommandWithWhich = async (command: string): Promise<string | null> => {
  if (process.platform === 'win32') return null;

  const shells = [
    process.env.SHELL,
    '/bin/zsh',
    '/bin/bash',
    '/bin/sh'
  ].filter(Boolean);

  for (const shell of shells) {
    try {
      const { stdout } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
        exec(`${shell} -l -c 'which ${command}'`, { timeout: 3000 }, (err, stdout, stderr) => {
          if (err) reject(err);
          else resolve({ stdout, stderr });
        });
      });
      const path = stdout.trim();
      if (path && path !== `${command} not found` && !path.includes('not found')) {
        return path;
      }
    } catch {}
  }
  return null;
};

// Direct path checks for common tools
const findCommandInCommonPaths = (command: string): string | null => {
  if (process.platform === 'win32') return null;

  const home = process.env.HOME || '';
  const commonPaths = [
    '/usr/local/bin',
    '/usr/bin',
    '/bin',
    '/opt/homebrew/bin',
    '/opt/homebrew/sbin',
    '/usr/local/homebrew/bin',
    `${home}/.nvm/versions/node/current/bin`,
    `${home}/.volta/bin`,
    `${home}/.fnm/current/bin`,
    `${home}/.asdf/shims`,
    `${home}/n/bin`,
    `${home}/.npm-global/bin`,
    `${home}/.yarn/bin`,
    '/usr/local/opt/node/bin',
    '/usr/local/opt/git/bin',
  ];

  for (const dir of commonPaths) {
    try {
      const fullPath = `${dir}/${command}`;
      // Use sync version for simplicity
      const { execSync } = require('child_process');
      execSync(`test -x "${fullPath}"`, { stdio: 'pipe' });
      return fullPath;
    } catch {}
  }
  return null;
};

// Execute a command with multiple fallback strategies
const execCommand = async (
  command: string,
  args: string[] = [],
  timeoutMs: number = 10000,
  envOverrides?: NodeJS.ProcessEnv,
): Promise<{ stdout: string; stderr: string; resolvedPath?: string; foundAt?: string }> => {
  const fullCommand = args.length > 0 ? `${command} ${args.join(' ')}` : command;
  const debugInfo: string[] = [];
  const baseEnv = { ...getShellEnv(), ...envOverrides };

  const runWith = (env: NodeJS.ProcessEnv, cmd?: string): Promise<{ stdout: string; stderr: string }> =>
    new Promise((resolve, reject) => {
      const execCmd = cmd || fullCommand;
      const child = exec(execCmd, { timeout: timeoutMs, env }, (error, stdout, stderr) => {
        if (error) {
          if (error.killed) reject(new Error('Command timeout'));
          else reject(error);
        } else {
          resolve({ stdout, stderr });
        }
      });
      const t = setTimeout(() => { child.kill(); reject(new Error('Command timeout')); }, timeoutMs);
      child.on('exit', () => clearTimeout(t));
    });

  // Strategy 1: Try to find exact path using 'which' and run directly
  try {
    const cmdPath = await findCommandWithWhich(command);
    if (cmdPath) {
      debugInfo.push(`Found via which: ${cmdPath}`);
      const result = await runWith(baseEnv, `${cmdPath} ${args.join(' ')}`);
      return { ...result, resolvedPath: baseEnv.PATH, foundAt: cmdPath };
    }
  } catch {}

  // Strategy 2: Check common installation paths directly
  try {
    const cmdPath = findCommandInCommonPaths(command);
    if (cmdPath) {
      debugInfo.push(`Found in common path: ${cmdPath}`);
      const result = await runWith(baseEnv, `${cmdPath} ${args.join(' ')}`);
      return { ...result, resolvedPath: baseEnv.PATH, foundAt: cmdPath };
    }
  } catch {}

  // Strategy 3: login shell PATH
  try {
    const loginPath = await getLoginShellPath();
    const env = { ...baseEnv, PATH: loginPath };
    const result = await runWith(env);
    return { ...result, resolvedPath: loginPath, foundAt: debugInfo[0]?.replace('Found via which: ', '') };
  } catch {}

  // Strategy 4: enriched static PATH
  try {
    const env = baseEnv;
    const result = await runWith(env);
    return { ...result, resolvedPath: env.PATH };
  } catch (err) {
    const errorMsg = `Tried: ${debugInfo.join(', ') || 'all strategies'}. Error: ${(err as Error).message}`;
    throw new Error(errorMsg);
  }
};

// Helper function to spawn process with cross-platform support and enriched PATH
const spawnCommand = (command: string, args: string[] = [], env?: NodeJS.ProcessEnv) => {
  const isWindows = process.platform === 'win32';
  const spawnEnv = env || getShellEnv();

  if (isWindows) {
    return spawn('cmd.exe', ['/c', command, ...args], { shell: true, env: spawnEnv });
  } else {
    return spawn(command, args, { shell: true, env: spawnEnv });
  }
};

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false
    },
    frame: true,
    resizable: true,
    minimizable: true,
    maximizable: true
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
};

// Auto-updater configuration
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

// Configure update server (GitHub Releases)
if (process.env.NODE_ENV === 'production') {
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'jadon7',
    repo: 'clawone'
  });
}

// Auto-updater event handlers
autoUpdater.on('checking-for-update', () => {
  mainWindow?.webContents.send('update-checking');
});

autoUpdater.on('update-available', (info) => {
  mainWindow?.webContents.send('update-available', info);
});

autoUpdater.on('update-not-available', (info) => {
  mainWindow?.webContents.send('update-not-available', info);
});

autoUpdater.on('error', (err) => {
  mainWindow?.webContents.send('update-error', err.message);
});

autoUpdater.on('download-progress', (progressObj) => {
  mainWindow?.webContents.send('update-download-progress', progressObj);
});

autoUpdater.on('update-downloaded', (info) => {
  mainWindow?.webContents.send('update-downloaded', info);
});

app.whenReady().then(() => {
  createWindow();

  // Check for updates after app is ready (only in production)
  if (!process.env.VITE_DEV_SERVER_URL) {
    setTimeout(() => {
      autoUpdater.checkForUpdates();
    }, 3000);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers

// Open external URL in default browser
ipcMain.handle('open-external', async (_, url: string) => {
  await shell.openExternal(url);
});

// Check Node.js version
ipcMain.handle('check-node', async () => {
  try {
    const { stdout, foundAt } = await execCommand('node', ['--version']);
    const version = stdout.trim().replace('v', '');
    const major = parseInt(version.split('.')[0]);
    const result = { 
      installed: true, 
      version, 
      valid: major >= 22, 
      debug: `Found at: ${foundAt || 'PATH'}` 
    };
    console.log('[check-node]', result);
    return result;
  } catch (error) {
    const msg = (error as Error).message;
    console.error('[check-node] failed:', msg);
    return { installed: false, version: null, valid: false, debug: `Not found. ${msg}` };
  }
});

// Check package manager
ipcMain.handle('check-package-manager', async (_, manager: string) => {
  try {
    const { stdout, foundAt } = await execCommand(manager, ['--version']);
    const version = stdout.trim();
    const result = { 
      installed: true, 
      version, 
      debug: `Found at: ${foundAt || 'PATH'}` 
    };
    console.log(`[check-${manager}]`, result);
    return result;
  } catch (error) {
    const msg = (error as Error).message;
    console.error(`[check-${manager}] failed:`, msg);
    return { installed: false, version: null, debug: `Not found. ${msg}` };
  }
});

// Check Git
ipcMain.handle('check-git', async () => {
  try {
    const { stdout, foundAt } = await execCommand('git', ['--version']);
    const version = stdout.trim();
    const result = { 
      installed: true, 
      version, 
      debug: `Found at: ${foundAt || 'PATH'}` 
    };
    console.log('[check-git]', result);
    return result;
  } catch (error) {
    const msg = (error as Error).message;
    console.error('[check-git] failed:', msg);
    return { installed: false, version: null, debug: `Not found. ${msg}` };
  }
});

// Install OpenClaw
ipcMain.handle('install-openclaw', async (event) => {
  // Resolve npm path and env before spawning to avoid code 127 in Electron's restricted PATH
  const npmPath = await findCommandWithWhich('npm').catch(() => null) || 'npm';
  const env = getShellEnv();

  // Try to get login shell PATH for the most accurate environment
  try {
    const loginPath = await getLoginShellPath();
    if (loginPath) env.PATH = loginPath;
  } catch {}

  return new Promise((resolve, reject) => {
    const proc = spawnCommand(npmPath, ['install', '-g', 'openclaw@latest'], env);

    proc.stdout?.on('data', (data) => {
      event.sender.send('install-log', data.toString());
    });

    proc.stderr?.on('data', (data) => {
      event.sender.send('install-log', data.toString());
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        reject(new Error(`Installation failed with code ${code}`));
      }
    });
  });
});

// Get config path
const getConfigPath = () => {
  return path.join(os.homedir(), '.openclaw', 'openclaw.json');
};

const getUiConfigPath = () => {
  return path.join(os.homedir(), '.openclaw', 'clawone-ui.json');
};

const normalizeChannels = (channels: Record<string, boolean | ChannelSetupDraft> | undefined) => {
  const normalized = new Map<string, ChannelSetupDraft>();

  for (const channelId of SUPPORTED_CHANNELS) {
    const current = channels?.[channelId];
    if (typeof current === 'boolean') {
      normalized.set(channelId, { enabled: current, values: {} });
      continue;
    }

    normalized.set(channelId, {
      enabled: Boolean(current?.enabled),
      values: current?.values || {},
    });
  }

  return normalized;
};

const LEGACY_AUTH_CHOICE_BY_PROVIDER: Record<string, string> = {
  openai: 'openai-api-key',
  anthropic: 'anthropic-api-key',
  google: 'gemini-api-key',
  openrouter: 'openrouter-api-key',
  mistral: 'mistral-api-key',
  moonshot: 'moonshot-api-key',
  minimax: 'minimax-api',
  xai: 'xai-api-key',
  zai: 'zai-api-key',
  qianfan: 'qianfan-api-key',
  volcengine: 'volcengine-api-key',
  byteplus: 'byteplus-api-key',
  kilo: 'kilocode-api-key',
  vercel: 'ai-gateway-api-key',
  'opencode-zen': 'opencode-zen',
  xiaomi: 'xiaomi-api-key',
  synthetic: 'synthetic-api-key',
  together: 'together-api-key',
  huggingface: 'huggingface-api-key',
  venice: 'venice-api-key',
  litellm: 'litellm-api-key',
  cloudflare: 'cloudflare-ai-gateway-api-key',
  custom: 'custom-api-key',
};

const LIST_CONFIG_FIELDS = new Set(['allowFrom', 'groupAllowFrom']);
let cachedAuthOptions: AuthOptionDefinition[] | null = null;

const parseJsonOutput = <T>(raw: string, fallback: T): T => {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const parseDelimitedList = (value: string) => (
  value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
);

const getValueByPath = (source: Record<string, unknown> | undefined, pathExpression: string) => {
  if (!source) return undefined;
  return pathExpression.split('.').reduce<unknown>((current, segment) => {
    if (current && typeof current === 'object' && segment in (current as Record<string, unknown>)) {
      return (current as Record<string, unknown>)[segment];
    }
    return undefined;
  }, source);
};

const serializeFieldValue = (fieldId: string, value: string) => {
  if (LIST_CONFIG_FIELDS.has(fieldId)) {
    return JSON.stringify(parseDelimitedList(value));
  }
  return JSON.stringify(value);
};

const normalizeAiSetup = (input: Partial<AISetup> | undefined): AISetup => {
  const rawValues = input?.values && typeof input.values === 'object' ? input.values : {};
  const apiKey = typeof input?.apiKey === 'string' ? input.apiKey : '';
  const values = { ...rawValues };
  if (apiKey && !values.apiKey) {
    values.apiKey = apiKey;
  }

  const authChoice = typeof input?.authChoice === 'string' && input.authChoice
    ? input.authChoice
    : LEGACY_AUTH_CHOICE_BY_PROVIDER[input?.provider || ''] || '';
  const option = AUTH_LOOKUP[authChoice];

  return {
    authChoice,
    provider: option?.label || input?.provider || '',
    providerId: option?.providerId || input?.providerId,
    values,
    apiKey: values.apiKey || '',
  };
};

const getAuthChoiceForProvider = (providerId: string | undefined) => {
  if (!providerId) return '';
  const match = AUTH_CATALOG.find((option) => option.providerId === providerId);
  return match?.id || '';
};

const getOfficialAuthOptions = async () => {
  if (cachedAuthOptions) return cachedAuthOptions;

  try {
    const { stdout } = await execCommand('openclaw', ['onboard', '--help']);
    const match = stdout.match(/--auth-choice <choice>\s+Auth:\s+([^\n]+)/);
    if (!match) {
      cachedAuthOptions = AUTH_CATALOG;
      return cachedAuthOptions;
    }

    const available = new Set(
      match[1]
        .split('|')
        .map((item) => item.trim())
        .filter(Boolean)
    );
    cachedAuthOptions = AUTH_CATALOG.filter((option) => available.has(option.id));
    return cachedAuthOptions;
  } catch {
    cachedAuthOptions = AUTH_CATALOG;
    return cachedAuthOptions;
  }
};

const backupInvalidConfigIfPresent = async () => {
  const configPath = getConfigPath();

  try {
    await execCommand('openclaw', ['config', 'validate']);
    return false;
  } catch {
    try {
      const rawConfig = await fs.readFile(configPath, 'utf-8');
      const backupPath = path.join(
        path.dirname(configPath),
        `openclaw.invalid.${Date.now()}.json`
      );
      await fs.writeFile(backupPath, rawConfig, 'utf-8');
    } catch {}
  }
  return true;
};

const buildOnboardArgs = (setup: AISetup, workspace: string) => {
  const normalized = normalizeAiSetup(setup);
  const option = AUTH_LOOKUP[normalized.authChoice];
  if (!option) {
    throw new Error('Unsupported authentication method. Re-select a provider in Step 1.');
  }

  const args = [
    'onboard',
    '--non-interactive',
    '--accept-risk',
    '--mode',
    'local',
    '--flow',
    'quickstart',
    '--workspace',
    workspace,
    '--auth-choice',
    option.id,
    '--skip-channels',
    '--skip-daemon',
    '--skip-health',
    '--skip-search',
    '--skip-skills',
    '--skip-ui',
  ];

  for (const field of option.fields) {
    const value = normalized.values[field.id]?.trim();
    if (field.required && !value) {
      throw new Error(`${field.label} is required for ${option.label}.`);
    }
    const flag = option.fieldFlagMap[field.id];
    if (flag && value) {
      args.push(flag, value);
    }
  }

  return { args, option, normalized };
};

const getProbeEnv = (baseDir: string) => ({
  OPENCLAW_CONFIG_PATH: path.join(baseDir, 'openclaw.json'),
  OPENCLAW_STATE_DIR: path.join(baseDir, 'state'),
});

const getOfficialWorkspace = async () => {
  const { stdout } = await execCommand('openclaw', ['config', 'get', 'agents.defaults.workspace']);
  return stdout.trim() || '~/.openclaw/workspace';
};

const getOfficialChannels = async () => {
  const { stdout } = await execCommand('openclaw', ['config', 'get', 'channels']);
  return parseJsonOutput<Record<string, Record<string, unknown>>>(stdout, {});
};

const getOfficialModelStatus = async () => {
  const { stdout } = await execCommand('openclaw', ['models', 'status', '--json']);
  return parseJsonOutput<ModelStatus>(stdout, {});
};

const mergeAiSetupWithOfficial = (snapshot: Partial<AISetup> | undefined, status: ModelStatus | undefined): AISetup => {
  const normalized = normalizeAiSetup(snapshot);
  const detectedProvider = status?.auth?.providers?.[0]?.provider || status?.auth?.missingProvidersInUse?.[0];
  const detectedChoice = getAuthChoiceForProvider(detectedProvider);
  const finalChoice = normalized.authChoice || detectedChoice;
  const option = AUTH_LOOKUP[finalChoice];

  return {
    authChoice: finalChoice,
    provider: option?.label || normalized.provider || detectedProvider || '',
    providerId: detectedProvider || option?.providerId || normalized.providerId,
    values: normalized.values,
    apiKey: normalized.apiKey,
  };
};

const mapOfficialChannelsToDrafts = (
  officialChannels: Record<string, Record<string, unknown>> | undefined,
  fallbackChannels: Record<string, boolean | ChannelSetupDraft> | undefined,
): ChannelDraftMap => {
  const fallbackMap = normalizeChannels(fallbackChannels);
  const mapped = {} as ChannelDraftMap;

  for (const channelId of SUPPORTED_CHANNELS) {
    const channelConfig = officialChannels?.[channelId];
    const fallback = fallbackMap.get(channelId) || { enabled: false, values: {} };
    const definition = CHANNEL_LOOKUP[channelId];
    const values: Record<string, string> = { ...(fallback.values || {}) };

    if (definition) {
      for (const field of definition.fields) {
        const configValue = getValueByPath(channelConfig, field.configPath || field.id);
        if (configValue === undefined || configValue === null) continue;
        if (Array.isArray(configValue)) {
          values[field.id] = configValue.join('\n');
        } else {
          values[field.id] = String(configValue);
        }
      }
    }

    mapped[channelId] = {
      enabled: Boolean(channelConfig?.enabled ?? fallback.enabled),
      values,
    };
  }

  return mapped;
};

const applyOfficialOnboard = async (setup: AISetup, workspace: string, envOverrides?: NodeJS.ProcessEnv) => {
  const { args } = buildOnboardArgs(setup, workspace);
  await execCommand('openclaw', args, 30000, envOverrides);
};

const probeOfficialAuth = async (setup: AISetup) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'clawone-probe-'));
  const envOverrides = getProbeEnv(tempDir);
  await fs.mkdir(envOverrides.OPENCLAW_STATE_DIR as string, { recursive: true });

  try {
    const workspace = path.join(tempDir, 'workspace');
    const { option } = buildOnboardArgs(setup, workspace);
    await applyOfficialOnboard(setup, workspace, envOverrides);

    if (option.probeMode === 'stage-only' || !option.probeProvider) {
      return {
        success: true,
        message: 'Credentials were accepted by official onboarding.',
        details: 'This auth method does not expose a stable live probe in ClawOne yet.',
      };
    }

    const { stdout } = await execCommand(
      'openclaw',
      ['models', 'status', '--json', '--probe', '--probe-provider', option.probeProvider],
      30000,
      envOverrides,
    );
    const status = parseJsonOutput<ModelStatus>(stdout, {});
    const result = status.auth?.probes?.results?.find((entry) => entry.provider === option.probeProvider);
    if (!result) {
      return {
        success: true,
        message: 'Official onboarding completed, but the probe did not return a provider result.',
      };
    }

    return {
      success: result.status === 'ok',
      message: result.status === 'ok'
        ? `Official provider probe succeeded${result.latencyMs ? ` (${result.latencyMs} ms)` : ''}.`
        : `Official provider probe returned "${result.status}".`,
      details: result.error,
    };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
};

const tryUnsetConfigPath = async (dotPath: string) => {
  try {
    await execCommand('openclaw', ['config', 'unset', dotPath]);
  } catch {}
};

const isGatewayInstalled = (output: string) => {
  return !output.includes('Gateway service not installed') && !output.includes('Service unit not found');
};

const isGatewayRunning = (output: string) => {
  const normalized = output.toLowerCase();
  return (
    normalized.includes('service: launchagent (loaded)') ||
    normalized.includes('runtime: running') ||
    normalized.includes('runtime: active') ||
    normalized.includes('active (running)')
  );
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const waitForGatewayRunning = async (
  event: Electron.IpcMainInvokeEvent,
  attempts: number,
  intervalMs: number,
) => {
  let lastOutput = '';
  for (let i = 0; i < attempts; i += 1) {
    const status = await execCommand('openclaw', ['gateway', 'status'], 30000);
    lastOutput = status.stdout;
    emitCommandOutput(event, status.stdout);
    if (isGatewayRunning(status.stdout)) {
      return { running: true, output: status.stdout };
    }
    if (i < attempts - 1) {
      await sleep(intervalMs);
    }
  }
  return { running: false, output: lastOutput };
};

const emitCommandOutput = (event: Electron.IpcMainInvokeEvent, output: string) => {
  output
    .split('\n')
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .forEach((line) => event.sender.send('service-log', line));
};

const normalizeDownloadedConfig = (payload: any) => {
  const source = payload?.config && typeof payload.config === 'object' ? payload.config : payload;
  const aiInput = source?.ai && typeof source.ai === 'object'
    ? source.ai
    : {
        provider: typeof source?.provider === 'string' ? source.provider : '',
        apiKey: typeof source?.apiKey === 'string' ? source.apiKey : '',
      };
  const ai = normalizeAiSetup(aiInput);
  const workspace = typeof source?.workspace === 'string' && source.workspace.trim()
    ? source.workspace.trim()
    : '~/.openclaw/workspace';
  const channelsInput = source?.channels && typeof source.channels === 'object' ? source.channels : {};
  const channels: Record<string, ChannelSetupDraft> = {};

  for (const channelId of SUPPORTED_CHANNELS) {
    const draft = channelsInput[channelId];
    if (typeof draft === 'boolean') {
      channels[channelId] = { enabled: draft, values: {} };
      continue;
    }
    channels[channelId] = {
      enabled: Boolean(draft?.enabled),
      values: draft?.values && typeof draft.values === 'object' ? draft.values : {},
    };
  }

  return { ai, workspace, channels };
};

const writeConfigSnapshot = async (config: { ai: AISetup; workspace: string; channels: Record<string, ChannelSetupDraft> }) => {
  const configDir = path.dirname(getConfigPath());
  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(getUiConfigPath(), JSON.stringify(config, null, 2), 'utf-8');
};

const applyConfigToOpenClaw = async (config: { ai: AISetup; workspace: string; channels: Record<string, ChannelSetupDraft> }) => {
  await backupInvalidConfigIfPresent();
  await applyOfficialOnboard(config.ai, config.workspace);

  await execCommand('openclaw', ['config', 'set', 'gateway.mode', JSON.stringify('local')]);
  await execCommand('openclaw', ['config', 'set', 'gateway.bind', JSON.stringify('loopback')]);
  await execCommand('openclaw', ['config', 'set', 'agents.defaults.workspace', JSON.stringify(config.workspace)]);

  const selectedChannels = normalizeChannels(config.channels || {});
  for (const channelId of SUPPORTED_CHANNELS) {
    await applyChannelDraft(channelId, selectedChannels.get(channelId) || { enabled: false, values: {} });
  }

  await execCommand('openclaw', ['config', 'validate']);
};

const tryRecoverMacLaunchAgent = async (event: Electron.IpcMainInvokeEvent) => {
  if (process.platform !== 'darwin') return;
  const uid = process.getuid?.() || Number(process.env.UID || 0);
  if (!uid) return;
  const plistPath = path.join(os.homedir(), 'Library', 'LaunchAgents', 'ai.openclaw.gateway.plist');
  const domain = `gui/${uid}`;

  event.sender.send('service-log', 'Gateway not running after start. Attempting launchctl recovery...');
  await execCommand('launchctl', ['bootout', domain, 'ai.openclaw.gateway']).catch(() => undefined);
  await execCommand('launchctl', ['bootstrap', domain, plistPath], 30000);
  await execCommand('launchctl', ['kickstart', '-k', `${domain}/ai.openclaw.gateway`], 30000);
};

const applyChannelDraft = async (channelId: (typeof SUPPORTED_CHANNELS)[number], draft: ChannelSetupDraft) => {
  if (!draft.enabled) {
    await execCommand('openclaw', ['config', 'set', `channels.${channelId}.enabled`, 'false']);
    return;
  }

  await execCommand('openclaw', ['config', 'set', `channels.${channelId}`, '{}']);

  const cliFlags = CHANNEL_ADD_FLAGS[channelId];
  if (cliFlags) {
    const args = ['channels', 'add', '--channel', channelId];
    let hasSetupValues = false;

    for (const [fieldId, flag] of Object.entries(cliFlags)) {
      const value = draft.values?.[fieldId]?.trim();
      if (!value) continue;
      args.push(flag, value);
      hasSetupValues = true;
    }

    if (hasSetupValues) {
      const supportedTargets = await getSupportedChannelAddTargets();
      const isSupportedByCli = !supportedTargets || supportedTargets.has(channelId);

      if (!isSupportedByCli) {
        console.warn(`[channel] Skipping openclaw channels add for unsupported channel "${channelId}" in current CLI.`);
      } else {
        try {
          await execCommand('openclaw', args, 30000);
        } catch (error) {
          if (!isSkippableChannelAddError(error)) {
            throw error;
          }
          console.warn(`[channel] Non-blocking channel add failure for "${channelId}": ${(error as Error).message}`);
        }
      }
    }
  }

  await execCommand('openclaw', ['config', 'set', `channels.${channelId}.enabled`, 'true']);

  const definition = CHANNEL_LOOKUP[channelId];
  for (const field of definition?.fields || []) {
    if (!field.configPath) continue;
    const rawValue = draft.values?.[field.id]?.trim() || '';
    const dotPath = `channels.${channelId}.${field.configPath}`;
    if (!rawValue) {
      await tryUnsetConfigPath(dotPath);
      continue;
    }

    await execCommand('openclaw', ['config', 'set', dotPath, serializeFieldValue(field.configPath, rawValue)]);
  }
};

// Read config
ipcMain.handle('read-config', async () => {
  try {
    let uiSnapshot: Partial<{ ai: Partial<AISetup>; workspace: string; channels: Record<string, boolean | ChannelSetupDraft> }> | null = null;
    try {
      const data = await fs.readFile(getUiConfigPath(), 'utf-8');
      uiSnapshot = JSON.parse(data);
    } catch {}

    const [workspace, officialChannels, modelStatus] = await Promise.all([
      getOfficialWorkspace().catch(() => uiSnapshot?.workspace || '~/.openclaw/workspace'),
      getOfficialChannels().catch(() => ({})),
      getOfficialModelStatus().catch(() => ({})),
    ]);

    const ai = mergeAiSetupWithOfficial(uiSnapshot?.ai, modelStatus);
    const channels = mapOfficialChannelsToDrafts(officialChannels, uiSnapshot?.channels);

    if (!uiSnapshot && !ai.authChoice && Object.keys(officialChannels).length === 0 && !workspace) {
      return null;
    }

    return {
      ai,
      workspace,
      channels,
    };
  } catch {
    return null;
  }
});

// Write config
ipcMain.handle('write-config', async (_, config: any) => {
  try {
    const normalizedConfig = {
      ai: normalizeAiSetup(config?.ai),
      workspace: typeof config?.workspace === 'string' ? config.workspace : '~/.openclaw/workspace',
      channels: config?.channels || {},
    };
    await writeConfigSnapshot(normalizedConfig);
    await applyConfigToOpenClaw(normalizedConfig);

    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('download-online-config', async (_, sourceUrl: string) => {
  try {
    if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl.trim())) {
      throw new Error('Please provide a valid http(s) URL.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(sourceUrl.trim(), {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}.`);
    }

    const payload = await response.json();
    const normalizedConfig = normalizeDownloadedConfig(payload);
    await writeConfigSnapshot(normalizedConfig);
    await applyConfigToOpenClaw(normalizedConfig);

    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('get-auth-options', async () => {
  return getOfficialAuthOptions();
});

// Test API connection
ipcMain.handle('test-api-connection', async (_, setup: Partial<AISetup>) => {
  try {
    return await probeOfficialAuth(normalizeAiSetup(setup));
  } catch (error) {
    return {
      success: false,
      message: 'Official auth probe failed.',
      details: (error as Error).message,
    };
  }
});

// Start OpenClaw service
ipcMain.handle('start-openclaw', async (event) => {
  try {
    const statusBefore = await execCommand('openclaw', ['gateway', 'status'], 30000);
    emitCommandOutput(event, statusBefore.stdout);

    if (!isGatewayInstalled(statusBefore.stdout)) {
      event.sender.send('service-log', 'Gateway service is not installed. Installing it now...');
      const installResult = await execCommand('openclaw', ['gateway', 'install'], 30000);
      emitCommandOutput(event, installResult.stdout);
      emitCommandOutput(event, installResult.stderr);
    }

    event.sender.send('service-log', 'Starting OpenClaw gateway service...');
    const startResult = await execCommand('openclaw', ['gateway', 'start'], 30000);
    emitCommandOutput(event, startResult.stdout);
    emitCommandOutput(event, startResult.stderr);

    let statusAfter = await waitForGatewayRunning(event, 6, 1500);

    if (!statusAfter.running) {
      await tryRecoverMacLaunchAgent(event).catch((error) => {
        event.sender.send('service-log', `launchctl recovery skipped: ${(error as Error).message}`);
      });
      const retryStart = await execCommand('openclaw', ['gateway', 'start'], 30000);
      emitCommandOutput(event, retryStart.stdout);
      emitCommandOutput(event, retryStart.stderr);
      statusAfter = await waitForGatewayRunning(event, 6, 1500);

      if (!statusAfter.running) {
        event.sender.send('service-log', 'Gateway still not running. Reinstalling gateway service and retrying...');
        await execCommand('openclaw', ['gateway', 'stop'], 30000).catch(() => undefined);
        await execCommand('openclaw', ['gateway', 'uninstall'], 30000).catch(() => undefined);
        const reinstall = await execCommand('openclaw', ['gateway', 'install'], 30000);
        emitCommandOutput(event, reinstall.stdout);
        emitCommandOutput(event, reinstall.stderr);
        const restart = await execCommand('openclaw', ['gateway', 'start'], 30000);
        emitCommandOutput(event, restart.stdout);
        emitCommandOutput(event, restart.stderr);
        statusAfter = await waitForGatewayRunning(event, 8, 1500);
      }

      if (!statusAfter.running) {
        throw new Error('Gateway service did not enter a running state. Check the logs above.');
      }
    }

    return { success: true };
  } catch (error) {
    event.sender.send('service-log', `Error: ${(error as Error).message}`);
    throw error;
  }
});

// Stop OpenClaw service
ipcMain.handle('stop-openclaw', async () => {
  try {
    await execCommand('openclaw', ['gateway', 'stop']);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('uninstall-openclaw', async (event) => {
  try {
    event.sender.send('service-log', 'Stopping OpenClaw gateway service before uninstall...');
    await execCommand('openclaw', ['gateway', 'stop'], 30000).catch(() => undefined);
    await execCommand('openclaw', ['gateway', 'uninstall'], 30000).catch(() => undefined);

    const npmPath = await findCommandWithWhich('npm').catch(() => null) || 'npm';
    const env = getShellEnv();
    const loginPath = await getLoginShellPath().catch(() => '');
    if (loginPath) env.PATH = loginPath;

    await new Promise<void>((resolve, reject) => {
      const proc = spawnCommand(npmPath, ['uninstall', '-g', 'openclaw'], env);
      proc.stdout?.on('data', (data) => event.sender.send('service-log', data.toString()));
      proc.stderr?.on('data', (data) => event.sender.send('service-log', data.toString()));
      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
          return;
        }
        reject(new Error(`Uninstall failed with code ${code}`));
      });
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Get service status
ipcMain.handle('get-service-status', async () => {
  try {
    const { stdout } = await execCommand('openclaw', ['gateway', 'status']);
    return {
      running: isGatewayRunning(stdout),
      output: stdout
    };
  } catch (error) {
    return { running: false, output: '' };
  }
});

// Auto-updater IPC handlers
ipcMain.handle('check-for-updates', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return { success: true, updateInfo: result?.updateInfo };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('download-update', async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall(false, true);
});

const PLUGIN_VISUALS: Record<string, Pick<Plugin, 'icon' | 'category'>> = {
  whatsapp: { icon: '💬', category: 'messaging' },
  telegram: { icon: '✈️', category: 'messaging' },
  discord: { icon: '🎮', category: 'messaging' },
  slack: { icon: '💼', category: 'messaging' },
  googlechat: { icon: '🗨️', category: 'messaging' },
  signal: { icon: '🔒', category: 'messaging' },
  imessage: { icon: '💭', category: 'messaging' },
  feishu: { icon: '🪶', category: 'messaging' },
  msteams: { icon: '🟦', category: 'messaging' },
  mattermost: { icon: '🏁', category: 'messaging' },
  'nextcloud-talk': { icon: '☁️', category: 'messaging' },
  matrix: { icon: '🧩', category: 'messaging' },
  bluebubbles: { icon: '🔵', category: 'messaging' },
  line: { icon: '📗', category: 'messaging' },
  zalo: { icon: '📨', category: 'messaging' },
  zalouser: { icon: '👤', category: 'messaging' },
  'synology-chat': { icon: '🗂️', category: 'messaging' },
  tlon: { icon: '🌊', category: 'messaging' },
  'copilot-proxy': { icon: '🤖', category: 'integration' },
  'google-gemini-cli-auth': { icon: '🧠', category: 'integration' },
  acpx: { icon: '🦀', category: 'utility' },
  memory: { icon: '🧠', category: 'utility' },
};

const getPlugins = async (): Promise<Plugin[]> => {
  const { stdout } = await execCommand('openclaw', ['plugins', 'list', '--json'], 30000);
  const payload = parseJsonOutput<{ plugins?: Array<Record<string, unknown>> }>(stdout, {});
  return (payload.plugins || [])
    .map((plugin) => {
      const id = String(plugin.id || '');
      const visuals = PLUGIN_VISUALS[id] || { icon: '🔌', category: 'utility' as const };
      const origin = String(plugin.origin || '');
      return {
        id,
        name: String(plugin.name || id),
        description: String(plugin.description || ''),
        icon: visuals.icon,
        category: visuals.category,
        installed: true,
        enabled: Boolean(plugin.enabled),
        version: typeof plugin.version === 'string' ? plugin.version : undefined,
        origin,
        status: typeof plugin.status === 'string' ? plugin.status : undefined,
        source: typeof plugin.source === 'string' ? plugin.source : undefined,
        packageSpec: origin === 'bundled' ? undefined : typeof plugin.name === 'string' ? String(plugin.name) : undefined,
      } satisfies Plugin;
    })
    .sort((left, right) => left.name.localeCompare(right.name));
};

const forwardPluginCommandOutput = (
  event: Electron.IpcMainInvokeEvent,
  command: string,
  args: string[],
  successMessage: string,
  failurePrefix: string,
) => new Promise<{ success: boolean; error?: string }>((resolve) => {
  const proc = spawnCommand(command, args, getShellEnv());

  proc.stdout?.on('data', (data) => {
    event.sender.send('plugin-log', data.toString());
  });

  proc.stderr?.on('data', (data) => {
    event.sender.send('plugin-log', data.toString());
  });

  proc.on('close', (code) => {
    if (code === 0) {
      event.sender.send('plugin-log', successMessage);
      resolve({ success: true });
      return;
    }
    resolve({ success: false, error: `${failurePrefix} (exit ${code})` });
  });
});

// Plugin management IPC handlers
ipcMain.handle('get-plugins', async () => {
  try {
    return await getPlugins();
  } catch {
    return [];
  }
});

ipcMain.handle('install-plugin', async (event, spec: string) => {
  return forwardPluginCommandOutput(
    event,
    'openclaw',
    ['plugins', 'install', spec],
    `Installed plugin ${spec}.`,
    `Installation failed for ${spec}`,
  );
});

ipcMain.handle('uninstall-plugin', async (event, pluginId: string) => {
  return forwardPluginCommandOutput(
    event,
    'openclaw',
    ['plugins', 'uninstall', pluginId, '--force'],
    `Uninstalled plugin ${pluginId}.`,
    `Uninstallation failed for ${pluginId}`,
  );
});

ipcMain.handle('set-plugin-enabled', async (_, pluginId: string, enabled: boolean) => {
  try {
    await execCommand('openclaw', ['plugins', enabled ? 'enable' : 'disable', pluginId], 30000);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});
