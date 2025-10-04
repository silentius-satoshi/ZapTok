import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLoginActions } from '@/hooks/useLoginActions';
import { useToast } from '@/hooks/useToast';
import { HelpCircle } from 'lucide-react';
import ExtensionLogin from './ExtensionLogin';
import zapTokLogo from '/images/ZapTok-v3.png';
import PrivateKeyLogin from './PrivateKeyLogin';
import BunkerLogin from './BunkerLogin';
import { devLog, devError } from '@/lib/devConsole';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SignInModal({ isOpen, onClose }: SignInModalProps) {
  const { user } = useCurrentUser();
  const login = useLoginActions();
  const { toast } = useToast();
  const [isLocked, setIsLocked] = useState(false);

  // Auto-close modal when user logs in
  useEffect(() => {
    if (user && isOpen) {
      // Defer the modal close to avoid state update during render warning
      setTimeout(() => onClose(), 0);
    }
  }, [user, isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      // Store original overflow
      const originalOverflow = document.body.style.overflow;
      // Prevent scrolling
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Restore original overflow
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const handleExtensionLogin = async () => {
    setIsLocked(true);
    try {
      if (!('nostr' in window)) {
        throw new Error('Nostr extension not found. Please install a NIP-07 extension.');
      }
      devLog('Starting extension login process...');
      await login.extension();
      devLog('Extension login successful, closing modal');
      // Defer the modal close to avoid state update during render warning
      setTimeout(() => onClose(), 0);
    } catch (error) {
      devError('Extension login failed:', error);
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : "Failed to connect to extension",
        variant: "destructive",
      });
    } finally {
      setIsLocked(false);
    }
  };

  const handlePrivateKeyLogin = async (privateKey: string) => {
    setIsLocked(true);
    try {
      await login.nsec(privateKey);
      // Defer the modal close to avoid state update during render warning
      setTimeout(() => onClose(), 0);
    } catch (error) {
      console.error('Private key login failed:', error);
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : "Invalid private key",
        variant: "destructive",
      });
      throw error; // Re-throw to let the child component handle loading state
    } finally {
      setIsLocked(false);
    }
  };

  const handleBunkerLogin = async (bunkerUrl: string) => {
    setIsLocked(true);
    try {
      // Try the new nostr-tools implementation first
      devLog('🔧 Attempting bunker login with nostr-tools implementation...');
      await login.bunkerNostrTools(bunkerUrl);
      devLog('✅ nostr-tools bunker login successful!');
      // Defer the modal close to avoid state update during render warning
      setTimeout(() => onClose(), 0);
      return;
    } catch (nostrToolsError) {
      devLog('❌ nostr-tools bunker login failed, falling back to Nostrify...', nostrToolsError);

      // Fallback to the original Nostrify implementation
      try {
        await login.bunker(bunkerUrl);
        // Defer the modal close to avoid state update during render warning
        setTimeout(() => onClose(), 0);
      } catch (error) {
        devError('Bunker login fallback also failed:', error);

        // Don't show error toast for confirmation URLs since BunkerLogin handles the flow
        if (!(error instanceof Error && error.message.startsWith('https://'))) {
          toast({
            title: "Login Failed",
            description: error instanceof Error ? error.message : "An unexpected error occurred",
            variant: "destructive",
          });
        }

        throw error; // Re-throw so BunkerLogin can handle it
      }
    } finally {
      setIsLocked(false);
    }
  };

  if (!isOpen) return null;

  // Prevent scroll propagation to underlying content
  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
  };

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black flex items-center justify-center p-4 overflow-y-auto scrollbar-hide" 
      style={{ zIndex: 99999 }}
      onWheel={handleWheel}
      onTouchMove={handleTouchMove}
    >
      <div className="w-full max-w-md my-auto relative z-10">
        <Card className="bg-gray-900 border-gray-800">
          {/* Header - Scrolls with content */}
          <CardHeader className="text-center pb-4 pt-6">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <img
                src={zapTokLogo}
                alt="ZapTok Logo"
                className="w-8 h-8 rounded-lg"
              />
              <CardTitle className="text-3xl bg-gradient-to-r from-purple-400 to-orange-400 bg-clip-text text-transparent">
                ZapTok
              </CardTitle>
            </div>
            <CardDescription className="text-gray-300 flex items-center justify-center space-x-2">
              <span>Connect your Nostr identity to create value + earn sats</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="w-4 h-4 text-gray-400 hover:text-white" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">
                      <strong>What is Nostr?</strong><br />
                      Nostr is decentralized social media where you own your identity and can earn Bitcoin (sats) for your content. No company controls your account - just you and your keys. Create, share, and get value for value in lightning fast Bitcoin! ⚡
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardDescription>
          </CardHeader>

          {/* Content - Everything scrolls together */}
          <CardContent className="space-y-6 pt-6">
            <Tabs defaultValue={('nostr' in window) ? 'extension' : 'key'} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="extension">Extension</TabsTrigger>
                <TabsTrigger value="key">Private Key</TabsTrigger>
                <TabsTrigger value="bunker">Bunker</TabsTrigger>
              </TabsList>

              <TabsContent value="extension" className="space-y-4">
                <ExtensionLogin
                  hasExtension={'nostr' in window}
                  loginWithExtension={handleExtensionLogin}
                  isLocked={isLocked}
                  isPWA={false}
                />
              </TabsContent>

              <TabsContent value="key" className="space-y-4">
                <PrivateKeyLogin login={handlePrivateKeyLogin} isLocked={isLocked} />
              </TabsContent>

              <TabsContent value="bunker" className="space-y-4">
                <BunkerLogin login={handleBunkerLogin} isLocked={isLocked} />
              </TabsContent>
            </Tabs>

            <div className="text-center pb-4">
              <Button
                variant="link"
                onClick={onClose}
                className="text-gray-400 hover:text-white"
                disabled={isLocked}
              >
                Back to main login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Render modal in a portal at document root to escape stacking contexts
  return createPortal(modalContent, document.body);
}
