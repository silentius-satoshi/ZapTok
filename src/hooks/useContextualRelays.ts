import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppContext } from '@/hooks/useAppContext';
import { type RelayContext } from '@/lib/relayOptimization';
import { logRoute } from '@/lib/devLogger';

/**
 * Map of route patterns to optimal relay contexts
 * Order matters - more specific routes should come first
 */
const routeContextMap: Record<string, RelayContext> = {
  // Settings routes - no relays (except Cashu-related) - MUST come before '/'
  '/settings/connected-wallets': 'settings-cashu', // Has Cashu relay settings
  '/settings/profile': 'none',
  '/settings/relays': 'none', 
  '/settings/appearance': 'none',
  '/settings/about': 'none',
  '/settings': 'none',
  
  // Lightning wallet - only Cashu relay
  '/wallet': 'cashu-only',
  '/lightning': 'cashu-only',
  
  // Legacy Cashu routes
  '/cashu': 'cashu-only',
  
  // Profile and social routes - use feed-optimized relays  
  '/profile': 'feed',
  '/npub': 'feed',
  '/note': 'feed',
  '/nevent': 'feed',
  '/naddr': 'feed',
  '/following': 'feed',
  '/discover': 'feed',
  '/feed': 'feed',
  
  // Home route - MUST come last as it matches everything starting with '/'
  '/': 'feed',
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
      if (import.meta.env.DEV) {
        logRoute('debug', `Switching from ${config.relayContext} to ${optimalContext} context for route: ${currentPath}`);
      }
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
