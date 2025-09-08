import { useSeoMeta } from '@unhead/react';
import { FollowingVideoFeed } from '@/components/FollowingVideoFeed';
import { Navigation } from '@/components/Navigation';
import { LoginArea } from '@/components/auth/LoginArea';
import { AuthGate } from '@/components/AuthGate';
import { LogoHeader } from '@/components/LogoHeader';
import { MobileNavigation } from '@/components/MobileNavigation';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useFeedRefresh } from '@/contexts/FeedRefreshContext';

const Index = () => {
  const isMobile = useIsMobile();
  const { followingFeedRef } = useFeedRefresh();

  useSeoMeta({
    title: 'Zaptok - Homepage',
    description: 'Watch videos from creators you follow on the decentralized Nostr network.',
  });

  return (
    <AuthGate>
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
            <div className={`flex-1 flex items-center justify-center overflow-hidden ${isMobile ? '' : 'pr-8'}`}>
              <div className={`w-full h-full flex items-center justify-center ${isMobile ? '' : 'max-w-3xl'}`}>
                <FollowingVideoFeed ref={followingFeedRef} />
              </div>
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

        {/* Bottom attribution - hidden on mobile to avoid conflicts */}
        <div className="hidden md:flex fixed bottom-4 right-4 flex-col items-end space-y-2">
          <div className="text-sm text-gray-300">
            <a
              href="https://soapbox.pub/mkstack"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-100 transition-colors font-medium"
            >
              Vibed with MKStack
            </a>
          </div>
        </div>
      </div>
    </AuthGate>
  );
};

export default Index;
