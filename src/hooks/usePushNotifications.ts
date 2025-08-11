import { useState, useEffect, useCallback } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePWA } from '@/hooks/usePWA';

export interface PushNotificationState {
  permission: NotificationPermission;
  subscription: PushSubscription | null;
  isSupported: boolean;
  isSubscribed: boolean;
  isSubscribing: boolean;
  error: string | null;
}

export interface PushNotificationActions {
  requestPermission: () => Promise<boolean>;
  subscribeToPush: () => Promise<boolean>;
  unsubscribeFromPush: () => Promise<boolean>;
  sendTestNotification: () => Promise<void>;
  clearError: () => void;
}

export interface NotificationPayload {
  type: 'lightning-payment' | 'cashu-token' | 'zap' | 'comment' | 'follow' | 'repost';
  title: string;
  body: string;
  data?: Record<string, any>;
  icon?: string;
  badge?: string;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export function usePushNotifications(): PushNotificationState & PushNotificationActions {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useCurrentUser();
  const { serviceWorkerRegistration } = usePWA();

  const isSupported = 'PushManager' in window && 'Notification' in window && 'serviceWorker' in navigator;
  const isSubscribed = subscription !== null;

  // Initialize permission state
  useEffect(() => {
    if (isSupported) {
      setPermission(Notification.permission);
    }
  }, [isSupported]);

  // Load existing subscription
  useEffect(() => {
    if (serviceWorkerRegistration && isSupported) {
      navigator.serviceWorker.ready
        .then((registration) => {
          return registration.pushManager.getSubscription();
        })
        .then((sub) => {
          console.log('[Push] Existing subscription:', sub);
          setSubscription(sub);
        })
        .catch((error) => {
          console.error('[Push] Failed to get existing subscription:', error);
        });
    }
  }, [serviceWorkerRegistration, isSupported]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Push notifications are not supported in this browser');
      return false;
    }

    try {
      setError(null);
      const result = await Notification.requestPermission();
      setPermission(result);
      
      console.log('[Push] Permission result:', result);
      return result === 'granted';
    } catch (error) {
      console.error('[Push] Permission request failed:', error);
      setError('Failed to request notification permission');
      return false;
    }
  }, [isSupported]);

  const subscribeToPush = useCallback(async (): Promise<boolean> => {
    if (!serviceWorkerRegistration) {
      setError('Service worker not ready');
      return false;
    }

    if (permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) {
        return false;
      }
    }

    try {
      setIsSubscribing(true);
      setError(null);

      const registration = await navigator.serviceWorker.ready;

      // Generate VAPID keys for your application
      // You would typically get this from your server/environment
      const vapidPublicKey = process.env.VITE_VAPID_PUBLIC_KEY || 
        'BEl62iUYgUivxIkv69yViEuiBIa40HI80NM9Ame50P1S1b-dQD1-1HEhNh8Ui4Eg7lGGAT4XFb9R8iqhW9SZ3uE';

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey,
      });

      if (!subscription) {
        throw new Error('Failed to create push subscription');
      }

      console.log('[Push] Created subscription:', subscription);
      setSubscription(subscription);

      // Send subscription to your server
      await sendSubscriptionToServer(subscription);

      return true;
    } catch (error) {
      console.error('[Push] Subscription failed:', error);
      setError('Failed to subscribe to push notifications');
      return false;
    } finally {
      setIsSubscribing(false);
    }
  }, [serviceWorkerRegistration, permission, requestPermission]);

  const unsubscribeFromPush = useCallback(async (): Promise<boolean> => {
    if (!subscription) {
      return true;
    }

    try {
      setError(null);

      await subscription.unsubscribe();
      setSubscription(null);

      // Remove subscription from server
      await removeSubscriptionFromServer(subscription);

      console.log('[Push] Unsubscribed successfully');
      return true;
    } catch (error) {
      console.error('[Push] Unsubscribe failed:', error);
      setError('Failed to unsubscribe from push notifications');
      return false;
    }
  }, [subscription]);

  const sendTestNotification = useCallback(async (): Promise<void> => {
    if (!isSubscribed || !user) {
      throw new Error('Not subscribed or not logged in');
    }

    try {
      setError(null);

      // Send test notification via your server
      await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription,
          payload: {
            type: 'zap',
            title: '⚡ Test Zap!',
            body: 'This is a test notification from ZapTok',
            data: {
              amount: 1000,
              from: 'Test User',
              url: '/wallet'
            }
          }
        }),
      });

      console.log('[Push] Test notification sent');
    } catch (error) {
      console.error('[Push] Test notification failed:', error);
      setError('Failed to send test notification');
      throw error;
    }
  }, [isSubscribed, subscription, user]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    permission,
    subscription,
    isSupported,
    isSubscribed,
    isSubscribing,
    error,

    // Actions
    requestPermission,
    subscribeToPush,
    unsubscribeFromPush,
    sendTestNotification,
    clearError,
  };
}

