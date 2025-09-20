/**
 * Enhanced WebSocket Client for Claude Code Optimizer Dashboard
 * Features: Automatic reconnection, heartbeat, message queuing, connection state management
 */

class EnhancedWebSocketClient {
    constructor(url, options = {}) {
        this.url = url;
        this.options = {
            reconnectInterval: 1000,      // Start with 1 second
            maxReconnectInterval: 30000,  // Max 30 seconds
            reconnectDecay: 1.5,          // Exponential backoff
            maxReconnectAttempts: -1,     // Infinite attempts
            heartbeatInterval: 15000,     // Send heartbeat every 15 seconds
            pingTimeout: 10000,           // Wait 10 seconds for pong
            ...options
        };
        
        // Connection state
        this.ws = null;
        this.isConnected = false;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.messageQueue = [];
        
        // Heartbeat state
        this.heartbeatTimer = null;
        this.pingTimer = null;
        this.lastPong = null;
        
        // Event handlers
        this.eventHandlers = {
            open: [],
            close: [],
            error: [],
            message: [],
            reconnect: [],
            heartbeat: []
        };
        
        // Auto-connect
        this.connect();
    }
    
    /**
     * Establish WebSocket connection
     */
    connect() {
        if (this.isConnecting || this.isConnected) {
            return;
        }
        
        this.isConnecting = true;
        console.log(`🔗 Connecting to ${this.url}...`);
        
        try {
            this.ws = new WebSocket(this.url);
            this.setupEventHandlers();
        } catch (error) {
            console.error('❌ WebSocket connection failed:', error);
            this.handleConnectionError(error);
        }
    }
    
    /**
     * Setup WebSocket event handlers
     */
    setupEventHandlers() {
        this.ws.onopen = (event) => {
            console.log('✅ WebSocket connected');
            this.isConnected = true;
            this.isConnecting = false;
            this.reconnectAttempts = 0;
            
            // Send queued messages
            this.flushMessageQueue();
            
            // Start heartbeat
            this.startHeartbeat();
            
            // Emit open event
            this.emit('open', event);
        };
        
        this.ws.onclose = (event) => {
            console.log(`🔌 WebSocket disconnected: ${event.code} - ${event.reason}`);
            this.isConnected = false;
            this.isConnecting = false;
            
            // Stop heartbeat
            this.stopHeartbeat();
            
            // Emit close event
            this.emit('close', event);
            
            // Attempt reconnection unless it was a clean close
            if (event.code !== 1000) {
                this.scheduleReconnect();
            }
        };
        
        this.ws.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
            this.emit('error', error);
        };
        
