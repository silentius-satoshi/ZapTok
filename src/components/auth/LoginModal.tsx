import { useState, useEffect } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { SignInModal } from './SignInModal';
import GetStartedModal from './GetStartedModal';
import { PWAInstallModal } from '@/components/PWAInstallModal';
import { usePWA } from '@/hooks/usePWA';
import { Monitor, Download } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { user } = useCurrentUser();
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showGetStartedModal, setShowGetStartedModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const {
    isInstallable,
    isInstalled,
    isStandalone,
    isInstalling,
  } = usePWA();

  // Auto-close modal when user logs in
  useEffect(() => {
    if (user) {
      onClose();
    }
  }, [user, onClose]);

  // Check if we're in a PWA environment
  const isPWA = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;

  // Security warnings
  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const warnings: string[] = [];
  if (!isSecure) warnings.push('Not using HTTPS');
  if (isPWA) warnings.push('PWA environment detected');

  if (!isOpen) return null;

  return (
    <>
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-orange-900/20" />
        
        <div className="relative z-10 text-center">
          <div className="flex items-center justify-center space-x-4 mb-8">
            <img 
              src="/images/ZapTok-v3.png"
              alt="ZapTok"
              className="w-16 h-16 rounded-2xl shadow-lg border border-gray-700/50"
            />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-orange-400 bg-clip-text text-transparent">
              ZapTok
            </h1>
          </div>
          
          <p className="text-gray-300 mb-8 text-lg">
            Connect your Nostr identity to create value + earn sats
          </p>
          
          {/* Get Started Button */}
          <div className="space-y-4 mb-8">
            <button
              onClick={() => setShowGetStartedModal(true)}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-8 py-3 rounded-lg text-lg font-medium transition-all transform hover:scale-105"
            >
              Get Started
            </button>
          </div>
          
          <div className="flex items-center justify-center space-x-2">
            <span className="text-gray-300 text-lg">Have a Nostr account?</span>
            <button
              onClick={() => setShowSignInModal(true)}
              className="text-purple-400 hover:text-purple-300 text-lg font-medium transition-colors"
            >
              Sign in
            </button>
          </div>

          {/* PWA Install Section - show when not in standalone mode for better discoverability */}
          {!isStandalone && (
            <div className="mt-8 p-6 bg-gray-800/20 backdrop-blur-sm rounded-2xl border border-gray-600/30">
              <div className="flex items-center justify-center space-x-3 mb-3">
                <Monitor className="h-6 w-6 text-gray-400" />
                <h3 className="text-xl font-medium text-white">Get the App</h3>
              </div>
              <p className="text-gray-400 text-base mb-6 text-center">
                Install ZapTok for the best experience
              </p>
              <button
                onClick={() => setShowInstallModal(true)}
                disabled={isInstalling}
                className="w-full flex items-center justify-center space-x-2 bg-gray-700/40 hover:bg-gray-600/50 border border-gray-500/40 text-white px-6 py-4 rounded-xl transition-all font-medium text-base"
              >
                <Download className="h-5 w-5" />
                <span>{isInstalling ? 'Installing...' : 'Install App'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Credit at the bottom */}
        <div className="absolute bottom-6 text-center">
          <a 
            href="https://soapbox.pub/mkstack/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-xs text-gray-500 hover:text-gray-400 transition-colors opacity-60 hover:opacity-80"
          >
            vibed by mkstack
          </a>
        </div>
      </div>

      {/* Sign In Modal */}
      <SignInModal 
        isOpen={showSignInModal} 
        onClose={() => setShowSignInModal(false)} 
      />

      {/* Get Started Modal */}
      {showGetStartedModal && (
        <GetStartedModal 
          onClose={() => setShowGetStartedModal(false)}
          onBackToLogin={() => {
            setShowGetStartedModal(false);
            // Main login modal stays open
          }}
        />
      )}

      {/* PWA Install Modal */}
      <PWAInstallModal 
        isOpen={showInstallModal} 
        onClose={() => setShowInstallModal(false)} 
      />
    </>
  );
}
