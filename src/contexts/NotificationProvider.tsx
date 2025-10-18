import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useSimplePool } from '@/hooks/useSimplePool';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUserTrust } from '@/providers/UserTrustProvider';
import { NostrEvent } from '@nostrify/nostrify';
import type { Filter } from '@nostr/tools';
import { KINDS } from '@/lib/nostr-kinds';
import { showLocalNotification, type NotificationPayload } from '@/hooks/usePushNotifications';
import { getZapInfoFromEvent } from '@/lib/event-metadata';

export interface Notification {
  id: string;
  type: 'NEW_USER_FOLLOWED_YOU' | 'USER_UNFOLLOWED_YOU' | 'YOUR_POST_WAS_ZAPPED' | 'YOUR_POST_WAS_REPOSTED' | 'YOUR_POST_WAS_REPLIED_TO' | 'YOU_WERE_MENTIONED_IN_POST' | 'YOUR_POST_WAS_MENTIONED_IN_POST' | 'POST_YOU_WERE_MENTIONED_IN_WAS_ZAPPED' | 'POST_YOU_WERE_MENTIONED_IN_WAS_REPOSTED' | 'POST_YOU_WERE_MENTIONED_IN_WAS_REPLIED_TO' | 'POST_YOUR_POST_WAS_MENTIONED_IN_WAS_ZAPPED' | 'POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPOSTED' | 'POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPLIED_TO' | 'YOUR_POST_WAS_HIGHLIGHTED' | 'YOUR_POST_WAS_BOOKMARKED' | 'YOUR_POST_HAD_REACTION' | 'YOUR_POST_WAS_APPROVED' | 'YOUR_POST_WAS_REMOVED' | 'GROUP_WAS_UPDATED' | 'REPORT_SUBMITTED' | 'MODERATION_ACTION';
  message: string;
  createdAt: number;
  read: boolean;
  eventId?: string;
  groupId?: string;
  users?: NotificationUser[];
  pubkey?: string;
  reportType?: string;
  actionType?: string;
  sats?: number;
  iconInfo?: string;
  iconTooltip?: string;
  event?: NostrEvent;
}

export interface NotificationUser {
  id: string;
  name?: string;
  picture?: string;
  followers_count: number;
  verified?: boolean;
}

