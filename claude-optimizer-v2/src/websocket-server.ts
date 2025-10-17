/**
 * WebSocket Server
 * Broadcasts LogMonitor events to connected dashboard clients
 */

import { Server, Socket } from 'socket.io';
import { createServer, Server as HTTPServer } from 'http';
import express, { Application } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export interface SessionEvent {
  type: 'session:start' | 'session:objective' | 'session:tokens' | 'session:tool' | 'session:complete' | 'session:error' | 'session:message';
  data: any;
  timestamp: Date;
}

export class WebSocketServer {
  private io: Server;
  private httpServer: HTTPServer;
  private app: Application;
  private port: number;
  private connectedClients: Set<string> = new Set();

  constructor(port: number = 3001) {
    this.port = port;
    this.app = express();
    this.app.use(cors());
    this.app.use(express.json());

    // Health check endpoint
    this.app.get('/health', (_req, res) => {
      res.json({
        status: 'healthy',
        clients: this.connectedClients.size,
        timestamp: new Date()
      });
    });

    // Calendar download endpoint
    this.app.get('/api/calendar/download', (_req, res) => {
      try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const icalPath = path.join(__dirname, '..', 'my-sessions.ics');

        // Check if file exists
        if (!fs.existsSync(icalPath)) {
          res.status(404).json({ error: 'Calendar file not found' });
          return;
        }

        // Read the iCal file
        const icalContent = fs.readFileSync(icalPath, 'utf-8');

        // Set appropriate headers
        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="claude-sessions.ics"');

        // Send the file
        res.send(icalContent);
        console.log('✅ Calendar downloaded by client');
      } catch (error) {
        console.error('❌ Error serving calendar:', error);
        res.status(500).json({ error: 'Failed to serve calendar file' });
      }
    });

    this.httpServer = createServer(this.app);
    this.io = new Server(this.httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.setupHandlers();
  }

  /**
   * Start WebSocket server
   */
  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.httpServer.listen(this.port, () => {
        console.log(`\n🔌 WebSocket server listening on port ${this.port}`);
        console.log(`   Health check: http://localhost:${this.port}/health\n`);
        resolve();
      });
    });
  }

  /**
   * Stop WebSocket server
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.io.close(() => {
        this.httpServer.close(() => {
          console.log('\n🔌 WebSocket server stopped\n');
          resolve();
        });
      });
    });
  }

  /**
   * Broadcast event to all connected clients
   */
  broadcast(event: SessionEvent): void {
    const eventWithTimestamp = {
      ...event,
      timestamp: new Date()
    };

    this.io.emit(event.type, eventWithTimestamp);

    // Log broadcast for debugging
    if (process.env.DEBUG) {
      console.log(`📡 Broadcast: ${event.type}`, eventWithTimestamp);
    }
  }

  /**
   * Send event to specific client
   */
  sendToClient(clientId: string, event: SessionEvent): void {
    const socket = this.io.sockets.sockets.get(clientId);
    if (socket) {
      socket.emit(event.type, {
        ...event,
        timestamp: new Date()
      });
    }
  }

  /**
   * Get number of connected clients
   */
  getConnectedClients(): number {
    return this.connectedClients.size;
  }

  /**
   * Get server status
   */
  getStatus(): {
    running: boolean;
    port: number;
    clients: number;
  } {
    return {
      running: this.httpServer.listening,
      port: this.port,
      clients: this.connectedClients.size
    };
  }

  /**
   * Set up Socket.io event handlers
   */
  private setupHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      this.handleConnection(socket);
    });
  }

  /**
   * Handle new client connection
   */
  private handleConnection(socket: Socket): void {
    const clientId = socket.id;
    this.connectedClients.add(clientId);

    console.log(`  ✅ Client connected: ${clientId} (total: ${this.connectedClients.size})`);

    // Send welcome message
    socket.emit('connected', {
      clientId,
      timestamp: new Date(),
      message: 'Connected to Claude Optimizer WebSocket server'
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      this.connectedClients.delete(clientId);
      console.log(`  ❌ Client disconnected: ${clientId} (total: ${this.connectedClients.size})`);
    });

    // Handle ping/pong for heartbeat
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date() });
    });

    // Handle client requests for current session state
    socket.on('request:session', () => {
      // This will be handled by CalendarWatcher integration
      socket.emit('session:state', {
        // Current session state will be sent here
        message: 'No active session'
      });
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`  ❌ Socket error for ${clientId}:`, error);
    });
  }
}
