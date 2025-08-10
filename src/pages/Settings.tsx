import { Button } from '@/components/ui/button';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { LogoHeader } from '@/components/LogoHeader';
import { useAppContext } from '@/hooks/useAppContext';
import { useSettingsLogic } from '@/hooks/useSettingsLogic';
import {
  settingsSections,
  getSettingSectionById,
  ConnectedWalletsSettings,
  NetworkSettings,
  KeysSettings,
  GenericSettings
} from '@/components/settings';

export function Settings() {
  const { config } = useAppContext();
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
    handleBitcoinConnect,
    handleDisconnect,
    handleNostrWalletConnect
  } = useSettingsLogic();

  // Mock additional relays for display if less than 2 active
  const getDisplayRelays = () => {
    const activeRelays = config.relayUrls;
    const placeholderCount = Math.max(0, Math.max(2, config.relayUrls.length) - activeRelays.length);
    const placeholders = Array.from({ length: placeholderCount }, (_, i) => ({
      name: `relay${i + 1}.example.com`,
      url: `wss://relay${i + 1}.example.com/`,
      status: 'placeholder' as const
    }));

    return [...activeRelays.map(url => ({
      name: url.replace(/^wss?:\/\//, ''),
      url,
      status: 'active' as const
    })), ...placeholders];
  };

  const renderSettingsContent = () => {
    if (!selectedSection) {
      return (
        <div className="space-y-0">
          {settingsSections.map((section, index) => (
            <button
              key={section.id}
              onClick={() => setSelectedSection(section.id)}
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
    if (selectedSection === 'connected-wallets') {
      return (
        <ConnectedWalletsSettings
          isConnecting={isConnecting}
          onBitcoinConnect={handleBitcoinConnect}
          onNostrWalletConnect={handleNostrWalletConnect}
          isConnected={isConnected}
          onDisconnect={handleDisconnect}
        />
      );
    }

    if (selectedSection === 'network') {
      return (
        <NetworkSettings
          customRelay={customRelay}
          setCustomRelay={setCustomRelay}
          showCustomInput={showCustomInput}
          setShowCustomInput={setShowCustomInput}
          knownRelays={knownRelays}
          setKnownRelays={setKnownRelays}
          isConnecting={isConnecting}
          setIsConnecting={setIsConnecting}
        />
      );
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
        <h1 className="text-3xl font-normal text-white">
          settings
        </h1>
      );
    }

    const sectionConfig = getSettingSectionById(selectedSection);
    const sectionTitle = selectedSection === 'connected-wallets' ? 'connected wallets' :
                        selectedSection === 'network' ? 'network' :
                        selectedSection === 'keys' ? 'keys' :
                        selectedSection === 'media-uploads' ? 'media uploads' :
                        sectionConfig?.title?.toLowerCase() || selectedSection;

    return (
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedSection(null)}
          className="p-2 text-gray-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-normal text-white">
          <button
            onClick={() => setSelectedSection(null)}
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
      {/* Left Navigation Column */}
      <div className="w-80 border-r border-gray-800 bg-black flex flex-col">
        {/* Logo at top of sidebar */}
        <LogoHeader />

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
          {renderSettingsContent()}
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
              <div className="flex items-center gap-4 text-lg">
                <div className="w-3 h-3 rounded-full bg-gray-500" />
                <span className="truncate text-gray-500">No caching services</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}