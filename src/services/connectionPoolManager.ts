/**
 * Connection Pool Manager
 * Manages WebSocket connections with pooling, health awareness, and resource optimization
 */

import { EventEmitter } from 'eventemitter3';
import { relayHealthMonitor, type RelayHealthMetrics } from './relayHealthMonitor';

export interface ConnectionPoolConfig {
  /** Maximum concurrent connections per relay */
  maxConnectionsPerRelay: number;
  /** Maximum total connections across all relays */
  maxTotalConnections: number;
  /** Connection timeout in ms */
  connectionTimeout: number;
  /** Idle connection cleanup interval in ms */
  cleanupInterval: number;
  /** Maximum idle time before connection cleanup in ms */
  maxIdleTime: number;
  /** Enable connection reuse */
  enableConnectionReuse: boolean;
}

export interface ConnectionInfo {
  readonly url: string;
  readonly socket: WebSocket;
  readonly createdAt: number;
  readonly lastUsed: number;
  readonly isIdle: boolean;
  readonly isHealthy: boolean;
  readonly subscriptionCount: number;
}

export interface ConnectionPoolEvents {
  'connection-created': (url: string, info: ConnectionInfo) => void;
  'connection-reused': (url: string, info: ConnectionInfo) => void;
  'connection-closed': (url: string, reason: string) => void;
  'pool-limit-reached': (totalConnections: number) => void;
  'connection-error': (url: string, error: Error) => void;
}

const DEFAULT_CONFIG: ConnectionPoolConfig = {
  maxConnectionsPerRelay: 3,
  maxTotalConnections: 20,
  connectionTimeout: 10000,
  cleanupInterval: 60000, // 1 minute
  maxIdleTime: 300000, // 5 minutes
  enableConnectionReuse: true,
};

/**
 * Advanced connection pool manager following Snort's patterns
 */
export class ConnectionPoolManager extends EventEmitter<ConnectionPoolEvents> {
  private readonly config: ConnectionPoolConfig;
  private readonly connections = new Map<string, ConnectionInfo[]>();
  private readonly activeConnections = new Set<WebSocket>();
  private readonly pendingConnections = new Map<string, Promise<WebSocket>>();
  private readonly cleanupTimer: NodeJS.Timeout;
  private isDestroyed = false;

  constructor(config: Partial<ConnectionPoolConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Start periodic cleanup
    this.cleanupTimer = setInterval(() => {
      this.cleanupIdleConnections();
    }, this.config.cleanupInterval);

    // Listen to health monitor events
    relayHealthMonitor.on('health-degraded', this.handleHealthDegraded.bind(this));
    relayHealthMonitor.on('relay-disconnected', this.handleRelayDisconnected.bind(this));
  }

  /**
   * Get or create a connection to a relay
   */
  async getConnection(url: string): Promise<WebSocket> {
    if (this.isDestroyed) {
      throw new Error('Connection pool has been destroyed');
    }

    // Check for existing healthy connection
    const existingConnection = this.findAvailableConnection(url);
    if (existingConnection) {
      this.updateConnectionUsage(url, existingConnection);
      this.emit('connection-reused', url, existingConnection);
      return existingConnection.socket;
    }

    // Check if we can create a new connection
    if (!this.canCreateConnection(url)) {
      throw new Error(`Connection limit reached for relay: ${url}`);
    }

    // Check for pending connection
    const pendingConnection = this.pendingConnections.get(url);
    if (pendingConnection) {
      return await pendingConnection;
    }

    // Create new connection
    return await this.createConnection(url);
  }

  /**
   * Release a connection (mark as idle)
   */
  releaseConnection(url: string, socket: WebSocket): void {
    const relayConnections = this.connections.get(url) || [];
    const connectionInfo = relayConnections.find(c => c.socket === socket);
    
    if (connectionInfo) {
      // Update to mark as idle
      const updatedInfo: ConnectionInfo = {
        ...connectionInfo,
        lastUsed: Date.now(),
        isIdle: true,
        subscriptionCount: Math.max(0, connectionInfo.subscriptionCount - 1),
      };

      // Replace in array
      const index = relayConnections.indexOf(connectionInfo);
      relayConnections[index] = updatedInfo;
    }
  }

