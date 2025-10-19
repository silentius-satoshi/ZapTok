import { useState, useEffect } from 'react';
import { ArrowLeft, Check, CheckCircle2, Copy, ExternalLink, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/useIsMobile';
import { AuthGate } from '@/components/AuthGate';
import { LogoHeader } from '@/components/LogoHeader';
import { Navigation } from '@/components/Navigation';
import { RelayContextIndicator } from '@/components/RelayContextIndicator';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useAuthor } from '@/hooks/useAuthor';
import { connectNWC, WebLNProviders } from '@getalby/bitcoin-connect';
import { useWallet } from '@/hooks/useWallet';
import { useToast } from '@/hooks/useToast';
import { useSeoMeta } from '@unhead/react';

const RIZFUL_URL = 'https://rizful.com';
const RIZFUL_SIGNUP_URL = `${RIZFUL_URL}/create-account`;
const RIZFUL_GET_TOKEN_URL = `${RIZFUL_URL}/nostr_onboarding_auth_token/get_token`;
const RIZFUL_TOKEN_EXCHANGE_URL = `${RIZFUL_URL}/nostr_onboarding_auth_token/post_for_secrets`;

function isEmail(address: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address);
}

function openPopup(url: string, name: string, width = 520, height = 700) {
  const left = window.screen.width / 2 - width / 2;
  const top = window.screen.height / 2 - height / 2;
  window.open(
    url,
    name,
    `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
  );
}

export function RizfulPage() {
  useSeoMeta({
    title: 'Rizful Vault - ZapTok',
    description: 'Connect your Rizful Vault to send and receive Lightning payments.',
  });

  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useCurrentUser();
  const { mutateAsync: publishEvent } = useNostrPublish();
  const author = useAuthor(user?.pubkey ?? '');
  const { provider } = useWallet();
  const { toast } = useToast();

  const [token, setToken] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [copiedLightningAddress, setCopiedLightningAddress] = useState(false);
  const [lightningAddress, setLightningAddress] = useState('');

  useEffect(() => {
    if (provider instanceof WebLNProviders.NostrWebLNProvider) {
      const lud16 = provider.client.lud16;
      const domain = lud16?.split('@')[1];
      if (domain !== 'rizful.com') return;

      if (lud16) {
        setConnected(true);
        setLightningAddress(lud16);
      }
    }
  }, [provider]);

  const updateUserProfile = async (address: string) => {
    try {
      if (!user) return;

      const profileData = author.data?.metadata || {};
      
      if (address === profileData.lud16) {
        return;
      }

      const profileContent: Record<string, unknown> = { ...profileData };
      
      if (isEmail(address)) {
        profileContent.lud16 = address;
      } else if (address.startsWith('lnurl')) {
        profileContent.lud06 = address;
      } else {
        throw new Error('Invalid Lightning Address');
      }

      if (!profileContent.nip05) {
        profileContent.nip05 = address;
      }

      await publishEvent({
        kind: 0,
        content: JSON.stringify(profileContent),
      });

      toast({
        title: 'Profile Updated',
        description: `Lightning address ${address} added to your profile.`,
      });
    } catch (e: unknown) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : String(e),
        variant: 'destructive',
      });
    }
  };

  const connectRizful = async () => {
    if (!user) return;

    setConnecting(true);
    try {
      const r = await fetch(RIZFUL_TOKEN_EXCHANGE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        body: JSON.stringify({
          secret_code: token.trim(),
          nostr_public_key: user.pubkey,
        }),
      });

      if (!r.ok) {
        const errorText = await r.text();
        throw new Error(errorText || 'Exchange failed');
      }

      const j = (await r.json()) as {
        nwc_uri?: string;
        lightning_address?: string;
      };

      if (j.nwc_uri) {
        connectNWC(j.nwc_uri);
        toast({
          title: 'Success!',
          description: 'Rizful Vault connected successfully. You can now send and receive Lightning payments.',
        });
      }
      if (j.lightning_address) {
        updateUserProfile(j.lightning_address);
      }
    } catch (e: unknown) {
      toast({
        title: 'Connection Error',
        description: e instanceof Error ? e.message : String(e),
        variant: 'destructive',
      });
    } finally {
      setConnecting(false);
    }
  };

  if (connected) {
    return (
      <AuthGate>
        <div className={`min-h-screen bg-black text-white ${isMobile ? 'overflow-x-hidden' : ''}`}>
          <main className="h-screen">
            <div className="flex h-full">
              {/* Left Sidebar - Logo and Navigation - Hidden on Mobile */}
              {!isMobile && (
                <div className="flex flex-col bg-black">
                  <LogoHeader />
                  <div className="flex-1">
                    <Navigation />
                  </div>
                </div>
              )}

              {/* Main Content - Full Width on Mobile */}
              <div className={`flex-1 overflow-y-auto scrollbar-hide ${isMobile ? 'min-w-0 overflow-x-hidden' : ''}`}>
                <div className={`max-w-7xl mx-auto ${isMobile ? 'p-4' : 'p-6'}`}>
                  <div className="mb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Back Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate('/bitcoin-connect-wallet')}
                          className="text-gray-400 hover:text-white hover:bg-gray-800"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          {!isMobile && <span className="ml-2">Back</span>}
                        </Button>

                        <div>
                          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-white`}>Rizful Vault</h1>
                        </div>
                      </div>
                      {!isMobile && <RelayContextIndicator className="text-right" />}
                    </div>
                  </div>

                  {/* Success State */}
                  <div className="max-w-2xl mx-auto">
                    <div className="p-8 bg-gray-900 border border-gray-700 rounded-lg text-center">
                      <div className="flex flex-col items-center space-y-6">
                        <CheckCircle2 className="w-32 h-32 text-green-400" />
                        <div className="font-semibold text-2xl text-white">Rizful Vault connected!</div>
                        <div className="text-center text-sm text-gray-400">
                          You can now use your Rizful Vault to zap your favorite notes and creators.
                        </div>
                        {lightningAddress && (
                          <div className="flex flex-col items-center gap-2">
                            <div className="text-gray-400">Your Lightning Address:</div>
                            <div
                              className="font-semibold text-lg rounded-lg px-4 py-2 flex justify-center items-center gap-2 cursor-pointer hover:bg-gray-800 border border-gray-700"
                              onClick={() => {
                                navigator.clipboard.writeText(lightningAddress);
                                setCopiedLightningAddress(true);
                                setTimeout(() => setCopiedLightningAddress(false), 2000);
                              }}
                            >
                              {lightningAddress}{' '}
                              {copiedLightningAddress ? (
                                <Check className="w-4 h-4" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </AuthGate>
    );
  }

  return (
    <AuthGate>
      <div className={`min-h-screen bg-black text-white ${isMobile ? 'overflow-x-hidden' : ''}`}>
        <main className="h-screen">
          <div className="flex h-full">
            {/* Left Sidebar - Logo and Navigation - Hidden on Mobile */}
            {!isMobile && (
              <div className="flex flex-col bg-black">
                <LogoHeader />
                <div className="flex-1">
                  <Navigation />
                </div>
              </div>
            )}

            {/* Main Content - Full Width on Mobile */}
            <div className={`flex-1 overflow-y-auto scrollbar-hide ${isMobile ? 'min-w-0 overflow-x-hidden' : ''}`}>
              <div className={`max-w-7xl mx-auto ${isMobile ? 'p-4' : 'p-6'}`}>
                <div className="mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Back Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/bitcoin-connect-wallet')}
                        className="text-gray-400 hover:text-white hover:bg-gray-800"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        {!isMobile && <span className="ml-2">Back</span>}
                      </Button>

                      <div>
                        <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-white`}>Rizful Vault</h1>
                        <p className={`text-gray-400 mt-2 ${isMobile ? 'text-sm' : ''}`}>
                          Connect your Rizful Vault in 3 easy steps
                        </p>
                      </div>
                    </div>
                    {!isMobile && <RelayContextIndicator className="text-right" />}
                  </div>
                </div>

                {/* 3-Step Wizard */}
                <div className="max-w-2xl mx-auto">
                  <div className="p-8 bg-gray-900 border border-gray-700 rounded-lg space-y-6">
                    {/* Step 1: Sign Up */}
                    <div className="space-y-2">
                      <div className="font-semibold text-white">1. New to Rizful?</div>
                      <Button
                        className="bg-lime-500 hover:bg-lime-600 text-black font-medium w-64"
                        onClick={() => window.open(RIZFUL_SIGNUP_URL, '_blank')}
                      >
                        Sign up for Rizful <ExternalLink className="ml-2 h-4 w-4" />
                      </Button>
                      <div className="text-sm text-gray-400">
                        If you already have a Rizful account, you can skip this step.
                      </div>
                    </div>

                    {/* Step 2: Get Code */}
                    <div className="space-y-2">
                      <div className="font-semibold text-white">2. Get your one-time code</div>
                      <Button
                        className="bg-orange-500 hover:bg-orange-600 text-white font-medium w-64"
                        onClick={() => openPopup(RIZFUL_GET_TOKEN_URL, 'rizful_codes')}
                      >
                        Get code <ExternalLink className="ml-2 h-4 w-4" />
                      </Button>
                    </div>

                    {/* Step 3: Connect */}
                    <div className="space-y-2">
                      <div className="font-semibold text-white">3. Connect to your Rizful Vault</div>
                      <Input
                        placeholder="Paste your one-time code here"
                        value={token}
                        onChange={(e) => {
                          setToken(e.target.value.trim());
                        }}
                        className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                      />
                      <Button
                        className="bg-sky-500 hover:bg-sky-600 text-white font-medium w-64"
                        disabled={!token || connecting}
                        onClick={() => connectRizful()}
                      >
                        {connecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Connect
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </AuthGate>
  );
}

export default RizfulPage;
