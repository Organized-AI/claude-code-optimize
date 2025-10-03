/**
 * Simple HTTP server for mobile calendar viewing
 * Serves the calendar mobile view and sessions JSON
 */

import express from 'express';
import cors from 'cors';
import { CalendarService } from './calendar-service.js';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class CalendarServer {
  private app: express.Application;
  private calendarService: CalendarService;
  private port: number;
  private server: any;

  constructor(port: number = 8080) {
    this.port = port;
    this.app = express();
    this.calendarService = new CalendarService();

    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Enable CORS for mobile access
    this.app.use(cors());

    // Serve static files
    this.app.use(express.static(path.join(__dirname, '..')));
  }

  private setupRoutes(): void {
    // Main calendar view
    this.app.get('/', (_req, res) => {
      res.sendFile(path.join(__dirname, '../calendar-mobile.html'));
    });

    // Sessions JSON endpoint
    this.app.get('/sessions.json', async (_req, res) => {
      try {
        await this.calendarService.initialize();
        const sessions = await this.calendarService.listUpcomingSessions();

        res.json(sessions);
      } catch (error) {
        console.error('Error fetching sessions:', error);
        res.status(500).json({
          error: 'Failed to fetch sessions',
          message: (error as Error).message
        });
      }
    });

    // Health check
    this.app.get('/health', (_req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, () => {
          console.log('\n📱 Mobile Calendar Server Started\n');
          console.log('═'.repeat(60));
          console.log('');

          // Get local IP addresses
          const interfaces = os.networkInterfaces();
          const addresses: string[] = [];

          for (const name of Object.keys(interfaces)) {
            const nets = interfaces[name];
            if (!nets) continue;

            for (const net of nets) {
              // Skip internal and non-IPv4 addresses
              if (net.family === 'IPv4' && !net.internal) {
                addresses.push(net.address);
              }
            }
          }

          console.log('  Access from this computer:');
          console.log(`  → http://localhost:${this.port}\n`);

          if (addresses.length > 0) {
            console.log('  Access from your phone (same WiFi):');
            addresses.forEach(addr => {
              console.log(`  → http://${addr}:${this.port}`);
            });
            console.log('');
          }

          console.log('  Tips:');
          console.log('  • Make sure your phone is on the same WiFi network');
          console.log('  • Bookmark the URL on your phone for quick access');
          console.log('  • Leave this server running while you work\n');
          console.log('═'.repeat(60));
          console.log('\n  Press Ctrl+C to stop\n');

          resolve();
        });

        this.server.on('error', (error: Error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('\n  📱 Mobile calendar server stopped\n');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}
