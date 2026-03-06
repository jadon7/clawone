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

// Helper function to execute commands in a cross-platform way
const execCommand = (command: string, args: string[] = []): Promise<{ stdout: string; stderr: string }> => {
  return new Promise((resolve, reject) => {
    const isWindows = process.platform === 'win32';
    const shell = isWindows ? true : false;
    const fullCommand = args.length > 0 ? `${command} ${args.join(' ')}` : command;

    exec(fullCommand, { shell }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
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
    const { stdout } = await execCommand('node', ['--version']);
    const version = stdout.trim().replace('v', '');
    const major = parseInt(version.split('.')[0]);
    return { installed: true, version, valid: major >= 22 };
  } catch (error) {
    return { installed: false, version: null, valid: false };
  }
});

// Check package manager
ipcMain.handle('check-package-manager', async (_, manager: string) => {
  try {
    const { stdout } = await execCommand(manager, ['--version']);
    return { installed: true, version: stdout.trim() };
  } catch (error) {
    return { installed: false, version: null };
  }
});

// Check Git
ipcMain.handle('check-git', async () => {
  try {
    const { stdout } = await execCommand('git', ['--version']);
    return { installed: true, version: stdout.trim() };
  } catch (error) {
    return { installed: false, version: null };
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