  /**
   * Close all connections to a specific relay
   */
  closeRelayConnections(url: string, reason: string = 'Manual close'): void {
    const relayConnections = this.connections.get(url) || [];
    
    for (const connectionInfo of relayConnections) {
      this.closeConnection(connectionInfo, reason);
    }

    this.connections.delete(url);
    this.emit('connection-closed', url, reason);
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    connectionsByRelay: Record<string, number>;
    healthyConnections: number;
  } {
    let totalConnections = 0;
    let activeConnections = 0;
    let idleConnections = 0;
    let healthyConnections = 0;
    const connectionsByRelay: Record<string, number> = {};

    for (const [url, connections] of this.connections.entries()) {
      connectionsByRelay[url] = connections.length;
      totalConnections += connections.length;

      for (const conn of connections) {
        if (conn.isIdle) {
          idleConnections++;
        } else {
          activeConnections++;
        }
        
        if (conn.isHealthy) {
          healthyConnections++;
        }
      }
    }

    return {
      totalConnections,
      activeConnections,
      idleConnections,
      connectionsByRelay,
      healthyConnections,
    };
  }

  /**
   * Get all connections for a relay
   */
  getRelayConnections(url: string): ConnectionInfo[] {
    return [...(this.connections.get(url) || [])];
  }

  /**
   * Clean up and destroy the pool
   */
  destroy(): void {
    this.isDestroyed = true;

    // Clear cleanup timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    // Close all connections
    for (const [url] of this.connections.entries()) {
      this.closeRelayConnections(url, 'Pool destroyed');
    }

    // Clear pending connections
    this.pendingConnections.clear();

    // Remove event listeners
    relayHealthMonitor.off('health-degraded', this.handleHealthDegraded.bind(this));
    relayHealthMonitor.off('relay-disconnected', this.handleRelayDisconnected.bind(this));
    
    this.removeAllListeners();
  }

  /**
   * Find an available connection for reuse
   */
  private findAvailableConnection(url: string): ConnectionInfo | null {
    if (!this.config.enableConnectionReuse) {
      return null;
    }

    const relayConnections = this.connections.get(url) || [];
    
    // Find healthy, idle connection
    const idleConnection = relayConnections.find(c => 
      c.isIdle && 
      c.isHealthy && 
      c.socket.readyState === WebSocket.OPEN
    );

    if (idleConnection) {
      return idleConnection;
    }

    // If no idle connections, find least used healthy connection
    const activeConnections = relayConnections.filter(c => 
      c.isHealthy && 
      c.socket.readyState === WebSocket.OPEN
    );

    if (activeConnections.length === 0) {
      return null;
    }

    // Return connection with lowest subscription count
    return activeConnections.reduce((min, current) => 
      current.subscriptionCount < min.subscriptionCount ? current : min
    );
  }

  /**
   * Check if we can create a new connection
   */
  private canCreateConnection(url: string): boolean {
    const relayConnections = this.connections.get(url) || [];
    const totalConnections = this.getTotalConnectionCount();

    // Check per-relay limit
    if (relayConnections.length >= this.config.maxConnectionsPerRelay) {
      return false;
    }

    // Check total connection limit
    if (totalConnections >= this.config.maxTotalConnections) {
      this.emit('pool-limit-reached', totalConnections);
      return false;
    }

    return true;
  }

  /**
   * Create a new connection
   */
  private async createConnection(url: string): Promise<WebSocket> {
    const connectionPromise = this.establishConnection(url);
    this.pendingConnections.set(url, connectionPromise);

    try {
      const socket = await connectionPromise;
      this.pendingConnections.delete(url);

      // Create connection info
      const connectionInfo: ConnectionInfo = {
        url,
        socket,
        createdAt: Date.now(),
        lastUsed: Date.now(),
        isIdle: false,
        isHealthy: true,
        subscriptionCount: 1,
      };

      // Add to connections map
      const relayConnections = this.connections.get(url) || [];
      relayConnections.push(connectionInfo);
      this.connections.set(url, relayConnections);

      // Track in active connections
      this.activeConnections.add(socket);

      // Set up event handlers
      this.setupConnectionHandlers(connectionInfo);

      this.emit('connection-created', url, connectionInfo);
      return socket;

    } catch (error) {
      this.pendingConnections.delete(url);
      this.emit('connection-error', url, error as Error);
      throw error;
    }
  }

  /**
   * Establish WebSocket connection
   */
  private async establishConnection(url: string): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(url);
      
      const timeout = setTimeout(() => {
        socket.close();
        reject(new Error(`Connection timeout for ${url}`));
      }, this.config.connectionTimeout);

