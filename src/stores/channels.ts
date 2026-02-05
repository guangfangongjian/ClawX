/**
 * Channels State Store
 * Manages messaging channel state
 */
import { create } from 'zustand';
import type { Channel } from '../types/channel';

interface ChannelsState {
  channels: Channel[];
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchChannels: () => Promise<void>;
  connectChannel: (channelId: string) => Promise<void>;
  disconnectChannel: (channelId: string) => Promise<void>;
  setChannels: (channels: Channel[]) => void;
  updateChannel: (channelId: string, updates: Partial<Channel>) => void;
}

export const useChannelsStore = create<ChannelsState>((set, get) => ({
  channels: [],
  loading: false,
  error: null,
  
  fetchChannels: async () => {
    set({ loading: true, error: null });
    
    try {
      const result = await window.electron.ipcRenderer.invoke(
        'gateway:rpc',
        'channels.list'
      ) as { success: boolean; result?: Channel[]; error?: string };
      
      if (result.success && result.result) {
        set({ channels: result.result, loading: false });
      } else {
        set({ error: result.error || 'Failed to fetch channels', loading: false });
      }
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },
  
  connectChannel: async (channelId) => {
    const { updateChannel } = get();
    updateChannel(channelId, { status: 'connecting' });
    
    try {
      const result = await window.electron.ipcRenderer.invoke(
        'gateway:rpc',
        'channels.connect',
        { channelId }
      ) as { success: boolean; error?: string };
      
      if (result.success) {
        updateChannel(channelId, { status: 'connected' });
      } else {
        updateChannel(channelId, { status: 'error', error: result.error });
      }
    } catch (error) {
      updateChannel(channelId, { status: 'error', error: String(error) });
    }
  },
  
  disconnectChannel: async (channelId) => {
    try {
      await window.electron.ipcRenderer.invoke(
        'gateway:rpc',
        'channels.disconnect',
        { channelId }
      );
      
      const { updateChannel } = get();
      updateChannel(channelId, { status: 'disconnected' });
    } catch (error) {
      console.error('Failed to disconnect channel:', error);
    }
  },
  
  setChannels: (channels) => set({ channels }),
  
  updateChannel: (channelId, updates) => {
    set((state) => ({
      channels: state.channels.map((channel) =>
        channel.id === channelId ? { ...channel, ...updates } : channel
      ),
    }));
  },
}));
