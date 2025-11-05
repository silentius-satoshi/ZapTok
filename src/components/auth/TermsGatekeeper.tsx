import { useEffect, useState } from 'react';
import { useNostrLogin } from '@nostrify/react/login';
import { TermsOfServiceDialog } from './TermsOfServiceDialog';

interface TermsGatekeeperProps {
  children: React.ReactNode;
}

const TERMS_VERSION = '2025-11-05'; // Update this when terms change
const STORAGE_KEY = 'zaptok:terms-accepted';

export function TermsGatekeeper({ children }: TermsGatekeeperProps) {
  const { logins } = useNostrLogin();
  const [showTerms, setShowTerms] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);

  // Check if user is logged in
  const isLoggedIn = logins.length > 0;
  const currentPubkey = logins[0]?.pubkey;

  useEffect(() => {
    if (isLoggedIn && currentPubkey) {
      // Check if this user has accepted the current version of terms
      try {
        const acceptedTerms = localStorage.getItem(STORAGE_KEY);
        if (acceptedTerms) {
          const accepted = JSON.parse(acceptedTerms);
          const userAccepted = accepted[currentPubkey];
          
          if (userAccepted === TERMS_VERSION) {
            // User has accepted current terms version
            setHasAcceptedTerms(true);
            setShowTerms(false);
          } else {
            // User hasn't accepted current terms or terms have been updated
            setHasAcceptedTerms(false);
            setShowTerms(true);
          }
        } else {
          // No terms acceptance record found
          setHasAcceptedTerms(false);
          setShowTerms(true);
        }
      } catch (error) {
        console.error('Error checking terms acceptance:', error);
        setShowTerms(true);
      }
    } else {
      // User is not logged in, hide terms dialog
      setShowTerms(false);
      setHasAcceptedTerms(false);
    }
  }, [isLoggedIn, currentPubkey]);

  const handleAcceptTerms = () => {
    if (currentPubkey) {
      try {
        // Store acceptance in localStorage
        const acceptedTerms = localStorage.getItem(STORAGE_KEY);
        const accepted = acceptedTerms ? JSON.parse(acceptedTerms) : {};
        accepted[currentPubkey] = TERMS_VERSION;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(accepted));
        
        setHasAcceptedTerms(true);
        setShowTerms(false);
      } catch (error) {
        console.error('Error saving terms acceptance:', error);
      }
    }
  };

  return (
    <>
      {/* Show terms dialog if user is logged in but hasn't accepted */}
      <TermsOfServiceDialog
        open={showTerms}
        onAccept={handleAcceptTerms}
      />
      
      {/* Show children regardless - just block interaction with the modal */}
      {children}
    </>
  );
}
