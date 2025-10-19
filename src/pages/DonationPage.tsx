import { useState } from 'react';
import { ArrowLeft, Zap, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { ZAPTOK_CONFIG } from '@/constants';
import { RecentSupporters } from '@/components/donation/RecentSupporters';
import { DonationZap } from '@/components/DonationZap';

export function DonationPage() {
  const navigate = useNavigate();
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | undefined>(undefined);
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setIsDonationModalOpen(true);
  };

  useSeoMeta({
    title: 'Support ZapTok - ZapTok',
    description: 'Support ZapTok development with Lightning donations. Help us build the future of decentralized video sharing.',
  });

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="text-gray-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Main Donation Section */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-yellow-400 flex items-center justify-center gap-3">
              <Zap className="h-6 w-6" />
              <span>Support ZapTok Development</span>
              <Dialog open={isInfoDialogOpen} onOpenChange={setIsInfoDialogOpen}>
                <DialogTrigger asChild>
                  <button
                    className="h-4 w-4 text-gray-400 hover:text-yellow-400 cursor-pointer focus:outline-none focus:text-yellow-400 transition-colors"
                    aria-label="How Lightning donations work"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-md bg-gray-900 border-gray-700">
                  <DialogHeader>
                    <DialogTitle className="text-yellow-400 flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      How Lightning Donations Work
                    </DialogTitle>
                  </DialogHeader>
                  <div className="text-gray-300 space-y-4 mt-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-400/20 flex items-center justify-center text-yellow-400 font-bold text-sm">
                        1
                      </div>
                      <div className="text-sm">
                        Choose an amount or enter a custom donation amount
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-400/20 flex items-center justify-center text-yellow-400 font-bold text-sm">
                        2
                      </div>
                      <div className="text-sm">
                        A Lightning invoice will be generated instantly
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-400/20 flex items-center justify-center text-yellow-400 font-bold text-sm">
                        3
                      </div>
                      <div className="text-sm">
                        Pay with your Lightning wallet (WebLN supported)
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-400/20 flex items-center justify-center text-yellow-400 font-bold text-sm">
                        4
                      </div>
                      <div className="text-sm">
                        Your support directly helps ZapTok development!
                      </div>
                    </div>
                  </div>
                  <div className="mt-6">
                    <Button
                      onClick={() => setIsInfoDialogOpen(false)}
                      className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900"
                    >
                      Got it!
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="text-gray-300 space-y-4">
              <p className="text-center">
                Your support helps us continue developing innovative features and
                maintaining the infrastructure that makes ZapTok possible.
              </p>
            </div>

            {/* Preset Amount Buttons - Jumble Style */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { amount: 1000, text: '⚡ 1k' },
                { amount: 10000, text: '🚀 10k' },
                { amount: 100000, text: '💎 100k' },
                { amount: 1000000, text: '🌟 1M' }
              ].map(({ amount, text }) => (
                <Button
                  key={amount}
                  variant="secondary"
                  className="h-16 text-lg font-semibold bg-gray-800 border-gray-600 text-gray-300 hover:border-yellow-500 hover:text-yellow-400 hover:bg-gray-700"
                  onClick={() => handleAmountSelect(amount)}
                >
                  {text}
                </Button>
              ))}
            </div>

            {/* Recent Supporters - Integrated */}
            <div className="border-t border-gray-700 pt-8">
              <RecentSupporters />
            </div>
          </CardContent>
        </Card>

        {/* Thank You Message */}
        <Card className="bg-gradient-to-br from-yellow-900/20 to-yellow-800/20 border-yellow-700">
          <CardContent className="p-6 text-center">
            <div className="text-yellow-400 text-3xl mb-3">🙏</div>
            <div className="text-yellow-300 font-semibold text-lg mb-2">
              Thank You!
            </div>
            <div className="text-yellow-200 text-sm">
              Every donation, no matter the size, helps us build a better decentralized future.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Donation Modal */}
      <DonationZap
        isOpen={isDonationModalOpen}
        onClose={() => {
          setIsDonationModalOpen(false);
          setSelectedAmount(undefined);
        }}
        defaultAmount={selectedAmount}
      />
    </div>
  );
}

export default DonationPage;