interface NotificationContextValue {
  notifications: Notification[];
  isConnected: boolean;
  isInitialLoad: boolean;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  updateLastSeenTimestamp: () => void;
  unreadCount: number;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

// Performance: Limit relay count to prevent slow queries (Jumble best practice)
const MAX_NOTIFICATION_RELAYS = 5;

// Helper function to get community ID
const getCommunityId = (community: NostrEvent) => {
  const dTag = community.tags.find(tag => tag[0] === "d");
  return `${KINDS.GROUP}:${community.pubkey}:${dTag ? dTag[1] : ""}`;
};

// Helper function to convert Nostr event to Notification
const eventToNotification = (event: NostrEvent, userPubkey: string, readNotifications: Record<string, boolean>): Notification | null => {
  // Skip notifications from the user themselves
  if (event.pubkey === userPubkey) return null;
  
  switch (event.kind) {
    case 1: { // Regular note (mention or reply)
      // Check if this is a reply to user's post or a mention
      const replyToTags = event.tags.filter(tag => tag[0] === 'e');
      const mentionTags = event.tags.filter(tag => tag[0] === 'p' && tag[1] === userPubkey);
      
      // If there are 'e' tags, it's a reply thread
      const isReply = replyToTags.length > 0;
      
      // Determine the parent event ID for replies
      // NIP-10: Use 'reply' marker if present, otherwise last 'e' tag is the immediate parent
      const replyMarkerTag = replyToTags.find(tag => tag[3] === 'reply');
      const parentEventId = replyMarkerTag ? replyMarkerTag[1] : replyToTags[replyToTags.length - 1]?.[1];
      
      return {
        id: event.id,
        type: isReply ? 'YOUR_POST_WAS_REPLIED_TO' : 'YOU_WERE_MENTIONED_IN_POST',
        message: isReply ? `replied to your post` : `mentioned you`,
        createdAt: event.created_at,
        read: !!readNotifications[event.id],
        eventId: isReply ? parentEventId : event.id,
        users: [{ id: event.pubkey, followers_count: 0 }],
        pubkey: event.pubkey,
        event
      };
    }
    
    case 7: { // Reaction
      return {
        id: event.id,
        type: 'YOUR_POST_HAD_REACTION',
        message: `reacted to your post`,
        createdAt: event.created_at,
        read: !!readNotifications[event.id],
        eventId: event.tags.find(tag => tag[0] === 'e')?.[1],
        users: [{ id: event.pubkey, followers_count: 0 }],
        pubkey: event.pubkey,
        event
      };
    }
    
    case 9735: { // Zap
      const zapInfo = getZapInfoFromEvent(event);
      if (!zapInfo) return null;
      
      return {
        id: event.id,
        type: 'YOUR_POST_WAS_ZAPPED',
        message: `zapped your post`,
        createdAt: event.created_at,
        read: !!readNotifications[event.id],
        eventId: event.tags.find(tag => tag[0] === 'e')?.[1],
        users: [{ id: zapInfo.senderPubkey || event.pubkey, followers_count: 0 }],
        pubkey: zapInfo.senderPubkey || event.pubkey,
        sats: zapInfo.amount, // Amount is already in sats from getAmountFromInvoice
        event
      };
    }
    
    case 6: // Repost
    case 16: { // Generic repost
      return {
        id: event.id,
        type: 'YOUR_POST_WAS_REPOSTED',
        message: `reposted your post`,
        createdAt: event.created_at,
        read: !!readNotifications[event.id],
        eventId: event.tags.find(tag => tag[0] === 'e')?.[1],
        users: [{ id: event.pubkey, followers_count: 0 }],
        pubkey: event.pubkey,
        event
      };
    }
    
    default:
      return null;
  }
};

// Helper to create push notification payload from Nostr notification
const createPushNotificationPayload = (notification: Notification): NotificationPayload | null => {
  const basePayload: Partial<NotificationPayload> = {
    data: {
      url: notification.eventId ? `/nevent1${notification.eventId}` : undefined,
      notificationId: notification.id
    },
    icon: '/images/ZapTok-v3.png',
    badge: '/images/ZapTok-v3.png'
  };

  switch (notification.type) {
    case 'YOUR_POST_WAS_ZAPPED':
      return {
        type: 'zap',
        title: '⚡ New Zap!',
        body: `Someone zapped ${notification.sats} sats`,
        ...basePayload
      };
      
    case 'YOUR_POST_WAS_REPLIED_TO':
      return {
        type: 'comment',
        title: '💬 New Comment',
        body: 'Someone replied to your post',
        ...basePayload
      };
      
    case 'YOUR_POST_WAS_REPOSTED':
      return {
        type: 'repost',
        title: '🔄 New Repost',
        body: 'Someone reposted your content',
        ...basePayload
      };
      
    case 'YOUR_POST_HAD_REACTION':
      return {
        type: 'follow',
        title: '❤️ New Reaction',
        body: 'Someone reacted to your post',
        ...basePayload
      };
      
    case 'YOU_WERE_MENTIONED_IN_POST':
      return {
        type: 'comment',
        title: '👋 Mentioned',
        body: 'You were mentioned in a post',
        ...basePayload
      };
      
    default:
      return null;
  }
};

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { simplePool, simplePoolRelays } = useSimplePool();
  const { user } = useCurrentUser();
  const { isUserTrusted, hideUntrustedNotifications } = useUserTrust();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  const isMountedRef = useRef(true);
  const subCloserRef = useRef<{ close: () => void } | null>(null);
  const eosedRef = useRef(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const eoseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load read notifications from localStorage
  const getReadNotifications = useCallback(() => {
    if (!user) return {};
    const storageKey = `notifications:${user.pubkey}`;
    return JSON.parse(localStorage.getItem(storageKey) || '{}');
  }, [user]);

  // Get last seen timestamp to prevent notification spam from old events
  const getLastSeenTimestamp = useCallback((): number => {
    if (!user) return Math.floor(Date.now() / 1000);
    
    const storageKey = `notifications:lastSeen:${user.pubkey}`;
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
      return parseInt(stored, 10);
    }
    
    // First time user: Set to current time to avoid historical notification spam
    const now = Math.floor(Date.now() / 1000);
    localStorage.setItem(storageKey, now.toString());
    console.log('[Notifications] First login detected - setting baseline to current time');
    return now;
  }, [user]);

