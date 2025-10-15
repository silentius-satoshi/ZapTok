import { BlossomClient, SignedEvent, BlobDescriptor } from "blossom-client-sdk";
import { sha256File, encodeAuthorizationHeader, uploadLimit, fetchWithTimeout } from './blossomUtils';

const MB = 1024 * 1024;

// Simplified, reliable server list for uploads
// Primary server: primal.net (known to work for you)
// Fallback server: stacker.news (reliable alternative)
const RELIABLE_UPLOAD_SERVERS = [
  'https://blossom.primal.net/',
  'https://blossom.stacker.news/',
];

export interface BlossomUploadResult {
  url: string;
  sha256: string;
  size: number;
  type: string;
  uploaded: number;
}

export interface BlossomUploaderConfig {
  servers?: string[]; // Optional - will use reliable defaults
  signer: {
    signEvent: (event: any) => Promise<SignedEvent>;
  };
  onProgress?: (progress: number) => void;
  membershipTier?: string;
}

export class CustomBlossomUploader {
  private servers: string[];
  private signer: { signEvent: (event: any) => Promise<SignedEvent> };
  private onProgress?: (progress: number) => void;
  private membershipTier?: string;

  constructor(config: BlossomUploaderConfig) {
    // Use reliable servers by default, allow override for future features
    this.servers = config.servers?.length ? config.servers : RELIABLE_UPLOAD_SERVERS;
    this.signer = config.signer;
    this.onProgress = config.onProgress;
    this.membershipTier = config.membershipTier;
  }

  async upload(file: File): Promise<string[][]> {
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

    const fileSha = await sha256File(file);

    // Simple two-server strategy: try primary, then fallback
    const primaryServer = this.servers[0];
    const fallbackServer = this.servers[1];

    console.log('🔄 Starting upload to primary server:', primaryServer);

    try {
      // Try primary server first
      const result = await this.uploadToSingleServer(primaryServer, file, fileSha);
      console.log('✅ Primary server upload successful:', result.url);
      
      // Mirror to fallback server in background (don't wait)
      if (fallbackServer) {
        this.mirrorUpload({
          sha256: fileSha,
          url: result.url,
          size: file.size,
          type: file.type,
          uploaded: Date.now() / 1000
        }).catch(error => {
          console.warn('⚠️ Background mirroring failed:', error);
        });
      }

      return [
        ['url', result.url],
        ['m', file.type || 'application/octet-stream'],
        ['x', fileSha],
        ['size', file.size.toString()],
      ];

    } catch (primaryError) {
      console.warn('❌ Primary server failed:', primaryError);
      
      if (!fallbackServer) {
        throw primaryError;
      }

      console.log('🔄 Trying fallback server:', fallbackServer);
      
      try {
        const result = await this.uploadToSingleServer(fallbackServer, file, fileSha);
        console.log('✅ Fallback server upload successful:', result.url);

        return [
          ['url', result.url],
          ['m', file.type || 'application/octet-stream'],
          ['x', fileSha],
          ['size', file.size.toString()],
        ];

      } catch (fallbackError) {
        console.error('❌ Both servers failed');
        throw new Error(`Upload failed. Primary: ${primaryError.message}. Fallback: ${fallbackError.message}`);
      }
    }
  }

  private async uploadToSingleServer(
    server: string,
    file: File,
    fileSha: string
  ): Promise<BlossomUploadResult> {
    // Create upload authorization
    const auth = await BlossomClient.createUploadAuth(
      this.signer.signEvent,
      file,
      { message: 'media upload' }
    );

    const encodedAuthHeader = encodeAuthorizationHeader(auth);
    
    // Normalize server URL
    const normalizedServer = server.endsWith('/') ? server : `${server}/`;
    const mediaUrl = `${normalizedServer}media`;
    const uploadUrl = `${normalizedServer}upload`;

    const headers = {
      "X-SHA-256": fileSha,
      "Authorization": encodedAuthHeader,
      'Content-Type': file.type || 'application/octet-stream',
    };

    const checkHeaders: Record<string, string> = {
      ...headers,
      "X-Content-Length": `${file.size}`,
    };

    if (file.type) checkHeaders["X-Content-Type"] = file.type;

    let targetUrl = uploadUrl;

    // Try media endpoint first
    try {
      const mediaCheck = await fetchWithTimeout(mediaUrl, {
        method: "HEAD",
        headers: checkHeaders,
        timeout: 3000,
      });

      if (mediaCheck.status === 200) {
        targetUrl = mediaUrl;
        console.log('📤 Using media endpoint:', targetUrl);
      } else {
        console.log('📤 Using upload endpoint:', targetUrl);
      }
    } catch (e) {
      console.warn(`📤 Media endpoint check failed for ${server}, using upload endpoint`);
    }

    // Upload the file
    return await this.uploadToServer(targetUrl, file, headers);
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
            });
          } catch (e) {
            reject(new Error('Invalid server response'));
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed - network error'));
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

      for (const server of mirrors) {
        try {
          await BlossomClient.mirrorBlob(server, blob, { auth });
        } catch (error) {
          console.warn('Failed to mirror to:', server, error);
        }
      }
    } catch (error) {
      console.error('Failed to create upload auth for mirroring:', error);
    }
  }
}