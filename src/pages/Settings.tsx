import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { LogoHeader } from '@/components/LogoHeader';
import { useAppContext } from '@/hooks/useAppContext';
import { useSettingsLogic } from '@/hooks/useSettingsLogic';
import { useWallet } from '@/hooks/useWallet';
import { useNavigate } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { useNostrConnection } from '@/components/NostrProvider';
import { RecentSupporters } from '@/components/donation/RecentSupporters';
import { DonationZap } from '@/components/DonationZap';
import {
  settingsSections,
  getSettingSectionById,
  CashuWalletSettings,
  NetworkSettings,
  KeysSettings,
  GenericSettings
} from '@/components/settings';

export function Settings() {
  const { config } = useAppContext();
  const { isBunkerSigner, isExtensionSigner } = useWallet();
  const { activeRelays, connectionState, userRelayList } = useNostrConnection();
  const navigate = useNavigate();
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | undefined>(undefined);

  useSeoMeta({
    title: 'Settings - ZapTok',
    description: 'Configure your ZapTok account settings, privacy preferences, and network options.',
  });

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setIsDonationModalOpen(true);
  };

  const {
    selectedSection,
    setSelectedSection,
    isConnecting,
    setIsConnecting,
    customRelay,
    setCustomRelay,
    showCustomInput,
    setShowCustomInput,
    knownRelays,
    setKnownRelays,
    isConnected,
    handleNostrWalletConnect,
    handleTestConnection
  } = useSettingsLogic();

  // Display user's configured relays from NIP-65 relay list
  const getDisplayRelays = () => {
    const readRelays: Array<{ name: string; url: string; status: 'active' | 'connecting' | 'inactive' | 'placeholder' }> = [];
    const writeRelays: Array<{ name: string; url: string; status: 'active' | 'connecting' | 'inactive' | 'placeholder' }> = [];
    
    // Use user's NIP-65 relay list if available
    if (userRelayList && (userRelayList.read.length > 0 || userRelayList.write.length > 0)) {
      // Process read relays
      userRelayList.read.forEach(url => {
        const isConnected = connectionState[url] === 'connected';
        const isConnecting = connectionState[url] === 'connecting';
        
        readRelays.push({
          name: url.replace(/^wss?:\/\//, ''),
          url,
          status: (isConnected ? 'active' : isConnecting ? 'connecting' : 'inactive') as 'active' | 'connecting' | 'inactive'
        });
      });
      
      // Process write relays
      userRelayList.write.forEach(url => {
        const isConnected = connectionState[url] === 'connected';
        const isConnecting = connectionState[url] === 'connecting';
        
        writeRelays.push({
          name: url.replace(/^wss?:\/\//, ''),
          url,
          status: (isConnected ? 'active' : isConnecting ? 'connecting' : 'inactive') as 'active' | 'connecting' | 'inactive'
        });
      });
    } else if (activeRelays.length > 0) {
      // Fallback to active relays if no user relay list - show in both read and write
      activeRelays.forEach(url => {
        const isConnected = connectionState[url] === 'connected';
        const isConnecting = connectionState[url] === 'connecting';
        
        const relayInfo = {
          name: url.replace(/^wss?:\/\//, ''),
          url,
          status: (isConnected ? 'active' : isConnecting ? 'connecting' : 'inactive') as 'active' | 'connecting' | 'inactive'
        };
        
        readRelays.push(relayInfo);
        writeRelays.push({ ...relayInfo });
      });
    }
    
    // Add placeholders if lists are empty
    if (readRelays.length === 0) {
      readRelays.push({
        name: 'relay1.example.com',
        url: 'wss://relay1.example.com/',
        status: 'placeholder' as const
      });
    }
    
    if (writeRelays.length === 0) {
      writeRelays.push({
        name: 'relay2.example.com',
        url: 'wss://relay2.example.com/',
        status: 'placeholder' as const
      });
    }

    return { readRelays, writeRelays };
  };

  const renderSettingsContent = () => {
    if (!selectedSection) {
      // Filter out sections based on signer type
      const availableSections = settingsSections.filter(section => {
        // Hide cashu-wallet for bunker signers
        if (section.id === 'cashu-wallet' && isBunkerSigner) {
          return false;
        }
        // Hide keys for bunker and extension signers (they can't access nsec)
        if (section.id === 'keys' && (isBunkerSigner || isExtensionSigner)) {
          return false;
        }
        return true;
      });

      return (
        <div className="space-y-0">
          {availableSections.map((section, index) => (
            <button
              key={section.id}
              onClick={() => navigate(`/settings?section=${section.id}`)}
              className={`w-full flex items-center justify-between h-16 px-6 rounded-none border-b border-gray-800 hover:bg-gray-800/50 transition-colors text-left ${
                index === 0 ? 'border-t border-gray-800' : ''
              }`}
            >
              <span className="text-white">{section.title}</span>
              <ChevronRight className="w-6 h-6 text-gray-400" />
            </button>
          ))}
        </div>
      );
    }

    const sectionConfig = getSettingSectionById(selectedSection);
    if (!sectionConfig) {
      return <GenericSettings sectionId={selectedSection} title="Unknown Section" />;
    }

    const { component: Component } = sectionConfig;

    // Handle sections that require props
    if (selectedSection === 'cashu-wallet') {
      // Redirect bunker signers away from cashu-wallet section
      if (isBunkerSigner) {
        navigate('/settings');
        return <GenericSettings sectionId={selectedSection} title="Access Denied" />;
      }
      return (
        <CashuWalletSettings />
      );
    }

    if (selectedSection === 'network') {
      return <NetworkSettings />;
    }

    if (selectedSection === 'keys') {
      return <KeysSettings />;
    }

    // Handle generic sections
    if (sectionConfig.component === GenericSettings) {
      return <GenericSettings sectionId={selectedSection} title={sectionConfig.title} />;
    }

    return <Component />;
  };

  const renderSettingsHeader = () => {
    if (!selectedSection) {
      return (
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="p-2 text-gray-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-normal text-white">
            settings
          </h1>
        </div>
      );
    }

    const sectionConfig = getSettingSectionById(selectedSection);
    const sectionTitle = selectedSection === 'cashu-wallet' ? 'cashu wallet' :
                        selectedSection === 'network' ? 'network' :
                        selectedSection === 'keys' ? 'keys' :
                        selectedSection === 'media-uploads' ? 'media uploads' :
                        selectedSection === 'developer' ? 'general' :
                        sectionConfig?.title?.toLowerCase() || selectedSection;

    return (
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/settings')}
          className="p-2 text-gray-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-normal text-white">
          <button
            onClick={() => navigate('/settings')}
            className="hover:underline hover:text-gray-300 transition-colors"
          >
            settings
          </button>
          : {sectionTitle}
        </h1>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-black">
      {/* Left Navigation Column - Hidden on mobile */}
      <div className="hidden md:flex w-80 border-r border-gray-800 bg-black flex-col">
        {/* Logo at top of sidebar */}
        <LogoHeader />

        {/* Navigation */}
        <div className="flex-1">
          <Navigation />
        </div>
      </div>

  {/* Middle Settings Column - Full width on mobile */}
  <div className="flex-1 md:border-r border-gray-800 bg-black pt-4 md:pt-0 pb-16 md:pb-0 min-w-0">
        {/* Header */}
        <div className="px-4 md:px-6 py-5 border-b border-gray-800">
          {renderSettingsHeader()}
        </div>

        {/* Content */}
        <div className="overflow-y-auto overflow-x-hidden scrollbar-hide" style={{ height: 'calc(100vh - 97px - 4rem)' }}>
          {renderSettingsContent()}
          
          {/* Donation Section - Only show on main settings page */}
          {!selectedSection && (
            <div className="mt-8 px-6 pb-8">
              <div className="mb-6 text-center">
                <h2 className="text-xl font-semibold text-white mb-2">Enjoying ZapTok?</h2>
                <p className="text-gray-400 text-sm">Your donation helps me maintain ZapTok and make it better 😊</p>
              </div>
              
              {/* Preset Amount Buttons */}
              <div className="grid grid-cols-4 gap-3 mb-6">
                <button
                  onClick={() => handleAmountSelect(1000)}
                  className="h-12 rounded-lg bg-gray-800/80 hover:bg-gray-700 border border-gray-700 hover:border-yellow-500 transition-all flex items-center justify-center text-white font-medium"
                >
                  <span className="mr-1">⚡</span> 1k
                </button>
                <button
                  onClick={() => handleAmountSelect(10000)}
                  className="h-12 rounded-lg bg-gray-800/80 hover:bg-gray-700 border border-gray-700 hover:border-yellow-500 transition-all flex items-center justify-center text-white font-medium"
                >
                  <span className="mr-1">🚀</span> 10k
                </button>
                <button
                  onClick={() => handleAmountSelect(100000)}
                  className="h-12 rounded-lg bg-gray-800/80 hover:bg-gray-700 border border-gray-700 hover:border-yellow-500 transition-all flex items-center justify-center text-white font-medium"
                >
                  <span className="mr-1">💎</span> 100k
                </button>
                <button
                  onClick={() => handleAmountSelect(1000000)}
                  className="h-12 rounded-lg bg-gray-800/80 hover:bg-gray-700 border border-gray-700 hover:border-yellow-500 transition-all flex items-center justify-center text-white font-medium"
                >
                  <span className="mr-1">🌟</span> 1M
                </button>
              </div>

              {/* Recent Supporters Section */}
              <div>
                <RecentSupporters />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Relay Column - Hidden on mobile */}
      <div className="hidden md:block w-96 bg-black p-8">
        <div className="space-y-10">
          {/* Read Relays Section */}
          <div>
            <h3 className="text-2xl font-semibold mb-6 text-white">Read Relays</h3>
            <div className="space-y-4">
              {getDisplayRelays().readRelays.map((relay, index) => (
                <div key={`read-${index}`} className="flex items-center gap-4 text-lg">
                  <div className={`w-3 h-3 rounded-full ${
                    relay.status === 'active' ? 'bg-green-500' :
                    relay.status === 'connecting' ? 'bg-yellow-500 animate-pulse' :
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
          
          {/* Write Relays Section */}
          <div>
            <h3 className="text-2xl font-semibold mb-6 text-white">Write Relays</h3>
            <div className="space-y-4">
              {getDisplayRelays().writeRelays.map((relay, index) => (
                <div key={`write-${index}`} className="flex items-center gap-4 text-lg">
                  <div className={`w-3 h-3 rounded-full ${
                    relay.status === 'active' ? 'bg-green-500' :
                    relay.status === 'connecting' ? 'bg-yellow-500 animate-pulse' :
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
        </div>
      </div>

      {/* Donation Modal */}
      <DonationZap
        isOpen={isDonationModalOpen}
        onClose={() => {
          setIsDonationModalOpen(false);
          setSelectedAmount(undefined);
        }}
        defaultAmount={selectedAmount}
      />
    </div>
  );
}