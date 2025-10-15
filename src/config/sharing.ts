export interface SharingConfig {
  zapTokEnabled: boolean;
  zapTokBaseUrl: string;
  enableAdvancedFeatures: boolean;
  enableAnimatedQR: boolean;
  enableMultiClientSharing: boolean;
  enableVanityUrls: boolean;
}

export const SHARING_CONFIG: SharingConfig = {
  zapTokEnabled: true, // Enable ZapTok URLs as primary
  zapTokBaseUrl: 'https://zaptok.social',
  enableAdvancedFeatures: true,
  enableAnimatedQR: false, // Keep false for now (Phase 3)
  enableMultiClientSharing: false, // Keep false for now (Phase 3)
  enableVanityUrls: true,
};

// Environment-based overrides
export function getSharingConfig(): SharingConfig {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    ...SHARING_CONFIG,
    // In development, might want to test with different settings
    zapTokEnabled: isDevelopment ? true : SHARING_CONFIG.zapTokEnabled,
  };
}