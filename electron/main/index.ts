/**
 * Electron Main Process Entry
 * Manages window creation, system tray, and IPC handlers
 */
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { join } from 'path';
import { GatewayManager } from '../gateway/manager';
import { registerIpcHandlers } from './ipc-handlers';
import { createTray } from './tray';
import { createMenu } from './menu';
import { PORTS } from '../utils/config';

// Disable GPU acceleration for better compatibility
app.disableHardwareAcceleration();

// Global references
let mainWindow: BrowserWindow | null = null;
const gatewayManager = new GatewayManager();

/**
 * Create the main application window
 */
function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 16, y: 16 },
    show: false,
  });

  // Show window when ready to prevent visual flash
  win.once('ready-to-show', () => {
    win.show();
  });

  // Handle external links
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Load the app
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    // Open DevTools in development
    win.webContents.openDevTools();
  } else {
    win.loadFile(join(__dirname, '../../dist/index.html'));
  }

  return win;
}

/**
 * Initialize the application
 */
async function initialize(): Promise<void> {
  // Set application menu
  createMenu();

  // Create the main window
  mainWindow = createWindow();

  // Create system tray
  createTray(mainWindow);

  // Register IPC handlers
  registerIpcHandlers(gatewayManager, mainWindow);

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Start Gateway automatically (optional based on settings)
  try {
    await gatewayManager.start();
    console.log('Gateway started successfully');
  } catch (error) {
    console.error('Failed to start Gateway:', error);
    // Notify renderer about the error
    mainWindow?.webContents.send('gateway:error', String(error));
  }
}

// Application lifecycle
app.whenReady().then(initialize);

app.on('window-all-closed', () => {
  // On macOS, keep the app running in the menu bar
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS, re-create window when dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createWindow();
  }
});

app.on('before-quit', async () => {
  // Clean up Gateway process
  await gatewayManager.stop();
});

// Export for testing
export { mainWindow, gatewayManager };
