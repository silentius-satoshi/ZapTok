import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Sparkles } from 'lucide-react';
import CreateAccount from './CreateAccount';

interface CreateAccountModalProps {
  id?: string;
  open?: boolean;
  onLogin?: () => void;
  onAbort?: () => void;
}

const CreateAccountModal = ({ id, open, onLogin, onAbort }: CreateAccountModalProps) => {
  const [showCreateAccount, setShowCreateAccount] = useState(false);

  if (!open) return null;

  if (showCreateAccount) {
    return (
      <CreateAccount 
        onClose={() => {
          setShowCreateAccount(false);
          onAbort?.();
        }}
        onBack={() => setShowCreateAccount(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto scrollbar-hide" style={{ zIndex: 99999, backgroundColor: 'rgba(0, 0, 0, 0.8)' }}>
      <div className="w-full max-w-md">
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <img
                src="/images/ZapTok-v3.png"
                alt="ZapTok Logo"
                className="w-8 h-8 rounded-lg"
              />
              <CardTitle className="text-2xl bg-gradient-to-r from-purple-400 to-orange-400 bg-clip-text text-transparent">
                Get Started
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent id={id} className="space-y-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-4 rounded-full bg-gradient-to-r from-purple-500/20 to-orange-500/20">
                  <Sparkles className="w-8 h-8 text-orange-400" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-white">
                  Create your Nostr identity
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Join the decentralized social network where you own your content and identity. 
                  Connect with creators, earn sats, and experience true digital freedom.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => setShowCreateAccount(true)}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white py-3"
              >
                Create Account
              </Button>
              
              <div className="text-center">
                <span className="text-gray-500 text-sm">Already have an account?</span>
                {' '}
                <button
                  onClick={onLogin}
                  className="text-orange-400 hover:text-orange-300 text-sm font-medium transition-colors"
                >
                  Sign in now
                </button>
              </div>

              <div className="text-center pt-4 border-t border-gray-700">
                <button
                  onClick={onAbort}
                  className="flex items-center justify-center space-x-2 text-gray-400 hover:text-gray-300 text-sm transition-colors mx-auto"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateAccountModal;
