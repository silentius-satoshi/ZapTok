import type { NostrEvent } from '@nostrify/nostrify';
import { generateEnhancedVideoShareURL, generateEnhancedProfileShareURL } from '@/lib/nostr-urls';

export interface SharingPreferences {
  preferredUrlType: 'zaptok' | 'njump' | 'raw';
  showMultipleOptions: boolean;
  defaultQRFormat: 'primary' | 'fallback';
  enableVanityNames: boolean;
}

const STORAGE_KEY = 'zaptok-sharing-preferences';

export function getUserSharingPreferences(): SharingPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        preferredUrlType: 'zaptok',
        showMultipleOptions: true,
        defaultQRFormat: 'primary',
        enableVanityNames: true,
        ...parsed, // Override with user preferences
      };
    }
  } catch (error) {
    console.warn('Failed to load sharing preferences:', error);
  }

  // Default preferences
  return {
    preferredUrlType: 'zaptok',
    showMultipleOptions: true,
    defaultQRFormat: 'primary',
    enableVanityNames: true,
  };
}

export function setSharingPreferences(preferences: Partial<SharingPreferences>): void {
  try {
    const current = getUserSharingPreferences();
    const updated = { ...current, ...preferences };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn('Failed to save sharing preferences:', error);
  }
}

export function getContextualQRData(
  event?: NostrEvent, 
  pubkey?: string, 
  metadata?: any,
  relays?: string[],
  vanityName?: string,
  preferences?: SharingPreferences
): string {
  const prefs = preferences || getUserSharingPreferences();
  
  try {
    if (event) {
      const urls = generateEnhancedVideoShareURL(event, {
        relays,
        vanityName: prefs.enableVanityNames ? vanityName : undefined,
        title: event.tags.find(tag => tag[0] === 'title')?.[1] || event.content?.slice(0, 50)
      });
      
      switch (prefs.preferredUrlType) {
        case 'zaptok':
          return urls.primary;
        case 'njump':
          return urls.fallback;
        case 'raw':
          return urls.raw;
        default:
          return urls.primary;
      }
    }
    
    if (pubkey) {
      const urls = generateEnhancedProfileShareURL(pubkey, {
        metadata,
        relays,
        vanityName: prefs.enableVanityNames ? vanityName : undefined
      });
      
      switch (prefs.preferredUrlType) {
        case 'zaptok':
          return urls.primary;
        case 'njump':
          return urls.fallback;
        case 'raw':
          return urls.raw;
        default:
          return urls.primary;
      }
    }
    
    throw new Error('No valid context for QR generation');
  } catch (error) {
    console.warn('Failed to generate contextual QR data:', error);
    // Fallback to basic identifier
    if (event) {
      return event.id || '';
    }
    if (pubkey) {
      return pubkey;
    }
    return '';
  }
}