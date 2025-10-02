import { useNostr } from '@/hooks/useNostr';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUserGroups } from '@/hooks/useUserGroups';
import { NostrEvent } from '@nostrify/nostrify';
import { KINDS } from '@/lib/nostr-kinds';

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
}

export interface NotificationUser {
  id: string;
  name?: string;
  picture?: string;
  followers_count: number;
  verified?: boolean;
}

export type NotificationGroup = 'all' | 'zaps' | 'likes' | 'reposts' | 'mentions' | 'follows' | 'replies';

// Helper function to get community ID
const getCommunityId = (community: NostrEvent) => {
  const dTag = community.tags.find(tag => tag[0] === "d");
  return `${KINDS.GROUP}:${community.pubkey}:${dTag ? dTag[1] : ""}`;
};

export function useNotifications() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { data: userGroupsData } = useUserGroups();

  return useQuery({
    queryKey: ['notifications', user?.pubkey],
    queryFn: async ({ signal }) => {
      if (!user) return [];

      const notifications: Notification[] = [];
      const readNotifications = JSON.parse(localStorage.getItem(`notifications:${user.pubkey}`) || '{}');

      // Optimized single query for all notification types
      const kinds = [
        KINDS.GROUP_COMMENT,
        KINDS.GROUP_POST_APPROVAL,
        KINDS.GROUP_POST_REMOVAL,
        KINDS.GROUP,
        7, 9735, 6, 16, // Add reactions, zaps, reposts for comprehensive notifications
      ];

      // Improved signal handling with longer timeout for notification queries
      const timeoutSignal = AbortSignal.timeout(8000);
      const combinedSignal = AbortSignal.any([signal, timeoutSignal]);

      const events = await nostr.query(
        [{ 
          kinds, 
          '#p': [user.pubkey], 
          limit: 100, // Increased limit to catch more notifications
        }],
        { signal: combinedSignal },
      );

      for (const event of events) {
        // Skip notifications from the user themselves
        if (event.pubkey === user.pubkey) continue;
        
        // Extract group ID from 'a' tag if present (for all notification types)
        const communityRef = event.tags.find(tag => tag[0] === 'a')?.[1];
        const communityParts = communityRef?.split(':');
        const groupId = communityParts && communityParts[0] === String(KINDS.GROUP) ? communityRef : undefined;
        
        switch (event.kind) {
          case KINDS.GROUP_COMMENT: {
            // Check if this is a top-level post or a reply
            const parentKindTag = event.tags.find(tag => tag[0] === "k");
            const parentKind = parentKindTag ? parentKindTag[1] : null;
            const isTopLevel = parentKind === "34550"; // Parent is the group
            
            notifications.push({
              id: event.id,
              type: isTopLevel ? 'YOU_WERE_MENTIONED_IN_POST' : 'YOUR_POST_WAS_REPLIED_TO',
              message: isTopLevel ? `mentioned you in a post` : `replied to your post`,
              createdAt: event.created_at,
              read: !!readNotifications[event.id],
              eventId: event.id,
              users: [{ id: event.pubkey, followers_count: 0 }],
              pubkey: event.pubkey,
              groupId
            });
            break;
          }
          // Note: GROUP_POST_REPLY case removed since all comments are now kind 1111
          case KINDS.GROUP_POST_APPROVAL: {
            // For post approval events, we already have the full community reference in the 'a' tag
            const communityRef = event.tags.find(tag => tag[0] === 'a')?.[1];
            
            notifications.push({
              id: event.id,
              type: 'YOUR_POST_WAS_APPROVED', // Post approval notification
              message: `approved your post to a group`,
              createdAt: event.created_at,
              read: !!readNotifications[event.id],
              eventId: event.tags.find(tag => tag[0] === 'e')?.[1],
              users: [{ id: event.pubkey, followers_count: 0 }],
              pubkey: event.pubkey,
              groupId: communityRef
            });
            break;
          }
          case KINDS.GROUP_POST_REMOVAL: {
            // For post removal events, we already have the full community reference in the 'a' tag
            const communityRef = event.tags.find(tag => tag[0] === 'a')?.[1];
            
            notifications.push({
              id: event.id,
              type: 'YOUR_POST_WAS_REMOVED', // Post removal notification
              message: `removed your post from a group`,
              createdAt: event.created_at,
              read: !!readNotifications[event.id],
              eventId: event.tags.find(tag => tag[0] === 'e')?.[1],
              users: [{ id: event.pubkey, followers_count: 0 }],
              pubkey: event.pubkey,
              groupId: communityRef
            });
            break;
          }
          case KINDS.GROUP: {
            const dTag = event.tags.find(tag => tag[0] === 'd')?.[1];
            const groupName = event.tags.find(tag => tag[0] === 'name')?.[1] || 'Unknown group';
            // Create the full community reference in the format "34550:pubkey:identifier"
            const fullGroupId = `${KINDS.GROUP}:${event.pubkey}:${dTag}`;
            
            notifications.push({
              id: event.id,
              type: 'GROUP_WAS_UPDATED', // Group update notification
              message: `Your group "${groupName}" has been updated`,
              createdAt: event.created_at,
              read: !!readNotifications[event.id],
              eventId: event.id,
              users: [{ id: event.pubkey, followers_count: 0 }],
              groupId: fullGroupId
            });
            break;
          }
        }
      }

      // Add moderator notifications if user is a moderator or owner of any groups
      if (userGroupsData && (userGroupsData.owned?.length > 0 || userGroupsData.moderated?.length > 0)) {
        // Filter groups where the user is a moderator or owner
        const moderatedGroups = [
          ...(userGroupsData.owned || []), 
          ...(userGroupsData.moderated || [])
        ];
        
        // Get all group IDs where the user is a moderator or owner
        const groupIds = moderatedGroups.map(group => getCommunityId(group));
        
        // Fetch all relevant moderation events for these groups
        const reportEvents = await nostr.query(
          [{ 
            kinds: [KINDS.REPORT], // Report events
            '#a': groupIds,
            limit: 20 
          }],
          { signal },
        );

        const reportActionEvents = await nostr.query(
          [{ 
            kinds: [KINDS.GROUP_CLOSE_REPORT], // Report action events
            '#a': groupIds,
            limit: 20 
          }],
          { signal },
        );

        const joinRequestEvents = await nostr.query(
          [{ 
            kinds: [KINDS.GROUP_JOIN_REQUEST], // Join request events
            '#a': groupIds,
            limit: 20 
          }],
          { signal },
        );

        const leaveRequestEvents = await nostr.query(
          [{ 
            kinds: [KINDS.GROUP_LEAVE_REQUEST], // Leave request events
            '#a': groupIds,
            limit: 20 
          }],
          { signal },
        );

        // Process report events
        for (const event of reportEvents) {
          // Skip notifications from the user themselves
          if (event.pubkey === user.pubkey) continue;
          
          const groupId = event.tags.find(tag => tag[0] === 'a')?.[1];
          if (!groupId) continue;

          // Get the report type from the p or e tag
          const pTag = event.tags.find(tag => tag[0] === 'p');
          const eTag = event.tags.find(tag => tag[0] === 'e');
          const reportType = pTag && pTag[2] ? pTag[2] : 
                            (eTag && eTag[2] ? eTag[2] : 'other');

          notifications.push({
            id: event.id,
            type: 'REPORT_SUBMITTED', // Report notification
            message: `New ${reportType} report in group`,
            createdAt: event.created_at,
            read: !!readNotifications[event.id],
            eventId: event.id,
            groupId,
            users: [{ id: event.pubkey, followers_count: 0 }],
            pubkey: event.pubkey,
            reportType
          });
        }

        // Process report action events
        for (const event of reportActionEvents) {
          // Skip notifications from the user themselves
          if (event.pubkey === user.pubkey) continue;
          
          const groupId = event.tags.find(tag => tag[0] === 'a')?.[1];
          if (!groupId) continue;

          const reportId = event.tags.find(tag => tag[0] === 'e')?.[1];
          const actionType = event.tags.find(tag => tag[0] === 't')?.[1] || 'unknown action';

          notifications.push({
            id: event.id,
            type: 'MODERATION_ACTION', // Moderation action notification
            message: `Moderator took action (${actionType}) on a report`,
            createdAt: event.created_at,
            read: !!readNotifications[event.id],
            eventId: reportId,
            groupId,
            users: [{ id: event.pubkey, followers_count: 0 }],
            pubkey: event.pubkey,
            actionType
          });
        }

        // Process join request events
        for (const event of joinRequestEvents) {
          // Skip notifications from the user themselves
          if (event.pubkey === user.pubkey) continue;
          
          const groupId = event.tags.find(tag => tag[0] === 'a')?.[1];
          if (!groupId) continue;

          notifications.push({
            id: event.id,
            type: 'NEW_USER_FOLLOWED_YOU', // Join request notification
            message: `New request to join group`,
            createdAt: event.created_at,
            read: !!readNotifications[event.id],
            eventId: event.id,
            groupId,
            users: [{ id: event.pubkey, followers_count: 0 }],
            pubkey: event.pubkey
          });
        }

        // Process leave request events
        for (const event of leaveRequestEvents) {
          // Skip notifications from the user themselves
          if (event.pubkey === user.pubkey) continue;
          
          const groupId = event.tags.find(tag => tag[0] === 'a')?.[1];
          if (!groupId) continue;

          notifications.push({
            id: event.id,
            type: 'USER_UNFOLLOWED_YOU', // Leave request notification
            message: `User requested to leave group`,
            createdAt: event.created_at,
            read: !!readNotifications[event.id],
            eventId: event.id,
            groupId,
            users: [{ id: event.pubkey, followers_count: 0 }],
            pubkey: event.pubkey
          });
        }
      }

      // Sort notifications by creation time (newest first)
      return notifications.sort((a, b) => b.createdAt - a.createdAt);
    },
    enabled: !!user,
    // Snort-inspired optimized cache configuration for notifications
    staleTime: 2 * 60 * 1000,     // 2 minutes - notifications should be fairly fresh
    gcTime: 15 * 60 * 1000,      // 15 minutes - keep notification data
    refetchOnWindowFocus: true,   // DO refetch notifications on focus (important for UX)
    refetchOnReconnect: true,     // DO refetch on reconnect
    // Remove automatic polling - use manual invalidation instead for better performance
  });
}

