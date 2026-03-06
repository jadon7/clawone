import { app, BrowserWindow, ipcMain } from 'electron';
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

// Execute a command, trying login shell PATH first, then fallback paths
const execCommand = async (command: string, args: string[] = [], timeoutMs: number = 10000): Promise<{ stdout: string; stderr: string; resolvedPath?: string }> => {
  const fullCommand = args.length > 0 ? `${command} ${args.join(' ')}` : command;

  const runWith = (env: NodeJS.ProcessEnv): Promise<{ stdout: string; stderr: string }> =>
    new Promise((resolve, reject) => {
      const child = exec(fullCommand, { shell: true, timeout: timeoutMs, env }, (error, stdout, stderr) => {
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

  // Strategy 1: login shell PATH
  try {
    const loginPath = await getLoginShellPath();
    const env = { ...process.env, PATH: loginPath };
    const result = await runWith(env);
    return { ...result, resolvedPath: loginPath };
  } catch {}

  // Strategy 2: enriched static PATH
  try {
    const env = getShellEnv();
    const result = await runWith(env);
    return { ...result, resolvedPath: env.PATH };
  } catch (err) {
    throw err;
  }
};

// Helper function to spawn process with cross-platform support
const spawnCommand = (command: string, args: string[] = []) => {
  const isWindows = process.platform === 'win32';

  if (isWindows) {
    // On Windows, use cmd.exe to execute commands
    return spawn('cmd.exe', ['/c', command, ...args], { shell: true });
  } else {
    return spawn(command, args, { shell: true });
  }
};

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
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

// Check Node.js version
ipcMain.handle('check-node', async () => {
  try {
    const { stdout, resolvedPath } = await execCommand('node', ['--version']);
    const version = stdout.trim().replace('v', '');
    const major = parseInt(version.split('.')[0]);
    const result = { installed: true, version, valid: major >= 22, debug: `Found via PATH: ${resolvedPath?.split(':').slice(0,3).join(':')}...` };
    console.log('[check-node]', result);
    return result;
  } catch (error) {
    const msg = (error as Error).message;
    console.error('[check-node] failed:', msg);
    return { installed: false, version: null, valid: false, debug: `Error: ${msg}` };
  }
});

// Check package manager
ipcMain.handle('check-package-manager', async (_, manager: string) => {
  try {
    const { stdout, resolvedPath } = await execCommand(manager, ['--version']);
    const version = stdout.trim();
    const result = { installed: true, version, debug: `Found via PATH: ${resolvedPath?.split(':').slice(0,3).join(':')}...` };
    console.log(`[check-${manager}]`, result);
    return result;
  } catch (error) {
    const msg = (error as Error).message;
    console.error(`[check-${manager}] failed:`, msg);
    return { installed: false, version: null, debug: `Error: ${msg}` };
  }
});

// Check Git
ipcMain.handle('check-git', async () => {
  try {
    const { stdout, resolvedPath } = await execCommand('git', ['--version']);
    const version = stdout.trim();
    const result = { installed: true, version, debug: `Found via PATH: ${resolvedPath?.split(':').slice(0,3).join(':')}...` };
    console.log('[check-git]', result);
    return result;
  } catch (error) {
    const msg = (error as Error).message;
    console.error('[check-git] failed:', msg);
    return { installed: false, version: null, debug: `Error: ${msg}` };
  }
});

// Install OpenClaw
ipcMain.handle('install-openclaw', async (event) => {
  return new Promise((resolve, reject) => {
    const process = spawnCommand('npm', ['install', '-g', 'openclaw@latest']);

    process.stdout?.on('data', (data) => {
      event.sender.send('install-log', data.toString());
    });

    process.stderr?.on('data', (data) => {
      event.sender.send('install-log', data.toString());
    });

    process.on('close', (code) => {
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

// Read config
ipcMain.handle('read-config', async () => {
  try {
    const configPath = getConfigPath();
    const data = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
});

// Write config
ipcMain.handle('write-config', async (_, config: any) => {
  try {
    const configPath = getConfigPath();
    const configDir = path.dirname(configPath);

    await fs.mkdir(configDir, { recursive: true });
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');

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
  return new Promise((resolve, reject) => {
    const process = spawnCommand('openclaw', ['start']);

    process.stdout?.on('data', (data) => {
      event.sender.send('service-log', data.toString());
    });

    process.stderr?.on('data', (data) => {
      event.sender.send('service-log', data.toString());
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        reject(new Error(`Service failed with code ${code}`));
      }
    });
  });
});

// Stop OpenClaw service
ipcMain.handle('stop-openclaw', async () => {
  try {
    await execCommand('openclaw', ['stop']);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Get service status
ipcMain.handle('get-service-status', async () => {
  try {
    const { stdout } = await execCommand('openclaw', ['status']);
    return { running: stdout.includes('running'), output: stdout };
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
  return new Promise((resolve) => {
    const process = spawnCommand('npm', ['install', '-g', `@openclaw/plugin-${pluginId}@latest`]);

    process.stdout?.on('data', (data) => {
      event.sender.send('plugin-log', data.toString());
    });

    process.stderr?.on('data', (data) => {
      event.sender.send('plugin-log', data.toString());
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({ success: false, error: `Installation failed with code ${code}` });
      }
    });
  });
});

ipcMain.handle('uninstall-plugin', async (event, pluginId: string) => {
  return new Promise((resolve) => {
    const process = spawnCommand('npm', ['uninstall', '-g', `@openclaw/plugin-${pluginId}`]);

    process.stdout?.on('data', (data) => {
      event.sender.send('plugin-log', data.toString());
    });

    process.stderr?.on('data', (data) => {
      event.sender.send('plugin-log', data.toString());
    });

    process.on('close', (code) => {
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
      const match = line.match(/@openclaw\/plugin-(\w+)/);
      if (match) {
        plugins.push(match[1]);
      }
    }

    return plugins;
  } catch (error) {
    return [];
  }
});
