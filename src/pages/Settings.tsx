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
  const { isBunkerSigner } = useWallet();
  const { activeRelays, connectionState, userRelayList } = useNostrConnection();
  const navigate = useNavigate();

  useSeoMeta({
    title: 'Settings - ZapTok',
    description: 'Configure your ZapTok account settings, privacy preferences, and network options.',
  });

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
    let displayRelays: string[] = [];
    
    // Use user's NIP-65 relay list if available
    if (userRelayList && (userRelayList.read.length > 0 || userRelayList.write.length > 0)) {
      // Combine read and write relays, removing duplicates
      const allUserRelays = new Set([...userRelayList.read, ...userRelayList.write]);
      displayRelays = Array.from(allUserRelays);
    } else if (activeRelays.length > 0) {
      // Fallback to active relays if no user relay list
      displayRelays = activeRelays;
    }
    
    const placeholderCount = Math.max(0, Math.max(2, displayRelays.length) - displayRelays.length);
    const placeholders = Array.from({ length: placeholderCount }, (_, i) => ({
      name: `relay${i + 1}.example.com`,
      url: `wss://relay${i + 1}.example.com/`,
      status: 'placeholder' as const
    }));

    return [...displayRelays.map(url => {
      const isConnected = connectionState[url] === 'connected';
      const isConnecting = connectionState[url] === 'connecting';
      
      return {
        name: url.replace(/^wss?:\/\//, ''),
        url,
        // Show as 'active' if we have connection state showing connected, otherwise 'inactive'
        status: (isConnected ? 'active' : isConnecting ? 'connecting' : 'inactive') as 'active' | 'connecting' | 'inactive' | 'placeholder'
      };
    }), ...placeholders];
  };

  const renderSettingsContent = () => {
    if (!selectedSection) {
      // Filter out cashu-wallet section for bunker signers
      const availableSections = settingsSections.filter(section => {
        if (section.id === 'cashu-wallet' && isBunkerSigner) {
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
        </div>
      </div>

      {/* Right Relay Column - Hidden on mobile */}
      <div className="hidden md:block w-96 bg-black p-8">
        <div className="space-y-10">
          {/* Relays Section */}
          <div>
            <h3 className="text-2xl font-semibold mb-6 text-white">Relays</h3>
            <div className="space-y-4">
              {getDisplayRelays().map((relay, index) => (
                <div key={index} className="flex items-center gap-4 text-lg">
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
    </div>
  );
}