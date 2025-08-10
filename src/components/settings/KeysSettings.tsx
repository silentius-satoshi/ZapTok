import { useState } from 'react';
import { Copy, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '@/hooks/useToast';
import { useNostrLogin } from '@nostrify/react/login';
import { nip19 } from 'nostr-tools';

export function KeysSettings() {
  const { user } = useCurrentUser();
  const { logins } = useNostrLogin();
  const { toast } = useToast();
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const getPublicKey = () => {
    if (!user?.pubkey) return '';
    try {
      return nip19.npubEncode(user.pubkey);
    } catch {
      return '';
    }
  };

  const getPrivateKey = (): string => {
    // For security reasons, we typically cannot access private keys
    // This would only work for direct nsec string logins
    return '';
  };

  const currentLogin = logins[0]; // Get first login for now
  const publicKey = getPublicKey();
  const privateKey = getPrivateKey();
  const isExtensionLogin = currentLogin?.type === 'extension';
  const canShowPrivateKey = false; // Always false for security

  return (
    <div className="p-6 space-y-8 text-white">
      {/* Title and Description */}
      <div className="space-y-4">
        <h2 className="text-4xl font-light">Your Keys</h2>
        <p className="text-gray-400 text-lg leading-relaxed max-w-4xl">
          Your Nostr identity consists of a public key (npub) and private key (nsec). Your public key is like your username - share it freely so others can find and follow you. Your private key is your password - never share it with anyone. With your private key, you can log into any Nostr app and access your identity, followers, and content.
        </p>
      </div>

      {/* Public Key Section */}
      <div className="space-y-3">
        <h3 className="text-xl font-medium">Public Key (npub)</h3>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-gray-900/50 border border-gray-700 rounded-lg p-4 font-mono text-sm break-all">
            {publicKey || 'Not available'}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => copyToClipboard(publicKey, 'Public key')}
            disabled={!publicKey}
            className="text-gray-400 hover:text-white"
          >
            <Copy className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-gray-500 text-sm">
          Share this with others so they can find and follow you on Nostr.
        </p>
      </div>

      {/* Private Key Section */}
      <div className="space-y-3">
        <h3 className="text-xl font-medium">Private Key (nsec)</h3>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-gray-900/50 border border-gray-700 rounded-lg p-4 font-mono text-sm break-all">
            {canShowPrivateKey ? (
              showPrivateKey ? privateKey : '•'.repeat(64)
            ) : (
              showPrivateKey ? '***** Private key not accessible *****' : '•'.repeat(32)
            )}
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowPrivateKey(!showPrivateKey)}
              className="text-gray-400 hover:text-white"
            >
              {showPrivateKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => copyToClipboard(privateKey, 'Private key')}
              disabled={!canShowPrivateKey || !privateKey}
              className="text-gray-400 hover:text-white"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <p className="text-gray-500 text-sm">
          This app cannot access your private key directly if using an extension. This is for your security.
        </p>
      </div>
    </div>
  );
}
