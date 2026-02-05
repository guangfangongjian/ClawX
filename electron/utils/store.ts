/**
 * Persistent Storage
 * Electron-store wrapper for application settings
 */
import Store from 'electron-store';

/**
 * Application settings schema
 */
export interface AppSettings {
  // General
  theme: 'light' | 'dark' | 'system';
  language: string;
  startMinimized: boolean;
  launchAtStartup: boolean;
  
  // Gateway
  gatewayAutoStart: boolean;
  gatewayPort: number;
  
  // Update
  updateChannel: 'stable' | 'beta' | 'dev';
  autoCheckUpdate: boolean;
  autoDownloadUpdate: boolean;
  skippedVersions: string[];
  
  // UI State
  sidebarCollapsed: boolean;
  devModeUnlocked: boolean;
  
  // Presets
  selectedBundles: string[];
  enabledSkills: string[];
  disabledSkills: string[];
}

/**
 * Default settings
 */
const defaults: AppSettings = {
  // General
  theme: 'system',
  language: 'en',
  startMinimized: false,
  launchAtStartup: false,
  
  // Gateway
  gatewayAutoStart: true,
  gatewayPort: 18789,
  
  // Update
  updateChannel: 'stable',
  autoCheckUpdate: true,
  autoDownloadUpdate: false,
  skippedVersions: [],
  
  // UI State
  sidebarCollapsed: false,
  devModeUnlocked: false,
  
  // Presets
  selectedBundles: ['productivity', 'developer'],
  enabledSkills: [],
  disabledSkills: [],
};

/**
 * Create settings store
 */
export const settingsStore = new Store<AppSettings>({
  name: 'settings',
  defaults,
});

/**
 * Get a setting value
 */
export function getSetting<K extends keyof AppSettings>(key: K): AppSettings[K] {
  return settingsStore.get(key);
}

/**
 * Set a setting value
 */
export function setSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K]
): void {
  settingsStore.set(key, value);
}

/**
 * Get all settings
 */
export function getAllSettings(): AppSettings {
  return settingsStore.store;
}

/**
 * Reset settings to defaults
 */
export function resetSettings(): void {
  settingsStore.clear();
}

/**
 * Export settings to JSON
 */
export function exportSettings(): string {
  return JSON.stringify(settingsStore.store, null, 2);
}

/**
 * Import settings from JSON
 */
export function importSettings(json: string): void {
  try {
    const settings = JSON.parse(json);
    settingsStore.set(settings);
  } catch (error) {
    throw new Error('Invalid settings JSON');
  }
}
