import { createRoot } from 'react-dom/client';
import { enableMapSet } from 'immer';

// Import polyfills first
import './lib/polyfills.ts';

// Enable Immer MapSet plugin for Zustand stores
enableMapSet();

import App from './App.tsx';
import './index.css';

createRoot(document.getElementById("root")!).render(<App />);
