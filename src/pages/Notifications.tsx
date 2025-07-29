import React, { useState, useMemo } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-6 w-16" />
            </div>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="flex items-center gap-2">
                Notifications
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {unreadCount}
                  </Badge>
                )}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Mark all read
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllNotifications}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear all
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleSettingsClick}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <div className="px-6 pb-4">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="mentions">Mentions</TabsTrigger>
                <TabsTrigger value="zaps">Zaps</TabsTrigger>
                <TabsTrigger value="likes">Likes</TabsTrigger>
                <TabsTrigger value="reposts">Reposts</TabsTrigger>
                <TabsTrigger value="follows">Follows</TabsTrigger>
              </TabsList>
            </div>

            <Separator />

            <TabsContent value={selectedTab} className="m-0">
              <ScrollArea className="h-[600px]">
                <div className="px-6">
                  {filteredNotifications.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      No notifications to show
                    </div>
                  ) : (
                    filteredNotifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        id={notification.id}
                        type={notification.type}
                        users={notification.users}
                        notification={notification}
                        sats={notification.sats}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}