export function useMarkNotificationAsRead() {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  return (notificationId: string) => {
    if (!user) return;
    
    const storageKey = `notifications:${user.pubkey}`;
    const readNotifications = JSON.parse(localStorage.getItem(storageKey) || '{}');
    
    readNotifications[notificationId] = true;
    localStorage.setItem(storageKey, JSON.stringify(readNotifications));
    
    // Invalidate the notifications query to trigger a refetch and update the badge
    queryClient.invalidateQueries({ queryKey: ['notifications', user.pubkey] });
  };
}

export function useMarkAllNotificationsAsRead() {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const { data: notifications = [] } = useNotifications();

  return () => {
    if (!user) return;
    
    const storageKey = `notifications:${user.pubkey}`;
    const readNotifications = JSON.parse(localStorage.getItem(storageKey) || '{}');
    
    // Mark all current notifications as read
    for (const notification of notifications) {
      readNotifications[notification.id] = true;
    }
    
    localStorage.setItem(storageKey, JSON.stringify(readNotifications));
    
    // Invalidate the notifications query to trigger a refetch and update the badge
    queryClient.invalidateQueries({ queryKey: ['notifications', user.pubkey] });
  };
}

export function useUnreadNotificationsCount() {
  const { data: notifications = [] } = useNotifications();
  return notifications.filter(notification => !notification.read).length;
}
