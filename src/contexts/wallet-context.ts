import { createContext } from 'react';
import type { WalletContextType } from '@/lib/wallet-types';

export const WalletContext = createContext<WalletContextType | undefined>(undefined);
