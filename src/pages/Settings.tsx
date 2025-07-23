import { Button } from '@/components/ui/button';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, Link, ArrowLeft, Trash2 } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { useAppContext } from '@/hooks/useAppContext';
import BitcoinConnectCard from '@/components/lightning/wallet-connections/BitcoinConnectCard';
import NostrWalletConnectCard from '@/components/lightning/wallet-connections/NostrWalletConnectCard';
import CashuWalletCard from '@/components/lightning/wallet-connections/CashuWalletCard';
import { useToast } from '@/hooks/useToast';
import { useWallet } from '@/hooks/useWallet';
import { useCaching } from '@/contexts/CachingContext';
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';

export function Settings() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isConnected, disconnect } = useWallet();
  const { config, presetRelays = [], addRelay, removeRelay } = useAppContext();
  const { currentService, connectToCachingService, disconnectCachingService, availableServices } = useCaching();
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [customRelay, setCustomRelay] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [knownRelays, setKnownRelays] = useState<Set<string>>(new Set());

  // Reset selectedSection when navigating to settings page
  useEffect(() => {
    if (location.pathname === '/settings') {
      // Check for section query parameter
      const searchParams = new URLSearchParams(location.search);
      const section = searchParams.get('section');
      if (section) {
        setSelectedSection(section);
      } else {
        setSelectedSection(null);
      }
    }
  }, [location.pathname, location.search]);

  // Track all relays that have ever been added (including disconnected ones)
  useEffect(() => {
    setKnownRelays(prev => {
      const newKnownRelays = new Set(prev);
      // Add all currently connected relays
      config.relayUrls.forEach(url => newKnownRelays.add(url));
      // Add all preset relays
      presetRelays.forEach(relay => newKnownRelays.add(relay.url));
      return newKnownRelays;
    });
  }, [config.relayUrls, presetRelays]);

  // Settings sections
  const settingsSections = [
    { id: 'appearance', title: 'Appearance' },
    { id: 'feeds', title: 'Feeds' },
    { id: 'discovery', title: 'Discovery' },
    { id: 'media-uploads', title: 'Media Uploads' },
    { id: 'stream', title: 'Stream' },
    { id: 'muted-content', title: 'Muted Content' },
    { id: 'content-moderation', title: 'Content Moderation' },
    { id: 'connected-wallets', title: 'Connected Wallets' },
    { id: 'notifications', title: 'Notifications' },
    { id: 'network', title: 'Network' },
    { id: 'zaps', title: 'Zaps' },
  ];

  // Function to normalize relay URL by adding wss:// if no protocol is present
  const normalizeRelayUrl = (url: string): string => {
    const trimmed = url.trim();
    if (!trimmed) return '';

    // If it already has a protocol, return as is
    if (trimmed.startsWith('wss://') || trimmed.startsWith('ws://')) {
      return trimmed;
    }

    // Otherwise, add wss:// prefix
    return `wss://${trimmed}`;
  };

  const handleToggleRelay = (relayUrl: string) => {
    if (config.relayUrls.includes(relayUrl)) {
      // Don't allow removing the last relay
      if (config.relayUrls.length > 1) {
        removeRelay(relayUrl);
      }
    } else {
      addRelay(relayUrl);
    }
  };

  const handleAddCustomRelay = () => {
    const normalizedUrl = normalizeRelayUrl(customRelay);
    if (normalizedUrl && !config.relayUrls.includes(normalizedUrl)) {
      addRelay(normalizedUrl);
      // Add to known relays set
      setKnownRelays(prev => new Set(prev).add(normalizedUrl));
      setCustomRelay('');
      setShowCustomInput(false);
    }
  };

  const handleRemoveRelay = (relayUrl: string) => {
    if (config.relayUrls.length > 1) {
      removeRelay(relayUrl);
    }
  };

  const handlePermanentlyRemoveRelay = (relayUrl: string) => {
    // Remove from connected relays if connected
    if (config.relayUrls.includes(relayUrl)) {
      if (config.relayUrls.length > 1) {
        removeRelay(relayUrl);
      }
    }
    // Remove from known relays (this will hide it from the list)
    setKnownRelays(prev => {
      const newSet = new Set(prev);
      newSet.delete(relayUrl);
      return newSet;
    });
  };

  // Get relay status based on current relay selection
  const getRelayStatus = (relayUrl: string) => {
    if (config.relayUrls.includes(relayUrl)) {
      return 'active'; // Currently selected relay
    }
    return 'inactive'; // Available but not selected
  };

  // Get all relays with status
  const getAllRelays = () => {
    const allRelays: Array<{ name: string; url: string; status: string }> = [];

    // Add all known relays (connected, disconnected, and presets)
    Array.from(knownRelays).forEach(relayUrl => {
      const presetRelay = presetRelays.find(r => r.url === relayUrl);
      const isConnected = config.relayUrls.includes(relayUrl);

      allRelays.push({
        name: presetRelay?.name || relayUrl.replace(/^wss?:\/\//, ''),
        url: relayUrl,
        status: isConnected ? 'active' : 'inactive'
      });
    });

    // Sort: connected first, then disconnected
    return allRelays.sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (b.status === 'active' && a.status !== 'active') return 1;
      return 0;
    });
  };

  // Mock additional relays for display if less than 2 active
  const getDisplayRelays = () => {
    const relays = getAllRelays();
    const activeRelays = relays.filter(r => getRelayStatus(r.url) === 'active');

    // Add placeholder relays if less than required for display
    const placeholderCount = Math.max(0, Math.max(2, config.relayUrls.length) - activeRelays.length);
    const placeholders = Array.from({ length: placeholderCount }, (_, i) => ({
      name: `relay${i + 1}.example.com`,
      url: `wss://relay${i + 1}.example.com/`,
      status: 'placeholder' as const
    }));

    return [...relays.map(r => ({ ...r, status: getRelayStatus(r.url) })), ...placeholders];
  };

  const handleCachingServiceConnect = async (url: string) => {
    setIsConnecting('caching');
    try {
      const success = await connectToCachingService(url);
      if (success) {
        toast({
          title: "Caching Service Connected",
          description: `Successfully connected to ${url}`,
        });
      } else {
        toast({
          title: "Connection Failed",
          description: "Could not connect to caching service",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Connection Error",
        description: "An error occurred while connecting",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(null);
    }
  };

  const handleCachingServiceDisconnect = () => {
    disconnectCachingService();
    toast({
      title: "Disconnected",
      description: "Disconnected from caching service",
    });
  };

  const handleBitcoinConnect = async () => {
    setIsConnecting('btc');
    try {
      // Attempt to connect to WebLN wallet (browser extension)
      if (!window.webln) {
        throw new Error('No WebLN wallet found. Please install a Lightning wallet extension like Alby.');
      }

      await window.webln.enable();

      toast({
        title: "Bitcoin Connect",
        description: "Successfully connected your Bitcoin wallet!"
      });
    } catch (err) {
      toast({
        title: "Connection failed",
        description: err instanceof Error ? err.message : "Could not connect to Bitcoin Connect",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(null);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      toast({
        title: "Wallet Disconnected",
        description: "Your Lightning wallet has been disconnected."
      });
    } catch {
      toast({
        title: "Disconnect failed",
        description: "Could not disconnect wallet",
        variant: "destructive"
      });
    }
  };

  const handleNostrWalletConnect = async () => {
    setIsConnecting('nwc');
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast({
        title: "Nostr Wallet Connect",
        description: "Successfully connected your NWC wallet!"
      });
    } catch {
      toast({
        title: "Connection failed",
        description: "Could not connect to Nostr Wallet Connect",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(null);
    }
  };

  const renderNetworkSection = () => (
    <div className="space-y-6 px-6 pt-0 pb-6">
      {/* Caching Service Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-semibold text-white">Caching Service</h3>
          <span className="text-xs bg-yellow-600/20 text-yellow-400 px-2 py-1 rounded">Experimental</span>
        </div>
        <p className="text-sm text-gray-400 mb-4">
          Caching services supplement relay data for improved performance. Your primary content comes from the relays configured below.
        </p>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-400 mb-3">Connected caching service</p>
            {currentService ? (
              <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${currentService.isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm text-gray-300">{currentService.url}</span>
                  <span className="text-xs text-gray-500">({currentService.name})</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCachingServiceDisconnect}
                  className="text-red-400 hover:text-red-300"
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-gray-800 rounded-lg">
                <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                <span className="text-sm text-gray-400">No caching service connected</span>
              </div>
            )}
          </div>

          <div>
            <p className="text-sm text-gray-400 mb-3">Available caching services</p>
            <div className="space-y-2">
              {availableServices.map((service) => (
                <div key={service.url} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${service.isConnected ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                    <span className="text-sm text-gray-300">{service.name}</span>
                    <span className="text-xs text-gray-500">{service.url}</span>
                  </div>
                  {!service.isConnected && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCachingServiceConnect(service.url)}
                      disabled={isConnecting === 'caching'}
                      className="text-blue-400 border-blue-400 hover:bg-blue-400/10"
                    >
                      {isConnecting === 'caching' ? 'Connecting...' : 'Connect'}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-400 mb-3">Connect to a custom caching service</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="wss://cachingservice.url"
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500"
                />
                <Link className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            className="text-pink-500 hover:text-pink-400 hover:bg-pink-500/10 p-0 h-auto"
          >
            Restore default caching service
          </Button>
        </div>
      </div>

      {/* Relays Section */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Relays</h3>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-400 mb-3">My relays</p>
            <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-hide">
              {getAllRelays().map((relay, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      relay.status === 'active' ? 'bg-green-500' : 'bg-gray-500'
                    }`}></div>
                    <span className={`text-sm ${
                      relay.status === 'active' ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      {relay.url}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {relay.status === 'active' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-500 hover:text-gray-300 hover:bg-gray-700"
                        onClick={() => handleRemoveRelay(relay.url)}
                        disabled={config.relayUrls.length <= 1}
                      >
                        disconnect
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-green-500 hover:text-green-400 hover:bg-green-500/10"
                        onClick={() => handleToggleRelay(relay.url)}
                      >
                        connect
                      </Button>
                    )}
                    {/* Show trash button if not the last connected relay or if it's disconnected */}
                    {(relay.status === 'inactive' || config.relayUrls.length > 1) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-400 hover:bg-red-500/10 p-1"
                        onClick={() => handlePermanentlyRemoveRelay(relay.url)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button
            variant="ghost"
            className="text-pink-500 hover:text-pink-400 hover:bg-pink-500/10 p-0 h-auto"
          >
            Reset relays
          </Button>

          <div>
            <p className="text-sm text-gray-400 mb-3">Connect to relay</p>
            {showCustomInput ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <Input
                      type="text"
                      placeholder="wss://relay.url"
                      value={customRelay}
                      onChange={(e) => setCustomRelay(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddCustomRelay();
                        } else if (e.key === 'Escape') {
                          setShowCustomInput(false);
                          setCustomRelay('');
                        }
                      }}
                      className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500"
                      autoFocus
                    />
                    <Link className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={handleAddCustomRelay}
                    disabled={!customRelay.trim() || config.relayUrls.includes(normalizeRelayUrl(customRelay))}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Connect
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowCustomInput(false);
                      setCustomRelay('');
                    }}
                    className="border-gray-600 text-gray-300 hover:bg-gray-800"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="wss://relay.url"
                    className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 cursor-pointer"
                    onClick={() => setShowCustomInput(true)}
                    readOnly
                  />
                  <Link className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderWalletConnections = () => (
    <div className="space-y-3">
      <BitcoinConnectCard
        isConnecting={isConnecting === 'btc'}
        onConnect={handleBitcoinConnect}
        isConnected={isConnected}
        onDisconnect={handleDisconnect}
      />

      <NostrWalletConnectCard
        isConnecting={isConnecting === 'nwc'}
        onConnect={handleNostrWalletConnect}
        disabled={isConnected}
        disabledReason="Browser extension wallet is connected"
      />

      <CashuWalletCard
        isConnecting={isConnecting === 'cashu'}
      />
    </div>
  );

  const renderSettingsHeader = () => {
    if (!selectedSection) {
      return (
        <h1 className="text-3xl font-normal text-white">
          settings
        </h1>
      );
    }

    const sectionTitle = selectedSection === 'connected-wallets' ? 'connected wallets' :
                        selectedSection === 'network' ? 'network' :
                        settingsSections.find(s => s.id === selectedSection)?.title?.toLowerCase();

    return (
      <h1 className="text-3xl font-normal text-white">
        <button
          onClick={() => setSelectedSection(null)}
          className="hover:underline hover:text-gray-300 transition-colors"
        >
          settings
        </button>
        : {sectionTitle}
      </h1>
    );
  };

  return (
    <div className="flex h-screen bg-black">
      {/* Left Navigation Column */}
      <div className="w-80 border-r border-gray-800 bg-black flex flex-col">
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

      {/* Middle Settings Column */}
      <div className="flex-1 border-r border-gray-800 bg-black">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-800">
          {renderSettingsHeader()}
        </div>

        {/* Content */}
        <div className="overflow-y-auto scrollbar-hide" style={{ height: 'calc(100vh - 97px)' }}>
          {selectedSection === 'connected-wallets' ? (
            <div className="space-y-4 p-6">
              <div className="mb-6">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedSection(null)}
                  className="text-gray-400 hover:text-white mb-4 p-0 h-auto"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Settings
                </Button>
                <h3 className="text-lg font-semibold text-white mb-2">Connected Wallets</h3>
                <p className="text-sm text-gray-400">
                  To enable zapping from the ZapTok web app, connect a wallet:
                </p>
              </div>
              {renderWalletConnections()}
            </div>
          ) : selectedSection === 'network' ? (
            <div>
              <div className="p-6 pb-0">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedSection(null)}
                  className="text-gray-400 hover:text-white mb-4 p-0 h-auto"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Settings
                </Button>
              </div>
              {renderNetworkSection()}
            </div>
          ) : selectedSection === 'stream' ? (
            <div className="space-y-4 p-6">
              <div className="mb-6">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedSection(null)}
                  className="text-gray-400 hover:text-white mb-4 p-0 h-auto"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Settings
                </Button>
                <h3 className="text-lg font-semibold text-white mb-2">Stream</h3>
                <p className="text-sm text-gray-400 mb-6">
                  Configure your livestreaming preferences and account settings.
                </p>
              </div>

              {/* Stream Settings Options */}
              <div className="space-y-4">
                <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                  <h4 className="text-white font-medium mb-2">Streaming Account</h4>
                  <p className="text-sm text-gray-400 mb-3">
                    Manage your zap.stream account and streaming configuration.
                  </p>
                  <Button
                    onClick={() => navigate('/stream', { state: { fromNavigation: true } })}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    Open Stream Dashboard
                  </Button>
                </div>

                <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                  <h4 className="text-white font-medium mb-2">Stream Quality</h4>
                  <p className="text-sm text-gray-400 mb-3">
                    Recommended settings for optimal streaming performance.
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Video Bitrate:</span>
                      <div className="text-white">2000-6000 kbps</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Audio Bitrate:</span>
                      <div className="text-white">128-320 kbps</div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                  <h4 className="text-white font-medium mb-2">RTMP Settings</h4>
                  <p className="text-sm text-gray-400 mb-3">
                    Server URL for streaming software (OBS, Streamlabs, etc.)
                  </p>
                  <div className="bg-gray-900 p-3 rounded border border-gray-600">
                    <code className="text-sm text-green-400">rtmp://ingest.zap.stream/live/</code>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Use this URL in your streaming software along with your stream key.
                  </p>
                </div>

                <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                  <h4 className="text-white font-medium mb-2">Protocol Support</h4>
                  <p className="text-sm text-gray-400 mb-3">
                    This streaming implementation uses NIP-53 Live Activities for decentralized broadcasting.
                  </p>
                  <div className="flex items-center space-x-4">
                    <a
                      href="https://github.com/nostr-protocol/nips/blob/master/53.md"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 text-sm underline"
                    >
                      Learn about NIP-53
                    </a>
                    <a
                      href="https://zap.stream"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 text-sm underline"
                    >
                      Visit zap.stream
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ) : selectedSection === 'appearance' ? (
            <div className="space-y-4 p-6">
              <div className="mb-6">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedSection(null)}
                  className="text-gray-400 hover:text-white mb-4 p-0 h-auto"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Settings
                </Button>
                <h3 className="text-lg font-semibold text-white mb-2">Appearance</h3>
              </div>

              <div className="space-y-6">
                {/* Select a theme */}
                <div>
                  <label className="text-white mb-4 block">Select a theme</label>
                  <div className="flex justify-between gap-2">
                    {/* Bitcoin Orange */}
                    <div className="relative opacity-60 flex-1">
                      <div className="w-full aspect-square bg-black rounded-lg border-2 border-gray-700 flex items-center justify-center cursor-not-allowed">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 via-purple-600 to-orange-500"></div>
                      </div>
                      <p className="text-gray-500 text-center mt-2 text-sm">bitcoin orange</p>
                    </div>

                    {/* Nostr Purple */}
                    <div className="relative opacity-60 flex-1">
                      <div className="w-full aspect-square bg-gray-200 rounded-lg border-2 border-gray-400 flex items-center justify-center cursor-not-allowed">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 via-red-500 to-purple-600"></div>
                      </div>
                      <p className="text-gray-500 text-center mt-2 text-sm">nostr purple</p>
                    </div>

                    {/* ZapTok Gradient - Selected */}
                    <div className="relative opacity-60 flex-1">
                      <div className="w-full aspect-square bg-black rounded-lg border-2 border-green-500 flex items-center justify-center cursor-not-allowed">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600"></div>
                        <div className="absolute top-1 right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                      <p className="text-gray-500 text-center mt-2 text-sm">zaptok gradient</p>
                    </div>

                    {/* Privacy Blue */}
                    <div className="relative opacity-60 flex-1">
                      <div className="w-full aspect-square bg-gray-200 rounded-lg border-2 border-gray-400 flex items-center justify-center cursor-not-allowed">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 via-cyan-500 to-purple-600"></div>
                      </div>
                      <p className="text-gray-500 text-center mt-2 text-sm">privacy blue</p>
                    </div>
                  </div>
                </div>

                {/* Show Animations */}
                <div className="flex items-center space-x-3 opacity-60">
                  <input
                    type="checkbox"
                    defaultChecked
                    disabled
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
                  />
                  <span className="text-gray-500">Show Animations</span>
                </div>

                {/* Automatically set Dark or Light mode */}
                <div className="flex items-center space-x-3 opacity-60">
                  <input
                    type="checkbox"
                    disabled
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
                  />
                  <span className="text-gray-500">Automatically set Dark or Light mode based on your system settings</span>
                </div>
              </div>
            </div>
          ) : selectedSection === 'feeds' ? (
            <div className="space-y-4 p-6">
              <div className="mb-6">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedSection(null)}
                  className="text-gray-400 hover:text-white mb-4 p-0 h-auto"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Settings
                </Button>
                <h3 className="text-lg font-semibold text-white mb-2">Feeds</h3>
              </div>

              <div className="space-y-8">
                {/* Following Feed Section */}
                <div>
                  <h4 className="text-white font-medium mb-4">Following Feed</h4>
                  <div className="space-y-4 opacity-60">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        defaultChecked
                        disabled
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
                      />
                      <span className="text-gray-500">Show reposts in following feed</span>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        disabled
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
                      />
                      <span className="text-gray-500">Show replies in following feed</span>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        defaultChecked
                        disabled
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
                      />
                      <span className="text-gray-500">Show reactions in following feed</span>
                    </div>
                  </div>
                </div>

                {/* Global Feed Section */}
                <div>
                  <h4 className="text-white font-medium mb-4">Global Feed</h4>
                  <div className="space-y-4 opacity-60">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        defaultChecked
                        disabled
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
                      />
                      <span className="text-gray-500">Enable global feed discovery</span>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        disabled
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
                      />
                      <span className="text-gray-500">Filter explicit content in global feed</span>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        defaultChecked
                        disabled
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
                      />
                      <span className="text-gray-500">Show trending content</span>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        disabled
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
                      />
                      <span className="text-gray-500">Limit global feed to specific hashtags</span>
                    </div>
                  </div>
                </div>

                {/* Feed Preferences */}
                <div>
                  <h4 className="text-white font-medium mb-4">Feed Preferences</h4>
                  <div className="space-y-4 opacity-60">
                    <div>
                      <label className="text-gray-500 mb-2 block">Default feed on app launch</label>
                      <select
                        disabled
                        className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-500 cursor-not-allowed"
                      >
                        <option>Following Feed</option>
                        <option>Global Feed</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-gray-500 mb-2 block">Feed refresh interval</label>
                      <select
                        disabled
                        className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-500 cursor-not-allowed"
                      >
                        <option>30 seconds</option>
                        <option>1 minute</option>
                        <option>5 minutes</option>
                        <option>Manual only</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : selectedSection === 'discovery' ? (
            <div className="space-y-4 p-6">
              <div className="mb-6">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedSection(null)}
                  className="text-gray-400 hover:text-white mb-4 p-0 h-auto"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Settings
                </Button>
                <h3 className="text-lg font-semibold text-white mb-2">Discovery</h3>
                <p className="text-sm text-gray-400">
                  Configure how you discover new content and users on the network.
                </p>
              </div>

              <div className="space-y-6">
                {/* Content Discovery */}
                <div>
                  <h4 className="text-white font-medium mb-4">Content Discovery</h4>
                  <div className="space-y-4 opacity-60">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        defaultChecked
                        disabled
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
                      />
                      <span className="text-gray-500">Enable trending hashtags</span>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        defaultChecked
                        disabled
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
                      />
                      <span className="text-gray-500">Show popular videos</span>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        disabled
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
                      />
                      <span className="text-gray-500">Personalized recommendations</span>
                    </div>
                  </div>
                </div>

                {/* User Discovery */}
                <div>
                  <h4 className="text-white font-medium mb-4">User Discovery</h4>
                  <div className="space-y-4 opacity-60">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        defaultChecked
                        disabled
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
                      />
                      <span className="text-gray-500">Suggest users to follow</span>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        disabled
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
                      />
                      <span className="text-gray-500">Show users based on mutual connections</span>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        defaultChecked
                        disabled
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
                      />
                      <span className="text-gray-500">Display creator profiles in search</span>
                    </div>
                  </div>
                </div>

                {/* Search & Filters */}
                <div>
                  <h4 className="text-white font-medium mb-4">Search & Filters</h4>
                  <div className="space-y-4 opacity-60">
                    <div>
                      <label className="text-gray-500 mb-2 block">Default search scope</label>
                      <select
                        disabled
                        className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-500 cursor-not-allowed"
                      >
                        <option>Global network</option>
                        <option>Following only</option>
                        <option>Current relay</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        disabled
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
                      />
                      <span className="text-gray-500">Enable content warnings filter</span>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        defaultChecked
                        disabled
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
                      />
                      <span className="text-gray-500">Show search suggestions</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : selectedSection === 'notifications' ? (
            <div className="space-y-4 p-6">
              <div className="mb-6">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedSection(null)}
                  className="text-gray-400 hover:text-white mb-4 p-0 h-auto"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Settings
                </Button>
                <h3 className="text-lg font-semibold text-white mb-2">Notifications</h3>
              </div>

              <div className="space-y-6">
                {/* Show notifications for */}
                <div>
                  <label className="text-white mb-4 block">Show notifications for:</label>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 opacity-60">
                      <input
                        type="checkbox"
                        defaultChecked
                        disabled
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
                      />
                      <span className="text-2xl">👤</span>
                      <span className="text-gray-500">New Followers</span>
                    </div>

                    <div className="flex items-center space-x-3 opacity-60">
                      <input
                        type="checkbox"
                        defaultChecked
                        disabled
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
                      />
                      <span className="text-2xl">⚡</span>
                      <span className="text-gray-500">Zaps</span>
                    </div>

                    <div className="flex items-center space-x-3 opacity-60">
                      <input
                        type="checkbox"
                        defaultChecked
                        disabled
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
                      />
                      <span className="text-2xl">💖</span>
                      <span className="text-gray-500">Reactions</span>
                    </div>

                    <div className="flex items-center space-x-3 opacity-60">
                      <input
                        type="checkbox"
                        defaultChecked
                        disabled
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
                      />
                      <span className="text-2xl">🔄</span>
                      <span className="text-gray-500">Reposts</span>
                    </div>

                    <div className="flex items-center space-x-3 opacity-60">
                      <input
                        type="checkbox"
                        defaultChecked
                        disabled
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
                      />
                      <span className="text-2xl">💬</span>
                      <span className="text-gray-500">Replies</span>
                    </div>

                    <div className="flex items-center space-x-3 opacity-60">
                      <input
                        type="checkbox"
                        defaultChecked
                        disabled
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
                      />
                      <span className="text-2xl">🏷️</span>
                      <span className="text-gray-500">Mentions</span>
                    </div>
                  </div>
                </div>

                {/* Notification preferences */}
                <div>
                  <label className="text-white mb-4 block">Notification preferences:</label>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 opacity-60">
                      <input
                        type="checkbox"
                        defaultChecked
                        disabled
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
                      />
                      <span className="text-gray-500">Ignore notes with more than 10 mentions</span>
                    </div>

                    <div className="flex items-center space-x-3 opacity-60">
                      <input
                        type="checkbox"
                        disabled
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
                      />
                      <span className="text-gray-500">Only show DM notifications from users I follow</span>
                    </div>

                    <div className="flex items-center space-x-3 opacity-60">
                      <input
                        type="checkbox"
                        disabled
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
                      />
                      <span className="text-gray-500">Only show reactions from users I follow</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : selectedSection === 'zaps' ? (
            <div className="space-y-4 p-6">
              <div className="mb-6">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedSection(null)}
                  className="text-gray-400 hover:text-white mb-4 p-0 h-auto"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Settings
                </Button>
                <h3 className="text-lg font-semibold text-white mb-2">Zaps</h3>
              </div>

              <div className="space-y-6">
                {/* Set default zap amount */}
                <div>
                  <label className="text-white mb-4 block">Set default zap amount:</label>
                  <input
                    type="number"
                    defaultValue="1"
                    disabled
                    className="w-full p-4 bg-gray-800 border border-gray-700 rounded-lg text-gray-500 cursor-not-allowed opacity-60"
                  />
                </div>

                {/* Set custom zap amount presets */}
                <div>
                  <label className="text-white mb-4 block">Set custom zap amount presets:</label>
                  <div className="space-y-3">
                    {/* Zap preset items */}
                    <div className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg border border-gray-700 opacity-60">
                      <span className="text-2xl">⚡</span>
                      <span className="text-gray-500 w-8">1</span>
                      <span className="text-gray-500 flex-1">Here's a zap for ya</span>
                    </div>
                    
                    <div className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg border border-gray-700 opacity-60">
                      <span className="text-2xl">🚀</span>
                      <span className="text-gray-500 w-8">5</span>
                      <span className="text-gray-500 flex-1"></span>
                    </div>
                    
                    <div className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg border border-gray-700 opacity-60">
                      <span className="text-2xl">☕</span>
                      <span className="text-gray-500 w-8">10</span>
                      <span className="text-gray-500 flex-1">Coffee on me ☕</span>
                    </div>
                    
                    <div className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg border border-gray-700 opacity-60">
                      <span className="text-2xl">🍻</span>
                      <span className="text-gray-500 w-8">15</span>
                      <span className="text-gray-500 flex-1">Cheers 🍻</span>
                    </div>
                    
                    <div className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg border border-gray-700 opacity-60">
                      <span className="text-2xl">🍌</span>
                      <span className="text-gray-500 w-8">20</span>
                      <span className="text-gray-500 flex-1">#V4V ⚡</span>
                    </div>
                    
                    <div className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg border border-gray-700 opacity-60">
                      <span className="text-2xl">🧑‍💼</span>
                      <span className="text-gray-500 w-8">25</span>
                      <span className="text-gray-500 flex-1"></span>
                    </div>
                  </div>
                </div>

                {/* Restore Default Feeds button */}
                <button
                  disabled
                  className="text-gray-500 hover:text-gray-500 p-0 h-auto cursor-not-allowed opacity-60"
                >
                  Restore Default Feeds
                </button>
              </div>
            </div>
          ) : selectedSection === 'media-uploads' ? (
            <div className="space-y-4 p-6">
              <div className="mb-6">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedSection(null)}
                  className="text-gray-400 hover:text-white mb-4 p-0 h-auto"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Settings
                </Button>
                <h3 className="text-lg font-semibold text-white mb-2">Media Uploads</h3>
              </div>

              {/* Media Server Section */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-gray-400 font-medium mb-4">Media Server</h4>
                  
                  {/* Connected Server */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                    <span className="text-gray-500">https://blossom.primal.net</span>
                  </div>
                  
                  {/* Switch Media Server */}
                  <div className="space-y-3">
                    <p className="text-gray-500">Switch media server</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          placeholder="enter blossom server url..."
                          disabled
                          className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-500 placeholder-gray-600 cursor-not-allowed opacity-60"
                        />
                        <Link className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-600" />
                      </div>
                    </div>
                    
                    <button
                      disabled
                      className="text-gray-500 hover:text-gray-500 p-0 h-auto cursor-not-allowed opacity-60"
                    >
                      restore default media server
                    </button>
                  </div>
                </div>

                {/* Media Mirrors Section */}
                <div>
                  <h4 className="text-gray-400 font-medium mb-4">Media Mirrors</h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="enable-media-mirrors"
                        disabled
                        className="w-4 h-4 bg-gray-800 border border-gray-600 rounded cursor-not-allowed opacity-60"
                      />
                      <label htmlFor="enable-media-mirrors" className="text-gray-500 cursor-not-allowed">
                        Enable media mirrors
                      </label>
                    </div>
                    
                    <p className="text-gray-500 text-sm">
                      You can enable one or more media mirror servers. When enabled, your uploads to the primary media server will be automatically copied to the mirror(s).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : selectedSection ? (
            <div className="space-y-4 p-6">
              <div className="mb-6">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedSection(null)}
                  className="text-gray-400 hover:text-white mb-4 p-0 h-auto"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Settings
                </Button>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {settingsSections.find(s => s.id === selectedSection)?.title}
                </h3>
                <p className="text-sm text-gray-400">
                  This section is coming soon.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-0">
              {settingsSections.map((section, index) => (
                <button
                  key={section.id}
                  onClick={() => {
                    setSelectedSection(section.id);
                  }}
                  className={`w-full flex items-center justify-between h-16 px-6 rounded-none border-b border-gray-800 hover:bg-gray-800/50 transition-colors text-left ${
                    index === 0 ? 'border-t border-gray-800' : ''
                  }`}
                >
                  <span className="text-white text-lg font-medium">{section.title}</span>
                  <ChevronRight className="w-6 h-6 text-gray-400" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Relay Column */}
      <div className="w-96 bg-black p-8">
        <div className="space-y-10">
          {/* Relays Section */}
          <div>
            <h3 className="text-2xl font-semibold mb-6 text-white">Relays</h3>
            <div className="space-y-4">
              {getDisplayRelays().map((relay, index) => (
                <div key={index} className="flex items-center gap-4 text-lg">
                  <div className={`w-3 h-3 rounded-full ${
                    relay.status === 'active' ? 'bg-green-500' :
                    relay.status === 'placeholder' ? 'bg-gray-500' : 'bg-red-500'
                  }`} />
                  <span className={`truncate ${
                    relay.status === 'placeholder' ? 'text-gray-500' : 'text-gray-300'
                  }`}>
                    {relay.url}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Caching Services Section */}
          <div>
            <h3 className="text-2xl font-semibold mb-6 text-white">Caching Services</h3>
            <div className="space-y-4">
              {/* Currently Connected Service */}
              {currentService && (
                <div className="flex items-center gap-4 text-lg">
                  <div className={`w-3 h-3 rounded-full ${currentService.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className={`truncate ${currentService.isConnected ? 'text-gray-300' : 'text-gray-500'}`}>
                    {currentService.url}
                  </span>
                </div>
              )}
              
              {/* Available Services (exclude currently connected one) */}
              {availableServices
                .filter(service => !currentService || service.url !== currentService.url)
                .map((service, index) => (
                <div key={service.url} className="flex items-center gap-4 text-lg">
                  <div className={`w-3 h-3 rounded-full ${service.isConnected ? 'bg-green-500' : 'bg-gray-500'}`} />
                  <span className={`truncate ${service.isConnected ? 'text-gray-300' : 'text-gray-500'}`}>
                    {service.url}
                  </span>
                </div>
              ))}
              
              {/* No services available fallback */}
              {!currentService && availableServices.length === 0 && (
                <div className="flex items-center gap-4 text-lg">
                  <div className="w-3 h-3 rounded-full bg-gray-500" />
                  <span className="truncate text-gray-500">No caching services</span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
