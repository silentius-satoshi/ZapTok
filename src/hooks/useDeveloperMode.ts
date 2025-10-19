import { useLocalStorage } from '@/hooks/useLocalStorage';

interface DeveloperPreferences {
  developerModeEnabled: boolean;
}

const DEFAULT_PREFERENCES: DeveloperPreferences = {
  developerModeEnabled: false, // Disabled by default for safety
};

/**
 * Hook to manage developer mode preferences
 * Controls visibility of advanced developer settings
 */
export function useDeveloperMode() {
  const [preferences, setPreferences] = useLocalStorage<DeveloperPreferences>(
    'developer-preferences',
    DEFAULT_PREFERENCES
  );

  const toggleDeveloperMode = () => {
    setPreferences(prev => ({
      ...prev,
      developerModeEnabled: !prev.developerModeEnabled,
    }));
  };

  const setDeveloperMode = (enabled: boolean) => {
    setPreferences(prev => ({
      ...prev,
      developerModeEnabled: enabled,
    }));
  };

  return {
    developerModeEnabled: preferences.developerModeEnabled,
    toggleDeveloperMode,
    setDeveloperMode,
  };
}
