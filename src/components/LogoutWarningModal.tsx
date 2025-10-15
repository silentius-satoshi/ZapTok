import { useState } from 'react';
import { AlertTriangle, Key, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';

interface LogoutWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmLogout: () => void;
}

export function LogoutWarningModal({ isOpen, onClose, onConfirmLogout }: LogoutWarningModalProps) {
  const [understood, setUnderstood] = useState(false);
  const navigate = useNavigate();

  const handleClose = () => {
    setUnderstood(false);
    onClose();
  };

  const handleConfirmLogout = () => {
    if (understood) {
      onConfirmLogout();
      handleClose();
    }
  };

  const handleGoToKeys = () => {
    handleClose();
    navigate('/settings?section=keys');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-gray-900 border-gray-700">
        <DialogHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-amber-500/20">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
            </div>
            <DialogTitle className="text-xl font-semibold text-white">
              Important: Save Your Keys!
            </DialogTitle>
          </div>
          <DialogDescription className="text-gray-300 space-y-4 leading-relaxed">
            <p>
              You're about to log out of an account that uses locally stored private keys.
              <strong className="text-amber-400"> If you haven't saved your private key (nsec), you will permanently lose access to this Nostr identity and all associated data.</strong>
            </p>

            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
              <div className="flex items-start gap-3">
                <Key className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-blue-400 mb-2">Before logging out, make sure to:</p>
                  <ul className="space-y-1 text-sm text-gray-400">
                    <li>• Copy and securely store your private key (nsec)</li>
                    <li>• Write it down or save it in a password manager</li>
                    <li>• Keep it safe - anyone with this key can control your account</li>
                  </ul>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-400">
              External signers (browser extensions, hardware wallets) don't have this issue as they manage keys separately.
            </p>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center space-x-2 bg-gray-800/30 p-3 rounded-lg">
            <Checkbox
              id="understood"
              checked={understood}
              onCheckedChange={(checked) => setUnderstood(checked === true)}
              className="border-gray-600 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
            />
            <label
              htmlFor="understood"
              className="text-sm font-medium text-gray-300 cursor-pointer"
            >
              I understand the risks and have saved my private key safely
            </label>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleGoToKeys}
              className="flex-1 border-blue-600 text-blue-400 hover:bg-blue-600/10 hover:text-blue-300"
            >
              <Key className="w-4 h-4 mr-2" />
              Go to Keys Settings
            </Button>

            <div className="flex gap-2 flex-1">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1 border-gray-600 text-gray-400 hover:bg-gray-600/10"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmLogout}
                disabled={!understood}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:text-gray-400 text-white"
              >
                I Understand - Logout
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}