      socket.onopen = () => {
        clearTimeout(timeout);
        relayHealthMonitor.onConnect(url);
        resolve(socket);
      };

      socket.onerror = () => {
        clearTimeout(timeout);
        relayHealthMonitor.onFailure(url, 'Connection error');
        reject(new Error(`Failed to connect to ${url}`));
      };

      socket.onclose = () => {
        clearTimeout(timeout);
        relayHealthMonitor.onDisconnect(url, 'Connection closed');
      };
    });
  }

  /**
   * Set up connection event handlers
   */
  private setupConnectionHandlers(connectionInfo: ConnectionInfo): void {
    const { socket, url } = connectionInfo;

    socket.onclose = () => {
      this.handleConnectionClose(connectionInfo);
    };

    socket.onerror = () => {
      relayHealthMonitor.onFailure(url, 'Socket error');
      this.markConnectionUnhealthy(connectionInfo);
    };
  }

  /**
   * Handle connection close
   */
  private handleConnectionClose(connectionInfo: ConnectionInfo): void {
    const { url, socket } = connectionInfo;
    
    // Remove from active connections
    this.activeConnections.delete(socket);

    // Remove from relay connections
    const relayConnections = this.connections.get(url) || [];
    const index = relayConnections.indexOf(connectionInfo);
    if (index >= 0) {
      relayConnections.splice(index, 1);
      if (relayConnections.length === 0) {
        this.connections.delete(url);
      }
    }

    relayHealthMonitor.onDisconnect(url, 'Connection closed');
  }

  /**
   * Update connection usage
   */
  private updateConnectionUsage(url: string, connectionInfo: ConnectionInfo): void {
    const updatedInfo: ConnectionInfo = {
      ...connectionInfo,
      lastUsed: Date.now(),
      isIdle: false,
      subscriptionCount: connectionInfo.subscriptionCount + 1,
    };

    // Replace in array
    const relayConnections = this.connections.get(url) || [];
    const index = relayConnections.indexOf(connectionInfo);
    if (index >= 0) {
      relayConnections[index] = updatedInfo;
    }
  }

  /**
   * Mark connection as unhealthy
   */
  private markConnectionUnhealthy(connectionInfo: ConnectionInfo): void {
    const updatedInfo: ConnectionInfo = {
      ...connectionInfo,
      isHealthy: false,
    };

    const relayConnections = this.connections.get(connectionInfo.url) || [];
    const index = relayConnections.indexOf(connectionInfo);
    if (index >= 0) {
      relayConnections[index] = updatedInfo;
    }
  }

  /**
   * Clean up idle connections
   */
  private cleanupIdleConnections(): void {
    const now = Date.now();

    for (const [url, connections] of this.connections.entries()) {
      const connectionsToClose = connections.filter(c => 
        c.isIdle && 
        (now - c.lastUsed) > this.config.maxIdleTime
      );

      for (const connectionInfo of connectionsToClose) {
        this.closeConnection(connectionInfo, 'Idle timeout');
      }
    }
  }

  /**
   * Close a specific connection
   */
  private closeConnection(connectionInfo: ConnectionInfo, reason: string): void {
    const { socket, url } = connectionInfo;
    
    if (socket.readyState === WebSocket.OPEN) {
      socket.close();
    }

    this.activeConnections.delete(socket);
    
    // Remove from relay connections
    const relayConnections = this.connections.get(url) || [];
    const index = relayConnections.indexOf(connectionInfo);
    if (index >= 0) {
      relayConnections.splice(index, 1);
      if (relayConnections.length === 0) {
        this.connections.delete(url);
      }
    }
  }

  /**
   * Get total connection count
   */
  private getTotalConnectionCount(): number {
    let total = 0;
    for (const connections of this.connections.values()) {
      total += connections.length;
    }
    return total;
  }

  /**
   * Handle relay health degradation
   */
  private handleHealthDegraded(url: string, metrics: RelayHealthMetrics): void {
    // Mark all connections to this relay as unhealthy
    const relayConnections = this.connections.get(url) || [];
    for (const connectionInfo of relayConnections) {
      this.markConnectionUnhealthy(connectionInfo);
    }
  }

  /**
   * Handle relay disconnection
   */
  private handleRelayDisconnected(url: string, reason: string): void {
    this.closeRelayConnections(url, `Health monitor: ${reason}`);
  }
}

// Create singleton instance
export const connectionPoolManager = new ConnectionPoolManager();