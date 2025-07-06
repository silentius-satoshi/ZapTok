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
      <div className="min-h-screen bg-black text-white">
        {/* Top Navigation */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-gray-800">
          <div className="flex items-center justify-between px-4 py-3">
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
            <LoginArea className="max-w-48" />
          </div>
        </header>

        {/* Main Content */}
        <main className="pt-16">
          <div className="flex">
            {/* Left Sidebar - Navigation */}
            <Navigation />
            
            {/* Video Feed */}
            <div className="flex-1 max-w-2xl mx-auto">
              <VideoFeed />
            </div>
            
            {/* Right Sidebar - Could be used for trending, etc. */}
            <div className="hidden lg:block w-80 p-4">
              <div className="sticky top-20">
                <h2 className="text-lg font-semibold mb-4">Trending</h2>
                <div className="space-y-2">
                  <div className="text-sm text-gray-400">
                    #nostr #decentralized #video
                  </div>
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
