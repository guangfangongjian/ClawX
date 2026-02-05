/**
 * IPC Handlers
 * Registers all IPC handlers for main-renderer communication
 */
import { ipcMain, BrowserWindow, shell, dialog, app } from 'electron';
import { GatewayManager } from '../gateway/manager';

/**
 * Register all IPC handlers
 */
export function registerIpcHandlers(
  gatewayManager: GatewayManager,
  mainWindow: BrowserWindow
): void {
  // Gateway handlers
  registerGatewayHandlers(gatewayManager, mainWindow);
  
  // Shell handlers
  registerShellHandlers();
  
  // Dialog handlers
  registerDialogHandlers();
  
  // App handlers
  registerAppHandlers();
}

/**
 * Gateway-related IPC handlers
 */
function registerGatewayHandlers(
  gatewayManager: GatewayManager,
  mainWindow: BrowserWindow
): void {
  // Get Gateway status
  ipcMain.handle('gateway:status', () => {
    return gatewayManager.getStatus();
  });
  
  // Start Gateway
  ipcMain.handle('gateway:start', async () => {
    try {
      await gatewayManager.start();
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  
  // Stop Gateway
  ipcMain.handle('gateway:stop', async () => {
    try {
      await gatewayManager.stop();
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  
  // Restart Gateway
  ipcMain.handle('gateway:restart', async () => {
    try {
      await gatewayManager.stop();
      await gatewayManager.start();
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  
  // Gateway RPC call
  ipcMain.handle('gateway:rpc', async (_, method: string, params?: unknown) => {
    try {
      const result = await gatewayManager.rpc(method, params);
      return { success: true, result };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  
  // Forward Gateway status events to renderer
  gatewayManager.on('status', (status) => {
    mainWindow.webContents.send('gateway:status-changed', status);
  });
  
  gatewayManager.on('message', (message) => {
    mainWindow.webContents.send('gateway:message', message);
  });
  
  gatewayManager.on('exit', (code) => {
    mainWindow.webContents.send('gateway:exit', code);
  });
}

/**
 * Shell-related IPC handlers
 */
function registerShellHandlers(): void {
  // Open external URL
  ipcMain.handle('shell:openExternal', async (_, url: string) => {
    await shell.openExternal(url);
  });
  
  // Open path in file explorer
  ipcMain.handle('shell:showItemInFolder', async (_, path: string) => {
    shell.showItemInFolder(path);
  });
  
  // Open path
  ipcMain.handle('shell:openPath', async (_, path: string) => {
    return await shell.openPath(path);
  });
}

/**
 * Dialog-related IPC handlers
 */
function registerDialogHandlers(): void {
  // Show open dialog
  ipcMain.handle('dialog:open', async (_, options: Electron.OpenDialogOptions) => {
    const result = await dialog.showOpenDialog(options);
    return result;
  });
  
  // Show save dialog
  ipcMain.handle('dialog:save', async (_, options: Electron.SaveDialogOptions) => {
    const result = await dialog.showSaveDialog(options);
    return result;
  });
  
  // Show message box
  ipcMain.handle('dialog:message', async (_, options: Electron.MessageBoxOptions) => {
    const result = await dialog.showMessageBox(options);
    return result;
  });
}

/**
 * App-related IPC handlers
 */
function registerAppHandlers(): void {
  // Get app version
  ipcMain.handle('app:version', () => {
    return app.getVersion();
  });
  
  // Get app name
  ipcMain.handle('app:name', () => {
    return app.getName();
  });
  
  // Get app path
  ipcMain.handle('app:getPath', (_, name: Parameters<typeof app.getPath>[0]) => {
    return app.getPath(name);
  });
  
  // Get platform
  ipcMain.handle('app:platform', () => {
    return process.platform;
  });
  
  // Quit app
  ipcMain.handle('app:quit', () => {
    app.quit();
  });
  
  // Relaunch app
  ipcMain.handle('app:relaunch', () => {
    app.relaunch();
    app.quit();
  });
}
