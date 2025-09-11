import { createRoot } from 'react-dom/client';
import { enableMapSet } from 'immer';

// Import polyfills first
import './lib/polyfills.ts';

// Enable Immer MapSet plugin for Zustand stores
enableMapSet();

import App from './App.tsx';
import './index.css';

// Import Blossom test function for development debugging
if (import.meta.env.DEV) {
  import('./lib/testBlossomServers').then(({ testBlossomServers }) => {
    (window as any).testBlossomServers = testBlossomServers;
    console.log('🧪 Blossom server test available: testBlossomServers()');
  });
}

createRoot(document.getElementById("root")!).render(<App />);
