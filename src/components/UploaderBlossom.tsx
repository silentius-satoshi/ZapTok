import { useState, useEffect, useRef, ReactNode } from 'react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { X, Check } from 'lucide-react';
import { BlossomClient, SignedEvent, BlobDescriptor, fetchWithTimeout } from "blossom-client-sdk";
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppContext } from '@/hooks/useAppContext';
import { useToast } from '@/hooks/useToast';
import { sha256File, uuidv4, encodeAuthorizationHeader, primalBlossom, uploadLimit } from '@/lib/blossomUtils';
import { signEvent } from '@/lib/nostrAPI';
import { logInfo, logWarning } from '@/lib/logger';

const MB = 1024 * 1024;

export interface UploadState {
  isUploading: boolean;
  progress: number;
  id?: string;
  uploadLimit: number;
  file?: File;
  xhr?: XMLHttpRequest;
  auth?: SignedEvent;
}

interface UploaderBlossomProps {
  uploadId?: string;
  publicKey?: string;
  nip05?: string;
  hideLabel?: boolean;
  file: File | undefined;
  onFail?: (reason: string, uploadId?: string) => void;
  onRefuse?: (reason: string, uploadId?: string) => void;
  onCancel?: (uploadId?: string) => void;
  onSuccess?: (url: string, uploadId?: string) => void;
  onStart?: (uploadId: string | undefined, cancelUpload: () => void) => void;
  progressBar?: (state: UploadState, resetUpload: () => void) => ReactNode;
}

