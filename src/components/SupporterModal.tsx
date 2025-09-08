import { useState } from 'react';
import { Heart, Zap, Gift } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/useToast';
import { DonationModal } from '@/components/DonationModal';

interface SupporterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SupporterModal({ isOpen, onClose }: SupporterModalProps) {
  const { toast } = useToast();
  const [showDonationModal, setShowDonationModal] = useState(false);

  const handleUpgradeToPro = () => {
    toast({
      title: "Pro Upgrade",
      description: "Pro features are coming soon! Stay tuned for enhanced video tools and creator benefits.",
    });
  };

  const handleOneTimeDonation = () => {
    setShowDonationModal(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-gray-900 border border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
            <Heart className="h-6 w-6 text-red-500" />
            Support ZapTok
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Introduction */}
          <div className="text-center space-y-3">
            <p className="text-lg text-gray-300">
              We are committed to building the future of decentralized social media by creating 
              an intuitive, Bitcoin-native video platform that empowers creators and communities on Nostr.
            </p>
            <p className="text-gray-400">
              With your help, we can keep pushing boundaries and evolving ZapTok into something extraordinary.
            </p>
          </div>

          {/* Support Options */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white">Become a Supporter</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Upgrade to Pro */}
              <Card className="bg-gray-800 border-gray-700 hover:border-purple-500 transition-colors">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Zap className="h-5 w-5 text-purple-500" />
                    Upgrade to Pro
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Upgrade your ZapTok Account to Pro for a small fee and enjoy additional perks that come with it!
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <p className="text-sm text-gray-400">
                        Enhanced video tools, priority support, and exclusive creator features.
                      </p>
                    </div>
                    <Button 
                      onClick={handleUpgradeToPro}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Upgrade to Pro
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* One-Time Donation */}
              <Card className="bg-gray-800 border-gray-700 hover:border-orange-500 transition-colors">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Gift className="h-5 w-5 text-orange-500" />
                    Donate to ZapTok development
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    A one-time donation lightning payment to support the development of ZapTok & its ongoing evolution towards a more robust, decentralized video platform in our growing Nostr ecosystem
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <p className="text-sm text-gray-400">
                        Support open-source development with Lightning Network donations.
                      </p>
                    </div>
                    <Button 
                      onClick={handleOneTimeDonation}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      <Gift className="h-4 w-4 mr-2" />
                      Make a Donation
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Why Your Contribution is Important */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white">Why Your Contribution is Important</h3>
            
            <div className="space-y-4">
              {/* Unlock New Features */}
              <div className="flex gap-4">
                <div className="text-green-500 mt-1">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-white">Unlock New Features</h4>
                  <p className="text-gray-400 text-sm">
                    Your support empowers us to design and implement cutting-edge features that enhance 
                    your experience and keep us at the forefront of technology.
                  </p>
                </div>
              </div>

              {/* Ensure Continuous Improvement */}
              <div className="flex gap-4">
                <div className="text-blue-500 mt-1">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-white">Ensure Continuous Improvement</h4>
                  <p className="text-gray-400 text-sm">
                    With your contributions, we can provide regular updates and ongoing maintenance, 
                    ensuring everything runs smoothly and efficiently for all users.
                  </p>
                </div>
              </div>

              {/* Support Open-Source Freedom */}
              <div className="flex gap-4">
                <div className="text-purple-500 mt-1">
                  <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-white">Support Open-Source Freedom</h4>
                  <p className="text-gray-400 text-sm">
                    Your support helps us keep ZapTok true to the principles of free and open-source software 
                    and remains accessible for everyone to use, modify and improve.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <DonationModal 
      isOpen={showDonationModal}
      onClose={() => setShowDonationModal(false)}
    />
    </>
  );
}
