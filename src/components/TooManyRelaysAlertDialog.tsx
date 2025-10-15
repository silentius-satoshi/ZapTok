import React, { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import relayListService from '@/services/relayList.service';

/**
 * TooManyRelaysAlertDialog - Warns users about suboptimal relay configurations
 * Based on production patterns for relay optimization warnings
 */
export function TooManyRelaysAlertDialog() {
  const [open, setOpen] = useState(false);
  const [relayList, setRelayList] = useState<{ read: string[]; write: string[] } | null>(null);
  const { user } = useCurrentUser();

  useEffect(() => {
    if (!user?.pubkey) return;

    const checkRelayConfiguration = async () => {
      try {
        // Check if user has dismissed this alert before
        const dismissed = localStorage.getItem('dismissedTooManyRelaysAlert');
        if (dismissed === 'true') return;

        // Get user's relay list
        const userRelayList = await relayListService.getUserRelayList(user.pubkey);
        setRelayList(userRelayList);

        // Check if relay configuration is suboptimal
        if (userRelayList.read.length > 4 || userRelayList.write.length > 4) {
          setOpen(true);
        }
      } catch (error) {
        console.warn('Failed to check relay configuration:', error);
      }
    };

    checkRelayConfiguration();
  }, [user?.pubkey]);

  const handleOptimizeNow = () => {
    setOpen(false);
    // Navigate to relay settings - you can customize this based on your routing
    window.location.href = '/settings/relays';
  };

  const handleMaybeLater = () => {
    setOpen(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('dismissedTooManyRelaysAlert', 'true');
    setOpen(false);
  };

  if (!relayList || !user) return null;

  const hasTooManyReadRelays = relayList.read.length > 4;
  const hasTooManyWriteRelays = relayList.write.length > 4;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Optimize Relay Settings</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Your current relay configuration may not be optimal. This could make it 
              difficult for others to find your posts and may result in incomplete notifications.
            </p>
            
            {hasTooManyReadRelays && (
              <p className="text-amber-600 dark:text-amber-400">
                You have {relayList.read.length} read relays. Most clients only use 2-4 relays, 
                setting more is unnecessary.
              </p>
            )}
            
            {hasTooManyWriteRelays && (
              <p className="text-amber-600 dark:text-amber-400">
                You have {relayList.write.length} write relays. Most clients only use 2-4 relays, 
                setting more is unnecessary.
              </p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col space-y-2 sm:space-y-0 sm:flex-row">
          <Button
            variant="outline"
            onClick={handleDismiss}
            className="sm:order-1"
          >
            Don't remind me again
          </Button>
          <Button
            variant="outline"
            onClick={handleMaybeLater}
            className="sm:order-2"
          >
            Maybe Later
          </Button>
          <AlertDialogAction
            onClick={handleOptimizeNow}
            className="sm:order-3"
          >
            Optimize Now
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}