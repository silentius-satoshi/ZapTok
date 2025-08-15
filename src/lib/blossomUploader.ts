import { BlossomClient, SignedEvent, BlobDescriptor } from "blossom-client-sdk";
import { sha256File, uuidv4, encodeAuthorizationHeader, primalBlossom, uploadLimit, fetchWithTimeout } from './blossomUtils';

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
}

export class CustomBlossomUploader {
  private servers: string[];
  private signer: { signEvent: (event: any) => Promise<SignedEvent> };
  private onProgress?: (progress: number) => void;
  private membershipTier?: string;

  constructor(config: BlossomUploaderConfig) {
    this.servers = config.servers || [primalBlossom];
    this.signer = config.signer;
    this.onProgress = config.onProgress;
    this.membershipTier = config.membershipTier;
  }

  async upload(file: File): Promise<string[][]> {
    const mainServer = this.servers[0] || primalBlossom;
    
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

    // Create upload authorization
    const auth = await BlossomClient.createUploadAuth(
      this.signer.signEvent,
      file,
      { message: 'media upload' }
    );

    const encodedAuthHeader = encodeAuthorizationHeader(auth);
    const fileSha = await sha256File(file);
    
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
    const mediaUrl = mainServer.endsWith('/') ? `${mainServer}media` : `${mainServer}/media`;
    const uploadUrl = mainServer.endsWith('/') ? `${mainServer}upload` : `${mainServer}/upload`;

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
      console.warn('Media endpoint check failed, using upload endpoint');
    }

    // Upload the file
    const result = await this.uploadToServer(targetUrl, file, headers);
    
    // Mirror to other servers
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