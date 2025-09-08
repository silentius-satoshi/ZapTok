import { useMutation } from "@tanstack/react-query";
import { CustomBlossomUploader } from "@/lib/blossomUploader";
import { finalizeEvent } from "nostr-tools";

import { useCurrentUser } from "./useCurrentUser";
import { useAppContext } from "./useAppContext";

export function useUploadFile(options?: { 
  onProgress?: (progress: number) => void;
  onRetry?: (attemptNumber: number, server: string, error: string) => void;
}) {
  const { user } = useCurrentUser();
  const { config } = useAppContext();

  return useMutation({
    mutationFn: async (file: File) => {
      console.log('useUploadFile: Starting upload mutation');
      
      if (!user) {
        console.error('useUploadFile: No user available');
        throw new Error('Must be logged in to upload files');
      }

      if (!user.signer) {
        console.error('useUploadFile: No signer available for user:', user.pubkey);
        throw new Error('User signer not available. Please try logging out and back in.');
      }

      console.log('useUploadFile: User and signer available, creating uploader');
      console.log('useUploadFile: Signer methods:', Object.keys(user.signer));
      console.log('useUploadFile: Signer signEvent type:', typeof user.signer.signEvent);
      console.log('useUploadFile: Blossom servers:', config.blossomServers);

      // Validate that signEvent method is available
      if (!user.signer.signEvent || typeof user.signer.signEvent !== 'function') {
        console.error('useUploadFile: signEvent method not available on signer');
        console.error('useUploadFile: Available signer methods:', Object.keys(user.signer));
        throw new Error('Invalid signer: signEvent method not available. Please ensure you are logged in with a Nostr extension or valid key.');
      }

      // Create a nostr-tools compatible signer adapter for Blossom
      const blossomSigner = {
        signEvent: async (event: any) => {
          console.log('blossomSigner: Using nostr-tools to sign event for Blossom');
          
          // Check if window.nostr (browser extension) is available
          if (typeof window !== 'undefined' && window.nostr && window.nostr.signEvent) {
            console.log('blossomSigner: Using browser extension directly');
            return await window.nostr.signEvent(event);
          }
          
          // Fallback to user.signer.signEvent but with error handling
          try {
            console.log('blossomSigner: Falling back to user.signer.signEvent');
            return await user.signer.signEvent(event);
          } catch (error) {
            console.error('blossomSigner: Both extension and user.signer failed:', error);
            throw new Error('Unable to sign event: browser extension and user signer both failed');
          }
        }
      };

      const uploader = new CustomBlossomUploader({
        servers: config.blossomServers,
        signer: blossomSigner,
        onProgress: options?.onProgress,
        onRetry: options?.onRetry || ((attempt, server, error) => {
          console.log(`useUploadFile: Retry attempt ${attempt} on ${server}: ${error}`);
        }),
        // You can extend this to include membership tier from user profile
        // membershipTier: user.membershipTier,
      });

      console.log('useUploadFile: Starting file upload via CustomBlossomUploader');
      const tags = await uploader.upload(file);
      console.log('useUploadFile: Upload completed, tags:', tags);
      return tags;
    },
  });
}