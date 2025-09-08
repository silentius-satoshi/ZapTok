import { useState } from 'react';
import { X, Zap } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/useToast';

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DonationModal({ isOpen, onClose }: DonationModalProps) {
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);

  const presetAmounts = [3000, 6000, 10000]; // sats

  const handleAmountSelect = (sats: number) => {
    setSelectedAmount(sats);
    setAmount(sats.toString());
  };

  const handleCustomAmount = (value: string) => {
    setAmount(value);
    setSelectedAmount(null);
  };

  const handleCompleteDonation = () => {
    if (!amount || parseInt(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid donation amount.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Donation Processing",
      description: `Lightning invoice generation for ${amount} sats is coming soon! Thank you for your support.`,
    });
    
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-gray-900 border border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-yellow-400 flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Support ZapTok
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <p className="text-gray-300 text-sm">
            A lightning payment will be generated to support the development of ZapTok. 
            You can process it through your preferred Lightning wallet.
          </p>

          {/* Amount Selection */}
          <div className="space-y-3">
            <Label className="text-yellow-400 font-medium">
              Amount (sats / one-time)
            </Label>
            
            {/* Custom Amount Input */}
            <Input
              type="number"
              placeholder="Enter amount in sats"
              value={amount}
              onChange={(e) => handleCustomAmount(e.target.value)}
              className="bg-gray-800 border-yellow-500 text-white placeholder-gray-400 focus:border-yellow-400"
            />

            {/* Preset Amount Buttons */}
            <div className="grid grid-cols-3 gap-2">
              {presetAmounts.map((sats) => (
                <Button
                  key={sats}
                  variant="outline"
                  onClick={() => handleAmountSelect(sats)}
                  className={`border-yellow-500 text-yellow-400 hover:bg-yellow-500 hover:text-black ${
                    selectedAmount === sats ? 'bg-yellow-500 text-black' : 'bg-transparent'
                  }`}
                >
                  {sats.toLocaleString()}
                </Button>
              ))}
            </div>
          </div>

          {/* Name Field */}
          <div className="space-y-2">
            <Label className="text-yellow-400 font-medium">
              Name (optional)
            </Label>
            <Input
              type="text"
              placeholder="Nickname, npub, @twitter, etc."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-yellow-400"
            />
          </div>

          {/* Complete Button */}
          <Button
            onClick={handleCompleteDonation}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-3"
          >
            Generate Lightning Invoice
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
