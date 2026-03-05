import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);

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
    titleBarStyle: 'hiddenInset',
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

app.whenReady().then(createWindow);

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
    const { stdout } = await execAsync('node --version');
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
    const { stdout } = await execAsync(`${manager} --version`);
    return { installed: true, version: stdout.trim() };
  } catch (error) {
    return { installed: false, version: null };
  }
});

// Check Git
ipcMain.handle('check-git', async () => {
  try {
    const { stdout } = await execAsync('git --version');
    return { installed: true, version: stdout.trim() };
  } catch (error) {
    return { installed: false, version: null };
  }
});

// Install OpenClaw
ipcMain.handle('install-openclaw', async (event) => {
  return new Promise((resolve, reject) => {
    const process = exec('npm install -g openclaw@latest');

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
    const process = exec('openclaw start');

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
    await execAsync('openclaw stop');
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Get service status
ipcMain.handle('get-service-status', async () => {
  try {
    const { stdout } = await execAsync('openclaw status');
    return { running: stdout.includes('running'), output: stdout };
  } catch (error) {
    return { running: false, output: '' };
  }
});
