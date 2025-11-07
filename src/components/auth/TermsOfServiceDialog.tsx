import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface TermsOfServiceDialogProps {
  open: boolean;
  onAccept: () => void;
}

export function TermsOfServiceDialog({ open, onAccept }: TermsOfServiceDialogProps) {
  const [accepted, setAccepted] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reset scroll state when modal opens
    if (open) {
      setHasScrolledToBottom(false);
      setAccepted(false);
    }
  }, [open]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const bottom = Math.abs(element.scrollHeight - element.scrollTop - element.clientHeight) < 5;
    if (bottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  const handleAccept = () => {
    if (accepted && hasScrolledToBottom) {
      onAccept();
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent 
        className="max-w-lg max-h-[85vh] overflow-hidden bg-neutral-900 border-gray-800"
        hideClose={true}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center">
          <DialogTitle className="flex items-center justify-center gap-3">
            <img src="/images/icon-128x128.png" alt="ZapTok" className="w-10 h-10" />
            <span className="text-2xl font-bold">ZapTok Terms of Service</span>
          </DialogTitle>
        </DialogHeader>

        <div 
          ref={contentRef}
          onScroll={handleScroll}
          className="overflow-y-scroll text-left text-sm text-neutral-300 p-4 bg-neutral-950 rounded max-h-[50vh]" 
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#6b7280 #1f2937' }}
        >
          <p className="mb-3">
            <strong>Last Updated: {new Date().toLocaleDateString()}</strong>
          </p>

          <p className="mb-3">
            <strong>
              IMPORTANT: PLEASE READ CAREFULLY. BY USING THIS APPLICATION, YOU AGREE TO THESE
              TERMS.
            </strong>
          </p>

          <h3 className="font-bold mb-2 text-white">1. Software Provided "AS IS"</h3>
          <p className="mb-3">
            This software is provided "AS IS" without warranty of any kind, express or implied. We
            disclaim all warranties including merchantability, fitness for a particular purpose, and
            non-infringement. Use at your own risk.
          </p>

          <h3 className="font-bold mb-2 text-white">2. No Liability for Damages</h3>
          <p className="mb-3">
            We are not liable for any direct, indirect, incidental, special, consequential, or
            punitive damages arising from your use of this application, including but not limited to
            data loss, service interruption, or any other damages.
          </p>

          <h3 className="font-bold mb-2 text-white">3. Decentralized Social Network (Nostr)</h3>
          <p className="mb-3">
            This application connects to the Nostr protocol, a decentralized social network. We do
            not control the relays, content, or data you access. You are solely responsible for your
            interactions with third-party relays and content.
          </p>

          <h3 className="font-bold mb-2 text-white">4. Cashu Wallet - We Are Not the Custodian</h3>
          <p className="mb-3">
            <strong>IMPORTANT: This application includes a Cashu ecash wallet.</strong>
          </p>
          <p className="mb-3">
            • Cashu ecash is custodial - mints hold the actual Bitcoin
            <br />
            • We are NOT the custodian - third-party mints are
            <br />
            • Mints can fail, steal funds, or disappear
            <br />
            • You must trust the mint operators
            <br />• We have ZERO control over mint operations
          </p>

          <h3 className="font-bold mb-2 text-white">5. Total Loss of Funds</h3>
          <p className="mb-3">
            <strong>YOU CAN LOSE ALL YOUR MONEY.</strong> We are not liable for any loss of funds
            due to:
          </p>
          <p className="mb-3">
            • Mint failures, insolvency, or fraud
            <br />
            • Device loss, damage, or theft
            <br />
            • User error or forgotten credentials
            <br />
            • Software bugs or vulnerabilities
            <br />
            • Network issues or relay failures
            <br />• Any other cause whatsoever
          </p>

          <h3 className="font-bold mb-2 text-white">6. Experimental Technology</h3>
          <p className="mb-3">
            Cashu ecash is experimental technology. Ecash tokens are bearer assets - anyone with the
            token secret can spend them. You are solely responsible for securing your tokens and
            understanding the risks.
          </p>

          <h3 className="font-bold mb-2 text-white">7. User Responsibility</h3>
          <p className="mb-3">You are solely responsible for:</p>
          <p className="mb-3">
            • Backing up your data and keys
            <br />
            • Securing your device
            <br />
            • Verifying mint trustworthiness
            <br />
            • Compliance with applicable laws
            <br />• Understanding how Nostr and Cashu work
          </p>

          <h3 className="font-bold mb-2 text-white">8. No Financial Services</h3>
          <p className="mb-3">
            This application does not provide financial, investment, or legal advice. We are not a
            financial institution, money transmitter, or payment processor.
          </p>

          <h3 className="font-bold mb-2 text-white">9. Legal Compliance</h3>
          <p className="mb-3">
            You must comply with all applicable laws in your jurisdiction. Use is void where
            prohibited. We make no representations about legality in any jurisdiction.
          </p>

          <h3 className="font-bold mb-2 text-white">10. Privacy and Data Collection</h3>
          <p className="mb-3">
            All application data is stored locally on your device. We do not track your activity or
            collect analytics.
          </p>
          <p className="mb-3">Third-party services may log your activity:</p>
          <p className="mb-3">
            • Nostr relays may log connections and events
            <br />
            • Cashu mints may log connections and transactions
            <br />• File hosting services (for images/media uploads) may log uploads and IPs
          </p>

          <h3 className="font-bold mb-2 text-white">11. Modifications</h3>
          <p className="mb-3">
            We may modify these terms at any time. Continued use constitutes acceptance.
          </p>

          <h3 className="font-bold mb-2 text-white">12. Acceptance</h3>
          <p className="mb-3">
            By using this application, you acknowledge that you have read, understood, and agree to
            these terms.
          </p>
        </div>

        <div className="p-4 border-t border-gray-800">
          {!hasScrolledToBottom && (
            <p className="text-xs text-yellow-500 text-center mb-3">
              Please scroll to the bottom to continue
            </p>
          )}
          <div className="flex items-center justify-center mb-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                disabled={!hasScrolledToBottom}
                className="w-5 h-5 mr-3 accent-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <span className={`text-sm ${!hasScrolledToBottom ? 'opacity-50' : ''}`}>
                I have read and agree to the Terms of Service
              </span>
            </label>
          </div>

          <button
            onClick={handleAccept}
            disabled={!accepted || !hasScrolledToBottom}
            className={`w-full py-3 px-6 rounded-lg font-medium transition ${
              accepted && hasScrolledToBottom
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-neutral-700 text-neutral-500 cursor-not-allowed'
            }`}
          >
            Continue
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
