import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import WebSocket from 'ws';
import { Session, TokenUsage } from '../types';
import { ConfigService } from './config';

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface SyncOptions {
  sessions?: boolean;
  tokens?: boolean;
  config?: boolean;
}

export class APIService {
  private client: AxiosInstance;
  private configService: ConfigService;
  private baseURL: string;
  
  constructor(baseURL?: string) {
    this.configService = new ConfigService();
    this.baseURL = baseURL || 'https://api.moonlock.dev';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'moonlock-cli/1.0.0'
      }
    });
    
    this.setupInterceptors();
  }
  
  private setupInterceptors(): void {
    // Request interceptor for authentication
    this.client.interceptors.request.use(
      async (config) => {
        const apiKey = await this.getAPIKey();
        if (apiKey) {
          config.headers.Authorization = `Bearer ${apiKey}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          console.warn('API authentication failed. Please check your API key.');
        } else if (error.response?.status >= 500) {
          console.warn('API server error. Please try again later.');
        }
        return Promise.reject(error);
      }
    );
  }
  
  async syncSession(session: Session): Promise<APIResponse> {
    try {
      const response = await this.client.post('/sessions', session);
      return {
        success: true,
        data: response.data,
        timestamp: new Date()
      };
    } catch (error) {
      return this.handleError(error, 'Failed to sync session');
    }
  }
  
  async syncTokenUsage(usage: TokenUsage[]): Promise<APIResponse> {
    try {
      const response = await this.client.post('/tokens/usage', { usage });
      return {
        success: true,
        data: response.data,
        timestamp: new Date()
      };
    } catch (error) {
      return this.handleError(error, 'Failed to sync token usage');
    }
  }
  
  async getRemoteQuota(): Promise<APIResponse<{
    current: number;
    limit: number;
    resetTime: string;
  }>> {
    try {
      const response = await this.client.get('/quota');
      return {
        success: true,
        data: response.data,
        timestamp: new Date()
      };
    } catch (error) {
      return this.handleError(error, 'Failed to fetch remote quota');
    }
  }
  
  async syncData(options: SyncOptions = { sessions: true, tokens: true }): Promise<APIResponse<{
    synced: {
      sessions: number;
      tokens: number;
    };
  }>> {
    try {
      const syncData: any = {};
      
      if (options.sessions) {
        // This would be implemented to get sessions from storage
        syncData.sessions = []; // Placeholder
      }
      
      if (options.tokens) {
        // This would be implemented to get token usage from storage
        syncData.tokens = []; // Placeholder
      }
      
      const response = await this.client.post('/sync', syncData);
      return {
        success: true,
        data: response.data,
        timestamp: new Date()
      };
    } catch (error) {
      return this.handleError(error, 'Failed to sync data');
    }
  }
  
  async getRemoteSessions(limit: number = 10): Promise<APIResponse<Session[]>> {
    try {
      const response = await this.client.get(`/sessions?limit=${limit}`);
      return {
        success: true,
        data: response.data,
        timestamp: new Date()
      };
    } catch (error) {
      return this.handleError(error, 'Failed to fetch remote sessions');
    }
  }
  
  async deleteRemoteSession(sessionId: string): Promise<APIResponse> {
    try {
      const response = await this.client.delete(`/sessions/${sessionId}`);
      return {
        success: true,
        data: response.data,
        timestamp: new Date()
      };
    } catch (error) {
      return this.handleError(error, 'Failed to delete remote session');
    }
  }
  
  async getUsageAnalytics(days: number = 30): Promise<APIResponse<{
    daily: Array<{ date: string; tokens: number; cost: number }>;
    weekly: Array<{ week: string; tokens: number; cost: number }>;
    trends: {
      averageDaily: number;
      peakHour: number;
      mostUsedModel: string;
    };
  }>> {
    try {
      const response = await this.client.get(`/analytics/usage?days=${days}`);
      return {
        success: true,
        data: response.data,
        timestamp: new Date()
      };
    } catch (error) {
      return this.handleError(error, 'Failed to fetch usage analytics');
    }
  }
  
  async testConnection(): Promise<APIResponse<{ status: string; version: string }>> {
    try {
      const response = await this.client.get('/health');
      return {
        success: true,
        data: response.data,
        timestamp: new Date()
      };
    } catch (error) {
      return this.handleError(error, 'Failed to connect to API');
    }
  }
  
  async setAPIKey(apiKey: string): Promise<void> {
    await this.configService.set('apiKey', apiKey);
  }
  
  async getAPIKey(): Promise<string | null> {
    return await this.configService.get('apiKey') || null;
  }
  
  async updateEndpoint(endpoint: string): Promise<void> {
    this.baseURL = endpoint;
    this.client.defaults.baseURL = endpoint;
    await this.configService.set('apiEndpoint', endpoint);
  }
  
  async exportData(format: 'json' | 'csv' = 'json'): Promise<APIResponse<{ downloadUrl: string }>> {
    try {
      const response = await this.client.post('/export', { format });
      return {
        success: true,
        data: response.data,
        timestamp: new Date()
      };
    } catch (error) {
      return this.handleError(error, 'Failed to export data');
    }
  }
  
  async importData(data: any): Promise<APIResponse<{ imported: number }>> {
    try {
      const response = await this.client.post('/import', data);
      return {
        success: true,
        data: response.data,
        timestamp: new Date()
      };
    } catch (error) {
      return this.handleError(error, 'Failed to import data');
    }
  }
  
  async getNotifications(): Promise<APIResponse<Array<{
    id: string;
    type: 'warning' | 'info' | 'error';
    message: string;
    timestamp: string;
    read: boolean;
  }>>> {
    try {
      const response = await this.client.get('/notifications');
      return {
        success: true,
        data: response.data,
        timestamp: new Date()
      };
    } catch (error) {
      return this.handleError(error, 'Failed to fetch notifications');
    }
  }
  
  async markNotificationRead(notificationId: string): Promise<APIResponse> {
    try {
      const response = await this.client.patch(`/notifications/${notificationId}`, { read: true });
      return {
        success: true,
        data: response.data,
        timestamp: new Date()
      };
    } catch (error) {
      return this.handleError(error, 'Failed to mark notification as read');
    }
  }
  
  private handleError(error: any, defaultMessage: string): APIResponse {
    let errorMessage = defaultMessage;
    
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return {
      success: false,
      error: errorMessage,
      timestamp: new Date()
    };
  }
}

// WebSocket service for real-time updates
export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000;
  private listeners: Map<string, Set<Function>> = new Map();
  
  constructor(private apiService: APIService) {}
  
  async connect(): Promise<boolean> {
    try {
      const apiKey = await this.apiService.getAPIKey();
      if (!apiKey) {
        throw new Error('API key required for WebSocket connection');
      }
      
      const wsUrl = this.apiService['baseURL'].replace('http', 'ws') + '/ws';
      this.ws = new WebSocket(`${wsUrl}?token=${apiKey}`);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
      };
      
      this.ws.onmessage = (event: WebSocket.MessageEvent) => {
        try {
          const data = JSON.parse(event.data.toString());
          this.emit(data.type, data.payload);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.attemptReconnect();
      };
      
      this.ws.onerror = (error: WebSocket.ErrorEvent) => {
        console.error('WebSocket error:', error);
      };
      
      return true;
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      return false;
    }
  }
  
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
  
  subscribe(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
  }
  
  unsubscribe(event: string, callback: Function): void {
    this.listeners.get(event)?.delete(callback);
  }
  
  private emit(event: string, data: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in WebSocket event listener:', error);
        }
      });
    }
  }
  
  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectInterval);
    } else {
      console.error('Max WebSocket reconnection attempts reached');
    }
  }
}