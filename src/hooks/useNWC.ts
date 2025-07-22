// React hook for managing NWC (Nostr Wallet Connect) connections
import { useState, useCallback, useRef, useEffect } from 'react';
import { useNostr } from '@/hooks/useNostr';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { NWCClient, createNostrAdapter } from '@/lib/nwc-client';
import { GetInfoResult, PayInvoiceParams, PayInvoiceResult, MakeInvoiceParams, MakeInvoiceResult, Transaction, NWCNotification } from '@/lib/nwc-types';
import { parseNWCURI } from '@/lib/nwc-utils';

export interface NWCConnection {
  id: string;
  alias: string;
  uri: string;
  walletInfo?: GetInfoResult;
  balance?: number;
  isConnected: boolean;
  lastSeen?: number;
}

export function useNWC() {
  const { nostr } = useNostr();
  const [connections, setConnections] = useLocalStorage<NWCConnection[]>('nwc-connections', []);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [activeConnection, setActiveConnection] = useLocalStorage<string | null>('nwc-active-connection', null);
  
  const clientsRef = useRef<Map<string, NWCClient>>(new Map());
  const notificationListeners = useRef<Map<string, AbortController>>(new Map());

  // Refresh wallet data
  const refreshWallet = useCallback(async (connectionId: string) => {
    const client = clientsRef.current.get(connectionId);
    if (!client) return;

    try {
      const [walletInfo, balance] = await Promise.all([
        client.getInfo(),
        client.getBalance(),
      ]);

      setConnections(prev => prev.map(c => 
        c.id === connectionId 
          ? { 
              ...c, 
              walletInfo, 
              balance: balance.balance,
              isConnected: true,
              lastSeen: Date.now()
            }
          : c
      ));
    } catch (error) {
      console.error('Failed to refresh wallet data:', error);
      
      setConnections(prev => prev.map(c => 
        c.id === connectionId 
          ? { ...c, isConnected: false }
          : c
      ));
    }
  }, [setConnections]);

  // Handle incoming notification
  const handleNotification = useCallback((connectionId: string, notification: NWCNotification) => {
    console.log('NWC Notification:', notification);
    
    // Refresh wallet data when we receive payment notifications
    if (notification.notification_type === 'payment_received' || 
        notification.notification_type === 'payment_sent') {
      refreshWallet(connectionId);
    }
  }, [refreshWallet]);

  // Start notification listener for a connection
  const startNotificationListener = useCallback((connectionId: string, client: NWCClient) => {
    // Stop existing listener
    const existingController = notificationListeners.current.get(connectionId);
    if (existingController) {
      existingController.abort();
    }

    // Start new listener
    const controller = new AbortController();
    notificationListeners.current.set(connectionId, controller);

    (async () => {
      try {
        for await (const notification of client.listenForNotifications(controller.signal)) {
          handleNotification(connectionId, notification);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Notification listener error:', error);
        }
      }
    })();
  }, [handleNotification]);

  // Get NWC client for a connection
  const getClient = useCallback((connectionId: string): NWCClient | null => {
    if (clientsRef.current.has(connectionId)) {
      return clientsRef.current.get(connectionId)!;
    }

    const connection = connections.find(c => c.id === connectionId);
    if (!connection) return null;

    try {
      const parsedURI = parseNWCURI(connection.uri);
      const client = new NWCClient(parsedURI, createNostrAdapter(nostr as unknown as Parameters<typeof createNostrAdapter>[0]));
      clientsRef.current.set(connectionId, client);
      return client;
    } catch (error) {
      console.error('Failed to create NWC client:', error);
      return null;
    }
  }, [connections, nostr]);

  // Add a new NWC connection
  const addConnection = useCallback(async (uri: string, alias?: string): Promise<string> => {
    setIsConnecting('new');
    
    try {
      const parsedURI = parseNWCURI(uri);
      const client = new NWCClient(parsedURI, createNostrAdapter(nostr as unknown as Parameters<typeof createNostrAdapter>[0]));
      
      // Test connection and get wallet info
      const walletInfo = await client.getInfo();
      const balance = await client.getBalance();

      const id = Date.now().toString();
      const connection: NWCConnection = {
        id,
        alias: alias || walletInfo.alias || 'NWC Wallet',
        uri,
        walletInfo,
        balance: balance.balance,
        isConnected: true,
        lastSeen: Date.now(),
      };

      setConnections(prev => [...prev, connection]);
      
      // Store client
      clientsRef.current.set(id, client);
      
      // Set as active if it's the first connection
      if (connections.length === 0) {
        setActiveConnection(id);
      }

      // Start listening for notifications
      startNotificationListener(id, client);

      return id;
    } catch (error) {
      console.error('Failed to add NWC connection:', error);
      throw error;
    } finally {
      setIsConnecting(null);
    }
  }, [connections, nostr, setConnections, setActiveConnection, startNotificationListener]);

  // Remove a connection
  const removeConnection = useCallback((connectionId: string) => {
    setConnections(prev => prev.filter(c => c.id !== connectionId));
    clientsRef.current.delete(connectionId);
    
    // Stop notification listener
    const controller = notificationListeners.current.get(connectionId);
    if (controller) {
      controller.abort();
      notificationListeners.current.delete(connectionId);
    }
    
    // Reset active connection if removed
    if (activeConnection === connectionId) {
      const remaining = connections.filter(c => c.id !== connectionId);
      setActiveConnection(remaining.length > 0 ? remaining[0].id : null);
    }
  }, [connections, activeConnection, setConnections, setActiveConnection]);

  // Test connection status
  const testConnection = useCallback(async (connectionId: string): Promise<boolean> => {
    const client = getClient(connectionId);
    if (!client) return false;

    try {
      const isConnected = await client.testConnection();
      
      // Update connection status
      setConnections(prev => prev.map(c => 
        c.id === connectionId 
          ? { ...c, isConnected, lastSeen: Date.now() }
          : c
      ));

      return isConnected;
    } catch (error) {
      console.error('Connection test failed:', error);
      
      // Mark as disconnected
      setConnections(prev => prev.map(c => 
        c.id === connectionId 
          ? { ...c, isConnected: false }
          : c
      ));

      return false;
    }
  }, [getClient, setConnections]);

  // Pay invoice
  const payInvoice = useCallback(async (invoice: string, amount?: number): Promise<PayInvoiceResult> => {
    if (!activeConnection) {
      throw new Error('No active NWC connection');
    }

    const client = getClient(activeConnection);
    if (!client) {
      throw new Error('NWC client not available');
    }

    const params: PayInvoiceParams = { invoice };
    if (amount) params.amount = amount;

    try {
      const result = await client.payInvoice(params);
      
      // Refresh balance after payment
      await refreshWallet(activeConnection);
      
      return result;
    } catch (error) {
      console.error('Payment failed:', error);
      throw error;
    }
  }, [activeConnection, getClient, refreshWallet]);

  // Make invoice
  const makeInvoice = useCallback(async (amount: number, description?: string): Promise<MakeInvoiceResult> => {
    if (!activeConnection) {
      throw new Error('No active NWC connection');
    }

    const client = getClient(activeConnection);
    if (!client) {
      throw new Error('NWC client not available');
    }

    const params: MakeInvoiceParams = { amount };
    if (description) params.description = description;

    return await client.makeInvoice(params);
  }, [activeConnection, getClient]);

  // Get transactions
  const getTransactions = useCallback(async (limit = 20): Promise<Transaction[]> => {
    if (!activeConnection) {
      return [];
    }

    const client = getClient(activeConnection);
    if (!client) {
      return [];
    }

    try {
      const result = await client.listTransactions({ limit });
      return result.transactions;
    } catch (error) {
      console.error('Failed to get transactions:', error);
      return [];
    }
  }, [activeConnection, getClient]);

  // Get current connection info
  const currentConnection = connections.find(c => c.id === activeConnection) || null;
  const currentBalance = currentConnection?.balance || 0;
  const isConnected = currentConnection?.isConnected || false;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Capture current values to avoid stale closure
      const listeners = notificationListeners.current;
      const clients = clientsRef.current;
      
      // Abort all notification listeners
      listeners.forEach(controller => {
        controller.abort();
      });
      listeners.clear();
      clients.clear();
    };
  }, []);

  return {
    // Connection management
    connections,
    activeConnection,
    currentConnection,
    setActiveConnection,
    addConnection,
    removeConnection,
    testConnection,
    refreshWallet,
    
    // Wallet operations
    payInvoice,
    makeInvoice,
    getTransactions,
    
    // State
    isConnecting,
    currentBalance,
    isConnected,
  };
}
