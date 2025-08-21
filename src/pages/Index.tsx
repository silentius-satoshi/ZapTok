import { useSeoMeta } from '@unhead/react';
import { VideoFeed } from '@/components/VideoFeed';
import { Navigation } from '@/components/Navigation';
import { LoginArea } from '@/components/auth/LoginArea';
import { AuthGate } from '@/components/AuthGate';
import { LogoHeader } from '@/components/LogoHeader';

const Index = () => {
  useSeoMeta({
    title: 'ZapTok - Nostr Video Platform',
    description: 'Discover and share videos on the decentralized Nostr network.',
  });

  return (
    <AuthGate>
      <div className="min-h-screen bg-black text-white overflow-hidden">
        {/* Main Content */}
        <main className="h-screen overflow-hidden">
          <div className="flex h-full">
            {/* Left Sidebar - Logo and Navigation */}
            <div className="flex flex-col bg-black">
              {/* Logo at top of sidebar */}
              <LogoHeader />

              {/* Navigation */}
              <div className="flex-1">
                <Navigation />
              </div>
            </div>

            {/* Video Feed */}
            <div className="flex-1 flex items-center justify-center overflow-hidden pr-8">
              <div className="w-full max-w-3xl h-full flex items-center justify-center">
                <VideoFeed />
              </div>
            </div>

            {/* Right Sidebar - Compact Login Area */}
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

        {/* Bottom attribution */}
        <div className="fixed bottom-4 right-4 text-sm text-gray-300">
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
    </AuthGate>
  );
};

export default Index;
