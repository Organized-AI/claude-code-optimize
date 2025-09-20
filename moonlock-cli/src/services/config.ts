import { promises as fs } from 'fs';
import path from 'path';
import { Config } from '../types';
import { StorageService } from './storage';

export class ConfigService {
  private storage: StorageService;
  
  constructor() {
    this.storage = new StorageService();
  }
  
  async get(key: string): Promise<any> {
    const config = await this.storage.getConfig();
    return this.getNestedValue(config, key);
  }
  
  async set(key: string, value: any): Promise<void> {
    const config = await this.storage.getConfig();
    this.setNestedValue(config, key, value);
    await this.storage.saveConfig(config);
  }
  
  async getAll(): Promise<Config> {
    return this.storage.getConfig();
  }
  
  async update(updates: Partial<Config>): Promise<void> {
    const config = await this.storage.getConfig();
    const updatedConfig = this.deepMerge(config, updates);
    await this.storage.saveConfig(updatedConfig);
  }
  
  async resetToDefaults(): Promise<void> {
    const defaultConfig: Config = {
      tracking: {
        enabled: true,
        autoStart: false,
        saveHistory: true,
        maxHistoryItems: 100
      },
      notifications: {
        quotaWarnings: true,
        sessionReminders: false,
        dailySummary: false
      },
      display: {
        theme: 'auto',
        verbose: false,
        showProgress: true
      }
    };
    
    await this.storage.saveConfig(defaultConfig);
  }
  
  async exportConfig(filePath?: string): Promise<string> {
    const config = await this.storage.getConfig();
    const dataDir = await this.storage.getDataDir();
    
    const exportPath = filePath || path.join(
      dataDir,
      `moonlock-config-${new Date().toISOString().split('T')[0]}.json`
    );
    
    const exportData = {
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      config: config
    };
    
    await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2));
    return exportPath;
  }
  
  async importConfig(filePath: string): Promise<void> {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const importData = JSON.parse(fileContent);
    
    if (!importData.config) {
      throw new Error('Invalid configuration file format');
    }
    
    // Validate the imported config
    const validatedConfig = await this.validateConfig(importData.config);
    await this.storage.saveConfig(validatedConfig);
  }
  
  async validateConfig(config: any): Promise<Config> {
    // Ensure all required properties exist with proper types
    const validated: Config = {
      apiEndpoint: typeof config.apiEndpoint === 'string' ? config.apiEndpoint : undefined,
      tracking: {
        enabled: typeof config.tracking?.enabled === 'boolean' ? config.tracking.enabled : true,
        autoStart: typeof config.tracking?.autoStart === 'boolean' ? config.tracking.autoStart : false,
        saveHistory: typeof config.tracking?.saveHistory === 'boolean' ? config.tracking.saveHistory : true,
        maxHistoryItems: typeof config.tracking?.maxHistoryItems === 'number' 
          ? Math.max(10, Math.min(1000, config.tracking.maxHistoryItems))
          : 100
      },
      notifications: {
        quotaWarnings: typeof config.notifications?.quotaWarnings === 'boolean' 
          ? config.notifications.quotaWarnings : true,
        sessionReminders: typeof config.notifications?.sessionReminders === 'boolean' 
          ? config.notifications.sessionReminders : false,
        dailySummary: typeof config.notifications?.dailySummary === 'boolean' 
          ? config.notifications.dailySummary : false
      },
      display: {
        theme: ['light', 'dark', 'auto'].includes(config.display?.theme) 
          ? config.display.theme : 'auto',
        verbose: typeof config.display?.verbose === 'boolean' ? config.display.verbose : false,
        showProgress: typeof config.display?.showProgress === 'boolean' 
          ? config.display.showProgress : true
      }
    };
    
    // Add any additional validated properties
    if (config.quotaLimits && typeof config.quotaLimits === 'object') {
      validated.quotaLimits = {
        daily: typeof config.quotaLimits.daily === 'number' ? config.quotaLimits.daily : undefined,
        weekly: typeof config.quotaLimits.weekly === 'number' ? config.quotaLimits.weekly : undefined,
        monthly: typeof config.quotaLimits.monthly === 'number' ? config.quotaLimits.monthly : undefined
      };
    }
    
    return validated;
  }
  
  async getConfigPath(): Promise<string> {
    const dataDir = await this.storage.getDataDir();
    return path.join(dataDir, 'config.json');
  }
  
  async backupConfig(): Promise<string> {
    const config = await this.storage.getConfig();
    const dataDir = await this.storage.getDataDir();
    const backupPath = path.join(
      dataDir,
      `config-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    );
    
    await fs.writeFile(backupPath, JSON.stringify(config, null, 2));
    return backupPath;
  }
  
  async restoreConfig(backupPath: string): Promise<void> {
    const backupContent = await fs.readFile(backupPath, 'utf-8');
    const backupConfig = JSON.parse(backupContent);
    
    const validatedConfig = await this.validateConfig(backupConfig);
    await this.storage.saveConfig(validatedConfig);
  }
  
  async listConfigKeys(): Promise<string[]> {
    const config = await this.storage.getConfig();
    return this.getAllKeys(config);
  }
  
  async getConfigSchema(): Promise<object> {
    return {
      apiEndpoint: {
        type: 'string',
        description: 'API endpoint URL for external integrations',
        optional: true
      },
      tracking: {
        type: 'object',
        properties: {
          enabled: {
            type: 'boolean',
            description: 'Enable token tracking',
            default: true
          },
          autoStart: {
            type: 'boolean',
            description: 'Automatically start sessions',
            default: false
          },
          saveHistory: {
            type: 'boolean',
            description: 'Save usage history',
            default: true
          },
          maxHistoryItems: {
            type: 'number',
            description: 'Maximum number of history items to keep',
            default: 100,
            min: 10,
            max: 1000
          }
        }
      },
      notifications: {
        type: 'object',
        properties: {
          quotaWarnings: {
            type: 'boolean',
            description: 'Show quota warning notifications',
            default: true
          },
          sessionReminders: {
            type: 'boolean',
            description: 'Show session reminder notifications',
            default: false
          },
          dailySummary: {
            type: 'boolean',
            description: 'Show daily usage summary',
            default: false
          }
        }
      },
      display: {
        type: 'object',
        properties: {
          theme: {
            type: 'string',
            description: 'Display theme',
            enum: ['light', 'dark', 'auto'],
            default: 'auto'
          },
          verbose: {
            type: 'boolean',
            description: 'Enable verbose output',
            default: false
          },
          showProgress: {
            type: 'boolean',
            description: 'Show progress indicators',
            default: true
          }
        }
      }
    };
  }
  
  private getNestedValue(obj: any, key: string): any {
    const parts = key.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      current = current[part];
    }
    
    return current;
  }
  
  private setNestedValue(obj: any, key: string, value: any): void {
    const parts = key.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current) || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part];
    }
    
    current[parts[parts.length - 1]] = value;
  }
  
  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }
  
  private getAllKeys(obj: any, prefix: string = ''): string[] {
    const keys: string[] = [];
    
    for (const key in obj) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        keys.push(...this.getAllKeys(obj[key], fullKey));
      } else {
        keys.push(fullKey);
      }
    }
    
    return keys;
  }
}