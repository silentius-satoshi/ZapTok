import { useState } from 'react';
import { ArrowLeft, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/useToast';
import { useNavigate } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { AuthGate } from '@/components/AuthGate';

export function DonationPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);

  useSeoMeta({
    title: 'Donate to ZapTok - ZapTok',
    description: 'Support ZapTok development with a Lightning donation',
  });

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
    
    navigate(-1);
  };

  return (
    <AuthGate>
      <div className="min-h-screen bg-black text-white">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-black/90 backdrop-blur-md border-b border-gray-800">
          <div className="flex items-center gap-4 px-4 py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="text-gray-400 hover:text-white p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-yellow-400" />
              <h1 className="text-xl font-bold text-yellow-400">Support ZapTok</h1>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-6 space-y-6">
          <p className="text-gray-300 text-center">
            A lightning payment will be generated to support the development of ZapTok. 
            You can process it through your preferred Lightning wallet.
          </p>

          {/* Amount Selection */}
          <div className="space-y-4">
            <Label className="text-yellow-400 font-medium text-lg">
              Amount (sats / one-time)
            </Label>
            
            {/* Custom Amount Input */}
            <Input
              type="number"
              placeholder="Enter amount in sats"
              value={amount}
              onChange={(e) => handleCustomAmount(e.target.value)}
              className="bg-gray-800 border-yellow-500 text-white placeholder-gray-400 focus:border-yellow-400 text-lg py-3"
            />

            {/* Preset Amount Buttons */}
            <div className="grid grid-cols-3 gap-3">
              {presetAmounts.map((sats) => (
                <Button
                  key={sats}
                  variant="outline"
                  onClick={() => handleAmountSelect(sats)}
                  className={`border-yellow-500 text-yellow-400 hover:bg-yellow-500 hover:text-black py-3 ${
                    selectedAmount === sats ? 'bg-yellow-500 text-black' : 'bg-transparent'
                  }`}
                >
                  {sats.toLocaleString()}
                </Button>
              ))}
            </div>
          </div>

          {/* Name Field */}
          <div className="space-y-3">
            <Label className="text-yellow-400 font-medium text-lg">
              Name (optional)
            </Label>
            <Input
              type="text"
              placeholder="Nickname, npub, @twitter, etc."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-yellow-400 text-lg py-3"
            />
          </div>

          {/* Complete Button */}
          <Button
            onClick={handleCompleteDonation}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-4 text-lg mt-8"
          >
            Generate Lightning Invoice
          </Button>
        </div>
      </div>
    </AuthGate>
  );
}

export default DonationPage;
