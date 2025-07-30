import { useSeoMeta } from '@unhead/react';
import { GlobalVideoFeed } from '@/components/GlobalVideoFeed';
import { Navigation } from '@/components/Navigation';
import { LoginArea } from '@/components/auth/LoginArea';
import { AuthGate } from '@/components/AuthGate';
import { LogoHeader } from '@/components/LogoHeader';

const Global = () => {
  useSeoMeta({
    title: 'Global Feed - ZapTok',
    description: 'Discover videos from creators around the world on the decentralized Nostr network.',
  });

  return (
    <AuthGate>
      <div className="min-h-screen bg-black text-white">
        {/* Main Content */}
        <main className="h-screen">
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
            
            {/* Global Video Feed */}
            <div className="flex-1 flex items-center justify-center">
              <GlobalVideoFeed />
            </div>
            
            {/* Right Sidebar - Login Area */}
            <div className="hidden lg:block w-80 p-4">
              <div className="sticky top-4 space-y-6">
                {/* Login Area */}
                <div className="p-4">
                  <LoginArea className="w-full" />
                </div>
              </div>
            </div>
          </div>
        </main>
        
        {/* Bottom attribution */}
        <div className="fixed bottom-4 right-4 text-xs text-gray-500">
          <a 
            href="https://soapbox.pub/mkstack" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-gray-300 transition-colors"
          >
            Vibed with MKStack
          </a>
        </div>
      </div>
    </AuthGate>
  );
};

export default Global;
