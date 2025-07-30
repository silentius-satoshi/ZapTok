import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLoginActions } from '@/hooks/useLoginActions';
import { useToast } from '@/hooks/useToast';
import { HelpCircle } from 'lucide-react';
import ExtensionLogin from './ExtensionLogin';
import PrivateKeyLogin from './PrivateKeyLogin';
import BunkerLogin from './BunkerLogin';

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
  if (user) {
    onClose();
  }

  const handleExtensionLogin = async () => {
    setIsLocked(true);
    try {
      if (!('nostr' in window)) {
        throw new Error('Nostr extension not found. Please install a NIP-07 extension.');
      }
      console.log('Starting extension login process...');
      await login.extension();
      console.log('Extension login successful, closing modal');
      onClose();
    } catch (error) {
      console.error('Extension login failed:', error);
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
      onClose();
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
      await login.bunker(bunkerUrl);
      onClose();
    } catch (error) {
      console.error('Bunker login failed:', error);
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : "Failed to connect to bunker",
        variant: "destructive",
      });
      throw error; // Re-throw to let the child component handle loading state
    } finally {
      setIsLocked(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 overflow-y-auto scrollbar-hide">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-orange-900/20" />
      
      <div className="w-full max-w-md my-8 relative z-10">
        <Card className="bg-transparent backdrop-blur-sm border-none relative">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <img 
                src="/images/ZapTok-v2.png" 
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
          
          <CardContent className="space-y-6">
            <Tabs defaultValue={('nostr' in window) ? 'extension' : 'key'} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
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
            
            <div className="text-center">
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
}
