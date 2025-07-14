import { Button } from '@/components/ui/button';
import { useLocation } from 'react-router-dom';
import { ChevronRight, Link, ArrowLeft, Trash2 } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { useAppContext } from '@/hooks/useAppContext';
import BitcoinConnectCard from '@/components/lightning/wallet-connections/BitcoinConnectCard';
import NostrWalletConnectCard from '@/components/lightning/wallet-connections/NostrWalletConnectCard';
import CashuWalletCard from '@/components/lightning/wallet-connections/CashuWalletCard';
import { useToast } from '@/hooks/useToast';
import { useWallet } from '@/hooks/useWallet';
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';

export function Settings() {
  const location = useLocation();
  const { toast } = useToast();
  const { isConnected, disconnect } = useWallet();
  const { config, presetRelays = [], addRelay, removeRelay } = useAppContext();
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
    { id: 'home-feeds', title: 'For You Feed' },
    { id: 'reads-feeds', title: 'Global Feed' },
    { id: 'media-uploads', title: 'Media Uploads' },
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

  const cachingServices = [
    { url: 'wss://cache2.primal.net/v1', status: 'active' },
  ];

  const handleBitcoinConnect = async () => {
    setIsConnecting('btc');
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast({
        title: "Bitcoin Connect",
        description: "Successfully connected your Bitcoin wallet!"
      });
    } catch {
      toast({
        title: "Connection failed",
        description: "Could not connect to Bitcoin Connect",
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

  const handleCashuConnect = async () => {
    setIsConnecting('cashu');
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast({
        title: "Cashu Wallet",
        description: "Successfully connected your Cashu wallet!"
      });
    } catch {
      toast({
        title: "Connection failed",
        description: "Could not connect to Cashu wallet",
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
        <h3 className="text-lg font-semibold text-white mb-4">Caching Service</h3>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-400 mb-3">Connected caching service</p>
            <div className="flex items-center gap-2 p-3 bg-gray-800 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-300">wss://cache2.primal.net/v1</span>
            </div>
          </div>
          
          <div>
            <p className="text-sm text-gray-400 mb-3">Connect to a different caching service</p>
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
      />

      <CashuWalletCard
        isConnecting={isConnecting === 'cashu'}
        onConnect={handleCashuConnect}
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
            <h3 className="text-2xl font-semibold mb-6 text-white">Caching services</h3>
            <div className="space-y-4">
              {cachingServices.map((service, index) => (
                <div key={index} className="flex items-center gap-4 text-lg">
                  <div className={`w-3 h-3 rounded-full ${service.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-gray-300 truncate">{service.url}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
