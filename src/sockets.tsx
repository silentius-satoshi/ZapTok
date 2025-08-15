import { NostrEvent, NostrEventContent } from './types/nostr';

// WebSocket connection management
let socketInstance: WebSocket | null = null;
let socketUrl = '';
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectDelay = 1000;

export const socket = () => socketInstance;

export const isConnected = () => {
  return socketInstance?.readyState === WebSocket.OPEN;
};

// Initialize WebSocket connection
export const initSocket = (url: string) => {
  socketUrl = url;
  connectSocket();
};

const connectSocket = () => {
  try {
    socketInstance = new WebSocket(socketUrl);

    socketInstance.onopen = () => {
      console.log('WebSocket connected');
      reconnectAttempts = 0;
    };

    socketInstance.onclose = (event) => {
      console.log('WebSocket disconnected');
      handleReconnection();
    };

    socketInstance.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

  } catch (error) {
    console.error('Failed to create WebSocket:', error);
    handleReconnection();
  }
};

const handleReconnection = () => {
  if (reconnectAttempts < maxReconnectAttempts) {
    setTimeout(() => {
      reconnectAttempts++;
      console.log(`Reconnection attempt ${reconnectAttempts}`);
      connectSocket();
    }, reconnectDelay * Math.pow(2, reconnectAttempts));
  }
};

// Send message through WebSocket
export const sendMessage = (message: string) => {
  if (isConnected() && socketInstance) {
    socketInstance.send(message);
  } else {
    console.warn('WebSocket not connected, message not sent:', message);
  }
};

// Subscription management
interface SocketHandlers {
  onEvent?: (subId: string, content: NostrEventContent) => void;
  onEose?: (subId: string) => void;
  onNotice?: (subId: string, notice: string) => void;
}

const subscriptions = new Map<string, SocketHandlers>();

export const subsTo = (subId: string, handlers: SocketHandlers) => {
  subscriptions.set(subId, handlers);

  // Set up message listener if not already set
  if (socketInstance && !socketInstance.onmessage) {
    socketInstance.onmessage = handleMessage;
  }

  return () => {
    subscriptions.delete(subId);
  };
};

const handleMessage = async (event: MessageEvent) => {
  try {
    let data: string;

    if (event.data instanceof ArrayBuffer) {
      // Handle binary data with pako decompression
      const decompressed = await decompressData(event.data);
      data = decompressed;
    } else {
      data = event.data;
    }

    const message = JSON.parse(data);
    const [type, subId, content] = message;

    const handlers = subscriptions.get(subId);
    if (!handlers) return;

    switch (type) {
      case 'EVENT':
        handlers.onEvent?.(subId, content);
        break;
      case 'EVENTS':
        if (Array.isArray(content)) {
          content.forEach(event => handlers.onEvent?.(subId, event));
        }
        break;
      case 'EOSE':
        handlers.onEose?.(subId);
        break;
      case 'NOTICE':
        handlers.onNotice?.(subId, content);
        break;
    }
  } catch (error) {
    console.error('Error handling WebSocket message:', error);
  }
};

// Binary data decompression (placeholder implementation)
const decompressData = async (data: ArrayBuffer): Promise<string> => {
  // This would use pako.inflate in the actual implementation
  // For now, return as text
  return new TextDecoder().decode(data);
};

// Socket listeners management
export const refreshSocketListeners = (
  ws: WebSocket | undefined,
  listeners: Record<string, (event: any) => any>
) => {
  if (!ws) return;

  Object.keys(listeners).forEach((eventType) => {
    ws.removeEventListener(eventType, listeners[eventType]);
    ws.addEventListener(eventType, listeners[eventType]);
  });
};

export const removeSocketListeners = (
  ws: WebSocket | undefined,
  listeners: Record<string, (event: any) => any>
) => {
  if (!ws) return;

  Object.keys(listeners).forEach((eventType) => {
    ws.removeEventListener(eventType, listeners[eventType]);
  });
};