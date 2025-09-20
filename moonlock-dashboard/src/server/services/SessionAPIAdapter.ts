/**
 * Session API Adapter
 * 
 * Adapter that makes SessionBasedAnthropicService compatible with 
 * the existing AnthropicAPIService interface for seamless integration.
 */

import { SessionBasedAnthropicService } from './SessionBasedAnthropicService.js';
import { AnthropicAPIService } from './AnthropicAPIService.js';

export class SessionAPIAdapter {
  private sessionService: SessionBasedAnthropicService;

  constructor(sessionService: SessionBasedAnthropicService) {
    this.sessionService = sessionService;
  }

  async getUsageMetrics() {
    return await this.sessionService.getUsageMetrics();
  }

  getHealthStatus() {
    return this.sessionService.getHealthStatus();
  }

  async performHealthCheck() {
    return await this.sessionService.performHealthCheck();
  }

  async getAvailableModels() {
    return await this.sessionService.getAvailableModels();
  }

  async sendDirectPrompt(request: any) {
    return await this.sessionService.sendDirectPrompt(request.prompt, request.model);
  }

  resetDailyMetrics() {
    // Session-based service doesn't need daily reset
    console.log('📊 Session-based service - metrics are real-time');
  }

  // Add any other methods that the routes might expect
  async getServiceStatus() {
    return await this.sessionService.getServiceStatus();
  }

  async isServiceAvailable() {
    return await this.sessionService.isServiceAvailable();
  }
}

/**
 * Create a unified service that works with both API key and session-based authentication
 */
export function createUnifiedAnthropicService(
  sessionBasedService?: SessionBasedAnthropicService,
  apiKeyService?: AnthropicAPIService
): any {
  if (sessionBasedService) {
    return new SessionAPIAdapter(sessionBasedService);
  }
  
  if (apiKeyService) {
    return apiKeyService;
  }
  
  return null;
}