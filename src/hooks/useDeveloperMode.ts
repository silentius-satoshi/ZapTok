import { useLocalStorage } from '@/hooks/useLocalStorage';

interface DeveloperPreferences {
  developerModeEnabled: boolean;
  cellularCheckEnabled: boolean;
}

const DEFAULT_PREFERENCES: DeveloperPreferences = {
  developerModeEnabled: false, // Disabled by default for safety
  cellularCheckEnabled: false, // Disabled by default (off)
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

  const toggleCellularCheck = () => {
    setPreferences(prev => ({
      ...prev,
      cellularCheckEnabled: !prev.cellularCheckEnabled,
    }));
  };

  const setCellularCheck = (enabled: boolean) => {
    setPreferences(prev => ({
      ...prev,
      cellularCheckEnabled: enabled,
    }));
  };

  return {
    developerModeEnabled: preferences.developerModeEnabled ?? DEFAULT_PREFERENCES.developerModeEnabled,
    cellularCheckEnabled: preferences.cellularCheckEnabled ?? DEFAULT_PREFERENCES.cellularCheckEnabled,
    toggleDeveloperMode,
    setDeveloperMode,
    toggleCellularCheck,
    setCellularCheck,
  };
}
