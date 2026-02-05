/**
 * Gateway Process Manager
 * Manages the OpenClaw Gateway process lifecycle
 */
import { spawn, ChildProcess, exec } from 'child_process';
import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { promisify } from 'util';
import { PORTS } from '../utils/config';

const execAsync = promisify(exec);

/**
 * Gateway connection status
 */
export interface GatewayStatus {
  state: 'stopped' | 'starting' | 'running' | 'error';
  port: number;
  pid?: number;
  uptime?: number;
  error?: string;
  connectedAt?: number;
}

/**
 * Gateway Manager Events
 */
export interface GatewayManagerEvents {
  status: (status: GatewayStatus) => void;
  message: (message: unknown) => void;
  exit: (code: number | null) => void;
  error: (error: Error) => void;
}

/**
 * Gateway Manager
 * Handles starting, stopping, and communicating with the OpenClaw Gateway
 */
export class GatewayManager extends EventEmitter {
  private process: ChildProcess | null = null;
  private ws: WebSocket | null = null;
  private status: GatewayStatus = { state: 'stopped', port: PORTS.OPENCLAW_GATEWAY };
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private pendingRequests: Map<string, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();
  
  constructor() {
    super();
  }
  
  /**
   * Get current Gateway status
   */
  getStatus(): GatewayStatus {
    return { ...this.status };
  }
  
  /**
   * Start Gateway process
   */
  async start(): Promise<void> {
    if (this.status.state === 'running') {
      return;
    }
    
    this.setStatus({ state: 'starting' });
    
    try {
      // Check if Gateway is already running
      const existing = await this.findExistingGateway();
      if (existing) {
        console.log('Found existing Gateway on port', existing.port);
        await this.connect(existing.port);
        return;
      }
      
      // Start new Gateway process
      await this.startProcess();
      
      // Wait for Gateway to be ready
      await this.waitForReady();
      
      // Connect WebSocket
      await this.connect(this.status.port);
      
    } catch (error) {
      this.setStatus({ state: 'error', error: String(error) });
      throw error;
    }
  }
  
  /**
   * Stop Gateway process
   */
  async stop(): Promise<void> {
    // Clear timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    // Close WebSocket
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    // Kill process
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    
    // Reject all pending requests
    for (const [id, request] of this.pendingRequests) {
      clearTimeout(request.timeout);
      request.reject(new Error('Gateway stopped'));
    }
    this.pendingRequests.clear();
    
    this.setStatus({ state: 'stopped' });
  }
  
  /**
   * Make an RPC call to the Gateway
   */
  async rpc<T>(method: string, params?: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('Gateway not connected'));
        return;
      }
      
      const id = crypto.randomUUID();
      
      // Set timeout for request
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`RPC timeout: ${method}`));
      }, 30000);
      
      // Store pending request
      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout,
      });
      
      // Send request
      const request = {
        jsonrpc: '2.0',
        id,
        method,
        params,
      };
      
      this.ws.send(JSON.stringify(request));
    });
  }
  
  /**
   * Find existing Gateway process
   */
  private async findExistingGateway(): Promise<{ port: number } | null> {
    try {
      // Try to connect to default port
      const port = PORTS.OPENCLAW_GATEWAY;
      const response = await fetch(`http://localhost:${port}/health`, {
        signal: AbortSignal.timeout(2000),
      });
      
      if (response.ok) {
        return { port };
      }
    } catch {
      // Gateway not running
    }
    
    return null;
  }
  
  /**
   * Start Gateway process
   */
  private async startProcess(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Find openclaw command
      const command = 'openclaw';
      const args = ['gateway', 'run', '--port', String(this.status.port)];
      
      this.process = spawn(command, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
        shell: true,
      });
      
      this.process.on('error', (error) => {
        console.error('Gateway process error:', error);
        reject(error);
      });
      
      this.process.on('exit', (code) => {
        console.log('Gateway process exited with code:', code);
        this.emit('exit', code);
        
        if (this.status.state === 'running') {
          this.setStatus({ state: 'stopped' });
          // Attempt to reconnect
          this.scheduleReconnect();
        }
      });
      
      // Log stdout
      this.process.stdout?.on('data', (data) => {
        console.log('Gateway:', data.toString());
      });
      
      // Log stderr
      this.process.stderr?.on('data', (data) => {
        console.error('Gateway error:', data.toString());
      });
      
      // Store PID
      if (this.process.pid) {
        this.setStatus({ pid: this.process.pid });
      }
      
      resolve();
    });
  }
  
  /**
   * Wait for Gateway to be ready
   */
  private async waitForReady(retries = 30, interval = 1000): Promise<void> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(`http://localhost:${this.status.port}/health`, {
          signal: AbortSignal.timeout(1000),
        });
        
        if (response.ok) {
          return;
        }
      } catch {
        // Gateway not ready yet
      }
      
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
    
    throw new Error('Gateway failed to start');
  }
  
  /**
   * Connect WebSocket to Gateway
   */
  private async connect(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = `ws://localhost:${port}/ws`;
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.on('open', () => {
        console.log('WebSocket connected to Gateway');
        this.setStatus({
          state: 'running',
          port,
          connectedAt: Date.now(),
        });
        this.startPing();
        resolve();
      });
      
      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      });
      
      this.ws.on('close', () => {
        console.log('WebSocket disconnected');
        if (this.status.state === 'running') {
          this.setStatus({ state: 'stopped' });
          this.scheduleReconnect();
        }
      });
      
      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      });
    });
  }
  
  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(message: { id?: string; result?: unknown; error?: unknown }): void {
    // Check if this is a response to a pending request
    if (message.id && this.pendingRequests.has(message.id)) {
      const request = this.pendingRequests.get(message.id)!;
      clearTimeout(request.timeout);
      this.pendingRequests.delete(message.id);
      
      if (message.error) {
        request.reject(new Error(String(message.error)));
      } else {
        request.resolve(message.result);
      }
      return;
    }
    
    // Emit message for other handlers
    this.emit('message', message);
  }
  
  /**
   * Start ping interval to keep connection alive
   */
  private startPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 30000);
  }
  
  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }
    
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.start();
      } catch (error) {
        console.error('Reconnection failed:', error);
        this.scheduleReconnect();
      }
    }, 5000);
  }
  
  /**
   * Update status and emit event
   */
  private setStatus(update: Partial<GatewayStatus>): void {
    this.status = { ...this.status, ...update };
    this.emit('status', this.status);
  }
}
