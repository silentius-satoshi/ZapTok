import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createHead, UnheadProvider } from '@unhead/react/client';
import { InferSeoMetaPlugin } from '@unhead/addons';
import { Suspense, useEffect } from 'react';
import NostrProvider from '@/components/NostrProvider';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NostrLoginProvider } from '@nostrify/react/login';
import { AppProvider } from '@/components/AppProvider';
import { AuthFilter } from '@/components/auth/AuthFilter';
import { WalletProvider } from '@/contexts/WalletContext';
import { UnifiedWalletProvider } from '@/contexts/UnifiedWalletContext';
import { VideoPlaybackProvider } from '@/contexts/VideoPlaybackContext';
import { CachingProvider } from '@/components/CachingProvider';
import { AppConfig } from '@/contexts/AppContext';
import { defaultZap, defaultZapOptions } from '@/types/zap';
import { ZapTokLogo } from '@/components/ZapTokLogo';
import { WalletLoader } from '@/components/WalletLoader';
import { useTransactionHistoryMonitor } from '@/hooks/useTransactionHistoryMonitor';
import { PWAUpdateNotification } from '@/components/PWAUpdateNotification';
import AppRouter from './AppRouter';

const head = createHead({
  plugins: [
    InferSeoMetaPlugin(),
  ],
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const defaultConfig: AppConfig = {
  theme: "dark", // Changed to dark theme for ZapTok
  relayUrls: [
    // Start with Chorus relay first for better Cashu transaction discovery
    "wss://relay.chorus.community",
    "wss://relay.nostr.band",
    "wss://ditto.pub/relay",
    "wss://relay.damus.io",
    "wss://relay.primal.net"
  ],
  relayContext: 'all', // Start with all relays, will be optimized automatically
  defaultZap,
  availableZapOptions: defaultZapOptions,
};

const presetRelays = [
  { url: 'wss://relay.chorus.community', name: 'Chorus' },
  { url: 'wss://ditto.pub/relay', name: 'Ditto' },
  { url: 'wss://relay.nostr.band', name: 'Nostr.Band' },
  { url: 'wss://relay.damus.io', name: 'Damus' },
  { url: 'wss://relay.primal.net', name: 'Primal' },
];

function AppContent() {
  // Set dark theme on app load
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  // Monitor transaction history for potential issues
  useTransactionHistoryMonitor();

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <ZapTokLogo size={48} className="mb-4 mx-auto" />
          <div className="text-white text-lg font-medium">Loading ZapTok...</div>
        </div>
      </div>
    }>
      {/* PWA Update Notification - shows at top when update is available */}
      <PWAUpdateNotification variant="banner" />
      
      {/* Main App Router */}
      <AppRouter />
    </Suspense>
  );
}

export function App() {
  return (
    <UnheadProvider head={head}>
      <AppProvider storageKey="nostr:app-config" defaultConfig={defaultConfig} presetRelays={presetRelays}>
        <QueryClientProvider client={queryClient}>
          <NostrLoginProvider storageKey='nostr:login'>
            <AuthFilter>
              <NostrProvider>
                <CachingProvider>
                  <WalletProvider>
                    <UnifiedWalletProvider>
                      <VideoPlaybackProvider>
                        <TooltipProvider>
                          <WalletLoader />
                          <Toaster />
                          <Sonner />
                          <AppContent />
                        </TooltipProvider>
                      </VideoPlaybackProvider>
                    </UnifiedWalletProvider>
                  </WalletProvider>
                </CachingProvider>
              </NostrProvider>
            </AuthFilter>
          </NostrLoginProvider>
        </QueryClientProvider>
      </AppProvider>
    </UnheadProvider>
  );
}

export default App;
