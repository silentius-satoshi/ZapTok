import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Eye, EyeOff, Key, AlertTriangle, HelpCircle } from 'lucide-react';

interface PrivateKeyLoginProps {
  login: (privateKey: string) => Promise<void>;
  isLocked: boolean;
}

const PrivateKeyLogin = ({ login, isLocked }: PrivateKeyLoginProps) => {
  const [privateKey, setPrivateKey] = useState('');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [isPrivateKeyLoading, setIsPrivateKeyLoading] = useState(false);
  const [acknowledgeRisk, setAcknowledgeRisk] = useState(false);

  const handlePrivateKeyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!privateKey.trim() || !acknowledgeRisk) {
      // Error handling will be done by parent component via toast
      return;
    }
    
    setIsPrivateKeyLoading(true);
    try {
      await login(privateKey);
    } catch (error) {
      // Error handling will be done by parent component via toast
      console.error('Private key login failed:', error);
    } finally {
      setIsPrivateKeyLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-orange-900/20 border border-orange-800 rounded-lg p-4 mb-4">
        <div className="flex items-center space-x-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-orange-300" />
          <h4 className="text-sm font-semibold text-orange-300">Security Warning</h4>
        </div>
        <p className="text-xs text-orange-200 leading-relaxed">
          Entering your nsec private key is like sharing your password. Only use this on trusted devices.
        </p>
      </div>
      
      <form onSubmit={handlePrivateKeyLogin} className="space-y-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
        <div className="space-y-2">
          <Label htmlFor="privatekey" className="text-gray-200 flex items-center space-x-2">
            <Key className="w-4 h-4" />
            <span>Private Key (nsec)</span>
          </Label>
          <div className="relative">
            <Input 
              id="privatekey" 
              type={showPrivateKey ? "text" : "password"}
              value={privateKey} 
              onChange={e => setPrivateKey(e.target.value)} 
              placeholder="nsec..." 
              className="bg-gray-900 border-gray-600 text-white pr-10 sensitive-content" 
              disabled={isLocked}
            />
            <button
              type="button"
              onClick={() => setShowPrivateKey(!showPrivateKey)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              disabled={isLocked}
            >
              {showPrivateKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="acknowledge" 
            checked={acknowledgeRisk}
            onCheckedChange={(checked) => setAcknowledgeRisk(checked as boolean)}
            className="border-gray-600 data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600"
            disabled={isLocked}
          />
          <Label htmlFor="acknowledge" className="text-gray-200 text-sm">
            I understand the security risks
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="w-4 h-4 text-gray-400 hover:text-white" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  <strong>Risk Acknowledgment</strong><br />
                  By checking this box, you acknowledge that entering your private key 
                  on this device carries security risks. Your private key gives full 
                  control over your Nostr identity and should only be entered on 
                  devices you trust completely.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <Button 
          type="submit" 
          className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white" 
          disabled={isPrivateKeyLoading || isLocked}
        >
          <Key className="w-4 h-4 mr-2" />
          {isPrivateKeyLoading ? "Connecting..." : "Login with Private Key"}
        </Button>
      </form>
    </div>
  );
};

export default PrivateKeyLogin;
