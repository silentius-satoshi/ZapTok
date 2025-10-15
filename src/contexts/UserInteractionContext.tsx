import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface UserInteractionContextType {
  hasUserInteracted: boolean;
  enableAutoplay: () => void;
}

const UserInteractionContext = createContext<UserInteractionContextType | undefined>(undefined);

interface UserInteractionProviderProps {
  children: ReactNode;
}

export function UserInteractionProvider({ children }: UserInteractionProviderProps) {
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  useEffect(() => {
    // List of events that indicate user interaction
    const interactionEvents = [
      'click',
      'keydown',
      'touchstart',
      'mousedown',
      'pointerdown'
    ];

    const handleUserInteraction = () => {
      setHasUserInteracted(true);
      
      // Remove event listeners after first interaction
      interactionEvents.forEach(event => {
        document.removeEventListener(event, handleUserInteraction, { capture: true });
      });
    };

    // Add event listeners for user interaction
    interactionEvents.forEach(event => {
      document.addEventListener(event, handleUserInteraction, { capture: true, passive: true });
    });

    return () => {
      // Cleanup event listeners
      interactionEvents.forEach(event => {
        document.removeEventListener(event, handleUserInteraction, { capture: true });
      });
    };
  }, []);

  const enableAutoplay = () => {
    setHasUserInteracted(true);
  };

  return (
    <UserInteractionContext.Provider value={{ hasUserInteracted, enableAutoplay }}>
      {children}
    </UserInteractionContext.Provider>
  );
}

export function useUserInteraction() {
  const context = useContext(UserInteractionContext);
  if (context === undefined) {
    throw new Error('useUserInteraction must be used within a UserInteractionProvider');
  }
  return context;
}