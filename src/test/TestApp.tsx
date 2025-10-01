import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createHead, UnheadProvider } from '@unhead/react/client';
import { BrowserRouter } from 'react-router-dom';
import { NostrLoginProvider } from '@nostrify/react/login';
import NostrProvider from '@/components/NostrProvider';
import { AppProvider } from '@/components/AppProvider';
import { ZapProvider } from '@/contexts/ZapProvider';
import { WalletProvider } from '@/contexts/WalletContext';
import { AppConfig } from '@/contexts/AppContext';
import { defaultZap, defaultZapOptions } from '@/types/zap';
import { VideoPlaybackProvider } from '@/contexts/VideoPlaybackContext';
import { CurrentVideoProvider } from '@/contexts/CurrentVideoContext';

interface TestAppProps {
  children: React.ReactNode;
}

export function TestApp({ children }: TestAppProps) {
  const head = createHead();

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const defaultConfig: AppConfig = {
    theme: 'light',
    relayUrls: [
      'wss://relay.chorus.community',
      'wss://relay.nostr.band',
      'wss://pyramid.fiatjaf.com',
      'wss://relay.damus.io',
      'wss://relay.primal.net'
    ],
    defaultZap,
    availableZapOptions: defaultZapOptions,
    blossomServers: ['https://media.primal.net'],
  };

  return (
    <UnheadProvider head={head}>
      <AppProvider storageKey='test-app-config' defaultConfig={defaultConfig}>
        <QueryClientProvider client={queryClient}>
          <NostrLoginProvider storageKey='test-login'>
            <ZapProvider>
              <BrowserRouter>
                <NostrProvider>
                  <WalletProvider>
                    <VideoPlaybackProvider>
                      <CurrentVideoProvider>
                        {children}
                      </CurrentVideoProvider>
                    </VideoPlaybackProvider>
                  </WalletProvider>
                </NostrProvider>
              </BrowserRouter>
            </ZapProvider>
          </NostrLoginProvider>
        </QueryClientProvider>
      </AppProvider>
    </UnheadProvider>
  );
}

export default TestApp;