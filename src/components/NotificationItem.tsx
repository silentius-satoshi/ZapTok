import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthor } from '@/hooks/useAuthor';
import { formatRelativeTime } from '@/lib/notificationUtils';
import { Zap, Heart, Repeat, MessageCircle, UserPlus, UserMinus, AtSign, Bell } from 'lucide-react';
import NotificationAvatar from './NotificationAvatar';
import type { Notification, NotificationUser } from '@/hooks/useNotifications';

interface NotificationItemProps {
  id?: string;
  type: Notification['type'];
  users?: NotificationUser[];
  notification?: Notification;
  sats?: number;
}

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  NEW_USER_FOLLOWED_YOU: UserPlus,
  USER_UNFOLLOWED_YOU: UserMinus,
  YOUR_POST_WAS_ZAPPED: Zap,
  YOUR_POST_WAS_LIKED: Heart,
  YOUR_POST_WAS_REPOSTED: Repeat,
  YOUR_POST_WAS_REPLIED_TO: MessageCircle,
  YOU_WERE_MENTIONED_IN_POST: AtSign,
  YOUR_POST_WAS_MENTIONED_IN_POST: AtSign,
  POST_YOU_WERE_MENTIONED_IN_WAS_ZAPPED: Zap,
  POST_YOU_WERE_MENTIONED_IN_WAS_LIKED: Heart,
  POST_YOU_WERE_MENTIONED_IN_WAS_REPOSTED: Repeat,
  POST_YOU_WERE_MENTIONED_IN_WAS_REPLIED_TO: MessageCircle,
  POST_YOUR_POST_WAS_MENTIONED_IN_WAS_ZAPPED: Zap,
  POST_YOUR_POST_WAS_MENTIONED_IN_WAS_LIKED: Heart,
  POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPOSTED: Repeat,
  POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPLIED_TO: MessageCircle,
  YOUR_POST_WAS_HIGHLIGHTED: Bell,
  YOUR_POST_WAS_BOOKMARKED: Bell,
  YOUR_POST_HAD_REACTION: Heart,
};

const uniqueifyUsers = (users: NotificationUser[]) => {
  return users.reduce<NotificationUser[]>((acc, u) => {
    const found = acc.find(a => a.id === u.id);
    return found ? acc : [...acc, u];
  }, []);
};

const avatarDisplayLimit = 6;

const NotificationItem: React.FC<NotificationItemProps> = (props) => {
  const sortedUsers = React.useMemo(() => {
    if (!props.users || props.users.length === 0) {
      return [];
    }

    const users = uniqueifyUsers(props.users);
    return users.sort((a, b) => b.followers_count - a.followers_count);
  }, [props.users]);

  const displayedUsers = React.useMemo(() => {
    return sortedUsers.slice(0, avatarDisplayLimit);
  }, [sortedUsers]);

  const numberOfUsers = React.useMemo(() => sortedUsers.length, [sortedUsers]);

  const remainingUsers = React.useMemo(() => {
    return numberOfUsers - displayedUsers.length;
  }, [numberOfUsers, displayedUsers.length]);

  const firstUser = displayedUsers[0];
  const { data: firstUserData } = useAuthor(firstUser?.id || '');

  const firstUserName = firstUserData?.metadata?.name || firstUser?.name || firstUser?.id?.slice(0, 8) || 'Unknown';

  const TypeIcon = typeIcons[props.type] || Bell;

  const getTypeDescription = () => {
    switch (props.type) {
      case 'NEW_USER_FOLLOWED_YOU':
        return numberOfUsers > 1 ? 'and others followed you' : 'followed you';
      case 'YOUR_POST_WAS_LIKED':
        return numberOfUsers > 1 ? 'and others liked your post' : 'liked your post';
      case 'YOUR_POST_WAS_ZAPPED':
        return numberOfUsers > 1 ? 'and others zapped your post' : 'zapped your post';
      case 'YOUR_POST_WAS_REPOSTED':
        return numberOfUsers > 1 ? 'and others reposted your post' : 'reposted your post';
      case 'YOUR_POST_WAS_REPLIED_TO':
        return numberOfUsers > 1 ? 'and others replied to your post' : 'replied to your post';
      case 'YOU_WERE_MENTIONED_IN_POST':
        return numberOfUsers > 1 ? 'and others mentioned you in a post' : 'mentioned you in a post';
      default:
        return props.notification?.message || 'interacted with your content';
    }
  };

  const time = () => {
    if (!props.notification?.createdAt) return '';
    return formatRelativeTime(props.notification.createdAt);
  };

  return (
    <div className="grid grid-cols-[44px_1fr_12px] py-3 px-0">
      {/* Icon/Avatar Column */}
      <div className="flex flex-col items-center justify-start py-1.5">
        <div className="w-6 h-6 flex items-center justify-center text-orange-400">
          <TypeIcon className="w-4 h-4" />
        </div>
        {props.sats && (
          <div className="text-orange-400 text-sm font-bold mt-1.5">
            {props.sats}
          </div>
        )}
      </div>

      {/* Content Column */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 min-h-9 flex-wrap w-4/5">
          {/* User Avatars */}
          <div className="flex gap-0.5">
            {displayedUsers.map((user) => (
              <UserAvatar key={user.id} user={user} />
            ))}
            {remainingUsers > 0 && (
              <NotificationAvatar number={remainingUsers} size="xs" />
            )}
          </div>

          {/* Description */}
          <div className="flex items-baseline">
            <div className="flex items-center font-bold text-base text-foreground">
              <span className="max-w-48 truncate">
                {firstUserName}
              </span>
            </div>
            <div className="font-normal text-base text-foreground ml-1">
              {getTypeDescription()}
            </div>
          </div>
        </div>

        {/* Reference/Preview */}
        {props.notification?.eventId && (
          <div className="font-normal text-base text-muted-foreground mt-1">
            Referenced post content would go here...
          </div>
        )}
      </div>

      {/* Time/Status Column */}
      <div className="flex flex-col items-end justify-start">
        {!props.notification?.read && (
          <div className="w-2.5 h-2.5 bg-primary rounded-full border border-background"></div>
        )}
        <div className="text-muted-foreground text-sm text-right mt-1">
          {time()}
        </div>
      </div>
    </div>
  );
};

// Helper component for user avatars
const UserAvatar: React.FC<{ user: NotificationUser }> = ({ user }) => {
  const { data: userData } = useAuthor(user.id);

  return (
    <Avatar className="w-9 h-9">
      <AvatarImage src={userData?.metadata?.picture || user.picture} />
      <AvatarFallback>
        {(userData?.metadata?.name || user.name || user.id)?.charAt(0) || '?'}
      </AvatarFallback>
    </Avatar>
  );
};

export default NotificationItem;
