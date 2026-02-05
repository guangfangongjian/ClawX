/**
 * Chat State Store
 * Manages chat messages and conversation state
 */
import { create } from 'zustand';

/**
 * Tool call in a message
 */
interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  status: 'pending' | 'running' | 'completed' | 'error';
}

/**
 * Chat message
 */
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  channel?: string;
  toolCalls?: ToolCall[];
}

interface ChatState {
  messages: ChatMessage[];
  loading: boolean;
  sending: boolean;
  error: string | null;
  
  // Actions
  fetchHistory: (limit?: number) => Promise<void>;
  sendMessage: (content: string, channelId?: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  addMessage: (message: ChatMessage) => void;
  updateMessage: (messageId: string, updates: Partial<ChatMessage>) => void;
  setMessages: (messages: ChatMessage[]) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  loading: false,
  sending: false,
  error: null,
  
  fetchHistory: async (limit = 50) => {
    set({ loading: true, error: null });
    
    try {
      const result = await window.electron.ipcRenderer.invoke(
        'gateway:rpc',
        'chat.history',
        { limit, offset: 0 }
      ) as { success: boolean; result?: ChatMessage[]; error?: string };
      
      if (result.success && result.result) {
        set({ messages: result.result, loading: false });
      } else {
        set({ error: result.error || 'Failed to fetch history', loading: false });
      }
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },
  
  sendMessage: async (content, channelId) => {
    const { addMessage } = get();
    
    // Add user message immediately
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      channel: channelId,
    };
    addMessage(userMessage);
    
    set({ sending: true, error: null });
    
    try {
      const result = await window.electron.ipcRenderer.invoke(
        'gateway:rpc',
        'chat.send',
        { content, channelId }
      ) as { success: boolean; result?: ChatMessage; error?: string };
      
      if (result.success && result.result) {
        addMessage(result.result);
      } else {
        set({ error: result.error || 'Failed to send message' });
      }
    } catch (error) {
      set({ error: String(error) });
    } finally {
      set({ sending: false });
    }
  },
  
  clearHistory: async () => {
    try {
      await window.electron.ipcRenderer.invoke('gateway:rpc', 'chat.clear');
      set({ messages: [] });
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  },
  
  addMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },
  
  updateMessage: (messageId, updates) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      ),
    }));
  },
  
  setMessages: (messages) => set({ messages }),
}));
