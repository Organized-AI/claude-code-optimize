/**
 * OAuth 2.0 Helper Utility
 * Handles Google Calendar OAuth authentication flow
 */

import { OAuth2Client } from 'google-auth-library';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as http from 'http';
import * as url from 'url';
import open from 'open';
import type { OAuthCredentials, OAuthToken } from '../types.js';

export class OAuthHelper {
  private oauth2Client: OAuth2Client;
  private configDir: string;
  private credentialsPath: string;
  private tokenPath: string;

  constructor(configDir?: string) {
    // Store OAuth config in ~/.claude-optimizer or custom location
    this.configDir = configDir || path.join(process.env.HOME || process.env.USERPROFILE || '.', '.claude-optimizer');
    this.credentialsPath = path.join(this.configDir, 'credentials.json');
    this.tokenPath = path.join(this.configDir, 'token.json');

    this.oauth2Client = new OAuth2Client();
  }

  /**
   * Initialize OAuth client with credentials
   */
  async initialize(): Promise<void> {
    // Ensure config directory exists
    await fs.mkdir(this.configDir, { recursive: true });

    // Load credentials
    const credentials = await this.loadCredentials();

    // Create OAuth2 client
    this.oauth2Client = new OAuth2Client(
      credentials.client_id,
      credentials.client_secret,
      credentials.redirect_uris[0] || 'http://localhost:3000/oauth/callback'
    );
  }

  /**
   * Get authenticated OAuth client
   * Performs authentication flow if no valid token exists
   */
  async getAuthenticatedClient(): Promise<OAuth2Client> {
    await this.initialize();

    // Try to load existing token
    const token = await this.loadToken();

    if (token) {
      this.oauth2Client.setCredentials(token);

      // Check if token is still valid
      try {
        await this.oauth2Client.getAccessToken();
        return this.oauth2Client;
      } catch (error) {
        console.log('  ⚠️  Token expired, re-authenticating...\n');
      }
    }

    // Perform OAuth flow
    await this.authenticate();
    return this.oauth2Client;
  }

  /**
   * Perform OAuth 2.0 authentication flow
   */
  private async authenticate(): Promise<void> {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    // Generate auth URL
    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'  // Force to get refresh token
    });

    console.log('  📱 Opening browser for Google OAuth...');
    console.log('  🔗 If browser doesn\'t open, visit this URL:\n');
    console.log(`  ${authUrl}\n`);

    // Open browser
    await open(authUrl);

    // Start local server to receive callback
    const code = await this.startCallbackServer();

    // Exchange code for tokens
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);

    // Save tokens
    await this.saveToken(tokens as OAuthToken);

    console.log('  ✅ Authentication successful!\n');
  }

  /**
   * Start temporary HTTP server to receive OAuth callback
   */
  private async startCallbackServer(): Promise<string> {
    return new Promise((resolve, reject) => {
      const server = http.createServer(async (req, res) => {
        try {
          if (!req.url) {
            throw new Error('No URL in request');
          }

          const queryData = url.parse(req.url, true).query;
          const code = queryData.code as string;

          if (code) {
            // Success page
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <!DOCTYPE html>
              <html>
              <head>
                <title>Authentication Successful</title>
                <style>
                  body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; text-align: center; }
                  .success { color: #28a745; font-size: 24px; margin-bottom: 20px; }
                  .message { font-size: 16px; color: #666; }
                </style>
              </head>
              <body>
                <div class="success">✅ Authentication Successful!</div>
                <div class="message">You can close this window and return to the terminal.</div>
              </body>
              </html>
            `);

            server.close();
            resolve(code);
          } else {
            throw new Error('No authorization code received');
          }
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Authentication failed. Please try again.');
          server.close();
          reject(error);
        }
      });

      server.listen(3000, () => {
        console.log('  🎧 Listening for OAuth callback on http://localhost:3000\n');
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        server.close();
        reject(new Error('Authentication timeout - no response received'));
      }, 5 * 60 * 1000);
    });
  }

  /**
   * Load OAuth credentials from file
   */
  private async loadCredentials(): Promise<OAuthCredentials> {
    try {
      const content = await fs.readFile(this.credentialsPath, 'utf-8');
      const parsed = JSON.parse(content);

      // Handle both direct format and Google's nested format
      if (parsed.installed) {
        return {
          client_id: parsed.installed.client_id,
          client_secret: parsed.installed.client_secret,
          redirect_uris: parsed.installed.redirect_uris
        };
      } else if (parsed.web) {
        return {
          client_id: parsed.web.client_id,
          client_secret: parsed.web.client_secret,
          redirect_uris: parsed.web.redirect_uris
        };
      } else {
        return parsed as OAuthCredentials;
      }
    } catch (error) {
      throw new Error(
        `Failed to load OAuth credentials from ${this.credentialsPath}.\n` +
        'Please download credentials from Google Cloud Console:\n' +
        '1. Go to https://console.cloud.google.com/apis/credentials\n' +
        '2. Create OAuth 2.0 Client ID (Desktop app type)\n' +
        '3. Download JSON and save as ' + this.credentialsPath
      );
    }
  }

  /**
   * Load saved OAuth token
   */
  private async loadToken(): Promise<OAuthToken | null> {
    try {
      const content = await fs.readFile(this.tokenPath, 'utf-8');
      return JSON.parse(content) as OAuthToken;
    } catch (error) {
      return null; // No saved token
    }
  }

  /**
   * Save OAuth token to file
   */
  private async saveToken(token: OAuthToken): Promise<void> {
    await fs.writeFile(this.tokenPath, JSON.stringify(token, null, 2));
  }

  /**
   * Clear saved token (for logout/reset)
   */
  async clearToken(): Promise<void> {
    try {
      await fs.unlink(this.tokenPath);
      console.log('  ✅ OAuth token cleared\n');
    } catch (error) {
      // Token file doesn't exist, that's fine
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.loadToken();
    if (!token) return false;

    this.oauth2Client.setCredentials(token);

    try {
      await this.oauth2Client.getAccessToken();
      return true;
    } catch (error) {
      return false;
    }
  }
}