export function UploaderBlossom(props: UploaderBlossomProps) {
  const { user } = useCurrentUser();
  const { config } = useAppContext();
  const { toast } = useToast();

  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    uploadLimit: uploadLimit.regular,
  });

  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const mainServer = () => {
    return config.blossomServers[0] || primalBlossom;
  };

  const xhrOnProgress = (e: ProgressEvent) => {
    if (e.lengthComputable) {
      const p = Math.ceil((e.loaded / e.total) * 100);
      setUploadState(prev => ({ ...prev, progress: p }));
    }
  };

  const xhrOnLoad = (e: ProgressEvent) => {
    const xhr = xhrRef.current;
    if ((xhr?.status || 200) < 300) {
      const response = JSON.parse(xhr?.responseText || '{}');
      if (props.onSuccess) {
        props.onSuccess(response.url, props.uploadId);
      }

      mirrorUpload(response);
      resetUpload();
      return;
    }

    toast({
      title: "Upload Error",
      description: xhr?.statusText || 'Error while uploading. Check your media server settings.',
      variant: "destructive",
    });
    resetUpload();
  };

  const xhrOnError = (e: ProgressEvent) => {
    resetUpload();
    if (props.onFail) {
      props.onFail('Upload failed', props.uploadId);
    }
  };

  const xhrOnAbort = (e: ProgressEvent) => {
    console.info('upload aborted: ', uploadState.file?.name);
    clearXHR();
  };

  const resetUpload = () => {
    setUploadState({
      isUploading: false,
      file: undefined,
      id: undefined,
      progress: 0,
      xhr: undefined,
      uploadLimit: uploadLimit.regular,
      auth: undefined,
    });
    clearXHR();
  };

  const mirrorUpload = async (blob: BlobDescriptor) => {
    const mirrors = config.blossomServers.slice(1) || [];
    if (mirrors.length === 0) return;

    if (!user?.signer) return;

    try {
      const auth = await BlossomClient.createUploadAuth(
        user.signer.signEvent,
        blob.sha256,
        { message: 'media upload mirroring' }
      );

      for (const server of mirrors) {
        try {
          await BlossomClient.mirrorBlob(server, blob, { auth });
        } catch (error) {
          console.warn('Failed to mirror to: ', server, error);
        }
      }
    } catch (error) {
      console.error('Failed to create upload auth for mirroring:', error);
    }
  };

  const clearXHR = () => {
    const xhr = xhrRef.current;
    if (!xhr) return;

    xhr.removeEventListener("load", xhrOnLoad);
    xhr.removeEventListener("error", xhrOnError);
    xhr.removeEventListener("abort", xhrOnAbort);

    xhrRef.current = null;
    setUploadState(prev => ({ ...prev, xhr: undefined }));
  };

  const calcUploadLimit = (membershipTier: string | undefined, size: number) => {
    let limit = uploadLimit.regular;

    if (membershipTier === 'premium') {
      limit = uploadLimit.premium;
    }
    if (membershipTier === 'premium-legend') {
      limit = uploadLimit.premiumLegend;
    }

    setUploadState(prev => ({ ...prev, uploadLimit: limit }));
    return size <= MB * limit;
  };

  const uploadFile = async (file: File) => {
    if (!user?.signer) {
      if (props.onFail) {
        props.onFail('Must be logged in to upload files', props.uploadId);
      }
      return;
    }

    const url = mainServer();
    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;

    setUploadState({
      isUploading: true,
      id: uuidv4(),
      progress: 0,
      xhr,
      file,
      uploadLimit: uploadLimit.regular,
      auth: undefined,
    });

    let allow = true;

    if (url === primalBlossom) {
      // For Primal server, check membership limits (this would need to be implemented based on your membership system)
      allow = calcUploadLimit(undefined, file.size); // You can pass membership tier here
    }

    if (!allow) {
      if (props.onRefuse) {
        props.onRefuse(`file_too_big_${uploadState.uploadLimit}`, props.uploadId);
      }
      resetUpload();
      return;
    }

    try {
      const auth = await BlossomClient.createUploadAuth(
        user.signer.signEvent,
        file,
        { message: 'media upload' }
      );

      setUploadState(prev => ({ ...prev, auth }));

      const encodedAuthHeader = encodeAuthorizationHeader(auth);
      const mediaUrl = url.endsWith('/') ? `${url}media` : `${url}/media`;
      const uploadUrl = url.endsWith('/') ? `${url}upload` : `${url}/upload`;
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

      try {
        const mediaCheck = await fetchWithTimeout(mediaUrl, {
          method: "HEAD",
          headers: checkHeaders,
          timeout: 3000,
        });

        if (mediaCheck.status === 200) {
          sendFile(xhr, mediaUrl, file, headers);
          return;
        }
      } catch (e) {
        console.warn('Failed media upload check: ', e);
      }

      try {
        const uploadCheck = await fetchWithTimeout(uploadUrl, {
          method: "HEAD",
          headers: checkHeaders,
          timeout: 3000,
        });

        if (uploadCheck.status === 200) {
          sendFile(xhr, uploadUrl, file, headers);
          return;
        }
      } catch (e) {
        console.warn('Failed upload check: ', e);
      }

      resetUpload();
      if (props.onFail) {
        props.onFail(`Failed to upload to ${url}`, props.uploadId);
      }
    } catch (e) {
      console.error('Upload auth creation failed:', e);
      resetUpload();
      if (props.onCancel) {
        props.onCancel();
      }
    }
  };

  const sendFile = (xhr: XMLHttpRequest, uploadUrl: string, file: File, headers: Record<string, string>) => {
    xhr.open('PUT', uploadUrl, true);

    Object.entries(headers).forEach(([name, value]) => {
      xhr.setRequestHeader(name, value);
    });

    xhr.upload.addEventListener("progress", xhrOnProgress);
    xhr.addEventListener("load", xhrOnLoad);
    xhr.addEventListener("error", xhrOnError);
    xhr.addEventListener("abort", xhrOnAbort);

    xhr.send(file);

    if (props.onStart) {
      props.onStart(uploadState.id, () => {
        xhr.abort();
        resetUpload();
      });
    }
  };

  // Effect to handle file uploads
  useEffect(() => {
    if (props.file !== undefined) {
      uploadFile(props.file);
    }
  }, [props.file]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (xhrRef.current) {
        xhrRef.current.abort();
      }
    };
  }, []);

  if (!uploadState.id) {
    return null;
  }

  if (props.progressBar) {
    return <>{props.progressBar(uploadState, resetUpload)}</>;
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {!props.hideLabel && (
        <div className="mb-2">
          <div className="text-sm font-medium">{uploadState.file?.name || ''}</div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Progress value={uploadState.progress} className="h-2" />
        </div>

        <Button
          onClick={() => {
            xhrRef.current?.abort();
            resetUpload();
            if (props.onCancel) {
              props.onCancel(props.uploadId);
            }
          }}
          disabled={uploadState.progress >= 100}
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
        >
          {uploadState.progress >= 100 ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <X className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
