import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Zap, HelpCircle, Link, AlertTriangle } from 'lucide-react';

interface BunkerLoginProps {
  login: (bunkerUrl: string) => Promise<void>;
  isLocked: boolean;
}

const BunkerLogin = ({ login, isLocked }: BunkerLoginProps) => {
  const [bunkerUrl, setBunkerUrl] = useState('');
  const [isBunkerLoading, setIsBunkerLoading] = useState(false);

  const handleBunkerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bunkerUrl.trim()) {
      // Error handling will be done by parent component via toast
      return;
    }
    
    setIsBunkerLoading(true);
    try {
      await login(bunkerUrl);
    } catch (error) {
      // Error handling will be done by parent component via toast
      console.error('Bunker login failed:', error);
    } finally {
      setIsBunkerLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 mb-4">
        <div className="flex items-center space-x-2 mb-2">
          <Zap className="w-4 h-4 text-blue-300" />
          <h4 className="text-sm font-semibold text-blue-300">Remote Signing</h4>
        </div>
        <p className="text-xs text-blue-200 leading-relaxed">
          Connect to a remote signer for secure key management. Your private key stays on your bunker server.
        </p>
      </div>
      
      <form onSubmit={handleBunkerLogin} className="space-y-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
        <div className="space-y-2">
          <Label htmlFor="bunkerurl" className="text-gray-200 flex items-center space-x-2">
            <Link className="w-4 h-4" />
            <span>Bunker URL</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="w-4 h-4 text-gray-400 hover:text-white" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">
                    <strong>Bunker URL Format</strong><br />
                    Enter the connection string from your bunker server. This typically starts with 
                    "bunker://" followed by your pubkey and connection parameters.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Input 
            id="bunkerurl" 
            type="text" 
            value={bunkerUrl} 
            onChange={e => setBunkerUrl(e.target.value)} 
            placeholder="bunker://..." 
            className="bg-gray-900 border-gray-600 text-white font-mono text-sm" 
            disabled={isLocked}
          />
        </div>
        
        <Button 
          type="submit" 
          className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white" 
          disabled={isBunkerLoading || isLocked}
        >
          <Zap className="w-4 h-4 mr-2" />
          {isBunkerLoading ? "Connecting..." : "Connect to Bunker"}
        </Button>
      </form>
      
      <Alert className="bg-gray-900 border-gray-700">
        <AlertTriangle className="w-4 h-4 text-yellow-400" />
        <AlertDescription className="text-gray-300 text-sm">
          <strong>Popular Bunkers:</strong> nsec.app, Amber (Android), or self-hosted options like Nostrum
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default BunkerLogin;
