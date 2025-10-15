import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface ZapContextType {
  defaultZapSats: number;
  defaultZapComment: string;
  quickZap: boolean;
  updateDefaultSats: (sats: number) => void;
  updateDefaultComment: (comment: string) => void;
  updateQuickZap: (enabled: boolean) => void;
}

const ZapContext = createContext<ZapContextType | undefined>(undefined);

interface ZapProviderProps {
  children: React.ReactNode;
}

export function ZapProvider({ children }: ZapProviderProps) {
  // Default values based on Jumble's implementation
  const [defaultZapSats, setDefaultZapSats] = useLocalStorage('defaultZapSats', 21);
  const [defaultZapComment, setDefaultZapComment] = useLocalStorage('defaultZapComment', '');
  const [quickZap, setQuickZap] = useLocalStorage('quickZap', true);

  const updateDefaultSats = (sats: number) => {
    if (sats >= 1 && sats <= 100000) {
      setDefaultZapSats(sats);
    }
  };

  const updateDefaultComment = (comment: string) => {
    setDefaultZapComment(comment);
  };

  const updateQuickZap = (enabled: boolean) => {
    setQuickZap(enabled);
  };

  return (
    <ZapContext.Provider
      value={{
        defaultZapSats,
        defaultZapComment,
        quickZap,
        updateDefaultSats,
        updateDefaultComment,
        updateQuickZap
      }}
    >
      {children}
    </ZapContext.Provider>
  );
}

export function useZap() {
  const context = useContext(ZapContext);
  if (context === undefined) {
    throw new Error('useZap must be used within a ZapProvider');
  }
  return context;
}