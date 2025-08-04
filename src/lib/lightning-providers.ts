/**
 * Lightning address providers that work well with browser requests
 */

export interface LightningProvider {
  domain: string;
  corsSupport: 'full' | 'partial' | 'none';
  supportsZaps: boolean;
  notes?: string;
}

export const LIGHTNING_PROVIDERS: LightningProvider[] = [
  {
    domain: 'stacker.news',
    corsSupport: 'full',
    supportsZaps: true,
    notes: 'Excellent CORS support, works well in browsers'
  },
  {
    domain: 'getalby.com',
    corsSupport: 'full',
    supportsZaps: true,
    notes: 'Native Alby support with good CORS'
  },
  {
    domain: 'zbd.gg',
    corsSupport: 'partial',
    supportsZaps: true,
    notes: 'Good for mobile, some CORS limitations'
  },
  {
    domain: 'primal.net',
    corsSupport: 'none',
    supportsZaps: true,
    notes: 'No CORS support - requires proxy or server-side requests'
  },
  {
    domain: 'walletofsatoshi.com',
    corsSupport: 'none',
    supportsZaps: true,
    notes: 'Popular but no CORS support for direct browser requests'
  }
];

/**
 * Check if a Lightning address provider supports CORS
 */
export function providerSupportsCORS(lightningAddress: string): boolean {
  const domain = lightningAddress.split('@')[1];
  if (!domain) return false;
  
  const provider = LIGHTNING_PROVIDERS.find(p => p.domain === domain);
  return provider ? provider.corsSupport === 'full' : false;
}

/**
 * Get provider info for a Lightning address
 */
export function getProviderInfo(lightningAddress: string): LightningProvider | null {
  const domain = lightningAddress.split('@')[1];
  if (!domain) return null;
  
  return LIGHTNING_PROVIDERS.find(p => p.domain === domain) || null;
}

/**
 * Suggest alternative payment methods based on provider capabilities
 */
export function getPaymentSuggestion(lightningAddress: string): {
  canUseWebLN: boolean;
  shouldUseCashu: boolean;
  message: string;
  isBlocked: boolean;
} {
  const provider = getProviderInfo(lightningAddress);
  
  if (!provider) {
    return {
      canUseWebLN: false,
      shouldUseCashu: false,
      isBlocked: true,
      message: 'Unknown provider - may not work with browser apps'
    };
  }
  
  switch (provider.corsSupport) {
    case 'full':
      return {
        canUseWebLN: true,
        shouldUseCashu: false,
        isBlocked: false,
        message: 'WebLN should work well with this provider'
      };
    case 'partial':
      return {
        canUseWebLN: true,
        shouldUseCashu: true,
        isBlocked: false,
        message: 'WebLN may work, but results may vary'
      };
    case 'none':
      return {
        canUseWebLN: false,
        shouldUseCashu: false,
        isBlocked: true,
        message: `${provider.domain} doesn't support browser apps. Try a different Lightning address from Alby, Stacker News, or ZBD.`
      };
    default:
      return {
        canUseWebLN: false,
        shouldUseCashu: false,
        isBlocked: true,
        message: 'This provider may not work with browser apps'
      };
  }
}
