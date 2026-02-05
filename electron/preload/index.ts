/**
 * Preload Script
 * Exposes safe APIs to the renderer process via contextBridge
 */
import { contextBridge, ipcRenderer } from 'electron';

/**
 * IPC renderer methods exposed to the renderer process
 */
const electronAPI = {
  /**
   * IPC invoke (request-response pattern)
   */
  ipcRenderer: {
    invoke: (channel: string, ...args: unknown[]) => {
      const validChannels = [
        // Gateway
        'gateway:status',
        'gateway:start',
        'gateway:stop',
        'gateway:restart',
        'gateway:rpc',
        // Shell
        'shell:openExternal',
        'shell:showItemInFolder',
        'shell:openPath',
        // Dialog
        'dialog:open',
        'dialog:save',
        'dialog:message',
        // App
        'app:version',
        'app:name',
        'app:getPath',
        'app:platform',
        'app:quit',
        'app:relaunch',
        // Settings
        'settings:get',
        'settings:set',
        'settings:getAll',
        'settings:reset',
        // Update
        'update:check',
        'update:download',
        'update:install',
        'update:getStatus',
        // Env
        'env:getConfig',
        'env:setApiKey',
        'env:deleteApiKey',
        // Provider
        'provider:validateKey',
        // Cron
        'cron:list',
        'cron:create',
        'cron:update',
        'cron:delete',
        'cron:toggle',
        'cron:trigger',
      ];
      
      if (validChannels.includes(channel)) {
        return ipcRenderer.invoke(channel, ...args);
      }
      
      throw new Error(`Invalid IPC channel: ${channel}`);
    },
    
    /**
     * Listen for events from main process
     */
    on: (channel: string, callback: (...args: unknown[]) => void) => {
      const validChannels = [
        'gateway:status-changed',
        'gateway:message',
        'gateway:exit',
        'gateway:error',
        'navigate',
        'update:available',
        'update:downloaded',
        'update:status',
        'cron:updated',
      ];
      
      if (validChannels.includes(channel)) {
        // Wrap the callback to strip the event
        const subscription = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => {
          callback(...args);
        };
        ipcRenderer.on(channel, subscription);
        
        // Return unsubscribe function
        return () => {
          ipcRenderer.removeListener(channel, subscription);
        };
      }
      
      throw new Error(`Invalid IPC channel: ${channel}`);
    },
    
    /**
     * Listen for a single event from main process
     */
    once: (channel: string, callback: (...args: unknown[]) => void) => {
      const validChannels = [
        'gateway:status-changed',
        'gateway:message',
        'gateway:exit',
        'gateway:error',
        'navigate',
        'update:available',
        'update:downloaded',
        'update:status',
      ];
      
      if (validChannels.includes(channel)) {
        ipcRenderer.once(channel, (_event, ...args) => callback(...args));
        return;
      }
      
      throw new Error(`Invalid IPC channel: ${channel}`);
    },
    
    /**
     * Remove all listeners for a channel
     */
    off: (channel: string, callback?: (...args: unknown[]) => void) => {
      if (callback) {
        ipcRenderer.removeListener(channel, callback as any);
      } else {
        ipcRenderer.removeAllListeners(channel);
      }
    },
  },
  
  /**
   * Open external URL in default browser
   */
  openExternal: (url: string) => {
    return ipcRenderer.invoke('shell:openExternal', url);
  },
  
  /**
   * Get current platform
   */
  platform: process.platform,
  
  /**
   * Check if running in development
   */
  isDev: process.env.NODE_ENV === 'development' || !!process.env.VITE_DEV_SERVER_URL,
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electron', electronAPI);

// Type declarations for the renderer process
export type ElectronAPI = typeof electronAPI;
