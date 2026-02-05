/**
 * Gateway State Store
 * Manages Gateway connection state
 */
import { create } from 'zustand';
import type { GatewayStatus } from '../types/gateway';

interface GatewayState {
  status: GatewayStatus;
  isInitialized: boolean;
  
  // Actions
  init: () => Promise<void>;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  restart: () => Promise<void>;
  setStatus: (status: GatewayStatus) => void;
}

export const useGatewayStore = create<GatewayState>((set, get) => ({
  status: {
    state: 'stopped',
    port: 18789,
  },
  isInitialized: false,
  
  init: async () => {
    if (get().isInitialized) return;
    
    try {
      // Get initial status
      const status = await window.electron.ipcRenderer.invoke('gateway:status') as GatewayStatus;
      set({ status, isInitialized: true });
      
      // Listen for status changes
      window.electron.ipcRenderer.on('gateway:status-changed', (newStatus) => {
        set({ status: newStatus as GatewayStatus });
      });
    } catch (error) {
      console.error('Failed to initialize Gateway:', error);
    }
  },
  
  start: async () => {
    try {
      set({ status: { ...get().status, state: 'starting' } });
      const result = await window.electron.ipcRenderer.invoke('gateway:start') as { success: boolean; error?: string };
      
      if (!result.success) {
        set({ status: { ...get().status, state: 'error', error: result.error } });
      }
    } catch (error) {
      set({ status: { ...get().status, state: 'error', error: String(error) } });
    }
  },
  
  stop: async () => {
    try {
      await window.electron.ipcRenderer.invoke('gateway:stop');
      set({ status: { ...get().status, state: 'stopped' } });
    } catch (error) {
      console.error('Failed to stop Gateway:', error);
    }
  },
  
  restart: async () => {
    const { stop, start } = get();
    await stop();
    await start();
  },
  
  setStatus: (status) => set({ status }),
}));
