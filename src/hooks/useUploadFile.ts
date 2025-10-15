import { useMutation } from "@tanstack/react-query";
import { CustomBlossomUploader } from "@/lib/blossomUploader";

import { useCurrentUser } from "./useCurrentUser";
import { useAppContext } from "./useAppContext";
// NIP-B7 imports kept for future use - currently dormant
// import { useBlossomServerList } from "./useBlossomServerList";

export function useUploadFile() {
  const { user } = useCurrentUser();
  const { config } = useAppContext();
  // const { serverList } = useBlossomServerList(); // Disabled for now

  return useMutation({
    mutationFn: async (variables: { file: File; onProgress?: (progress: number) => void }) => {
      const { file, onProgress } = variables;
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

      // HYBRID APPROACH: Use reliable hardcoded servers for now
      // Future: Enable NIP-B7 server selection when stable
      // const uploaderServers = serverList?.servers?.length
      //   ? serverList.servers
      //   : config.blossomServers;

      // For now: Use reliable servers that work
      const uploaderServers = undefined; // Let CustomBlossomUploader use its defaults

      console.log('useUploadFile: Using reliable server defaults (primal.net + stacker.news)');

      // Validate that signEvent method is available
      if (!user.signer.signEvent || typeof user.signer.signEvent !== 'function') {
        console.error('useUploadFile: signEvent method not available on signer');
        console.error('useUploadFile: Available signer methods:', Object.keys(user.signer));
        throw new Error('Invalid signer: signEvent method not available. Please ensure you are logged in with a Nostr extension or valid key.');
      }

      // Create a simplified signer adapter for Blossom
      const blossomSigner = {
        signEvent: async (event: any) => {
          console.log('blossomSigner: Signing event for Blossom upload');

          // Prefer browser extension if available
          if (typeof window !== 'undefined' && window.nostr && window.nostr.signEvent) {
            console.log('blossomSigner: Using browser extension');
            return await window.nostr.signEvent(event);
          }

          // Fallback to user signer
          console.log('blossomSigner: Using user.signer.signEvent');
          return await user.signer.signEvent(event);
        }
      };

      const uploader = new CustomBlossomUploader({
        servers: uploaderServers, // undefined = use reliable defaults
        signer: blossomSigner,
        onProgress: onProgress,
      });

      console.log('useUploadFile: Starting upload with simplified, reliable approach');
      const tags = await uploader.upload(file);
      console.log('useUploadFile: Upload completed successfully, tags:', tags);
      return tags;
    },
  });
}