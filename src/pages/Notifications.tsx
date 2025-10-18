import React, { useState, useMemo } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Navigate, useNavigate } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import {
  Settings,
  ArrowLeft,
  Zap,
  MessageCircle,
  Repeat,
  UserPlus,
  AtSign
} from 'lucide-react';
import NotificationItem from '@/components/NotificationItem';
import { Navigation } from '@/components/Navigation';
import { LogoHeader } from '@/components/LogoHeader';
import { useIsMobile } from '@/hooks/useIsMobile';
import { truncateNumber, truncateName, formatRelativeTime } from '@/lib/notificationUtils';

export default function Notifications() {
  const { user } = useCurrentUser();
  const { data: notifications = [], isLoading } = useNotifications();
  const [selectedTab, setSelectedTab] = useState('all');
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useSeoMeta({
    title: 'Notifications - ZapTok',
    description: 'View your latest notifications including zaps, comments, reposts, and follows on ZapTok.',
  });

  // Redirect to home if user is not logged in
  if (!user) {
    return <Navigate to="/" />;
  }

  // Filter notifications based on selected tab
  const filteredNotifications = useMemo(() => {
    if (selectedTab === 'all') return notifications;
    return notifications.filter(notification => {
      switch (selectedTab) {
        case 'mentions':
          return notification.type.includes('MENTIONED') || notification.type.includes('REPLIED_TO');
        case 'zaps':
          return notification.type.includes('ZAPPED');
        case 'reposts':
          return notification.type.includes('REPOSTED');
        case 'follows':
          return notification.type.includes('FOLLOWED');
        default:
          return true;
      }
    });
  }, [notifications, selectedTab]);

  const unreadCount = useMemo(() => {
    // Count notifications that are explicitly marked as unread (read: false or undefined)
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  const hasNewActivity = useMemo(() => {
    // Check if there are any notifications at all, regardless of read status
    return notifications.length > 0;
  }, [notifications]);

  // Get notifications from the last 24 hours
  const recentNotifications = useMemo(() => {
    const twentyFourHoursAgo = Math.floor(Date.now() / 1000) - (24 * 60 * 60);
    return notifications.filter(notification => notification.createdAt > twentyFourHoursAgo);
  }, [notifications]);

  const handleBack = () => {
    navigate('/'); // Go back to home page
  };

  const handleSettingsClick = () => {
    navigate('/settings?section=notifications');
  };

  // Get enhanced notification statistics
  const notificationStats = useMemo(() => {
    const stats = {
      // Basic counts
      all: notifications.length,
      mentions: 0,
      zaps: { count: 0, totalSats: 0 },
      reposts: 0,
      follows: { gained: 0, lost: 0 },
      replies: 0,

      // Secondary notifications (activity on posts you were mentioned in)
      mentionActivity: {
        zapped: 0,
        liked: 0,
        reposted: 0,
        replied: 0,
      },

      // Activity on posts your posts were mentioned in
      postMentionActivity: {
        zapped: 0,
        liked: 0,
        reposted: 0,
        replied: 0,
      }
    };

    notifications.forEach(notification => {
      // Direct mentions
      if (notification.type.includes('YOU_WERE_MENTIONED_IN_POST')) stats.mentions++;
      if (notification.type.includes('YOUR_POST_WAS_MENTIONED_IN_POST')) stats.mentions++;

      // Zaps
      if (notification.type.includes('YOUR_POST_WAS_ZAPPED')) {
        stats.zaps.count++;
        stats.zaps.totalSats += notification.sats || 0;
      }

      // Basic interactions
      if (notification.type.includes('YOUR_POST_WAS_REPOSTED')) stats.reposts++;
      if (notification.type.includes('YOUR_POST_WAS_REPLIED_TO')) stats.replies++;

      // Follows
      if (notification.type.includes('NEW_USER_FOLLOWED_YOU')) stats.follows.gained++;
      if (notification.type.includes('USER_UNFOLLOWED_YOU')) stats.follows.lost++;

      // Secondary activity - posts you were mentioned in
      if (notification.type.includes('POST_YOU_WERE_MENTIONED_IN_WAS_ZAPPED')) stats.mentionActivity.zapped++;
      if (notification.type.includes('POST_YOU_WERE_MENTIONED_IN_WAS_LIKED')) stats.mentionActivity.liked++;
      if (notification.type.includes('POST_YOU_WERE_MENTIONED_IN_WAS_REPOSTED')) stats.mentionActivity.reposted++;
      if (notification.type.includes('POST_YOU_WERE_MENTIONED_IN_WAS_REPLIED_TO')) stats.mentionActivity.replied++;

      // Activity on posts your posts were mentioned in
      if (notification.type.includes('POST_YOUR_POST_WAS_MENTIONED_IN_WAS_ZAPPED')) stats.postMentionActivity.zapped++;
      if (notification.type.includes('POST_YOUR_POST_WAS_MENTIONED_IN_WAS_LIKED')) stats.postMentionActivity.liked++;
      if (notification.type.includes('POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPOSTED')) stats.postMentionActivity.reposted++;
      if (notification.type.includes('POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPLIED_TO')) stats.postMentionActivity.replied++;
    });

    return stats;
  }, [notifications]);

  if (isLoading) {
    return (
      <div className="flex h-screen bg-black">
        {/* Left Navigation Column - Hidden on Mobile */}
        {!isMobile && (
          <div className="w-80 border-r border-gray-800 bg-black flex flex-col">
            <LogoHeader />
            <div className="flex-1">
              <Navigation />
            </div>
          </div>
        )}

        {/* Middle Content Column */}
        <div className="flex-1 border-r border-gray-800 bg-black">
          <div className="px-6 py-5 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start space-x-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Summary Column - Hidden on Mobile */}
        {!isMobile && (
          <div className="w-96 bg-black p-8">
            <Skeleton className="h-8 w-32 mb-6" />
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex h-screen bg-black ${isMobile ? 'overflow-x-hidden' : ''}`}>
      {/* Left Navigation Column - Hidden on Mobile */}
      {!isMobile && (
        <div className="w-80 border-r border-gray-800 bg-black flex flex-col">
          <LogoHeader />
          <div className="flex-1">
            <Navigation />
          </div>
        </div>
      )}

      {/* Middle Notifications Column - Full Width on Mobile */}
      <div className={`flex-1 bg-black ${!isMobile ? 'border-r border-gray-800' : ''} ${isMobile ? 'overflow-x-hidden' : ''} min-w-0`}>
        {/* Header */}
        <div className={`py-5 ${isMobile ? 'px-4' : 'px-6'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="p-2 text-gray-400 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <button
                onClick={handleBack}
                className="text-2xl font-semibold text-gray-400 hover:text-white hover:underline transition-colors cursor-pointer"
              >
                notifications
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSettingsClick}
                className="text-gray-400 hover:text-white"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto overflow-x-hidden scrollbar-hide" style={{ height: 'calc(100vh - 97px)' }}>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <div className={`py-0 border-b border-gray-800 ${isMobile ? 'px-0' : 'px-6'}`}>
              <div className="relative flex w-full bg-black">
                {/* Sliding underline */}
                <div
                  className="absolute bottom-0 h-0.5 bg-gradient-to-r from-orange-500 to-purple-600 transition-all duration-300 ease-out"
                  style={{
                    width: '20%', // 1/5 of the width since we have 5 tabs
                    left: `${['all', 'zaps', 'mentions', 'reposts', 'follows'].indexOf(selectedTab) * 20}%`,
                  }}
                />

                <button
                  onClick={() => setSelectedTab('all')}
                  className={`flex-1 ${isMobile ? 'px-2 py-4 text-xs' : 'px-4 py-4 text-sm'} font-medium transition-colors ${
                    selectedTab === 'all'
                      ? 'text-white'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  ALL
                </button>
                <button
                  onClick={() => setSelectedTab('zaps')}
                  className={`flex-1 ${isMobile ? 'px-2 py-4 text-xs' : 'px-4 py-4 text-sm'} font-medium transition-colors ${
                    selectedTab === 'zaps'
                      ? 'text-white'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  ZAPS
                </button>
                <button
                  onClick={() => setSelectedTab('mentions')}
                  className={`flex-1 ${isMobile ? 'px-2 py-4 text-xs' : 'px-4 py-4 text-sm'} font-medium transition-colors ${
                    selectedTab === 'mentions'
                      ? 'text-white'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  MENTIONS
                </button>
                <button
                  onClick={() => setSelectedTab('reposts')}
                  className={`flex-1 ${isMobile ? 'px-2 py-4 text-xs' : 'px-4 py-4 text-sm'} font-medium transition-colors ${
                    selectedTab === 'reposts'
                      ? 'text-white'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  REPOSTS
                </button>
                <button
                  onClick={() => setSelectedTab('follows')}
                  className={`flex-1 ${isMobile ? 'px-2 py-4 text-xs' : 'px-4 py-4 text-sm'} font-medium transition-colors ${
                    selectedTab === 'follows'
                      ? 'text-white'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  FOLLOWS
                </button>
              </div>
            </div>

            <TabsContent value={selectedTab} className="m-0">
              <div className={`${isMobile ? 'px-4' : 'px-6'}`}>
                {filteredNotifications.length === 0 ? (
                  <div className="py-16 text-center text-gray-400">
                    <p className="text-lg mb-2">No notifications to show</p>
                    <p className="text-sm text-gray-500">
                      {selectedTab === 'all' ? 'You have no notifications yet.' : `No ${selectedTab} notifications found.`}
                    </p>
                  </div>
                ) : (
                  <div className="border-t border-gray-800">
                    {filteredNotifications.map((notification, index) => (
                      <div key={notification.id}>
                        <NotificationItem
                          id={notification.id}
                          type={notification.type}
                          users={notification.users}
                          notification={notification}
                          sats={notification.sats}
                        />
                        {index < filteredNotifications.length - 1 && (
                          <div className="border-b border-gray-800" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right Summary Column - Hidden on Mobile */}
      {!isMobile && (
        <div className="w-96 bg-black p-8">
          <div className="space-y-8">
            {/* Summary Section */}
            <div>
              <h3 className="text-2xl font-semibold mb-6 text-white">SUMMARY</h3>
              <div className="space-y-3">
                <p className="text-white text-lg">{notifications.length} total notification{notifications.length !== 1 ? 's' : ''}</p>
              </div>
            </div>

            {/* Activity Categories */}
            <div className="space-y-6">
              {notificationStats.zaps.count > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-yellow-400" />
                    <span className="text-gray-300">{truncateNumber(notificationStats.zaps.count)} zap{notificationStats.zaps.count !== 1 ? 's' : ''}</span>
                  </div>
                  {notificationStats.zaps.totalSats > 0 && (
                    <span className="text-orange-400 text-sm">⚡{truncateNumber(notificationStats.zaps.totalSats)}</span>
                  )}
                </div>
              )}

              {notificationStats.mentions > 0 && (
                <div className="flex items-center gap-3">
                  <AtSign className="w-5 h-5 text-cyan-400" />
                  <span className="text-gray-300">{truncateNumber(notificationStats.mentions)} mention{notificationStats.mentions !== 1 ? 's' : ''}</span>
                </div>
              )}

              {notificationStats.reposts > 0 && (
                <div className="flex items-center gap-3">
                  <Repeat className="w-5 h-5 text-green-400" />
                  <span className="text-gray-300">{truncateNumber(notificationStats.reposts)} repost{notificationStats.reposts !== 1 ? 's' : ''}</span>
                </div>
              )}

              {(notificationStats.follows.gained + notificationStats.follows.lost) > 0 && (
                <div className="flex items-center gap-3">
                  <UserPlus className="w-5 h-5 text-blue-400" />
                  <span className="text-gray-300">{truncateNumber(notificationStats.follows.gained + notificationStats.follows.lost)} follow{(notificationStats.follows.gained + notificationStats.follows.lost) !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>

            {/* Recent Activity Section - Last 24 Hours */}
            <div>
              <h3 className="text-2xl font-semibold mb-6 text-white">Recent Activity</h3>
              <div className="space-y-4">
                {recentNotifications.slice(0, 5).map((notification, index) => {
                  const timeAgo = formatRelativeTime(notification.createdAt);
                  const userName = notification.users?.[0]?.name || 'Unknown User';
                  const displayName = truncateName(userName, 15);

                  // Get icon based on notification type
                  const getNotificationIcon = () => {
                    if (notification.type.includes('ZAPPED')) return <Zap className="w-3 h-3 text-yellow-400" />;
                    if (notification.type.includes('REPOSTED')) return <Repeat className="w-3 h-3 text-green-400" />;
                    if (notification.type.includes('REPLIED')) return <MessageCircle className="w-3 h-3 text-blue-400" />;
                    if (notification.type.includes('FOLLOWED')) return <UserPlus className="w-3 h-3 text-blue-400" />;
                    if (notification.type.includes('MENTIONED')) return <AtSign className="w-3 h-3 text-cyan-400" />;
                    return <div className="w-3 h-3 rounded-full bg-purple-500" />;
                  };

                  return (
                    <div key={index} className="flex items-start gap-3">
                      <div className="mt-1 flex-shrink-0">
                        {getNotificationIcon()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-300 text-sm truncate">
                          {displayName}
                        </p>
                        <p className="text-gray-500 text-xs">
                          {timeAgo}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {recentNotifications.length === 0 && (
                  <p className="text-gray-500 text-sm">No activity in the last 24 hours</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}