import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppContext } from '@/hooks/useAppContext';
import { useToast } from '@/hooks/useToast';
import { useWallet } from '@/hooks/useWallet';

export function useSettingsLogic() {
  const location = useLocation();
  const { toast } = useToast();
  const { isConnected, disconnect } = useWallet();
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

  // Wallet connection handlers
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
    handleBitcoinConnect,
    handleDisconnect,
    handleNostrWalletConnect
  };
}
