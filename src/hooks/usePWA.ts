import { useState, useEffect, useCallback } from 'react';

export interface PWAInstallPrompt {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface ServiceWorkerRegistration {
  installing: ServiceWorker | null;
  waiting: ServiceWorker | null;
  active: ServiceWorker | null;
  update: () => Promise<void>;
  unregister: () => Promise<boolean>;
}

export interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  isOnline: boolean;
  serviceWorkerRegistration: ServiceWorkerRegistration | null;
  installPrompt: PWAInstallPrompt | null;
  hasUpdate: boolean;
  isInstalling: boolean;
  installError: string | null;
}

export interface PWAActions {
  installPWA: () => Promise<boolean>;
  showInstallPrompt: () => Promise<boolean>;
  updateServiceWorker: () => Promise<void>;
  dismissInstallPrompt: () => void;
  clearInstallError: () => void;
}

export function usePWA(): PWAState & PWAActions {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [serviceWorkerRegistration, setServiceWorkerRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [installPrompt, setInstallPrompt] = useState<PWAInstallPrompt | null>(null);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);

  // Check if app is running in standalone mode
  useEffect(() => {
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');

      setIsStandalone(isStandaloneMode);
      setIsInstalled(isStandaloneMode);
    };

    checkStandalone();

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = () => checkStandalone();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handle beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      if (import.meta.env.DEV) {
        console.log('[PWA] Install prompt available');
      }
      e.preventDefault();

      const deferredPrompt = e as any;
      setInstallPrompt(deferredPrompt);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      console.log('[PWA] App installed successfully');
      setIsInstalled(true);
      setIsInstallable(false);
      setInstallPrompt(null);
      setIsInstalling(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
        .then((registration) => {
          if (import.meta.env.DEV) {
            console.log('[PWA] Service Worker registered successfully with base URL:', import.meta.env.BASE_URL);
          }

          const swRegistration: ServiceWorkerRegistration = {
            installing: registration.installing,
            waiting: registration.waiting,
            active: registration.active,
            update: async () => { await registration.update(); },
            unregister: () => registration.unregister(),
          };

          setServiceWorkerRegistration(swRegistration);

          // Check for updates
          registration.addEventListener('updatefound', () => {
            if (import.meta.env.DEV) {
              console.log('[PWA] Service Worker update found');
            }
            setHasUpdate(true);
          });

          // Listen for service worker messages
          navigator.serviceWorker.addEventListener('message', (event) => {
            console.log('[PWA] Message from SW:', event.data);

            if (event.data.type === 'notification-action') {
              // Handle notification actions
              const { url } = event.data;
              if (url && url !== window.location.pathname) {
                window.location.href = url;
              }
            }
          });
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error);
          setInstallError('Failed to register service worker');
        });
    }
  }, []);

  const installPWA = useCallback(async (): Promise<boolean> => {
    if (!installPrompt) {
      console.warn('[PWA] No install prompt available');
      return false;
    }

    try {
      setIsInstalling(true);
      setInstallError(null);

      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;

      console.log('[PWA] Install prompt result:', outcome);

      if (outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
        setInstallPrompt(null);
        return true;
      } else {
        setIsInstalling(false);
        return false;
      }
    } catch (error) {
      console.error('[PWA] Install failed:', error);
      setInstallError('Installation failed. Please try again.');
      setIsInstalling(false);
      return false;
    }
  }, [installPrompt]);

  const showInstallPrompt = useCallback(async (): Promise<boolean> => {
    return installPWA();
  }, [installPWA]);

  const updateServiceWorker = useCallback(async (): Promise<void> => {
    if (!serviceWorkerRegistration) {
      throw new Error('No service worker registration available');
    }

    try {
      await serviceWorkerRegistration.update();
      setHasUpdate(false);

      // Reload the page to activate the new service worker
      window.location.reload();
    } catch (error) {
      console.error('[PWA] Service Worker update failed:', error);
      throw error;
    }
  }, [serviceWorkerRegistration]);

  const dismissInstallPrompt = useCallback(() => {
    setIsInstallable(false);
    setInstallPrompt(null);
  }, []);

  const clearInstallError = useCallback(() => {
    setInstallError(null);
  }, []);

  return {
    // State
    isInstallable,
    isInstalled,
    isStandalone,
    isOnline,
    serviceWorkerRegistration,
    installPrompt,
    hasUpdate,
    isInstalling,
    installError,

    // Actions
    installPWA,
    showInstallPrompt,
    updateServiceWorker,
    dismissInstallPrompt,
    clearInstallError,
  };
}
