import { ReactNode, useEffect } from 'react';
import { z } from 'zod';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { AppContext, type AppConfig, type AppContextType, type Theme } from '@/contexts/AppContext';
import type { ZapOption } from '@/types/zap';
import { defaultZap, defaultZapOptions } from '@/types/zap';
import { DEFAULT_BLOSSOM_SERVERS } from '@/lib/blossomUtils';

interface AppProviderProps {
  children: ReactNode;
  /** Application storage key */
  storageKey: string;
  /** Default app configuration */
  defaultConfig: AppConfig;
  /** Optional list of preset relays to display in the RelaySelector */
  presetRelays?: { name: string; url: string }[];
}

// Zod schema for ZapOption validation
const ZapOptionSchema = z.object({
  amount: z.number().min(1),
  emoji: z.string().min(1),
  message: z.string(),
});

// Zod schema for AppConfig validation
const AppConfigSchema: z.ZodType<AppConfig, z.ZodTypeDef, unknown> = z.object({
  theme: z.enum(['dark', 'light', 'system']),
  relayUrls: z.array(z.string().url()).min(1),
  defaultZap: ZapOptionSchema,
  availableZapOptions: z.array(ZapOptionSchema).min(1),
  relayContext: z.enum(['all', 'wallet', 'feed', 'cashu-only', 'none', 'settings-cashu', 'search-only']).optional(),
  blossomServers: z.array(z.string().url()).min(1),
});

// Migration schema for old single relay configs
const LegacyAppConfigSchema = z.object({
  theme: z.enum(['dark', 'light', 'system']),
  relayUrl: z.string().url(),
});

export function AppProvider(props: AppProviderProps) {
  const {
    children,
    storageKey,
    defaultConfig,
    presetRelays,
  } = props;

  // App configuration state with localStorage persistence
  const [config, setConfig] = useLocalStorage<AppConfig>(
    storageKey,
    defaultConfig,
    {
      serialize: JSON.stringify,
      deserialize: (value: string) => {
        const parsed = JSON.parse(value);

        // Try to parse as new config first
        const newConfigResult = AppConfigSchema.safeParse(parsed);
        if (newConfigResult.success) {
          return newConfigResult.data;
        }

        // Try to parse as legacy config and migrate
        const legacyConfigResult = LegacyAppConfigSchema.safeParse(parsed);
        if (legacyConfigResult.success) {
          return {
            theme: legacyConfigResult.data.theme,
            relayUrls: [legacyConfigResult.data.relayUrl],
            defaultZap,
            availableZapOptions: defaultZapOptions,
            relayContext: 'all',
            blossomServers: DEFAULT_BLOSSOM_SERVERS,
          };
        }

        // If both fail, return default config
        return defaultConfig;
      }
    }
  );

  // Generic config updater with callback pattern
  const updateConfig = (updater: (currentConfig: AppConfig) => AppConfig) => {
    setConfig(updater);
  };

  // Add relay function
  const addRelay = (relayUrl: string) => {
    updateConfig((current) => ({
      ...current,
      relayUrls: [...current.relayUrls.filter(url => url !== relayUrl), relayUrl]
    }));
  };

  // Remove relay function
  const removeRelay = (relayUrl: string) => {
    updateConfig((current) => ({
      ...current,
      relayUrls: current.relayUrls.filter(url => url !== relayUrl)
    }));
  };

  // Set default zap function
  const setDefaultZap = (zapOption: ZapOption) => {
    updateConfig((current) => ({
      ...current,
      defaultZap: zapOption
    }));
  };

  // Set zap option at specific index
  const setZapOption = (zapOption: Partial<ZapOption>, index: number) => {
    updateConfig((current) => ({
      ...current,
      availableZapOptions: current.availableZapOptions.map((option, i) =>
        i === index ? { ...option, ...zapOption } : option
      )
    }));
  };

  // Reset zap options to default
  const resetZapOptionsToDefault = () => {
    updateConfig((current) => ({
      ...current,
      defaultZap,
      availableZapOptions: [...defaultZapOptions]
    }));
  };

  // Set relay context function
  const setRelayContext = (relayContext: 'all' | 'wallet' | 'feed' | 'cashu-only' | 'none' | 'settings-cashu' | 'search-only') => {
    updateConfig((current) => ({
      ...current,
      relayContext
    }));
  };

  // Add or replace primary Blossom server
  const addBlossomServer = (serverUrl: string) => {
    updateConfig((current) => ({
      ...current,
      blossomServers: [serverUrl, ...current.blossomServers.slice(1)]
    }));
  };

  // Append a mirror Blossom server
  const appendBlossomServer = (serverUrl: string) => {
    updateConfig((current) => ({
      ...current,
      blossomServers: [...current.blossomServers.filter(url => url !== serverUrl), serverUrl]
    }));
  };

  // Remove a specific Blossom server
  const removeBlossomServer = (serverUrl: string) => {
    updateConfig((current) => ({
      ...current,
      blossomServers: current.blossomServers.filter(url => url !== serverUrl)
    }));
  };

  // Remove all mirror servers (keep only primary)
  const removeBlossomMirrors = () => {
    updateConfig((current) => ({
      ...current,
      blossomServers: current.blossomServers.slice(0, 1)
    }));
  };

  const appContextValue: AppContextType = {
    config,
    updateConfig,
    addRelay,
    removeRelay,
    setDefaultZap,
    setZapOption,
    resetZapOptionsToDefault,
    setRelayContext,
    presetRelays,
    addBlossomServer,
    appendBlossomServer,
    removeBlossomServer,
    removeBlossomMirrors,
  };

  // Apply theme effects to document
  useApplyTheme(config.theme);

  return (
    <AppContext.Provider value={appContextValue}>
      {children}
    </AppContext.Provider>
  );
}

/**
 * Hook to apply theme changes to the document root
 */
function useApplyTheme(theme: Theme) {
  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light';

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  // Handle system theme changes when theme is set to "system"
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');

      const systemTheme = mediaQuery.matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);
}