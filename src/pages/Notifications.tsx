import React, { useState, useMemo } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  CheckCheck,
  Trash2,
  Settings,
  ArrowLeft
} from 'lucide-react';
import NotificationItem from '@/components/NotificationItem';
import { Navigation } from '@/components/Navigation';
import { LogoHeader } from '@/components/LogoHeader';

export default function Notifications() {
  const { user } = useCurrentUser();
  const { data: notifications = [], isLoading, refetch } = useNotifications();
  const [selectedTab, setSelectedTab] = useState('all');
  const navigate = useNavigate();

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
          return notification.type.includes('MENTIONED');
        case 'zaps':
          return notification.type.includes('ZAPPED');
        case 'likes':
          return notification.type.includes('LIKED');
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
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  const handleBack = () => {
    navigate(-1); // Go back to previous page
  };

  const markAllAsRead = () => {
    // Implementation for marking all as read
    refetch();
  };

  const clearAllNotifications = () => {
    // Implementation for clearing all notifications
    refetch();
  };

  const handleSettingsClick = () => {
    navigate('/settings?section=notifications');
  };

  // Get notification counts by type
  const notificationCounts = useMemo(() => {
    const counts = {
      all: notifications.length,
      mentions: 0,
      zaps: 0,
      likes: 0,
      reposts: 0,
      follows: 0,
    };

    notifications.forEach(notification => {
      if (notification.type.includes('MENTIONED')) counts.mentions++;
      if (notification.type.includes('ZAPPED')) counts.zaps++;
      if (notification.type.includes('LIKED')) counts.likes++;
      if (notification.type.includes('REPOSTED')) counts.reposts++;
      if (notification.type.includes('FOLLOWED')) counts.follows++;
    });

    return counts;
  }, [notifications]);

  if (isLoading) {
    return (
      <div className="flex h-screen bg-black">
        {/* Left Navigation Column */}
        <div className="w-80 border-r border-gray-800 bg-black flex flex-col">
          <LogoHeader />
          <div className="flex-1">
            <Navigation />
          </div>
        </div>

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

        {/* Right Summary Column */}
        <div className="w-96 bg-black p-8">
          <Skeleton className="h-8 w-32 mb-6" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-black">
      {/* Left Navigation Column */}
      <div className="w-80 border-r border-gray-800 bg-black flex flex-col">
        <LogoHeader />
        <div className="flex-1">
          <Navigation />
        </div>
      </div>

      {/* Middle Notifications Column */}
      <div className="flex-1 border-r border-gray-800 bg-black">
        {/* Header */}
        <div className="px-6 py-5">
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
              <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
                notifications
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {unreadCount}
                  </Badge>
                )}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                className="text-gray-400 hover:text-white"
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Mark all read
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllNotifications}
                className="text-gray-400 hover:text-white"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear all
              </Button>
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
        <div className="overflow-y-auto scrollbar-hide" style={{ height: 'calc(100vh - 97px)' }}>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <div className="px-6 py-0 border-b border-gray-800">
              <div className="relative flex w-full bg-black">
                {/* Sliding underline */}
                <div 
                  className="absolute bottom-0 h-0.5 bg-gradient-to-r from-orange-500 to-purple-600 transition-all duration-300 ease-out"
                  style={{
                    width: '16.666%', // 1/6 of the width since we have 6 tabs
                    left: `${['all', 'zaps', 'likes', 'mentions', 'reposts', 'follows'].indexOf(selectedTab) * 16.666}%`,
                  }}
                />
                
                <button
                  onClick={() => setSelectedTab('all')}
                  className={`flex-1 px-4 py-4 text-sm font-medium transition-colors ${
                    selectedTab === 'all'
                      ? 'text-white'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  ALL
                </button>
                <button
                  onClick={() => setSelectedTab('zaps')}
                  className={`flex-1 px-4 py-4 text-sm font-medium transition-colors ${
                    selectedTab === 'zaps'
                      ? 'text-white'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  ZAPS
                </button>
                <button
                  onClick={() => setSelectedTab('likes')}
                  className={`flex-1 px-4 py-4 text-sm font-medium transition-colors ${
                    selectedTab === 'likes'
                      ? 'text-white'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  REPLIES
                </button>
                <button
                  onClick={() => setSelectedTab('mentions')}
                  className={`flex-1 px-4 py-4 text-sm font-medium transition-colors ${
                    selectedTab === 'mentions'
                      ? 'text-white'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  MENTIONS
                </button>
                <button
                  onClick={() => setSelectedTab('reposts')}
                  className={`flex-1 px-4 py-4 text-sm font-medium transition-colors ${
                    selectedTab === 'reposts'
                      ? 'text-white'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  REPOSTS
                </button>
                <button
                  onClick={() => setSelectedTab('follows')}
                  className={`flex-1 px-4 py-4 text-sm font-medium transition-colors ${
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
              <div className="px-6">
                {filteredNotifications.length === 0 ? (
                  <div className="py-16 text-center text-gray-400">
                    <p className="text-lg mb-2">No notifications to show</p>
                    <p className="text-sm text-gray-500">
                      {selectedTab === 'all' ? 'You have no notifications yet.' : `No ${selectedTab} notifications found.`}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-800">
                    {filteredNotifications.map((notification) => (
                      <div key={notification.id} className="py-4">
                        <NotificationItem
                          id={notification.id}
                          type={notification.type}
                          users={notification.users}
                          notification={notification}
                          sats={notification.sats}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right Summary Column */}
      <div className="w-96 bg-black p-8">
        <div className="space-y-8">
          {/* Summary Section */}
          <div>
            <h3 className="text-2xl font-semibold mb-6 text-white">SUMMARY</h3>
            <div className="space-y-3">
              {unreadCount === 0 ? (
                <p className="text-gray-400 text-lg">no new notifications</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-white text-lg">{unreadCount} new notification{unreadCount !== 1 ? 's' : ''}</p>
                  <div className="space-y-1 text-sm text-gray-400">
                    {notificationCounts.mentions > 0 && (
                      <p>{notificationCounts.mentions} mention{notificationCounts.mentions !== 1 ? 's' : ''}</p>
                    )}
                    {notificationCounts.zaps > 0 && (
                      <p>{notificationCounts.zaps} zap{notificationCounts.zaps !== 1 ? 's' : ''}</p>
                    )}
                    {notificationCounts.likes > 0 && (
                      <p>{notificationCounts.likes} like{notificationCounts.likes !== 1 ? 's' : ''}</p>
                    )}
                    {notificationCounts.reposts > 0 && (
                      <p>{notificationCounts.reposts} repost{notificationCounts.reposts !== 1 ? 's' : ''}</p>
                    )}
                    {notificationCounts.follows > 0 && (
                      <p>{notificationCounts.follows} follow{notificationCounts.follows !== 1 ? 's' : ''}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity Section */}
          <div>
            <h3 className="text-2xl font-semibold mb-6 text-white">Recent Activity</h3>
            <div className="space-y-4">
              {notifications.slice(0, 3).map((notification, index) => {
                const timeAgo = new Date(notification.createdAt * 1000).toLocaleDateString();
                const userName = notification.users?.[0]?.name || 'Unknown User';
                
                return (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-purple-500 mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-300 text-sm truncate">
                        {userName}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {timeAgo}
                      </p>
                    </div>
                  </div>
                );
              })}
              
              {notifications.length === 0 && (
                <p className="text-gray-500 text-sm">No recent activity</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}