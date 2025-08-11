import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SignInModal } from './SignInModal';
import GetStartedModal from './GetStartedModal';

interface AddAccountDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddAccountDialog({ isOpen, onClose }: AddAccountDialogProps) {
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showGetStartedModal, setShowGetStartedModal] = useState(false);

  // Debug logging
  console.log('AddAccountDialog render:', { isOpen, showSignInModal, showGetStartedModal });

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <div className="flex items-center justify-center space-x-4 mb-2">
              <img 
                src="/images/ZapTok-v3.png"
                alt="ZapTok"
                className="w-12 h-12 rounded-xl"
              />
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-orange-400 bg-clip-text text-transparent">
                Add Account
              </DialogTitle>
            </div>
          </DialogHeader>
          
          <div className="text-center space-y-6">
            <p className="text-gray-300">
              Connect another Nostr identity
            </p>
            
            {/* Get Started Button */}
            <div className="space-y-3">
              <button
                onClick={() => {
                  onClose();
                  // Add a small delay to ensure the dialog closes before opening the modal
                  setTimeout(() => {
                    setShowGetStartedModal(true);
                  }, 100);
                }}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-6 py-3 rounded-lg font-medium transition-all"
              >
                Create New Account
              </button>
            </div>
            
            <div className="text-center">
              <span className="text-gray-300">Have a Nostr account? </span>
              <button
                onClick={() => {
                  onClose();
                  // Add a small delay to ensure the dialog closes before opening the modal
                  setTimeout(() => {
                    setShowSignInModal(true);
                  }, 100);
                }}
                className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
              >
                Sign in
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sign In Modal */}
      <SignInModal 
        isOpen={showSignInModal} 
        onClose={() => setShowSignInModal(false)} 
      />

      {/* Get Started Modal */}
      {showGetStartedModal && (
        <GetStartedModal 
          onClose={() => setShowGetStartedModal(false)}
          onBackToLogin={() => {
            setShowGetStartedModal(false);
            // Don't reopen the add account dialog
          }}
        />
      )}
    </>
  );
}
