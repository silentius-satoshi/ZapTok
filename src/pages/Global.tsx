import { useSeoMeta } from '@unhead/react';
import { GlobalVideoFeed } from '@/components/GlobalVideoFeed';
import { Zap } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { LoginArea } from '@/components/auth/LoginArea';
import { LogoHeader } from '@/components/LogoHeader';
import { MobileNavigation } from '@/components/MobileNavigation';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useFeedRefresh } from '@/contexts/FeedRefreshContext';

const Global = () => {
  const isMobile = useIsMobile();
  const { globalFeedRef } = useFeedRefresh();

  useSeoMeta({
    title: 'Global Feed - ZapTok',
    description: 'Discover videos from creators around the world on the decentralized Nostr network.',
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

            {/* Global Video Feed */}
            <div className="flex-1 overflow-hidden">
              <GlobalVideoFeed ref={globalFeedRef} />
            </div>

            {/* Right Sidebar - Compact Login Area */}
            <div className="hidden lg:block w-96 overflow-visible relative">
              <div className="sticky top-4 space-y-6 overflow-visible">
                {/* Login Area */}
                <div className="p-3 overflow-visible relative">
                  <LoginArea className="justify-end max-w-full" />
                </div>
              </div>
            </div>
          </div>
        </main>

      </div>
  );
};

export default Global;
