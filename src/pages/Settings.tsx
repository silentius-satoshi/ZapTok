import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Plus, Link } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { useAppContext } from '@/hooks/useAppContext';
import BitcoinConnectCard from '@/components/lightning/wallet-connections/BitcoinConnectCard';
import NostrWalletConnectCard from '@/components/lightning/wallet-connections/NostrWalletConnectCard';
import CashuWalletCard from '@/components/lightning/wallet-connections/CashuWalletCard';
import { useToast } from '@/hooks/useToast';
import { useWallet } from '@/contexts/WalletContext';
import { useState } from 'react';

export function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isConnected, disconnect } = useWallet();
  const { config, presetRelays = [] } = useAppContext();
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  // Settings sections matching Primal's layout
  const settingsSections = [
    { id: 'appearance', title: 'Appearance' },
    { id: 'home-feeds', title: 'Home Feeds' },
    { id: 'reads-feeds', title: 'Reads Feeds' },
    { id: 'media-uploads', title: 'Media Uploads' },
    { id: 'muted-content', title: 'Muted Content' },
    { id: 'content-moderation', title: 'Content Moderation' },
    { id: 'connected-wallets', title: 'Connected Wallets' },
    { id: 'notifications', title: 'Notifications' },
    { id: 'dev-tools', title: 'Dev Tools' },
    { id: 'network', title: 'Network' },
    { id: 'zaps', title: 'Zaps' },
  ];

  // Get relay status based on current relay selection
  const getRelayStatus = (relayUrl: string) => {
    if (relayUrl === config.relayUrl) {
      return 'active'; // Currently selected relay
    }
    return 'inactive'; // Available but not selected
  };

  // Get all relays with status
  const getAllRelays = () => {
    const allRelays = [...presetRelays];
    
    // Add current relay if it's not in presets
    if (!presetRelays.find(r => r.url === config.relayUrl)) {
      allRelays.push({ 
        name: config.relayUrl.replace(/^wss?:\/\//, ''), 
        url: config.relayUrl 
      });
    }

    // Sort: active first, then inactive
    return allRelays.sort((a, b) => {
      const aStatus = getRelayStatus(a.url);
      const bStatus = getRelayStatus(b.url);
      if (aStatus === 'active' && bStatus !== 'active') return -1;
      if (bStatus === 'active' && aStatus !== 'active') return 1;
      return 0;
    });
  };

  // Mock additional relays for display if less than 2 active
  const getDisplayRelays = () => {
    const relays = getAllRelays();
    const activeRelays = relays.filter(r => getRelayStatus(r.url) === 'active');
    
    // Add placeholder relays if less than 2
    const placeholderCount = Math.max(0, 2 - activeRelays.length);
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
    <div className="space-y-6">
      {/* Caching Service Section */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Caching Service</h3>
        <p className="text-gray-400 text-sm mb-4">Connected caching service</p>
        
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-gray-900 rounded-lg border border-gray-700">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-gray-300 text-sm">wss://cache2.primal.net/v1</span>
          </div>
          
          <div className="space-y-2">
            <p className="text-gray-400 text-sm">Connect to a different caching service</p>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="wss://cachingservice.url" 
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm placeholder-gray-500"
              />
              <Button size="sm" className="px-4">
                <Link className="w-4 h-4" />
              </Button>
            </div>
            <Button variant="ghost" className="text-pink-400 hover:text-pink-300 text-sm">
              Restore default caching service
            </Button>
          </div>
        </div>
      </div>

      {/* Relays Section */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Relays</h3>
        <p className="text-gray-400 text-sm mb-4">My relays</p>
        
        <div className="space-y-2">
          {getDisplayRelays().map((relay, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg border border-gray-700">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  relay.status === 'active' ? 'bg-green-500' : 
                  relay.status === 'placeholder' ? 'bg-gray-500' : 'bg-red-500'
                }`} />
                <span className={`text-sm ${
                  relay.status === 'placeholder' ? 'text-gray-500' : 'text-gray-300'
                }`}>
                  {relay.url}
                </span>
              </div>
              {relay.status !== 'placeholder' && (
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                  remove
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          <Button variant="ghost" className="text-pink-400 hover:text-pink-300 text-sm">
            Reset relays
          </Button>
          
          <div className="space-y-2">
            <p className="text-gray-400 text-sm">Connect to relay</p>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="wss://relay.url" 
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm placeholder-gray-500"
              />
              <Button size="sm" className="px-4">
                <Link className="w-4 h-4" />
              </Button>
            </div>
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

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="flex h-screen">
        {/* Left Sidebar - Navigation */}
        <div className="flex flex-col bg-black border-r border-gray-800">
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

        {/* Main Content - Settings */}
        <div className="flex-1">
          {/* Header */}
          <div className="p-4 border-b border-gray-800">
            <h1 className="text-xl font-bold">
              {selectedSection === 'connected-wallets' ? 'settings: connected wallets' :
               selectedSection === 'network' ? 'settings: network' : 'settings'}
            </h1>
          </div>

          {/* Settings Content */}
          <div className="p-4">
            {selectedSection === 'connected-wallets' ? (
              <div>
                <div className="mb-4">
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedSection(null)}
                    className="text-gray-400 hover:text-white mb-3"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Settings
                  </Button>
                  <p className="text-gray-400 text-sm">
                    Manage your Lightning wallet connections for instant Bitcoin payments.
                  </p>
                </div>
                {renderWalletConnections()}
              </div>
            ) : selectedSection === 'network' ? (
              <div>
                <div className="mb-4">
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedSection(null)}
                    className="text-gray-400 hover:text-white mb-3"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Settings
                  </Button>
                </div>
                {renderNetworkSection()}
              </div>
            ) : (
              <div className="space-y-1">
                {settingsSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => {
                      if (section.id === 'connected-wallets') {
                        setSelectedSection('connected-wallets');
                      } else if (section.id === 'network') {
                        setSelectedSection('network');
                      }
                    }}
                    className="w-full flex items-center justify-between p-3 rounded border border-gray-800 hover:bg-gray-800/50 transition-colors text-left"
                  >
                    <span className="text-white font-medium">{section.title}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Relays */}
        <div className="w-72 p-4 border-l border-gray-800">
          <div className="space-y-6">
            {/* Relays Section */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Relays</h3>
              <div className="space-y-2">
                {getDisplayRelays().map((relay, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${
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
              <h3 className="text-lg font-semibold mb-4">Caching services</h3>
              <div className="space-y-2">
                {cachingServices.map((service, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${service.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-gray-300 truncate">{service.url}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
