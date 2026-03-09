import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import os from 'os';
import { spawn } from 'child_process';
import { autoUpdater } from 'electron-updater';

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
const execCommand = async (command: string, args: string[] = [], timeoutMs: number = 10000): Promise<{ stdout: string; stderr: string; resolvedPath?: string; foundAt?: string }> => {
  const fullCommand = args.length > 0 ? `${command} ${args.join(' ')}` : command;
  const debugInfo: string[] = [];

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
      const result = await runWith(process.env, `${cmdPath} ${args.join(' ')}`);
      return { ...result, resolvedPath: process.env.PATH, foundAt: cmdPath };
    }
  } catch {}

  // Strategy 2: Check common installation paths directly
  try {
    const cmdPath = findCommandInCommonPaths(command);
    if (cmdPath) {
      debugInfo.push(`Found in common path: ${cmdPath}`);
      const result = await runWith(process.env, `${cmdPath} ${args.join(' ')}`);
      return { ...result, resolvedPath: process.env.PATH, foundAt: cmdPath };
    }
  } catch {}

  // Strategy 3: login shell PATH
  try {
    const loginPath = await getLoginShellPath();
    const env = { ...process.env, PATH: loginPath };
    const result = await runWith(env);
    return { ...result, resolvedPath: loginPath, foundAt: debugInfo[0]?.replace('Found via which: ', '') };
  } catch {}

  // Strategy 4: enriched static PATH
  try {
    const env = getShellEnv();
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
    // Use platform-specific title bar style with frame enabled for dragging
    ...(process.platform === 'darwin' ? {
      titleBarStyle: 'hiddenInset',
      frame: true
    } : {}),
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

const bootstrapValidConfig = async (workspace: string) => {
  const configPath = getConfigPath();

  try {
    await execCommand('openclaw', ['config', 'validate']);
    return;
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

  await execCommand('openclaw', [
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
    'skip',
    '--skip-channels',
    '--skip-daemon',
    '--skip-health',
    '--skip-search',
    '--skip-skills',
    '--skip-ui',
  ], 30000);
};

const isGatewayInstalled = (output: string) => {
  return !output.includes('Gateway service not installed') && !output.includes('Service unit not found');
};

const isGatewayRunning = (output: string) => {
  return output.includes('Service: LaunchAgent (loaded)') || output.toLowerCase().includes('runtime: running');
};

const emitCommandOutput = (event: Electron.IpcMainInvokeEvent, output: string) => {
  output
    .split('\n')
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .forEach((line) => event.sender.send('service-log', line));
};

const applyChannelDraft = async (channelId: (typeof SUPPORTED_CHANNELS)[number], draft: ChannelSetupDraft) => {
  if (!draft.enabled) {
    await execCommand('openclaw', ['config', 'set', `channels.${channelId}.enabled`, 'false']);
    return;
  }

  await execCommand('openclaw', ['config', 'set', `channels.${channelId}`, '{}']);

  const cliFlags = CHANNEL_ADD_FLAGS[channelId];
  if (!cliFlags) return;

  const args = ['channels', 'add', '--channel', channelId];
  let hasSetupValues = false;

  for (const [fieldId, flag] of Object.entries(cliFlags)) {
    const value = draft.values?.[fieldId]?.trim();
    if (!value) continue;
    args.push(flag, value);
    hasSetupValues = true;
  }

  if (hasSetupValues) {
    await execCommand('openclaw', args, 30000);
  }
};

// Read config
ipcMain.handle('read-config', async () => {
  try {
    const data = await fs.readFile(getUiConfigPath(), 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
});

// Write config
ipcMain.handle('write-config', async (_, config: any) => {
  try {
    // Persist UI snapshot for ClawOne display/reload.
    const configDir = path.dirname(getConfigPath());
    await fs.mkdir(configDir, { recursive: true });
    await fs.writeFile(getUiConfigPath(), JSON.stringify(config, null, 2), 'utf-8');

    const workspace = typeof config?.workspace === 'string' ? config.workspace : '~/.openclaw/workspace';
    await bootstrapValidConfig(workspace);

    await execCommand('openclaw', ['config', 'set', 'gateway.mode', JSON.stringify('local')]);
    await execCommand('openclaw', ['config', 'set', 'gateway.bind', JSON.stringify('loopback')]);
    await execCommand('openclaw', ['config', 'set', 'agents.defaults.workspace', JSON.stringify(workspace)]);

    const selectedChannels = normalizeChannels(config?.channels || {});
    for (const channelId of SUPPORTED_CHANNELS) {
      await applyChannelDraft(channelId, selectedChannels.get(channelId) || { enabled: false, values: {} });
    }

    await execCommand('openclaw', ['config', 'validate']);

    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Test API connection
ipcMain.handle('test-api-connection', async (_, provider: string, apiKey: string) => {
  // Simplified test - in production, you'd make actual API calls
  if (!apiKey || apiKey.length < 10) {
    return { success: false, message: 'Invalid API key' };
  }
  return { success: true, message: 'Connection successful' };
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

    const statusAfter = await execCommand('openclaw', ['gateway', 'status'], 30000);
    emitCommandOutput(event, statusAfter.stdout);

    if (!isGatewayRunning(statusAfter.stdout)) {
      throw new Error('Gateway service did not enter a running state. Check the logs above.');
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

// Plugin management IPC handlers
ipcMain.handle('install-plugin', async (event, pluginId: string) => {
  const npmPath = await findCommandWithWhich('npm').catch(() => null) || 'npm';
  const env = getShellEnv();
  try {
    const loginPath = await getLoginShellPath();
    if (loginPath) env.PATH = loginPath;
  } catch {}

  return new Promise((resolve) => {
    const proc = spawnCommand(npmPath, ['install', '-g', `@openclaw/plugin-${pluginId}@latest`], env);

    proc.stdout?.on('data', (data) => {
      event.sender.send('plugin-log', data.toString());
    });

    proc.stderr?.on('data', (data) => {
      event.sender.send('plugin-log', data.toString());
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({ success: false, error: `Installation failed with code ${code}` });
      }
    });
  });
});

ipcMain.handle('uninstall-plugin', async (event, pluginId: string) => {
  const npmPath = await findCommandWithWhich('npm').catch(() => null) || 'npm';
  const env = getShellEnv();
  try {
    const loginPath = await getLoginShellPath();
    if (loginPath) env.PATH = loginPath;
  } catch {}

  return new Promise((resolve) => {
    const proc = spawnCommand(npmPath, ['uninstall', '-g', `@openclaw/plugin-${pluginId}`], env);

    proc.stdout?.on('data', (data) => {
      event.sender.send('plugin-log', data.toString());
    });

    proc.stderr?.on('data', (data) => {
      event.sender.send('plugin-log', data.toString());
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({ success: false, error: `Uninstallation failed with code ${code}` });
      }
    });
  });
});

ipcMain.handle('get-installed-plugins', async () => {
  try {
    const { stdout } = await execCommand('npm', ['list', '-g', '--depth=0']);
    const plugins: string[] = [];

    // Parse npm list output to find installed @openclaw/plugin-* packages
    const lines = stdout.split('\n');
    for (const line of lines) {
      const match = line.match(/@openclaw\/plugin-([a-z0-9-]+)/i);
      if (match) {
        plugins.push(match[1]);
      }
    }

    return plugins;
  } catch (error) {
    return [];
  }
});
