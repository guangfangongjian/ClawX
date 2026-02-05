/**
 * Path Utilities
 * Cross-platform path resolution helpers
 */
import { app } from 'electron';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync, mkdirSync } from 'fs';

/**
 * Expand ~ to home directory
 */
export function expandPath(path: string): string {
  if (path.startsWith('~')) {
    return path.replace('~', homedir());
  }
  return path;
}

/**
 * Get OpenClaw config directory
 */
export function getOpenClawConfigDir(): string {
  return join(homedir(), '.openclaw');
}

/**
 * Get ClawX config directory
 */
export function getClawXConfigDir(): string {
  return join(homedir(), '.clawx');
}

/**
 * Get ClawX logs directory
 */
export function getLogsDir(): string {
  return join(app.getPath('userData'), 'logs');
}

/**
 * Get ClawX data directory
 */
export function getDataDir(): string {
  return app.getPath('userData');
}

/**
 * Ensure directory exists
 */
export function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Get resources directory (for bundled assets)
 */
export function getResourcesDir(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'resources');
  }
  return join(__dirname, '../../resources');
}

/**
 * Get preload script path
 */
export function getPreloadPath(): string {
  return join(__dirname, '../preload/index.js');
}
