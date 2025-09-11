import { useState } from 'react';
import { ArrowLeft, Zap, Heart, Coffee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { DonationZap } from '@/components/DonationZap';
import { RecentSupporters } from '@/components/donation/RecentSupporters';

export function DonationPage() {
  const navigate = useNavigate();
  const [showDonationModal, setShowDonationModal] = useState(false);

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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Donation Section */}
        <div className="lg:col-span-2">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-yellow-400 flex items-center gap-3">
                <Zap className="h-6 w-6" />
                Support ZapTok Development
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-gray-300 space-y-4">
                <p>
                  ZapTok is an open-source, decentralized video platform built on Nostr. 
                  Your support helps us continue developing innovative features and 
                  maintaining the infrastructure that makes ZapTok possible.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-yellow-400">
                    <Heart className="h-4 w-4" />
                    <span>Open Source</span>
                  </div>
                  <div className="flex items-center gap-2 text-yellow-400">
                    <Zap className="h-4 w-4" />
                    <span>Lightning Fast</span>
                  </div>
                  <div className="flex items-center gap-2 text-yellow-400">
                    <Coffee className="h-4 w-4" />
                    <span>Community Driven</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-700 pt-6">
                <Button
                  onClick={() => setShowDonationModal(true)}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-4 text-lg"
                  size="lg"
                >
                  <Zap className="h-5 w-5 mr-2" />
                  Make a Lightning Donation
                </Button>
              </div>

              {/* How it works */}
              <div className="bg-gray-800 rounded-lg p-4 space-y-3">
                <h3 className="text-yellow-400 font-semibold">How Lightning Donations Work</h3>
                <div className="text-sm text-gray-300 space-y-2">
                  <div className="flex items-start gap-3">
                    <span className="text-yellow-400 font-bold">1.</span>
                    <span>Choose an amount or enter a custom donation amount</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-yellow-400 font-bold">2.</span>
                    <span>A Lightning invoice will be generated instantly</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-yellow-400 font-bold">3.</span>
                    <span>Pay with your Lightning wallet (WebLN supported)</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-yellow-400 font-bold">4.</span>
                    <span>Your support directly helps ZapTok development!</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Recent Supporters */}
          <RecentSupporters />

          {/* Development Stats */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-yellow-400 text-sm">Development Impact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Open Source Commits</span>
                <span className="text-white font-semibold">500+</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Features Released</span>
                <span className="text-white font-semibold">25+</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Community Members</span>
                <span className="text-white font-semibold">1,000+</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Videos Shared</span>
                <span className="text-white font-semibold">10,000+</span>
              </div>
            </CardContent>
          </Card>

          {/* Thank You Message */}
          <Card className="bg-gradient-to-br from-yellow-900/20 to-yellow-800/20 border-yellow-700">
            <CardContent className="p-4 text-center">
              <div className="text-yellow-400 text-2xl mb-2">🙏</div>
              <div className="text-yellow-300 font-semibold text-sm mb-1">
                Thank You!
              </div>
              <div className="text-yellow-200 text-xs">
                Every donation, no matter the size, helps us build a better decentralized future.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Donation Modal */}
      <DonationZap 
        isOpen={showDonationModal}
        onClose={() => setShowDonationModal(false)}
      />
    </div>
  );
}

export default DonationPage;