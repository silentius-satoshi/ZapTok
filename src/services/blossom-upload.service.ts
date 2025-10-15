import { BlossomClient } from 'blossom-client-sdk';
import { TDraftEvent } from '@/types';
import { z } from 'zod';

type UploadOptions = {
  onProgress?: (progressPercent: number) => void;
  signal?: AbortSignal;
};

interface BlobDescriptor {
  url: string;
  sha256: string;
  size: number;
  type: string;
  uploaded: number;
}

export const UPLOAD_ABORTED_ERROR_MSG = 'Upload aborted';

// Default Blossom servers - tiered by CORS friendliness
export const DEFAULT_BLOSSOM_SERVERS = [
  // Tier 1: Known CORS-friendly servers
  'https://blossom.band/',
  'https://nostr.download/',
  'https://nostr.media/',
  // Tier 2: Popular but potentially restrictive
  'https://blossom.primal.net/'
];

class BlossomUploadService {
  static instance: BlossomUploadService;

  constructor() {
    if (!BlossomUploadService.instance) {
      BlossomUploadService.instance = this;
    }
    return BlossomUploadService.instance;
  }

  /**
   * Calculate SHA-256 hash of a file
   */
  private async calculateSHA256(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Determine if fallback should be used based on error type
   */
  private shouldUseFallback(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    return (
      errorMessage.includes('cors') ||
      errorMessage.includes('network policy') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('preflight') ||
      error.name === 'TypeError' || // Often indicates fetch issues
      errorMessage.includes('network error') ||
      errorMessage.includes('failed to fetch')
    );
  }

  /**
   * Upload using Blossom Client SDK (primary method)
   */
  private async uploadWithSDK(
    server: string,
    file: File,
    signer: (draft: TDraftEvent) => Promise<any>,
    options?: UploadOptions
  ): Promise<{ url: string; tags: string[][] }> {
    const auth = await BlossomClient.createUploadAuth(signer, file, {
      message: 'Uploading video file to ZapTok'
    });

    const blob = await BlossomClient.uploadBlob(server, file, { auth });

    // Parse NIP-94 tags from response
    let tags: string[][] = [];
    const parseResult = z.array(z.array(z.string())).safeParse((blob as any).nip94 ?? []);
    if (parseResult.success) {
      tags = parseResult.data;
    } else {
      // Generate NIP-94 tags manually if not provided
      tags = this.generateNIP94Tags(blob);
    }

    return { url: blob.url, tags };
  }

  /**
   * Upload using XMLHttpRequest with manual BUD-02 authentication (fallback method)
   */
  private async uploadWithXHR(
    server: string,
    file: File,
    signer: (draft: TDraftEvent) => Promise<any>,
    options?: UploadOptions
  ): Promise<{ url: string; tags: string[][] }> {
    // Calculate file hash
    const sha256 = await this.calculateSHA256(file);

    // Create BUD-02 authentication event (kind 24242)
    const authEvent = await signer({
      kind: 24242,
      content: `Upload ${file.name} to ZapTok`,
      tags: [
        ['t', 'upload'],
        ['x', sha256],
        ['size', file.size.toString()],
        ['expiration', Math.floor(Date.now() / 1000 + 3600).toString()], // 1 hour expiration
      ],
      created_at: Math.floor(Date.now() / 1000),
    });

    const authHeader = btoa(JSON.stringify(authEvent));

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Check for abort signal
      if (options?.signal?.aborted) {
        reject(new Error(UPLOAD_ABORTED_ERROR_MSG));
        return;
      }

      // Handle abort signal during upload
      const abortHandler = () => {
        xhr.abort();
        reject(new Error(UPLOAD_ABORTED_ERROR_MSG));
      };
      options?.signal?.addEventListener('abort', abortHandler);

      // Normalize server URL (remove trailing slash)
      const normalizedServer = server.endsWith('/') ? server.slice(0, -1) : server;

      // Configure request
      xhr.open('PUT', `${normalizedServer}/upload`);
      xhr.setRequestHeader('Authorization', `Nostr ${authHeader}`);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      
      // Set timeout (30 seconds)
      xhr.timeout = 30000;

      // Progress tracking
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && options?.onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          options.onProgress(progress);
        }
      };

