import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createHead, UnheadProvider } from '@unhead/react/client';
import { InferSeoMetaPlugin } from '@unhead/addons';
import { Suspense, useEffect } from 'react';
import { NostrLoginProvider } from '@nostrify/react/login';
import { AppProvider } from '@/components/AppProvider';
import { AuthFilter } from '@/components/auth/AuthFilter';
import { ZapProvider } from '@/contexts/ZapProvider';
import { CurrentVideoProvider } from '@/contexts/CurrentVideoContext';
import { FeedRefreshProvider } from '@/contexts/FeedRefreshContext';
import { AppConfig } from '@/contexts/AppContext';
import { defaultZap, defaultZapOptions } from '@/types/zap';
import { DEFAULT_BLOSSOM_SERVERS } from '@/lib/blossomUtils';
import { ZapTokLogo } from '@/components/ZapTokLogo';
import AppRouter from './AppRouter';

const head = createHead({
  plugins: [
    InferSeoMetaPlugin(),
  ],
});

// Create QueryClient instance outside of component to prevent recreation
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
  blossomServers: DEFAULT_BLOSSOM_SERVERS,
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

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <ZapTokLogo size={48} className="mb-4 mx-auto" />
          <div className="text-white text-lg font-medium">Loading ZapTok...</div>
        </div>
      </div>
    }>
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
            <ZapProvider>
              <CurrentVideoProvider>
                <FeedRefreshProvider>
                  <AuthFilter>
                    <AppContent />
                  </AuthFilter>
                </FeedRefreshProvider>
              </CurrentVideoProvider>
            </ZapProvider>
          </NostrLoginProvider>
        </QueryClientProvider>
      </AppProvider>
    </UnheadProvider>
  );
}

export default App;
