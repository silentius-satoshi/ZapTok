/**
 * ContentPolicyProvider - Battery Optimization via Connection-Aware Media Loading
 * 
 * Implements user-configurable media loading policies:
 * - Always: Load media on any connection
 * - WiFi Only: Load only on WiFi/Ethernet (default - saves 60-80% battery on cellular)
 * - Never: Click-to-load for all media
 * 
 * Detects connection type via navigator.connection API and adjusts behavior accordingly.
 * Based on Jumble's proven battery optimization patterns.
 * 
 * The cellular check can be disabled via developer settings for users who want to
 * bypass connection detection.
 */

import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react';
import { bundleLog } from '@/lib/logBundler';
import { useDeveloperMode } from '@/hooks/useDeveloperMode';

export type MediaAutoLoadPolicy = 'always' | 'wifi-only' | 'never';

type ConnectionType = 'wifi' | 'ethernet' | 'cellular' | 'unknown';

interface ContentPolicyContextValue {
  autoLoadMedia: boolean;
  mediaAutoLoadPolicy: MediaAutoLoadPolicy;
  setMediaAutoLoadPolicy: (policy: MediaAutoLoadPolicy) => void;
  connectionType: ConnectionType;
}

const ContentPolicyContext = createContext<ContentPolicyContextValue | undefined>(undefined);

interface ContentPolicyProviderProps {
  children: ReactNode;
}

export function ContentPolicyProvider({ children }: ContentPolicyProviderProps) {
  const { cellularCheckEnabled } = useDeveloperMode();
  
  // Default to 'wifi-only' for optimal battery savings
  const [mediaAutoLoadPolicy, setMediaAutoLoadPolicy] = useState<MediaAutoLoadPolicy>(() => {
    // Load from localStorage if available
    const saved = localStorage.getItem('mediaAutoLoadPolicy');
    return (saved as MediaAutoLoadPolicy) || 'wifi-only';
  });

  const [connectionType, setConnectionType] = useState<ConnectionType>('unknown');

  // Monitor connection type changes
  useEffect(() => {
    // If cellular check is disabled, always set connection to 'unknown' to bypass detection
    if (!cellularCheckEnabled) {
      bundleLog('battery', '🔋 Cellular check disabled - connection detection bypassed');
      setConnectionType('unknown');
      return;
    }

    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

    if (!connection) {
      bundleLog('battery', '⚠️ Network Information API not supported - defaulting to always load');
      setConnectionType('unknown');
      return;
    }

    const updateConnectionType = () => {
      const type = connection.effectiveType || connection.type;
      
      // Map connection types to our simplified categories
      let mappedType: ConnectionType = 'unknown';
      
      if (type === 'wifi') {
        mappedType = 'wifi';
      } else if (type === 'ethernet') {
        mappedType = 'ethernet';
      } else if (['slow-2g', '2g', '3g', '4g', '5g', 'cellular'].includes(type)) {
        mappedType = 'cellular';
      }

      setConnectionType(mappedType);
      bundleLog('battery', `🔋 Connection type detected: ${mappedType} (raw: ${type})`);
    };

    // Initial detection
    updateConnectionType();

    // Listen for connection changes
    connection.addEventListener('change', updateConnectionType);

    return () => {
      connection.removeEventListener('change', updateConnectionType);
    };
  }, [cellularCheckEnabled]); // Re-run effect when cellularCheckEnabled changes

  // Save policy changes to localStorage
  useEffect(() => {
    localStorage.setItem('mediaAutoLoadPolicy', mediaAutoLoadPolicy);
    bundleLog('battery', `🔋 Media auto-load policy changed: ${mediaAutoLoadPolicy}`);
  }, [mediaAutoLoadPolicy]);

  // Calculate if media should auto-load based on policy and connection
  const autoLoadMedia = useMemo(() => {
    if (mediaAutoLoadPolicy === 'always') {
      return true;
    }
    
    if (mediaAutoLoadPolicy === 'never') {
      return false;
    }
    
    // 'wifi-only' policy - check connection type
    // Load on WiFi, Ethernet, or Unknown (fallback for unsupported browsers)
    const shouldLoad = connectionType === 'wifi' || connectionType === 'ethernet' || connectionType === 'unknown';
    
    if (!shouldLoad && connectionType === 'cellular') {
      bundleLog('battery', '🔋 Cellular connection detected - media auto-load disabled (WiFi-only policy)');
    }
    
    return shouldLoad;
  }, [mediaAutoLoadPolicy, connectionType]);

  const value: ContentPolicyContextValue = {
    autoLoadMedia,
    mediaAutoLoadPolicy,
    setMediaAutoLoadPolicy,
    connectionType,
  };

  return (
    <ContentPolicyContext.Provider value={value}>
      {children}
    </ContentPolicyContext.Provider>
  );
}

export function useContentPolicy(): ContentPolicyContextValue {
  const context = useContext(ContentPolicyContext);
  
  if (context === undefined) {
    throw new Error('useContentPolicy must be used within a ContentPolicyProvider');
  }
  
  return context;
}