      // Success handler
      xhr.onload = () => {
        options?.signal?.removeEventListener('abort', abortHandler);
        
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const blobDescriptor: BlobDescriptor = JSON.parse(xhr.responseText);
            
            if (!blobDescriptor.url || !blobDescriptor.sha256) {
              reject(new Error('Invalid blob descriptor from server'));
              return;
            }

            // Verify hash matches
            if (blobDescriptor.sha256 !== sha256) {
              console.warn('Server returned different hash:', blobDescriptor.sha256, 'expected:', sha256);
            }

            const tags = this.generateNIP94Tags(blobDescriptor);
            resolve({ url: blobDescriptor.url, tags });
          } catch (parseError) {
            reject(new Error(`Invalid server response: ${xhr.responseText}`));
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
        }
      };

      // Error handlers
      xhr.onerror = () => {
        options?.signal?.removeEventListener('abort', abortHandler);
        reject(new Error('Network error during XHR upload'));
      };

      xhr.ontimeout = () => {
        options?.signal?.removeEventListener('abort', abortHandler);
        reject(new Error('XHR upload timeout'));
      };

      xhr.onabort = () => {
        options?.signal?.removeEventListener('abort', abortHandler);
        reject(new Error(UPLOAD_ABORTED_ERROR_MSG));
      };

      // Send the file
      xhr.send(file);
    });
  }

  /**
   * Generate NIP-94 compatible tags from blob descriptor
   */
  private generateNIP94Tags(blob: { url: string; sha256: string; size: number; type?: string }): string[][] {
    const tags: string[][] = [
      ['url', blob.url],
      ['x', blob.sha256],
      ['size', blob.size.toString()],
    ];

    if (blob.type) {
      tags.push(['m', blob.type]);
    }

    // Add service tag for Blossom
    tags.push(['service', 'blossom']);

    return tags;
  }

  /**
   * Hybrid upload method - tries SDK first, falls back to XHR if needed
   */
  async upload(
    file: File, 
    signer: (draft: TDraftEvent) => Promise<any>,
    pubkey: string,
    options?: UploadOptions
  ): Promise<{ url: string; tags: string[][] }> {
    if (options?.signal?.aborted) {
      throw new Error(UPLOAD_ABORTED_ERROR_MSG);
    }

    options?.onProgress?.(0);

    // Pseudo-progress for initial setup
    let pseudoProgress = 1;
    let pseudoTimer: number | undefined;
    
    const startPseudoProgress = () => {
      if (pseudoTimer !== undefined) return;
      pseudoTimer = window.setInterval(() => {
        pseudoProgress = Math.min(pseudoProgress + 2, 85);
        if (pseudoProgress < 85) {
          options?.onProgress?.(pseudoProgress);
        }
      }, 300);
    };

    const stopPseudoProgress = () => {
      if (pseudoTimer !== undefined) {
        clearInterval(pseudoTimer);
        pseudoTimer = undefined;
      }
    };

    let lastError: Error | undefined;
    
    // Try each server with both methods
    for (let i = 0; i < DEFAULT_BLOSSOM_SERVERS.length; i++) {
      const server = DEFAULT_BLOSSOM_SERVERS[i];
      
      try {
        startPseudoProgress();
        
        // Method 1: Try Blossom Client SDK
        const result = await this.uploadWithSDK(server, file, signer, options);
        
        stopPseudoProgress();
        options?.onProgress?.(90);

        // Mirror to backup servers (async, non-blocking)
        this.mirrorToBackupServers(result.url, file, signer, server);
        
        options?.onProgress?.(100);
        return result;

      } catch (sdkError) {
        stopPseudoProgress();
        console.log(`SDK upload failed for ${server}:`, sdkError);
        
        // Check if we should try XHR fallback
        if (this.shouldUseFallback(sdkError as Error)) {
          try {
            console.log(`🔄 Trying XHR fallback for ${server}`);
            startPseudoProgress();
            
            // Method 2: Try XMLHttpRequest fallback
            const result = await this.uploadWithXHR(server, file, signer, options);
            
            stopPseudoProgress();
            options?.onProgress?.(90);

            // Mirror to backup servers
            this.mirrorToBackupServers(result.url, file, signer, server);
            
            options?.onProgress?.(100);
            return result;

          } catch (xhrError) {
            stopPseudoProgress();
            console.log(`XHR fallback also failed for ${server}:`, xhrError);
            lastError = xhrError as Error;
          }
        } else {
          lastError = sdkError as Error;
        }
      }
    }

    // All servers and methods failed
    throw new Error(`Upload failed on all servers. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Mirror uploaded blob to backup servers (non-blocking, with fallback retry)
   */
  private async mirrorToBackupServers(
    blobUrl: string,
    file: File,
    signer: (draft: TDraftEvent) => Promise<any>,
    excludeServer: string
  ): Promise<void> {
    const backupServers = DEFAULT_BLOSSOM_SERVERS.filter(server => server !== excludeServer);
    
    if (backupServers.length === 0) return;

    try {
      const auth = await BlossomClient.createUploadAuth(signer, file, {
        message: 'Mirroring video file to backup servers'
      });

      // Mirror to backup servers - with individual retry logic
      Promise.allSettled(
        backupServers.map(async (server) => {
          try {
            // Normalize server URL (remove trailing slash)
            const normalizedServer = server.endsWith('/') ? server.slice(0, -1) : server;
            
            console.log(`🔄 Attempting backup upload to ${normalizedServer}`);
            
            // Try SDK method first
            try {
              await BlossomClient.uploadBlob(normalizedServer, file, { auth });
              console.log(`✅ Successfully mirrored to ${normalizedServer} (SDK)`);
              return;
            } catch (sdkError) {
              console.log(`SDK mirror failed for ${normalizedServer}, trying XHR fallback`);
              
              // Try XHR fallback if SDK fails
              if (this.shouldUseFallback(sdkError as Error)) {
                try {
                  await this.uploadWithXHR(normalizedServer, file, signer);
                  console.log(`✅ Successfully mirrored to ${normalizedServer} (XHR fallback)`);
                  return;
                } catch (xhrError) {
                  console.warn(`⚠️ XHR mirror also failed for ${normalizedServer}:`, xhrError);
                  throw xhrError;
                }
              } else {
                throw sdkError;
              }
            }
          } catch (error) {
            console.warn(`⚠️ Failed to mirror to ${server}:`, error);
            // Ignore individual mirror failures - this is non-critical
          }
        })
      ).catch(console.error);
    } catch (error) {
      console.warn('Failed to setup mirroring:', error);
    }
  }

  /**
   * Test connectivity to Blossom servers
   */
  async testServers(): Promise<{ server: string; success: boolean; error?: string; method?: string }[]> {
    const results = await Promise.allSettled(
      DEFAULT_BLOSSOM_SERVERS.map(async (server) => {
        try {
          // Normalize server URL (remove trailing slash for testing)
          const normalizedServer = server.endsWith('/') ? server.slice(0, -1) : server;
          
          // Test basic connectivity first
          const response = await fetch(`${normalizedServer}`, { method: 'HEAD', mode: 'cors' });
          return { 
            server, 
            success: response.ok,
            method: 'HEAD',
            error: response.ok ? undefined : `HTTP ${response.status}`
          };
        } catch (error) {
          return { 
            server, 
            success: false, 
            method: 'HEAD',
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          server: DEFAULT_BLOSSOM_SERVERS[index],
          success: false,
          method: 'HEAD',
          error: result.reason?.message || 'Test failed'
        };
      }
    });
  }
}

const instance = new BlossomUploadService();
export default instance;