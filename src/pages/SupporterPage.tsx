import { useState } from 'react';
import { Heart, ArrowLeft, Zap, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/useToast';
import { useNavigate } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { AuthGate } from '@/components/AuthGate';

export function SupporterPage() {
  const { toast } = useToast();
  const navigate = useNavigate();

  useSeoMeta({
    title: 'Support ZapTok - ZapTok',
    description: 'Support ZapTok development with Bitcoin donations or Pro upgrades',
  });

  const handleUpgradeToPro = () => {
    toast({
      title: "Pro Upgrade",
      description: "Pro features are coming soon! Stay tuned for enhanced video tools and creator benefits.",
    });
  };

  const handleOneTimeDonation = () => {
    navigate('/donate');
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
              <Heart className="h-6 w-6 text-red-500" />
              <h1 className="text-xl font-bold">Support ZapTok</h1>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-6 space-y-6">
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
            
            <div className="space-y-4">
              {/* Upgrade to Pro */}
              <Card className="bg-gray-900 border-gray-700 hover:border-purple-500 transition-colors">
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
                      <Zap className="mr-2 h-4 w-4" />
                      Upgrade to Pro
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* One-Time Donation */}
              <Card className="bg-gray-900 border-gray-700 hover:border-orange-500 transition-colors">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Gift className="h-5 w-5 text-orange-500" />
                    One-Time Donation
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
                      <Gift className="mr-2 h-4 w-4" />
                      Make a Donation
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Why Your Contribution Matters */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white">Why Your Contribution Matters</h3>
            <div className="bg-gray-900 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="font-semibold text-white">Open Source Development</h4>
                  <p className="text-sm text-gray-400">
                    ZapTok is built as open-source software, ensuring transparency and community-driven innovation.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="font-semibold text-white">Bitcoin Ecosystem Growth</h4>
                  <p className="text-sm text-gray-400">
                    Your support directly contributes to building tools that strengthen the Bitcoin and Nostr ecosystems.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="font-semibold text-white">Sustainable Development</h4>
                  <p className="text-sm text-gray-400">
                    Contributions help maintain servers, fund development, and ensure long-term project sustainability.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGate>
  );
}

export default SupporterPage;