  // Update last seen timestamp
  const updateLastSeenTimestamp = useCallback(() => {
    if (!user) return;
    
    const storageKey = `notifications:lastSeen:${user.pubkey}`;
    const now = Math.floor(Date.now() / 1000);
    localStorage.setItem(storageKey, now.toString());
  }, [user]);

  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    if (!user) return;
    
    const storageKey = `notifications:${user.pubkey}`;
    const readNotifications = getReadNotifications();
    readNotifications[notificationId] = true;
    localStorage.setItem(storageKey, JSON.stringify(readNotifications));
    
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  }, [user, getReadNotifications]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    if (!user) return;
    
    const storageKey = `notifications:${user.pubkey}`;
    const readNotifications = getReadNotifications();
    
    notifications.forEach(n => {
      readNotifications[n.id] = true;
    });
    
    localStorage.setItem(storageKey, JSON.stringify(readNotifications));
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, [user, notifications, getReadNotifications]);

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length;
  
  // Filter notifications based on Web of Trust settings
  const filteredNotifications = useMemo(() => {
    if (!hideUntrustedNotifications) return notifications;
    
    return notifications.filter(notification => {
      // Always show notifications without a pubkey
      if (!notification.pubkey) return true;
      
      // Filter based on trust
      return isUserTrusted(notification.pubkey);
    });
  }, [notifications, hideUntrustedNotifications, isUserTrusted]);

  // Memoize relay list to prevent unnecessary re-subscriptions
  const relayList = useMemo(() => 
    simplePoolRelays.slice(0, MAX_NOTIFICATION_RELAYS).join(','),
    [simplePoolRelays]
  );

  // Real-time subscription logic
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setIsConnected(false);
      setIsInitialLoad(true);
      return;
    }

    // Don't start subscription until relays are configured
    const limitedRelays = relayList.split(',').filter(Boolean);
    if (limitedRelays.length === 0) {
      console.log('[Notifications] Waiting for relays to be configured...');
      setIsConnected(false);
      setIsInitialLoad(true);
      return;
    }

    isMountedRef.current = true;
    eosedRef.current = false;

    const subscribe = async () => {
      // Close existing subscription
      if (subCloserRef.current) {
        subCloserRef.current.close();
        subCloserRef.current = null;
      }

      // Clear any pending EOSE timeout
      if (eoseTimeoutRef.current) {
        clearTimeout(eoseTimeoutRef.current);
        eoseTimeoutRef.current = null;
      }

      if (!isMountedRef.current) return;

      try {
        // Limit to first N relays for performance
        const limitedRelays = relayList.split(',').filter(Boolean);
        
        if (limitedRelays.length === 0) {
          console.warn('[Notifications] No relays available');
          // Retry in 5 seconds
          if (isMountedRef.current) {
            reconnectTimeoutRef.current = setTimeout(() => {
              if (isMountedRef.current) subscribe();
            }, 5000);
          }
          return;
        }

        console.log('[Notifications] Subscribing to', limitedRelays.length, 'relays');

        // Social notification kinds
        const kinds = [
          1,    // Regular notes (mentions, replies)
          // 7,  // Reactions (disabled by default - can be enabled in settings)
          9735, // Zaps
          6,    // Reposts
          16    // Generic reposts
        ];

        const readNotifications = getReadNotifications();
        const lastSeenTimestamp = getLastSeenTimestamp();
        let eosCount = 0;
        const expectedEosCount = limitedRelays.length;

        // Only fetch events since last seen to prevent notification spam from old events
        const filter: Filter = {
          kinds,
          '#p': [user.pubkey],
          since: lastSeenTimestamp,
          limit: 100
        };
        
        console.log('[Notifications] Fetching events since', new Date(lastSeenTimestamp * 1000).toISOString());

        // Finish initial load after timeout even if not all relays respond
        eoseTimeoutRef.current = setTimeout(() => {
          if (!eosedRef.current) {
            eosedRef.current = true;
            setIsInitialLoad(false);
            setIsConnected(eosCount > 0); // Connected if at least one relay responded
            console.log(`[Notifications] Initial load complete (timeout, received ${eosCount}/${expectedEosCount} EOSE)`);
          }
        }, 3000); // 3 second timeout

        subCloserRef.current = simplePool.subscribeMany(
          limitedRelays,
          filter,
          {
            oneose: () => {
              eosCount++;
              console.log(`[Notifications] EOSE ${eosCount}/${expectedEosCount}`);
              
              if (eosCount >= expectedEosCount && !eosedRef.current) {
                if (eoseTimeoutRef.current) {
                  clearTimeout(eoseTimeoutRef.current);
                  eoseTimeoutRef.current = null;
                }
                eosedRef.current = true;
                setIsInitialLoad(false);
                setIsConnected(true);
                console.log('[Notifications] Initial load complete');
              }
            },
            onevent: (event: NostrEvent) => {
              const notification = eventToNotification(event, user.pubkey, readNotifications);
              if (!notification) return;

              setNotifications(prev => {
                // Prevent duplicates
                if (prev.some(n => n.id === event.id)) return prev;

                // Insert in chronological order (newest first)
                const newNotifications = [notification, ...prev].sort((a, b) => b.createdAt - a.createdAt);

                // If this is a new notification after initial load, show push notification
                if (eosedRef.current && !notification.read) {
                  console.log('[Notifications] New real-time notification:', notification.type);
                  
                  const pushPayload = createPushNotificationPayload(notification);
                  if (pushPayload) {
                    try {
                      showLocalNotification(pushPayload);
                    } catch (err) {
                      console.warn('[Notifications] Failed to show push notification:', err);
                    }
                  }
                }

                return newNotifications;
              });
            },
            onclose: (reasons: string[]) => {
              console.log('[Notifications] Subscription closed:', reasons);
              setIsConnected(false);

              // Auto-reconnect if not explicitly closed by caller
              if (!reasons.every(r => r === 'closed by caller') && isMountedRef.current) {
                console.log('[Notifications] Auto-reconnecting in 5 seconds...');
                reconnectTimeoutRef.current = setTimeout(() => {
                  if (isMountedRef.current) {
                    subscribe();
                  }
                }, 5000);
              }
            }
          }
        );
      } catch (error) {
        console.error('[Notifications] Subscription error:', error);
        setIsConnected(false);

        // Retry on error
        if (isMountedRef.current) {
          console.log('[Notifications] Retrying in 5 seconds...');
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) subscribe();
          }, 5000);
        }
      }
    };

    subscribe();

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      if (eoseTimeoutRef.current) {
        clearTimeout(eoseTimeoutRef.current);
        eoseTimeoutRef.current = null;
      }
      
      if (subCloserRef.current) {
        subCloserRef.current.close();
        subCloserRef.current = null;
      }
    };
  }, [user?.pubkey, simplePool, relayList, getReadNotifications, getLastSeenTimestamp]);

  const value: NotificationContextValue = {
    notifications: filteredNotifications,
    isConnected,
    isInitialLoad,
    markAsRead,
    markAllAsRead,
    updateLastSeenTimestamp,
    unreadCount
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
}
