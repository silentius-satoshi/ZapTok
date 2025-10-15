import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Wallet, Chrome } from 'lucide-react';

interface ExtensionLoginProps {
  hasExtension: boolean;
  loginWithExtension: () => Promise<void>;
  isLocked: boolean;
  isPWA: boolean;
}

const ExtensionLogin = ({ hasExtension, loginWithExtension, isLocked, isPWA }: ExtensionLoginProps) => {
  const [isExtensionLoading, setIsExtensionLoading] = useState(false);

  const handleExtensionLogin = async () => {
    if (!('nostr' in window)) {
      // Error handling will be done by parent component via toast
      return;
    }

    setIsExtensionLoading(true);
    try {
      await loginWithExtension();
    } catch (error) {
      // Error handling will be done by parent component via toast
      console.error('Extension login failed:', error);
    } finally {
      setIsExtensionLoading(false);
    }
  };

  if (hasExtension) {
    return (
      <div className="space-y-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-green-300 flex items-center space-x-2">
            <Wallet className="w-4 h-4" />
            <span>Connect with Extension:</span>
          </h4>
          <p className="text-xs text-gray-300 leading-relaxed">
            Login with one click using a NIP-07 compatible browser extension like Alby, nos2x, or Amber to securely connect without sharing your keys
          </p>
        </div>
        
        <Button 
          onClick={handleExtensionLogin} 
          disabled={isExtensionLoading || isLocked} 
          className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
        >
          <Wallet className="w-4 h-4 mr-2" />
          {isExtensionLoading ? "Connecting..." : "Login with Extension"}
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
      <div className="flex items-center space-x-2 mb-2">
        <Chrome className="w-4 h-4 text-blue-300" />
        <h4 className="text-sm font-semibold text-blue-300">No Extension Detected</h4>
      </div>
      <p className="text-xs text-blue-200 leading-relaxed mb-3">
        Install a Nostr browser extension like Alby, nos2x, or Amber for easier login.
      </p>
      {isPWA && (
        <p className="text-xs text-yellow-200 leading-relaxed mb-3">
          💡 Tip: Extensions work best when accessing ZapTok through your regular browser. For PWA, use bunker:// connection with Amber instead.
        </p>
      )}
      <Button 
        onClick={handleExtensionLogin} 
        disabled={isExtensionLoading || isLocked} 
        className="w-full bg-gray-600 hover:bg-gray-700 text-white"
      >
        <Wallet className="w-4 h-4 mr-2" />
        {isExtensionLoading ? "Checking..." : "Try Extension Login"}
      </Button>
    </div>
  );
};

export default ExtensionLogin;
