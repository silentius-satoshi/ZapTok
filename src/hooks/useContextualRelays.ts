import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppContext } from '@/hooks/useAppContext';
import { type RelayContext } from '@/lib/relayOptimization';

/**
 * Map of route patterns to optimal relay contexts
 */
const routeContextMap: Record<string, RelayContext> = {
  // Lightning wallet - only Cashu relay
  '/wallet': 'cashu-only',
  '/lightning': 'cashu-only',
  
  // Feed-related routes - use feed-optimized relays  
  '/': 'feed',
  '/feed': 'feed',
  '/following': 'feed',
  '/discover': 'feed',
  
  // Profile and social routes - use feed-optimized relays
  '/profile': 'feed',
  '/npub': 'feed',
  '/note': 'feed',
  '/nevent': 'feed',
  '/naddr': 'feed',
  
  // Settings routes - no relays (except Cashu-related)
  '/settings': 'none',
  '/settings/profile': 'none',
  '/settings/relays': 'none',
  '/settings/appearance': 'none',
  '/settings/connected-wallets': 'settings-cashu', // Has Cashu relay settings
  '/settings/about': 'none',
  
  // Legacy Cashu routes
  '/cashu': 'cashu-only',
};

/**
 * Hook to automatically optimize relay connections based on current route
 * Switches to wallet-optimized relays on wallet pages, feed-optimized on social pages
 */
export function useContextualRelays() {
  const location = useLocation();
  const { config, setRelayContext } = useAppContext();
  
  useEffect(() => {
    const currentPath = location.pathname;
    
    // Find matching route pattern
    let optimalContext: RelayContext = 'feed'; // Default to feed context
    
    for (const [routePattern, context] of Object.entries(routeContextMap)) {
      if (currentPath.startsWith(routePattern)) {
        optimalContext = context;
        break;
      }
    }
    
    // Only switch context if it's different from current
    if (config.relayContext !== optimalContext) {
      console.log(`[ContextualRelays] Switching from ${config.relayContext} to ${optimalContext} context for route: ${currentPath}`);
      setRelayContext(optimalContext);
    }
  }, [location.pathname, config.relayContext, setRelayContext]);
  
  return {
    currentContext: config.relayContext || 'all',
    isOptimized: config.relayContext !== 'all',
  };
}

/**
 * Hook to manually control relay context
 */
export function useRelayContext() {
  const { config, setRelayContext } = useAppContext();
  
  return {
    context: config.relayContext || 'all',
    setContext: setRelayContext,
    isWalletContext: config.relayContext === 'wallet',
    isFeedContext: config.relayContext === 'feed',
    isAllRelaysContext: config.relayContext === 'all' || !config.relayContext,
  };
}
