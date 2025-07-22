/// <reference types="vite/client" />

import { WebLNProvider } from '@/lib/wallet-types';

declare global {
  interface Window {
    webln?: WebLNProvider;
  }
}
