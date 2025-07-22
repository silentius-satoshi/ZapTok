import { useSeoMeta } from '@unhead/react';
import { VideoFeed } from '@/components/VideoFeed';
import { Navigation } from '@/components/Navigation';
import { LoginArea } from '@/components/auth/LoginArea';
import { AuthGate } from '@/components/AuthGate';

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
              <div className="p-4">
                <div className="flex items-center space-x-3">
                  <img 
                    src="/images/ZapTok-v2.png" 
                    alt="ZapTok Logo" 
                    className="w-8 h-8 rounded-lg"
                  />
                  <h1 className="text-xl font-bold bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">
                    ZapTok
                  </h1>
                </div>
              </div>
              
              {/* Navigation */}
              <div className="flex-1">
                <Navigation />
              </div>
            </div>
            
            {/* Video Feed */}
            <div className="flex-1 flex items-center justify-center overflow-hidden">
              <VideoFeed />
            </div>
            
            {/* Right Sidebar - Login Area */}
            <div className="hidden lg:block w-[28rem] p-4 overflow-hidden">
              <div className="sticky top-4 space-y-6">
                {/* Login Area */}
                <div className="p-4 overflow-hidden">
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

export default Index;
