/**
 * Gateway WebSocket Client
 * Provides a typed interface for Gateway RPC calls
 */
import { GatewayManager } from './manager';

/**
 * Channel types supported by OpenClaw
 */
export type ChannelType = 'whatsapp' | 'telegram' | 'discord' | 'slack' | 'wechat';

/**
 * Channel status
 */
export interface Channel {
  id: string;
  type: ChannelType;
  name: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  lastActivity?: string;
  error?: string;
}

/**
 * Skill definition
 */
export interface Skill {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category?: string;
  icon?: string;
  configurable?: boolean;
}

/**
 * Chat message
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  channel?: string;
  toolCalls?: ToolCall[];
}

/**
 * Tool call in a message
 */
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  status: 'pending' | 'running' | 'completed' | 'error';
}

/**
 * Gateway Client
 * Typed wrapper around GatewayManager for making RPC calls
 */
export class GatewayClient {
  constructor(private manager: GatewayManager) {}
  
  // ==================== Channel Methods ====================
  
  /**
   * List all channels
   */
  async listChannels(): Promise<Channel[]> {
    return this.manager.rpc<Channel[]>('channels.list');
  }
  
  /**
   * Get channel by ID
   */
  async getChannel(channelId: string): Promise<Channel> {
    return this.manager.rpc<Channel>('channels.get', { channelId });
  }
  
  /**
   * Connect a channel
   */
  async connectChannel(channelId: string): Promise<void> {
    return this.manager.rpc<void>('channels.connect', { channelId });
  }
  
  /**
   * Disconnect a channel
   */
  async disconnectChannel(channelId: string): Promise<void> {
    return this.manager.rpc<void>('channels.disconnect', { channelId });
  }
  
  /**
   * Get QR code for channel connection (e.g., WhatsApp)
   */
  async getChannelQRCode(channelType: ChannelType): Promise<string> {
    return this.manager.rpc<string>('channels.getQRCode', { channelType });
  }
  
  // ==================== Skill Methods ====================
  
  /**
   * List all skills
   */
  async listSkills(): Promise<Skill[]> {
    return this.manager.rpc<Skill[]>('skills.list');
  }
  
  /**
   * Enable a skill
   */
  async enableSkill(skillId: string): Promise<void> {
    return this.manager.rpc<void>('skills.enable', { skillId });
  }
  
  /**
   * Disable a skill
   */
  async disableSkill(skillId: string): Promise<void> {
    return this.manager.rpc<void>('skills.disable', { skillId });
  }
  
  /**
   * Get skill configuration
   */
  async getSkillConfig(skillId: string): Promise<Record<string, unknown>> {
    return this.manager.rpc<Record<string, unknown>>('skills.getConfig', { skillId });
  }
  
  /**
   * Update skill configuration
   */
  async updateSkillConfig(skillId: string, config: Record<string, unknown>): Promise<void> {
    return this.manager.rpc<void>('skills.updateConfig', { skillId, config });
  }
  
  // ==================== Chat Methods ====================
  
  /**
   * Send a chat message
   */
  async sendMessage(content: string, channelId?: string): Promise<ChatMessage> {
    return this.manager.rpc<ChatMessage>('chat.send', { content, channelId });
  }
  
  /**
   * Get chat history
   */
  async getChatHistory(limit = 50, offset = 0): Promise<ChatMessage[]> {
    return this.manager.rpc<ChatMessage[]>('chat.history', { limit, offset });
  }
  
  /**
   * Clear chat history
   */
  async clearChatHistory(): Promise<void> {
    return this.manager.rpc<void>('chat.clear');
  }
  
  // ==================== System Methods ====================
  
  /**
   * Get Gateway health status
   */
  async getHealth(): Promise<{ status: string; uptime: number }> {
    return this.manager.rpc<{ status: string; uptime: number }>('system.health');
  }
  
  /**
   * Get Gateway configuration
   */
  async getConfig(): Promise<Record<string, unknown>> {
    return this.manager.rpc<Record<string, unknown>>('system.config');
  }
  
  /**
   * Update Gateway configuration
   */
  async updateConfig(config: Record<string, unknown>): Promise<void> {
    return this.manager.rpc<void>('system.updateConfig', config);
  }
}