// Send subscription to server for storage
async function sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
  try {
    const response = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    console.log('[Push] Subscription sent to server');
  } catch (error) {
    console.error('[Push] Failed to send subscription to server:', error);
    // Don't throw - this is not critical for the client
  }
}

// Remove subscription from server
async function removeSubscriptionFromServer(subscription: PushSubscription): Promise<void> {
  try {
    const response = await fetch('/api/notifications/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    console.log('[Push] Subscription removed from server');
  } catch (error) {
    console.error('[Push] Failed to remove subscription from server:', error);
    // Don't throw - this is not critical for the client
  }
}

// Utility function to show local notification (fallback when push isn't available)
export function showLocalNotification(payload: NotificationPayload): void {
  if (!('Notification' in window)) {
    console.warn('[Notification] Notifications not supported');
    return;
  }

  if (Notification.permission !== 'granted') {
    console.warn('[Notification] Permission not granted');
    return;
  }

  const options: NotificationOptions = {
    body: payload.body,
    icon: payload.icon || '/images/ZapTok-v3.png',
    badge: payload.badge || '/images/ZapTok-v3.png',
    data: payload.data,
    requireInteraction: true,
    tag: payload.type,
  };

  // Only add actions if supported
  if (payload.actions && 'actions' in Notification.prototype) {
    (options as any).actions = payload.actions;
  }

  const notification = new Notification(payload.title, options);

  notification.onclick = (event) => {
    event.preventDefault();
    window.focus();
    
    // Handle click based on type
    const { data } = payload;
    if (data?.url) {
      window.location.href = data.url;
    }
    
    notification.close();
  };

  // Auto-close after 5 seconds
  setTimeout(() => {
    notification.close();
  }, 5000);
}

// Hook for listening to Lightning/Cashu events and sending notifications
export function useEventNotifications() {
  const { isSubscribed, subscribeToPush } = usePushNotifications();
  const { user } = useCurrentUser();

  const notifyLightningPayment = useCallback((amount: number, from?: string) => {
    if (isSubscribed) {
      // Send push notification via server
      // Implementation would send to your notification API
    } else {
      // Fallback to local notification
      showLocalNotification({
        type: 'lightning-payment',
        title: '⚡ Lightning Payment',
        body: `Received ${amount} sats${from ? ` from ${from}` : ''}`,
        data: { amount, from, url: '/wallet' },
      });
    }
  }, [isSubscribed]);

  const notifyCashuToken = useCallback((amount: number, from?: string) => {
    if (isSubscribed) {
      // Send push notification via server
    } else {
      showLocalNotification({
        type: 'cashu-token',
        title: '🥜 Cashu Token',
        body: `New ${amount} sat token${from ? ` from ${from}` : ''}`,
        data: { amount, from, url: '/wallet' },
      });
    }
  }, [isSubscribed]);

  const notifyZap = useCallback((amount: number, content?: string) => {
    if (isSubscribed) {
      // Send push notification via server
    } else {
      showLocalNotification({
        type: 'zap',
        title: '⚡ Zap Received',
        body: `${amount} sats zapped to your content!`,
        data: { amount, content, url: '/wallet' },
      });
    }
  }, [isSubscribed]);

  const notifyComment = useCallback((from: string, preview: string, videoId?: string) => {
    if (isSubscribed) {
      // Send push notification via server
    } else {
      showLocalNotification({
        type: 'comment',
        title: '💬 New Comment',
        body: preview,
        data: { from, preview, videoId, url: videoId ? `/video/${videoId}` : '/' },
      });
    }
  }, [isSubscribed]);

  // Auto-subscribe for logged-in users if not already subscribed
  useEffect(() => {
    if (user && !isSubscribed) {
      subscribeToPush().catch((error) => {
        console.log('[Push] Auto-subscribe failed:', error);
      });
    }
  }, [user, isSubscribed, subscribeToPush]);

  return {
    notifyLightningPayment,
    notifyCashuToken,
    notifyZap,
    notifyComment,
  };
}
