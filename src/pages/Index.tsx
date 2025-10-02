import { useSeoMeta } from '@unhead/react';
import { FollowingVideoFeed } from '@/components/FollowingVideoFeed';
import { TimelineFollowingVideoFeed } from '@/components/TimelineFollowingVideoFeed';
import { Navigation } from '@/components/Navigation';
import { LoginArea } from '@/components/auth/LoginArea';
import { LogoHeader } from '@/components/LogoHeader';
import { MobileNavigation } from '@/components/MobileNavigation';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useFeedRefresh } from '@/contexts/FeedRefreshContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Button } from '@/components/ui/button';
import { VideoInteractionPrompt } from '@/components/auth/LoginPrompt';
import { VideoCacheDebug } from '@/components/VideoCacheDebug';
import { useState } from 'react';

const Index = () => {
  const isMobile = useIsMobile();
  const { followingFeedRef } = useFeedRefresh();
  const { user, isAuthenticated } = useCurrentUser();
  const [useTimelineFeed, setUseTimelineFeed] = useState(true); // Default to timeline feed

  useSeoMeta({
    title: 'ZapTok - Homepage',
    description: 'Watch videos from creators you follow on the decentralized Nostr network.',
  });

  return (
      <div className="min-h-screen bg-black text-white overflow-hidden">
        {/* Mobile Navigation */}
        {isMobile && <MobileNavigation />}

        {/* Main Content */}
        <main className={`h-screen overflow-hidden ${isMobile ? '' : ''}`}>
          <div className="flex h-full">
            {/* Desktop Left Sidebar - Logo and Navigation */}
            <div className="hidden md:flex flex-col bg-black">
              {/* Logo at top of sidebar */}
              <LogoHeader />

              {/* Navigation */}
              <div className="flex-1">
                <Navigation />
              </div>
            </div>

            {/* Following Video Feed */}
            <div className={`flex-1 flex items-center justify-center overflow-hidden ${isMobile ? '' : 'pr-8'} relative`}>
              <div className={`w-full h-full flex items-center justify-center ${isMobile ? '' : 'max-w-3xl'}`}>
                {isAuthenticated ? (
                  useTimelineFeed ? (
                    <TimelineFollowingVideoFeed ref={followingFeedRef} />
                  ) : (
                    <FollowingVideoFeed ref={followingFeedRef} />
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center h-full space-y-6 p-8">
                    <div className="text-center space-y-4">
                      <h2 className="text-2xl font-bold text-white">Your Following Feed</h2>
                      <p className="text-gray-400 max-w-md">
                        Connect your Nostr identity to see videos from creators you follow
                      </p>
                    </div>
                    <VideoInteractionPrompt onLoginClick={() => {}} />
                  </div>
                )}
              </div>

              {/* Debug Controls - Bottom Right */}
              {!isMobile && (
                <div className="absolute bottom-4 right-4 z-50 flex flex-col space-y-2">
                  {/* Feed Toggle */}
                  <Button
                    onClick={() => setUseTimelineFeed(!useTimelineFeed)}
                    variant="outline"
                    size="sm"
                    className="bg-black/80 text-white border-gray-600 hover:bg-gray-800"
                  >
                    {useTimelineFeed ? 'Timeline Feed (NEW)' : 'React Query Feed (OLD)'}
                  </Button>
                  
                  {/* Cache Debug */}
                  <VideoCacheDebug />
                </div>
              )}
            </div>

            {/* Desktop Right Sidebar - Compact Login Area */}
            <div className="hidden lg:block w-80 overflow-hidden">
              <div className="sticky top-4 space-y-6">
                {/* Login Area */}
                <div className="p-3 overflow-hidden">
                  <LoginArea className="justify-end" />
                </div>
              </div>
            </div>
          </div>
        </main>

      </div>
  );
};

export default Index;
