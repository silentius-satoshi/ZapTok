import path from "node:path";

import react from "@vitejs/plugin-react-swc";
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from "vitest/config";
import { execSync } from 'child_process';
import packageJson from './package.json';

const getGitHash = () => {
  try {
    return JSON.stringify(execSync('git rev-parse --short HEAD').toString().trim());
  } catch (error) {
    console.warn('Failed to retrieve commit hash:', error);
    return '"unknown"';
  }
};

const getAppVersion = () => {
  try {
    return JSON.stringify(packageJson.version);
  } catch (error) {
    console.warn('Failed to retrieve app version:', error);
    return '"unknown"';
  }
};

// https://vitejs.dev/config/
export default defineConfig(() => ({
  base: process.env.NODE_ENV === 'production' && !process.env.VERCEL ? '/ZapTok/' : '/',
  define: {
    __GIT_COMMIT__: getGitHash(),
    __APP_VERSION__: getAppVersion(),
  },
  server: {
    host: "::",
    port: 5173,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@tanstack/react-query'],
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'sw.js',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB limit for PWA caching
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.(png|jpg|jpeg|svg|gif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ]
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'ZapTok',
        short_name: 'ZapTok',
        description: 'Discover and share videos on the decentralized Nostr network',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: process.env.NODE_ENV === 'production' && !process.env.VERCEL ? '/ZapTok/' : '/',
        scope: process.env.NODE_ENV === 'production' && !process.env.VERCEL ? '/ZapTok/' : '/',
        categories: ['social', 'entertainment', 'video'],
        lang: 'en',
        dir: 'ltr',
        icons: [
          {
            src: 'images/icon-72x72.png',
            sizes: '72x72',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'images/icon-96x96.png',
            sizes: '96x96',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'images/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'images/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'images/icon-152x152.png',
            sizes: '152x152',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'images/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'images/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'images/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        prefer_related_applications: false,
        shortcuts: [
          {
            name: 'Discover Videos',
            short_name: 'Discover',
            description: 'Discover trending videos',
            url: process.env.VERCEL ? '/discover' : '/ZapTok/discover',
            icons: [{ src: 'images/icon-96x96.png', sizes: '96x96' }]
          }
        ]
      }
    })
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    testTimeout: 10000, // Increase default timeout for all tests to 10 seconds
    include: ['src/**/*.{test,spec}.{ts,tsx}'], // Only include TypeScript test files
    exclude: [
      'src/**/*.{test,spec}.js', // Exclude JavaScript test files (Node.js scripts)
      'src/debug/**/*' // Exclude debug tests from regular test runs
    ],
    onConsoleLog(log) {
      return !log.includes("React Router Future Flag Warning");
    },
    env: {
      DEBUG_PRINT_LIMIT: '0', // Suppress DOM output that exceeds AI context windows
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Ensure single React instance to prevent hook call issues
      "react": path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
    },
  },
}));