        this.ws.onmessage = (event) => {
            this.handleMessage(event);
        };
    }
    
    /**
     * Handle incoming WebSocket message
     */
    handleMessage(event) {
        try {
            const data = JSON.parse(event.data);
            const messageType = data.type;
            
            // Handle system messages
            switch (messageType) {
                case 'ping':
                    this.sendPong();
                    break;
                    
                case 'pong':
                    this.lastPong = Date.now();
                    this.emit('heartbeat', { type: 'pong', latency: this.getLatency() });
                    break;
                    
                case 'heartbeat_ack':
                    this.emit('heartbeat', { type: 'ack', timestamp: data.timestamp });
                    break;
                    
                case 'initial_data':
                    console.log('📊 Received initial data');
                    this.emit('message', data);
                    break;
                    
                case 'session_update':
                    console.log(`🔄 Session update: ${data.event || 'unknown'}`);
                    this.emit('message', data);
                    break;
                    
                default:
                    this.emit('message', data);
                    break;
            }
        } catch (error) {
            console.error('❌ Error parsing WebSocket message:', error);
            // Still emit the raw message
            this.emit('message', { type: 'raw', data: event.data });
        }
    }
    
    /**
     * Send message with queuing support
     */
    send(data) {
        const message = typeof data === 'string' ? data : JSON.stringify(data);
        
        if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
            try {
                this.ws.send(message);
                return true;
            } catch (error) {
                console.error('❌ Error sending message:', error);
                this.queueMessage(message);
                return false;
            }
        } else {
            this.queueMessage(message);
            return false;
        }
    }
    
    /**
     * Queue message for later delivery
     */
    queueMessage(message) {
        this.messageQueue.push(message);
        // Limit queue size to prevent memory issues
        if (this.messageQueue.length > 100) {
            this.messageQueue.shift(); // Remove oldest message
        }
    }
    
    /**
     * Send all queued messages
     */
    flushMessageQueue() {
        while (this.messageQueue.length > 0 && this.isConnected) {
            const message = this.messageQueue.shift();
            try {
                this.ws.send(message);
            } catch (error) {
                console.error('❌ Error sending queued message:', error);
                // Put message back at front of queue
                this.messageQueue.unshift(message);
                break;
            }
        }
    }
    
    /**
     * Start heartbeat mechanism
     */
    startHeartbeat() {
        this.stopHeartbeat(); // Clear any existing timers
        
        this.heartbeatTimer = setInterval(() => {
            if (this.isConnected) {
                this.sendHeartbeat();
            }
        }, this.options.heartbeatInterval);
    }
    
    /**
     * Stop heartbeat mechanism
     */
    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
        if (this.pingTimer) {
            clearTimeout(this.pingTimer);
            this.pingTimer = null;
        }
    }
    
    /**
     * Send heartbeat message
     */
    sendHeartbeat() {
        const heartbeat = {
            type: 'heartbeat',
            timestamp: new Date().toISOString(),
            client_id: this.getClientId()
        };
        
        this.send(heartbeat);
        this.emit('heartbeat', { type: 'sent', timestamp: heartbeat.timestamp });
    }
    
    /**
     * Send ping message
     */
    sendPing() {
        const ping = {
            type: 'ping',
            timestamp: new Date().toISOString()
        };
        
        this.send(ping);
        
        // Set timeout for pong response
        this.pingTimer = setTimeout(() => {
            console.warn('⚠️ Ping timeout - no pong received');
            this.emit('heartbeat', { type: 'timeout' });
        }, this.options.pingTimeout);
    }
    
    /**
     * Send pong response
     */
    sendPong() {
        const pong = {
            type: 'pong',
            timestamp: new Date().toISOString()
        };
        this.send(pong);
    }
    
    /**
     * Get latency from last ping-pong
     */
    getLatency() {
        if (this.lastPong) {
            return Date.now() - this.lastPong;
        }
        return null;
    }
    
    /**
     * Get unique client ID
     */
    getClientId() {
        if (!this._clientId) {
            this._clientId = 'client_' + Math.random().toString(36).substr(2, 9);
        }
        return this._clientId;
    }
    
    /**
     * Schedule reconnection with exponential backoff
     */
    scheduleReconnect() {
        if (this.options.maxReconnectAttempts !== -1 && 
            this.reconnectAttempts >= this.options.maxReconnectAttempts) {
            console.error('❌ Max reconnection attempts reached');
            return;
        }
        
        const timeout = Math.min(
            this.options.reconnectInterval * Math.pow(this.options.reconnectDecay, this.reconnectAttempts),
            this.options.maxReconnectInterval
        );
        
        this.reconnectAttempts++;
        
        console.log(`🔄 Scheduling reconnection attempt #${this.reconnectAttempts} in ${timeout}ms`);
        
        setTimeout(() => {
            if (!this.isConnected && !this.isConnecting) {
                this.emit('reconnect', { attempt: this.reconnectAttempts, timeout });
                this.connect();
            }
        }, timeout);
    }
    
    /**
     * Handle connection error
     */
    handleConnectionError(error) {
        this.isConnecting = false;
        this.isConnected = false;
        this.scheduleReconnect();
    }
    
    /**
     * Manually disconnect WebSocket
     */
    disconnect() {
        console.log('🔌 Manually disconnecting WebSocket...');
        this.stopHeartbeat();
        
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.close(1000, 'Manual disconnect');
        }
        
        this.isConnected = false;
        this.isConnecting = false;
    }
    
    /**
     * Add event listener
     */
    on(event, handler) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].push(handler);
        }
    }
    
    /**
     * Remove event listener
     */
    off(event, handler) {
        if (this.eventHandlers[event]) {
            const index = this.eventHandlers[event].indexOf(handler);
            if (index > -1) {
                this.eventHandlers[event].splice(index, 1);
            }
        }
    }
    
    /**
     * Emit event to all listeners
     */
    emit(event, data) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`❌ Error in ${event} event handler:`, error);
                }
            });
        }
    }
    
    /**
     * Get connection statistics
     */
    getStats() {
        return {
            connected: this.isConnected,
            connecting: this.isConnecting,
            reconnectAttempts: this.reconnectAttempts,
            queuedMessages: this.messageQueue.length,
            lastPong: this.lastPong,
            latency: this.getLatency(),
            clientId: this.getClientId(),
            url: this.url
        };
    }
    
    /**
     * Request fresh data from server
     */
    requestData() {
        this.send({
            type: 'request_data',
            timestamp: new Date().toISOString()
        });
    }
}

// Export for use in different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedWebSocketClient;
} else if (typeof window !== 'undefined') {
    window.EnhancedWebSocketClient = EnhancedWebSocketClient;
}

// Usage example:
/*
const wsClient = new EnhancedWebSocketClient('ws://localhost:3001/ws');

wsClient.on('open', () => {
    console.log('Connected to dashboard server');
});

wsClient.on('message', (data) => {
    console.log('Received data:', data);
    // Handle different message types
    switch (data.type) {
        case 'initial_data':
            updateDashboard(data);
            break;
        case 'session_update':
            updateSessionData(data);
            break;
    }
});

wsClient.on('close', () => {
    console.log('Disconnected from dashboard server');
});

wsClient.on('reconnect', (info) => {
    console.log(`Reconnecting... attempt ${info.attempt}`);
});

wsClient.on('heartbeat', (info) => {
    console.log('Heartbeat:', info);
});
*/