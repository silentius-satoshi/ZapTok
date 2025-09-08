import { BlossomClient, SignedEvent, BlobDescriptor } from "blossom-client-sdk";
import { sha256File, uuidv4, encodeAuthorizationHeader, DEFAULT_BLOSSOM_SERVERS, uploadLimit, fetchWithTimeout } from './blossomUtils';

const MB = 1024 * 1024;

export interface BlossomUploadResult {
  url: string;
  sha256: string;
  size: number;
  type: string;
  uploaded: number;
  tags: string[][];
}

export interface BlossomUploaderConfig {
  servers: string[];
  signer: {
    signEvent: (event: any) => Promise<SignedEvent>;
  };
  onProgress?: (progress: number) => void;
  membershipTier?: string;
  onRetry?: (attemptNumber: number, server: string, error: string) => void;
}

export interface UploadAttempt {
  server: string;
  attempt: number;
  error?: string;
  success?: boolean;
}

export class CustomBlossomUploader {
  private servers: string[];
  private signer: { signEvent: (event: any) => Promise<SignedEvent> };
  private onProgress?: (progress: number) => void;
  private onRetry?: (attemptNumber: number, server: string, error: string) => void;
  private membershipTier?: string;
  private attempts: UploadAttempt[] = [];

  constructor(config: BlossomUploaderConfig) {
    this.servers = config.servers.length > 0 ? config.servers : DEFAULT_BLOSSOM_SERVERS;
    this.signer = config.signer;
    this.onProgress = config.onProgress;
    this.onRetry = config.onRetry;
    this.membershipTier = config.membershipTier;
  }

  async upload(file: File): Promise<string[][]> {
    this.attempts = [];
    
    // Check upload limits
    let uploadLimitMB = uploadLimit.regular;
    if (this.membershipTier === 'premium') {
      uploadLimitMB = uploadLimit.premium;
    }
    if (this.membershipTier === 'premium-legend') {
      uploadLimitMB = uploadLimit.premiumLegend;
    }

    if (file.size > MB * uploadLimitMB) {
      throw new Error(`File too large. Maximum size is ${uploadLimitMB}MB`);
    }

    // Calculate SHA-256 once for all attempts
    const fileSha = await sha256File(file);

    // Try uploading to servers in order with retry logic
    let lastError: Error = new Error('No servers available');
    
    for (let serverIndex = 0; serverIndex < this.servers.length; serverIndex++) {
      const server = this.servers[serverIndex];
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const result = await this.attemptUpload(server, file, fileSha, attempt);
          
          // Success! Mirror to other servers if possible
          await this.mirrorUpload({
            sha256: fileSha,
            url: result.url,
            size: file.size,
            type: file.type,
            uploaded: Date.now() / 1000
          });

          // Return NIP-94 compatible tags
          return [
            ['url', result.url],
            ['m', file.type || 'application/octet-stream'],
            ['x', fileSha],
            ['size', file.size.toString()],
          ];
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          this.attempts.push({
            server,
            attempt,
            error: errorMessage,
            success: false
          });

          lastError = error instanceof Error ? error : new Error(errorMessage);
          
          if (this.onRetry) {
            this.onRetry(attempt, server, errorMessage);
          }

          // For permanent errors (CORS, 401, 403), don't retry on same server
          if (this.isPermanentError(error)) {
            break;
          }

          // For temporary errors, wait before retrying
          if (attempt < 3) {
            await this.delay(1000 * attempt); // exponential backoff
          }
        }
      }
    }

    // All servers failed
    const attemptSummary = this.attempts.map(a => 
      `${a.server} (attempt ${a.attempt}): ${a.error}`
    ).join('; ');
    
    throw new Error(`Upload failed on all servers. Attempts: ${attemptSummary}`);
  }

  private async attemptUpload(
    server: string, 
    file: File, 
    fileSha: string, 
    attemptNumber: number
  ): Promise<BlossomUploadResult> {
    // Create upload authorization
    const auth = await BlossomClient.createUploadAuth(
      this.signer.signEvent,
      file,
      { message: 'media upload' }
    );

    const encodedAuthHeader = encodeAuthorizationHeader(auth);
    
    const headers = {
      "X-SHA-256": fileSha,
      "Authorization": encodedAuthHeader,
      'Content-Type': file.type,
    };

    const checkHeaders: Record<string, string> = {
      ...headers,
      "X-Content-Length": `${file.size}`,
    };

    if (file.type) checkHeaders["X-Content-Type"] = file.type;

    // Try media endpoint first, then upload endpoint
    const mediaUrl = server.endsWith('/') ? `${server}media` : `${server}/media`;
    const uploadUrl = server.endsWith('/') ? `${server}upload` : `${server}/upload`;

    let targetUrl = uploadUrl;

    try {
      const mediaCheck = await fetchWithTimeout(mediaUrl, {
        method: "HEAD",
        headers: checkHeaders,
        timeout: 3000,
      });

      if (mediaCheck.status === 200) {
        targetUrl = mediaUrl;
      }
    } catch (e) {
      console.warn(`Media endpoint check failed for ${server}, using upload endpoint`);
    }

    // Upload the file
    return await this.uploadToServer(targetUrl, file, headers);
  }

  private isPermanentError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    
    const message = error.message.toLowerCase();
    
    // CORS errors are permanent for this origin
    if (message.includes('cors')) return true;
    
    // Authentication/authorization errors are permanent
    if (message.includes('401') || message.includes('403') || message.includes('unauthorized')) return true;
    
    // Bad request errors are permanent
    if (message.includes('400') || message.includes('bad request')) return true;
    
    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private uploadToServer(url: string, file: File, headers: Record<string, string>): Promise<BlossomUploadResult> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && this.onProgress) {
          const progress = Math.ceil((e.loaded / e.total) * 100);
          this.onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve({
              url: response.url,
              sha256: response.sha256,
              size: response.size || file.size,
              type: response.type || file.type,
              uploaded: response.uploaded || Date.now() / 1000,
              tags: []
            });
          } catch (e) {
            reject(new Error('Invalid server response'));
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelled'));
      });

      xhr.open('PUT', url, true);

      Object.entries(headers).forEach(([name, value]) => {
        xhr.setRequestHeader(name, value);
      });

      xhr.send(file);
    });
  }

  private async mirrorUpload(blob: BlobDescriptor): Promise<void> {
    const mirrors = this.servers.slice(1);
    if (mirrors.length === 0) return;

    try {
      const auth = await BlossomClient.createUploadAuth(
        this.signer.signEvent,
        blob.sha256,
        { message: 'media upload mirroring' }
      );

      const mirrorPromises = mirrors.map(async (server) => {
        try {
          await BlossomClient.mirrorBlob(server, blob, { auth });
        } catch (error) {
          console.warn('Failed to mirror to:', server, error);
        }
      });

      await Promise.allSettled(mirrorPromises);
    } catch (error) {
      console.error('Failed to create upload auth for mirroring:', error);
    }
  }
}