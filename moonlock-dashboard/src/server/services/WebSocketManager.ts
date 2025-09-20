import { WebSocket, WebSocketServer } from 'ws';
import { WebSocketMessage } from '../../shared/types/index.js';
import { IncomingMessage } from 'http';

interface ClientConnection {
  id: string;
  socket: WebSocket;
  subscriptions: Set<string>; // Session IDs client is subscribed to
  commandSubscriptions: Set<string>; // Command process IDs client is subscribed to
  planSubscriptions: Set<string>; // Plan mode session IDs client is subscribed to
  lastPing: number;
}

export class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Map<string, ClientConnection> = new Map();
  private heartbeatInterval: NodeJS.Timeout;
  
  constructor(port: number = 8001) {
    this.wss = new WebSocketServer({ 
      port,
      path: '/ws'
    });
    
    this.wss.on('connection', (socket: WebSocket, request: IncomingMessage) => {
      this.handleConnection(socket, request);
    });
    
    // Start heartbeat mechanism
    this.heartbeatInterval = setInterval(() => {
      this.performHeartbeat();
    }, 30000); // Every 30 seconds
    
    console.log(`WebSocket server started on port ${port}`);
  }
  
  private handleConnection(socket: WebSocket, request: IncomingMessage): void {
    const clientId = this.generateClientId();
    const client: ClientConnection = {
      id: clientId,
      socket,
      subscriptions: new Set(),
      commandSubscriptions: new Set(),
      planSubscriptions: new Set(),
      lastPing: Date.now(),
    };
    
    this.clients.set(clientId, client);
    
    console.log(`Client ${clientId} connected. Total clients: ${this.clients.size}`);
    
    socket.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(clientId, message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
        this.sendError(clientId, 'Invalid message format');
      }
    });
    
    socket.on('close', () => {
      this.handleDisconnection(clientId);
    });
    
    socket.on('error', (error: Error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
      this.handleDisconnection(clientId);
    });
    
    socket.on('pong', () => {
      const client = this.clients.get(clientId);
      if (client) {
        client.lastPing = Date.now();
      }
    });
    
    // Send welcome message
    this.sendToClient(clientId, {
      type: 'connection',
      clientId,
      timestamp: Date.now(),
    });
  }
  
  private handleMessage(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    switch (message.type) {
      case 'subscribe':
        if (message.sessionId) {
          client.subscriptions.add(message.sessionId);
          console.log(`Client ${clientId} subscribed to session ${message.sessionId}`);
        }
        break;
        
      case 'unsubscribe':
        if (message.sessionId) {
          client.subscriptions.delete(message.sessionId);
          console.log(`Client ${clientId} unsubscribed from session ${message.sessionId}`);
        }
        break;
        
      case 'subscribe_commands':
        if (message.processId) {
          client.commandSubscriptions.add(message.processId);
          console.log(`Client ${clientId} subscribed to command process ${message.processId}`);
        } else {
          // Subscribe to all command streams
          client.commandSubscriptions.add('*');
          console.log(`Client ${clientId} subscribed to all command streams`);
        }
        break;
        
      case 'unsubscribe_commands':
        if (message.processId) {
          client.commandSubscriptions.delete(message.processId);
          console.log(`Client ${clientId} unsubscribed from command process ${message.processId}`);
        } else {
          client.commandSubscriptions.clear();
          console.log(`Client ${clientId} unsubscribed from all command streams`);
        }
        break;
        
      case 'subscribe_plan':
        if (message.planSessionId) {
          client.planSubscriptions.add(message.planSessionId);
          console.log(`Client ${clientId} subscribed to plan session ${message.planSessionId}`);
        }
        break;
        
      case 'unsubscribe_plan':
        if (message.planSessionId) {
          client.planSubscriptions.delete(message.planSessionId);
          console.log(`Client ${clientId} unsubscribed from plan session ${message.planSessionId}`);
        }
        break;
        
      case 'ping':
        client.lastPing = Date.now();
        this.sendToClient(clientId, {
          type: 'pong',
          timestamp: Date.now(),
        });
        break;
        
      default:
        console.warn(`Unknown message type: ${message.type}`);
    }
  }
  
  private handleDisconnection(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.socket.terminate();
      this.clients.delete(clientId);
      console.log(`Client ${clientId} disconnected. Total clients: ${this.clients.size}`);
    }
  }
  
  private performHeartbeat(): void {
    const now = Date.now();
    const timeout = 60000; // 60 seconds timeout
    
    for (const [clientId, client] of this.clients.entries()) {
      if (now - client.lastPing > timeout) {
        console.log(`Client ${clientId} heartbeat timeout, disconnecting`);
        this.handleDisconnection(clientId);
      } else if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.ping();
      }
    }
  }
  
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Public methods for broadcasting messages
  broadcast(type: string, data: any): void {
    const message = {
      type,
      data,
      timestamp: Date.now()
    };
    
    const messageStr = JSON.stringify(message);
    
    for (const client of this.clients.values()) {
      if (client.socket.readyState === WebSocket.OPEN) {
        try {
          client.socket.send(messageStr);
        } catch (error) {
          console.error(`Failed to send message to client ${client.id}:`, error);
        }
      }
    }
  }
  
  // Legacy broadcast method for backward compatibility
  broadcastLegacy(message: WebSocketMessage): void {
    const messageStr = JSON.stringify(message);
    
    for (const client of this.clients.values()) {
      if (client.socket.readyState === WebSocket.OPEN) {
        // Check if client is subscribed to this session (except for certain message types)
        const exemptTypes = ['connection', 'ping', 'pong', 'calendar_sync'];
        if ('sessionId' in message && 
            !exemptTypes.includes(message.type) &&
            !client.subscriptions.has(message.sessionId)) {
          continue;
        }
        
        try {
          client.socket.send(messageStr);
        } catch (error) {
          console.error(`Failed to send message to client ${client.id}:`, error);
        }
      }
    }
  }

  // Emit session update to all subscribed clients
  emitSessionUpdate(session: any): void {
    this.broadcast({
      type: 'session_update',
      session
    });
  }
  
  sendToSession(sessionId: string, message: WebSocketMessage): void {    
    const messageStr = JSON.stringify(message);
    
    for (const client of this.clients.values()) {
      if (client.socket.readyState === WebSocket.OPEN && 
          client.subscriptions.has(sessionId)) {
        try {
          client.socket.send(messageStr);
        } catch (error) {
          console.error(`Failed to send message to client ${client.id}:`, error);
        }
      }
    }
  }
  
  sendToClient(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (client && client.socket.readyState === WebSocket.OPEN) {
      try {
        client.socket.send(JSON.stringify(message));
      } catch (error) {
        console.error(`Failed to send message to client ${clientId}:`, error);
      }
    }
  }
  
  sendError(clientId: string, errorMessage: string): void {
    this.sendToClient(clientId, {
      type: 'error',
      message: errorMessage,
      timestamp: Date.now(),
    });
  }
  
  getConnectedClientsCount(): number {
    return this.clients.size;
  }
  
  // Command streaming methods
  broadcastCommandStream(processId: string, type: 'stdout' | 'stderr', data: string, sessionId?: string): void {
    const message = {
      type: 'claude-command-stream',
      data: {
        type,
        data,
        processId,
        sessionId
      },
      timestamp: Date.now()
    };
    
    const messageStr = JSON.stringify(message);
    
    for (const client of this.clients.values()) {
      if (client.socket.readyState === WebSocket.OPEN) {
        // Send to clients subscribed to this specific process or all command streams
        if (client.commandSubscriptions.has(processId) || client.commandSubscriptions.has('*')) {
          try {
            client.socket.send(messageStr);
          } catch (error) {
            console.error(`Failed to send command stream to client ${client.id}:`, error);
          }
        }
      }
    }
  }
  
  broadcastCommandResult(result: any, sessionId?: string): void {
    const message = {
      type: 'claude-command-result',
      data: result,
      sessionId,
      timestamp: Date.now()
    };
    
    this.broadcast('command-result', message);
  }
  
  // Plan mode streaming methods
  broadcastPlanModeUpdate(planSessionId: string, updateType: string, data: any): void {
    const message = {
      type: 'plan-mode-update',
      data: {
        type: updateType,
        planSessionId,
        ...data
      },
      timestamp: Date.now()
    };
    
    const messageStr = JSON.stringify(message);
    
    for (const client of this.clients.values()) {
      if (client.socket.readyState === WebSocket.OPEN) {
        // Send to clients subscribed to this plan session
        if (client.planSubscriptions.has(planSessionId) || client.planSubscriptions.has('*')) {
          try {
            client.socket.send(messageStr);
          } catch (error) {
            console.error(`Failed to send plan mode update to client ${client.id}:`, error);
          }
        }
      }
    }
  }
  
  getSessionSubscribers(sessionId: string): string[] {
    const subscribers: string[] = [];
    
    for (const [clientId, client] of this.clients.entries()) {
      if (client.subscriptions.has(sessionId)) {
        subscribers.push(clientId);
      }
    }
    
    return subscribers;
  }
  
  getCommandSubscribers(processId?: string): string[] {
    const subscribers: string[] = [];
    
    for (const [clientId, client] of this.clients.entries()) {
      if (processId && client.commandSubscriptions.has(processId)) {
        subscribers.push(clientId);
      } else if (!processId && client.commandSubscriptions.has('*')) {
        subscribers.push(clientId);
      }
    }
    
    return subscribers;
  }
  
  getPlanSubscribers(planSessionId?: string): string[] {
    const subscribers: string[] = [];
    
    for (const [clientId, client] of this.clients.entries()) {
      if (planSessionId && client.planSubscriptions.has(planSessionId)) {
        subscribers.push(clientId);
      } else if (!planSessionId && client.planSubscriptions.has('*')) {
        subscribers.push(clientId);
      }
    }
    
    return subscribers;
  }
  
  // Enhancement-specific broadcast methods
  broadcastPredictionUpdate(sessionId: string, prediction: any): void {
    const message = {
      type: 'prediction_update',
      sessionId,
      prediction,
      timestamp: Date.now()
    };
    
    this.sendToSession(sessionId, message as any);
  }
  
  broadcastBurnRateUpdate(sessionId: string, metrics: any): void {
    const message = {
      type: 'burn_rate_update',
      sessionId,
      metrics,
      timestamp: Date.now()
    };
    
    this.sendToSession(sessionId, message as any);
  }
  
  broadcastTemplateSelected(sessionId: string, template: any): void {
    const message = {
      type: 'template_selected',
      sessionId,
      template,
      timestamp: Date.now()
    };
    
    this.sendToSession(sessionId, message as any);
  }
  
  broadcastCalendarSync(status: 'syncing' | 'completed' | 'error', message?: string): void {
    const wsMessage = {
      type: 'calendar_sync',
      status,
      message,
      timestamp: Date.now()
    };
    
    // Broadcast to all clients
    this.broadcastLegacy(wsMessage as any);
  }
  
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Close all client connections
    for (const client of this.clients.values()) {
      client.socket.close(1000, 'Server shutting down');
    }
    
    this.clients.clear();
    
    // Close WebSocket server
    this.wss.close(() => {
      console.log('WebSocket server closed');
    });
  }
}