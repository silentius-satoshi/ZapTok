import { useLocalStorage } from '@/hooks/useLocalStorage';

interface CashuPreferences {
  cashuEnabled: boolean;
}

const DEFAULT_PREFERENCES: CashuPreferences = {
  cashuEnabled: true, // Enabled by default for existing users
};

/**
 * Hook to manage user preferences for Cashu features
 * Allows users to hide/show all Cashu-related UI elements
 */
export function useCashuPreferences() {
  const [preferences, setPreferences] = useLocalStorage<CashuPreferences>(
    'cashu-preferences',
    DEFAULT_PREFERENCES
  );

  const toggleCashuEnabled = () => {
    setPreferences(prev => ({
      ...prev,
      cashuEnabled: !prev.cashuEnabled,
    }));
  };

  const setCashuEnabled = (enabled: boolean) => {
    setPreferences(prev => ({
      ...prev,
      cashuEnabled: enabled,
    }));
  };

  return {
    cashuEnabled: preferences.cashuEnabled,
    toggleCashuEnabled,
    setCashuEnabled,
  };
}
