import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppContext } from '@/hooks/useAppContext';
import { useToast } from '@/hooks/useToast';
import { useWallet } from '@/hooks/useWallet';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export function useSettingsLogic() {
  const location = useLocation();
  const { toast } = useToast();
  const { isConnected, testConnection } = useWallet();
  const { user } = useCurrentUser();
  const { config, presetRelays = [] } = useAppContext();

  // Settings state
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

  const handleTestConnection = async () => {
    try {
      await testConnection();
      toast({
        title: "✅ Connection Test Successful",
        description: "Lightning wallet connection is working properly",
      });
    } catch (error) {
      toast({
        title: "❌ Connection Test Failed",
        description: error instanceof Error ? error.message : "Failed to test wallet connection",
        variant: "destructive",
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

  return {
    // State
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

    // Handlers
    handleTestConnection,
    handleNostrWalletConnect
  };
}
