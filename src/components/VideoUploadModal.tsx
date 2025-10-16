import { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, Play, Video, FileVideo, CheckCircle2, Zap, Pause, Image as ImageIcon, RotateCcw, X, RefreshCw, Trash2, Download } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { createVideoEvent, type VideoEventData } from '@/lib/videoEventStrategy';
import { compressVideo, shouldCompressVideo, isCompressionSupported } from '@/lib/videoCompression';
import blossomUploadService from '@/services/blossom-upload.service';
import { useRecordVideo } from '@/hooks/useRecordVideo';

interface VideoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface VideoMetadata {
  title: string;
  description: string;
  duration: number;
  size: number;
  type: string;
  thumbnailUrl?: string;
  customHashtags: string; // Comma-separated hashtags entered by user
}

export function VideoUploadModal({ isOpen, onClose }: VideoUploadModalProps) {
  const { user } = useCurrentUser();
  const { mutate: createEvent } = useNostrPublish();
  const { toast } = useToast();

  // Recording state from useRecordVideo hook
  const {
    isRecording,
    isPaused,
    recordedBlob,
    error: recordingError,
    stream,
    duration: recordingDuration,
    facingMode,
    initializeCamera,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    createFile,
    switchCamera,
  } = useRecordVideo();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata>({
    title: '',
    description: '',
    duration: 0,
    size: 0,
    type: '',
    customHashtags: ''
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStep, setUploadStep] = useState<'camera' | 'preview' | 'metadata' | 'uploading' | 'complete'>('camera');
  const [retryInfo, setRetryInfo] = useState<string>('');
  const [currentServer, setCurrentServer] = useState<string>('');
  const [uploadAttempts, setUploadAttempts] = useState<{server: string, attempt: number, error?: string}[]>([]);
  const [isRecordingProcessing, setIsRecordingProcessing] = useState(false);

  // Preview playback state
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(0);

  // No longer using old upload hooks - hybrid Blossom service handles all uploads
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionResult, setCompressionResult] = useState<{ originalSize: number; compressedSize: number; } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraPreviewRef = useRef<HTMLVideoElement>(null);

  const processFile = useCallback((file: File) => {
    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select a video file.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (100MB limit)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: 'Please select a video file smaller than 100MB.',
        variant: 'destructive',
      });
      return;
    }

    console.log('Processing video file:', file.name, file.type, file.size);

    setSelectedFile(file);
    setVideoMetadata(prev => ({
      ...prev,
      size: file.size,
      type: file.type,
      title: file.name.replace(/\.[^/.]+$/, '') // Remove file extension
    }));

    // Clean up previous preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setUploadStep('metadata');
  }, [toast, previewUrl]);

  const handleVideoLoad = useCallback(() => {
    if (videoRef.current) {
      const duration = videoRef.current.duration;
      console.log('Video loaded successfully, duration:', duration);

      setVideoMetadata(prev => ({
        ...prev,
        duration: Math.round(duration)
      }));
    }
  }, []);

  const generateThumbnail = useCallback(async (video: HTMLVideoElement): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Seek to 1 second or 10% of video duration for thumbnail
      const seekTime = Math.min(1, video.duration * 0.1);
      video.currentTime = seekTime;

      video.addEventListener('seeked', () => {
        if (context) {
          context.drawImage(video, 0, 0);
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              resolve(url);
            }
          }, 'image/jpeg', 0.8);
        }
      }, { once: true });
    });
  }, []);

  const handleClose = useCallback(() => {
    console.log('handleClose called - cleaning up');
    
    // FIRST: Reset recording state (this clears recordedBlob)
    resetRecording();
    
    // Clean up URLs
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    // Stop camera stream if active (resetRecording should already do this, but double-check)
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped camera track:', track.kind);
      });
    }

    // Clean up recorded blob URL if exists
    if (recordedBlob) {
      URL.revokeObjectURL(URL.createObjectURL(recordedBlob));
    }

    // Reset state
    setSelectedFile(null);
    setVideoMetadata({
      title: '',
      description: '',
      duration: 0,
      size: 0,
      type: '',
      customHashtags: ''
    });
    setPreviewUrl(null);
    setUploadProgress(0);
    setIsProcessing(false);
    setUploadStep('camera');
    setCompressionProgress(0);
    setIsCompressing(false);
    setCompressionResult(null);

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    onClose();
  }, [previewUrl, stream, recordedBlob, resetRecording, onClose]);

  // Cleanup when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Stop camera stream
      if (stream) {
        stream.getTracks().forEach(track => {
          track.stop();
          console.log('Stopped track:', track.kind);
        });
      }
      
      // Reset recording state completely
      resetRecording();
      
      // Also reset local state
      setSelectedFile(null);
      setPreviewUrl(null);
      setUploadStep('camera');
    }
  }, [isOpen, stream, resetRecording]);

  // Initialize camera when modal opens
  useEffect(() => {
    if (isOpen && uploadStep === 'camera' && !selectedFile && !recordedBlob) {
      console.log('Modal opened - initializing camera');
      
      // Small delay to ensure cleanup has completed
      const timer = setTimeout(() => {
        initializeCamera().catch((err) => {
          console.error('Failed to initialize camera:', err);
          toast({
            title: 'Camera Error',
            description: 'Unable to access camera. Please check permissions.',
            variant: 'destructive',
          });
        });
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, uploadStep, selectedFile, recordedBlob, initializeCamera, toast]);

  // Attach stream to camera preview video element
  useEffect(() => {
    if (stream && cameraPreviewRef.current) {
      cameraPreviewRef.current.srcObject = stream;
    }
  }, [stream]);

  // Track recording processing state
  useEffect(() => {
    // When recording stops but blob isn't ready yet, show loading
    if (!isRecording && !recordedBlob && isRecordingProcessing) {
      // Still processing
    } else if (!isRecording && recordedBlob) {
      // Processing complete
      setIsRecordingProcessing(false);
    }
  }, [isRecording, recordedBlob, isRecordingProcessing]);

  // Auto-play recorded video when it's ready
  useEffect(() => {
    if (recordedBlob && videoRef.current && uploadStep === 'camera') {
      videoRef.current.play().catch((err) => {
        console.log('Auto-play blocked:', err);
      });
    }
  }, [recordedBlob, uploadStep]);

  // Handle recorded video
  const handleUseRecording = useCallback(() => {
    if (!recordedBlob) return;
    
    // Go to preview screen instead of directly processing
    setUploadStep('preview');
  }, [recordedBlob]);

  // Handle re-record - fully reset and restart camera
  const handleReRecord = useCallback(async () => {
    console.log('Re-record: Resetting recording state...');
    
    // Reset processing state
    setIsRecordingProcessing(false);
    
    // First, reset the recording state (clears recordedBlob)
    resetRecording();
    
    // Wait a moment for state to clear
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Then restart the camera (don't start recording automatically)
    try {
      await initializeCamera();
      console.log('Re-record: Camera restarted successfully');
    } catch (err) {
      console.error('Re-record: Failed to restart camera:', err);
      toast({
        title: 'Camera Error',
        description: 'Unable to restart camera. Please try again.',
        variant: 'destructive',
      });
    }
  }, [resetRecording, initializeCamera, toast]);

  // Handle record/pause button click
  const handleRecordPauseClick = useCallback(() => {
    if (!isRecording && !recordedBlob) {
      // Start recording (camera already initialized)
      startRecording();
    } else if (isRecording && !isPaused) {
      // Pause recording
      pauseRecording();
    } else if (isPaused) {
      // Resume recording
      resumeRecording();
    }
  }, [isRecording, isPaused, recordedBlob, startRecording, pauseRecording, resumeRecording]);

  const handleStopRecording = useCallback(() => {
    stopRecording();
    setIsRecordingProcessing(true);
    // Don't auto-navigate - let user choose Next or Re-record
  }, [stopRecording]);

  // Preview video controls
  const handlePreviewPlayPause = useCallback(() => {
    if (!videoRef.current) return;
    
    if (isPreviewPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  }, [isPreviewPlaying]);

  const handlePreviewTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setPreviewCurrentTime(videoRef.current.currentTime);
    }
  }, []);

  const handlePreviewLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setPreviewDuration(videoRef.current.duration);
    }
  }, []);

  const handlePreviewSeek = useCallback((newTime: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setPreviewCurrentTime(newTime);
    }
  }, []);

  const handleDeleteRecording = useCallback(() => {
    resetRecording();
    setUploadStep('camera');
    setPreviewCurrentTime(0);
    setPreviewDuration(0);
    setIsPreviewPlaying(false);
  }, [resetRecording]);

  const handleDownloadRecording = useCallback(() => {
    if (!recordedBlob) return;
    
    const url = URL.createObjectURL(recordedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zaptok-recording-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Video Downloaded',
      description: 'Your recording has been saved to your device.',
    });
  }, [recordedBlob, toast]);

  const handlePublishToNostr = useCallback(() => {
    if (!recordedBlob) return;
    
    const file = createFile(`recording-${Date.now()}.webm`);
    if (file) {
      processFile(file);
    }
  }, [recordedBlob, createFile, processFile]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Stop camera when file is selected
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    resetRecording();
    
    processFile(file);
  }, [processFile, stream, resetRecording]);

  const handleUpload = useCallback(async () => {
    if (!selectedFile || !user) return;

    // Enhanced validation
    if (!user.signer) {
      toast({
        title: 'Authentication Error',
        description: 'User signer not available. Please try logging out and back in.',
        variant: 'destructive',
      });
      return;
    }

    // Enhanced signer validation with better bunker signer support
    const signerAny = user.signer as any; // Type assertion for bunker signer access
    const isBunkerSigner = signerAny?.bunkerSigner;
    const effectiveSigner = isBunkerSigner || user.signer;

    console.log('🔍 [VideoUpload] Signer validation debug:', {
      signerAvailable: !!user.signer,
      isBunkerSigner: !!isBunkerSigner,
      hasDirectSignEvent: !!user.signer?.signEvent,
      hasBunkerSignEvent: !!signerAny?.bunkerSigner?.signEvent,
      effectiveSignEvent: !!effectiveSigner?.signEvent,
      signerSignEventType: typeof user.signer?.signEvent,
      bunkerSignEventType: typeof signerAny?.bunkerSigner?.signEvent,
      signerMethods: user.signer ? Object.keys(user.signer) : 'none',
      bunkerMethods: signerAny?.bunkerSigner ? Object.keys(signerAny.bunkerSigner) : 'none',
      signerConstructor: user.signer?.constructor?.name,
      bunkerConstructor: signerAny?.bunkerSigner?.constructor?.name
    });

    if (!effectiveSigner?.signEvent || typeof effectiveSigner.signEvent !== 'function') {
      console.error('❌ [VideoUpload] Signer validation failed:', {
        hasDirectSignEvent: !!user.signer?.signEvent,
        hasBunkerSignEvent: !!signerAny?.bunkerSigner?.signEvent,
        directSignEventType: typeof user.signer?.signEvent,
        bunkerSignEventType: typeof signerAny?.bunkerSigner?.signEvent,
        availableMethods: user.signer ? Object.keys(user.signer) : [],
        bunkerMethods: signerAny?.bunkerSigner ? Object.keys(signerAny.bunkerSigner) : []
      });

      toast({
        title: 'Authentication Error',
        description: 'Invalid signer configuration. Please ensure you are logged in with a Nostr signer or valid key.',
        variant: 'destructive',
      });
      return;
    }

    console.log('✅ [VideoUpload] Starting upload process:', {
      fileSize: selectedFile.size,
      fileName: selectedFile.name,
      userPubkey: user.pubkey,
      signerAvailable: !!user.signer,
      isBunkerSigner: !!isBunkerSigner,
      hasDirectSignEvent: !!user.signer?.signEvent,
      hasBunkerSignEvent: !!signerAny?.bunkerSigner?.signEvent,
      effectiveSignEvent: !!effectiveSigner?.signEvent,
      effectiveSignerType: effectiveSigner?.constructor?.name || 'unknown'
    });

    setIsProcessing(true);
    setUploadStep('uploading');
    setUploadProgress(0);
    setRetryInfo('');
    setCurrentServer('');
    setUploadAttempts([]);

    // Declare fileToUpload outside try block so it's accessible in catch block
    let fileToUpload = selectedFile;
    let compressionInfo = '';

    try {
      // Generate thumbnail if video is loaded
      let thumbnailUrl = '';
      if (videoRef.current) {
        console.log('🖼️ [VideoUpload] Generating thumbnail...');
        const thumbnailDataUrl = await generateThumbnail(videoRef.current);

        // Convert thumbnail to File for upload
        const response = await fetch(thumbnailDataUrl);
        const blob = await response.blob();
        const thumbnailFile = new File([blob], `${selectedFile.name}_thumbnail.jpg`, { type: 'image/jpeg' });

        // Upload thumbnail using hybrid Blossom approach
        console.log('🚀 [VideoUpload] Uploading thumbnail with hybrid Blossom...');
        setRetryInfo('Uploading thumbnail...');
        const signerAny = user.signer as any;
        const isBunkerSigner = signerAny?.bunkerSigner;
        const effectiveSigner = isBunkerSigner || user.signer;

        const thumbnailResult = await blossomUploadService.upload(
          thumbnailFile,
          effectiveSigner.signEvent.bind(effectiveSigner),
          user.pubkey,
          {
            onProgress: (progress) => {
              const adjustedProgress = 25 + (progress * 0.15); // 25-40%
              setUploadProgress(adjustedProgress);
              console.log(`📊 [Blossom] Thumbnail progress: ${progress}% (adjusted: ${adjustedProgress}%)`);
            }
          }
        );
        thumbnailUrl = thumbnailResult.url;
        console.log('✅ [Blossom] Thumbnail uploaded:', thumbnailUrl);
        setRetryInfo('');
      }

      // Check if video should be compressed
      // fileToUpload and compressionInfo are already declared outside try block

      if (isCompressionSupported() && await shouldCompressVideo(selectedFile)) {
        console.log('Video compression recommended, compressing video...');
        setIsCompressing(true);
        setCompressionProgress(0);

        try {
          const result = await compressVideo(selectedFile, {
            onProgress: (progress) => {
              setCompressionProgress(progress);
            }
          });

          fileToUpload = result.compressedFile;
          setCompressionResult({
            originalSize: result.originalSize,
            compressedSize: result.compressedSize
          });

          const savedMB = (result.originalSize - result.compressedSize) / (1024 * 1024);
          compressionInfo = ` (compressed from ${(result.originalSize / 1024 / 1024).toFixed(1)}MB to ${(result.compressedSize / 1024 / 1024).toFixed(1)}MB, saved ${savedMB.toFixed(1)}MB)`;

          console.log('Video compression completed:', {
            originalSize: result.originalSize,
            compressedSize: result.compressedSize,
            compressionRatio: result.compressionRatio,
            savedMB: savedMB.toFixed(1)
          });

          toast({
            title: 'Video compressed!',
            description: `Reduced file size by ${savedMB.toFixed(1)}MB for faster upload and streaming.`,
          });

        } catch (compressionError) {
          console.warn('Video compression failed, using original file:', compressionError);
          toast({
            title: 'Compression skipped',
            description: 'Using original video file for upload.',
            variant: 'default',
          });
        } finally {
          setIsCompressing(false);
        }
      } else {
        console.log('Video compression not needed or not supported');
      }

      // Upload video using hybrid Blossom approach (SDK + XHR fallback)
      console.log('🚀 [VideoUpload] Starting hybrid Blossom upload (SDK + XHR fallback)...');
      setUploadProgress(50);
      setRetryInfo('Uploading with hybrid Blossom protocol...');

      // Use hybrid Blossom upload service as primary method
      const signerAny = user.signer as any;
      const isBunkerSigner = signerAny?.bunkerSigner;
      const effectiveSigner = isBunkerSigner || user.signer;

      const videoResult = await blossomUploadService.upload(
        fileToUpload,
        effectiveSigner.signEvent.bind(effectiveSigner),
        user.pubkey,
        {
          onProgress: (progress) => {
            const adjustedProgress = 50 + (progress * 0.3); // 50-80%
            setUploadProgress(adjustedProgress);
            console.log(`📊 [Blossom] Upload progress: ${progress}% (adjusted: ${adjustedProgress}%)`);
          }
        }
      );

      console.log('✅ [Blossom] Video uploaded successfully with hybrid approach:', videoResult);
      setRetryInfo('Video upload successful!');

      // Convert Blossom result to video tags format
      const videoTags = [
        ['url', videoResult.url],
        ...videoResult.tags
      ];

      console.log('📝 [Blossom] Generated video tags:', videoTags);
      setRetryInfo('');
      // videoUrl is the first tag - we'll use it in the tags array below

      setUploadProgress(80);

      // Create hybrid video event for cross-client compatibility
      console.log('Creating hybrid Nostr event for cross-client compatibility...');

      // Extract video data from upload tags
      const videoUrl = videoTags.find(tag => tag[0] === 'url')?.[1] || '';
      const videoHash = videoTags.find(tag => tag[0] === 'x')?.[1] || '';
      const videoSize = parseInt(videoTags.find(tag => tag[0] === 'size')?.[1] || '0');
      const videoType = videoTags.find(tag => tag[0] === 'm')?.[1] || videoMetadata.type;

      // Prepare video data for event
      const videoData: VideoEventData = {
        title: videoMetadata.title,
        description: videoMetadata.description,
        videoUrl: videoUrl,
        thumbnailUrl: thumbnailUrl,
        hash: videoHash,
        duration: videoMetadata.duration,
        size: videoSize,
        type: videoType,
        // Extract dimensions if available from Blossom tags
        width: videoTags.find(tag => tag[0] === 'dim')?.[1]?.split('x')[0] ?
               parseInt(videoTags.find(tag => tag[0] === 'dim')![1].split('x')[0]) : undefined,
        height: videoTags.find(tag => tag[0] === 'dim')?.[1]?.split('x')[1] ?
                parseInt(videoTags.find(tag => tag[0] === 'dim')![1].split('x')[1]) : undefined,
      };

      // Parse custom hashtags (remove # if user included it, split by comma, trim whitespace)
      const customTags = videoMetadata.customHashtags
        .split(',')
        .map(tag => tag.trim().replace(/^#/, ''))
        .filter(tag => tag.length > 0);

      // Combine auto-tags with custom tags
      const allHashtags = [
        'video',
        'zaptok',
        ...(videoMetadata.duration <= 60 ? ['short'] : []),
        ...customTags
      ];

      // Create video event (kind 21/22 with rich metadata)
      const videoEvent = createVideoEvent(videoData, {
        includeNip71Tags: true,
        includeRichContent: true,
        hashtags: allHashtags,
        includeImeta: true
      });

      // Add any additional Blossom-specific tags from the upload
      const additionalTags = videoTags.filter(tag =>
        !['url', 'x', 'size', 'dim', 'm', 'thumb'].includes(tag[0])
      );
      videoEvent.tags = [...(videoEvent.tags || []), ...additionalTags];

      console.log('Publishing video event to Nostr...', {
        kind: videoEvent.kind,
        contentPreview: videoEvent.content?.substring(0, 50),
        tagCount: videoEvent.tags?.length,
        videoUrl: videoUrl,
        videoHash: videoHash
      });

      createEvent(videoEvent);

      setUploadProgress(100);
      setUploadStep('complete');

      toast({
        title: 'Video uploaded successfully!',
        description: `Your ${videoMetadata.duration <= 60 ? 'short' : 'normal'} video has been published.`,
      });

      // Reset form after a delay
      setTimeout(() => {
        handleClose();
      }, 2000);

    } catch (error) {
      console.error('Upload failed:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        user: user ? { pubkey: user.pubkey, signerAvailable: !!user.signer } : 'No user',
        attempts: uploadAttempts
      });

      // Show error message - hybrid service has already tried all available methods
      let displayErrorMessage = 'There was an error uploading your video. Please try again.';
      let errorDetails = '';

      if (error instanceof Error) {
        const message = error.message.toLowerCase();

        if (message.includes('upload failed on all servers')) {
          displayErrorMessage = 'Upload failed on all available servers using multiple protocols. Please try again later.';
          if (uploadAttempts.length > 0) {
            const serverList = [...new Set(uploadAttempts.map(a => a.server))];
            errorDetails = `Tried servers: ${serverList.join(', ')}`;
          }
        } else if (message.includes('cors')) {
          displayErrorMessage = 'Network access blocked. Both primary and fallback upload methods failed.';
          errorDetails = 'Please try again in a few minutes.';
        } else if (message.includes('503') || message.includes('service unavailable')) {
          displayErrorMessage = 'Server temporarily unavailable. All upload methods exhausted.';
          errorDetails = 'This usually resolves within a few minutes.';
        } else if (message.includes('signer') || message.includes('nostr')) {
          displayErrorMessage = 'Authentication error. Please try logging out and back in.';
        } else if (message.includes('network') || message.includes('fetch')) {
          displayErrorMessage = 'Network error. Please check your connection and try again.';
        } else if (message.includes('file') || message.includes('size')) {
          displayErrorMessage = 'File upload error. Please try a smaller file or different format.';
        }
      }

      toast({
        title: 'Upload failed',
        description: errorDetails ? `${displayErrorMessage} ${errorDetails}` : displayErrorMessage,
        variant: 'destructive',
      });
      setUploadStep('metadata');
    } finally {
      setIsProcessing(false);
      setRetryInfo('');
      setCurrentServer('');
    }
  }, [selectedFile, user, videoMetadata, createEvent, toast, generateThumbnail, handleClose]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        hideClose
        className="p-0 gap-0 border-0 bg-transparent max-w-none w-full h-full md:max-w-2xl md:h-[90vh] overflow-hidden"
      >
        {/* Camera View - Matches VideoCard dimensions exactly */}
        {uploadStep === 'camera' && (
          <div className="relative w-full h-full bg-black md:rounded-3xl md:border-2 md:border-gray-800 overflow-hidden md:shadow-2xl">
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-4 left-4 z-50 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
            >
              <X className="h-6 w-6 text-white" />
            </button>

            {/* Flip Camera Button - Top Right (show when camera is active, hide when video is recorded) */}
            {!recordedBlob && (
              <button
                onClick={switchCamera}
                disabled={isRecording}
                className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={facingMode === 'user' ? 'Switch to back camera' : 'Switch to front camera'}
              >
                <RefreshCw className="h-6 w-6 text-white" />
              </button>
            )}

            {/* Camera Preview or Recorded Video Playback */}
            <div className="w-full h-full flex items-center justify-center">
              {recordedBlob ? (
                // Playback after recording
                <video
                  key="recorded-video"
                  ref={videoRef}
                  src={URL.createObjectURL(recordedBlob)}
                  className="w-full h-full object-cover"
                  playsInline
                  loop
                  muted={false}
                />
              ) : (
                // Live camera preview - mirrored for front-facing camera only
                <video
                  key="camera-preview"
                  ref={cameraPreviewRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                  style={facingMode === 'user' ? { transform: 'scaleX(-1)' } : undefined}
                />
              )}

              {/* Error State */}
              {recordingError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                  <div className="text-center text-white max-w-md px-6">
                    <p className="text-lg font-medium mb-2">Camera Access Required</p>
                    <p className="text-sm text-gray-300">{recordingError}</p>
                    <Button
                      onClick={handleClose}
                      variant="outline"
                      className="mt-4"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Duration Display - Top Center (only during recording) */}
            {isRecording && !recordedBlob && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-40 px-4 py-2 rounded-full bg-red-600 text-white font-mono text-sm flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
                {Math.floor(recordingDuration / 60).toString().padStart(2, '0')}:{(recordingDuration % 60).toString().padStart(2, '0')}
              </div>
            )}

            {/* Bottom Controls - Minimal iOS-style */}
            <div className="absolute bottom-0 left-0 right-0 z-40 pb-8 pt-12">
              <div className="flex items-center justify-between px-6">
                {/* Left side - Re-record button (only when recorded) */}
                {recordedBlob && !isRecordingProcessing && (
                  <Button
                    onClick={handleReRecord}
                    variant="ghost"
                    size="lg"
                    className="text-white hover:bg-white/20"
                  >
                    <RotateCcw className="h-5 w-5 mr-2" />
                    Re-record
                  </Button>
                )}
                {!recordedBlob && <div className="w-24" />} {/* Spacer */}

                {/* Center - Record button or loading */}
                <div className="flex items-center justify-center flex-1">
                  {isRecordingProcessing ? (
                    // Processing recorded video
                    <div className="text-white text-center">
                      <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
                      <p className="text-sm">Processing video...</p>
                    </div>
                  ) : !recordedBlob ? (
                    // During camera preview or recording: Simple record button
                    <button
                      onClick={handleRecordPauseClick}
                      className="relative h-20 w-20 rounded-full border-4 border-white flex items-center justify-center bg-transparent transition-all"
                    >
                      {isRecording && !isPaused ? (
                        // Square pause button when recording
                        <div className="w-8 h-8 bg-white" />
                      ) : isPaused ? (
                        // Red circle for resume recording
                        <div className="w-12 h-12 rounded-full bg-red-600" />
                      ) : (
                        // Red circle for start recording
                        <div className="w-16 h-16 rounded-full bg-red-600" />
                      )}
                    </button>
                  ) : null}
                </div>

                {/* Right side - Preview button (only when paused or recording can be stopped) */}
                {isRecording && (
                  <Button
                    onClick={handleStopRecording}
                    size="lg"
                    className="bg-gradient-to-r from-purple-600 to-orange-600 hover:from-purple-700 hover:to-orange-700 text-white"
                  >
                    Preview
                    <Play className="h-5 w-5 ml-2" />
                  </Button>
                )}
                {!isRecording && !recordedBlob && <div className="w-24" />} {/* Spacer */}
              </div>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {/* Preview Screen - After recording finishes */}
        {uploadStep === 'preview' && recordedBlob && (
          <div className="relative w-full h-full bg-black md:rounded-3xl md:border-2 md:border-gray-800 overflow-hidden md:shadow-2xl">
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-4 left-4 z-50 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
            >
              <X className="h-6 w-6 text-white" />
            </button>

            {/* Video Preview */}
            <div className="w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                src={URL.createObjectURL(recordedBlob)}
                className="w-full h-full object-cover cursor-pointer"
                onClick={handlePreviewPlayPause}
                onPlay={() => setIsPreviewPlaying(true)}
                onPause={() => setIsPreviewPlaying(false)}
                onTimeUpdate={handlePreviewTimeUpdate}
                onLoadedMetadata={handlePreviewLoadedMetadata}
                loop
              />

              {/* Play/Pause Overlay */}
              {!isPreviewPlaying && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-black/50 rounded-full p-6">
                    <Play className="h-16 w-16 text-white" fill="white" />
                  </div>
                </div>
              )}
            </div>

            {/* Progress Bar - Bottom */}
            <div className="absolute bottom-0 left-0 right-0 z-40 pb-24">
              <div className="px-4">
                {/* Time Display */}
                <div className="flex justify-between text-white text-xs mb-2 px-2">
                  <span>{Math.floor(previewCurrentTime / 60)}:{Math.floor(previewCurrentTime % 60).toString().padStart(2, '0')}</span>
                  <span>{Math.floor(previewDuration / 60)}:{Math.floor(previewDuration % 60).toString().padStart(2, '0')}</span>
                </div>

                {/* Progress Bar */}
                <div className="relative h-1 bg-gray-600 rounded-full cursor-pointer"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const percentage = x / rect.width;
                    handlePreviewSeek(percentage * previewDuration);
                  }}
                >
                  <div 
                    className="absolute top-0 left-0 h-full bg-white rounded-full"
                    style={{ width: `${(previewCurrentTime / previewDuration) * 100}%` }}
                  />
                  {/* Draggable handle */}
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg"
                    style={{ left: `${(previewCurrentTime / previewDuration) * 100}%`, transform: 'translate(-50%, -50%)' }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between px-6 mt-6">
                {/* Delete Button - Bottom Left */}
                <button
                  onClick={handleDeleteRecording}
                  className="p-3 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                  title="Delete recording"
                >
                  <Trash2 className="h-6 w-6 text-white" />
                </button>

                {/* Publish Button - Bottom Center */}
                <Button
                  onClick={handlePublishToNostr}
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 to-orange-600 hover:from-purple-700 hover:to-orange-700 text-white px-8"
                >
                  Publish to Nostr
                </Button>

                {/* Download Button - Bottom Right */}
                <button
                  onClick={handleDownloadRecording}
                  className="p-3 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                  title="Download recording"
                >
                  <Download className="h-6 w-6 text-white" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Metadata Step - Matches VideoCard dimensions */}
        {uploadStep === 'metadata' && selectedFile && (
          <div className="w-full h-full bg-gradient-to-b from-gray-900 to-black md:rounded-3xl md:border-2 md:border-gray-800 overflow-hidden flex flex-col md:shadow-2xl">
            {/* Header with Close Button */}
            <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-sm border-b border-gray-800">
              <button
                onClick={() => setUploadStep('camera')}
                className="p-2 rounded-full hover:bg-gray-800 transition-colors text-white"
              >
                <X className="h-5 w-5" />
              </button>
              <h2 className="text-lg font-semibold text-white">Video Details</h2>
              <div className="w-9" /> {/* Spacer for centering */}
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              <div className="space-y-4 p-4">
            {/* Video Preview */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-4">
                <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4 relative">
                  {previewUrl ? (
                    <video
                      ref={videoRef}
                      src={previewUrl}
                      controls
                      preload="metadata"
                      onLoadedMetadata={handleVideoLoad}
                      onError={(e) => {
                        console.error('Video preview failed to load:', e.currentTarget.error);
                        toast({
                          title: 'Video preview error',
                          description: 'Unable to preview video, but upload should still work.',
                          variant: 'destructive',
                        });
                      }}
                      className="w-full h-full object-contain"
                      style={{ backgroundColor: 'black' }}
                    >
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <FileVideo className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Loading video preview...</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="secondary">
                    <FileVideo className="h-3 w-3 mr-1" />
                    {formatFileSize(videoMetadata.size)}
                  </Badge>
                  {videoMetadata.duration > 0 && (
                    <Badge variant="secondary">
                      <Play className="h-3 w-3 mr-1" />
                      {formatDuration(videoMetadata.duration)}
                    </Badge>
                  )}
                  <Badge variant={videoMetadata.duration <= 60 ? "default" : "outline"}>
                    {videoMetadata.duration <= 60 ? "Short Video" : "Normal Video"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Metadata Form */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={videoMetadata.title}
                  onChange={(e) => setVideoMetadata(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter video title"
                  maxLength={100}
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={videoMetadata.description}
                  onChange={(e) => setVideoMetadata(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your video..."
                  maxLength={500}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="hashtags">Custom Hashtags (optional)</Label>
                <Input
                  id="hashtags"
                  value={videoMetadata.customHashtags}
                  onChange={(e) => setVideoMetadata(prev => ({ ...prev, customHashtags: e.target.value }))}
                  placeholder="e.g., nostr, bitcoin, technology"
                  maxLength={100}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Separate with commas. Auto-tags: #video, #zaptok{videoMetadata.duration <= 60 ? ', #short' : ''}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setUploadStep('camera')}>
                Back
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!videoMetadata.title.trim() || isProcessing}
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload to Nostr
              </Button>
            </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Uploading */}
        {uploadStep === 'uploading' && (
          <div className="w-full h-full bg-black md:rounded-3xl md:border-2 md:border-gray-800 overflow-hidden flex items-center justify-center md:shadow-2xl">
          <div className="space-y-4 text-center max-w-md px-6">
            {isCompressing ? (
              <>
                <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                  <Zap className="h-8 w-8 text-purple-600 animate-pulse" />
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">Compressing video...</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Optimizing your video for faster upload and streaming
                  </p>

                  <Progress value={compressionProgress} className="w-full mb-2" />
                  <p className="text-xs text-gray-500">{Math.round(compressionProgress)}% compressed</p>
                </div>

                <div className="text-left space-y-2 text-sm text-gray-600">
                  <p>• Analyzing video metadata...</p>
                  <p>• Optimizing video quality...</p>
                  <p>• Reducing file size...</p>
                  <p>• Preparing for upload...</p>
                </div>
              </>
            ) : (
              <>
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <Upload className="h-8 w-8 text-blue-600 animate-pulse" />
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">Uploading your video...</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {compressionResult
                      ? `Compressed from ${(compressionResult.originalSize / 1024 / 1024).toFixed(1)}MB to ${(compressionResult.compressedSize / 1024 / 1024).toFixed(1)}MB`
                      : "This may take a moment depending on your file size"
                    }
                  </p>

                  <Progress value={uploadProgress} className="w-full mb-2" />
                  <p className="text-xs text-gray-500">{uploadProgress}% complete</p>

                  {retryInfo && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                      <p>{retryInfo}</p>
                      {currentServer && (
                        <p className="text-yellow-600">Server: {currentServer.replace('https://', '').replace('http://', '').split('/')[0]}</p>
                      )}
                    </div>
                  )}

                  {uploadAttempts.length > 0 && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                      <p>Trying multiple servers for reliability...</p>
                      <p className="text-blue-600">
                        Attempted: {[...new Set(uploadAttempts.map(a => a.server))].join(', ')}
                      </p>
                    </div>
                  )}
                </div>

                <div className="text-left space-y-2 text-sm text-gray-600">
                  <p>• {compressionResult ? '✓' : '•'} Video compression {compressionResult ? 'completed' : 'skipped'}</p>
                  <p>• Uploading to Blossom servers...</p>
                  <p>• Generating thumbnail...</p>
                  <p>• Creating hybrid Nostr event...</p>
                  <p>• Publishing to relays...</p>
                </div>
              </>
            )}
          </div>
          </div>
        )}

        {/* Step 4: Complete */}
        {uploadStep === 'complete' && (
          <div className="w-full h-full bg-black md:rounded-3xl md:border-2 md:border-gray-800 overflow-hidden flex items-center justify-center md:shadow-2xl">
          <div className="space-y-4 text-center max-w-md px-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Upload Complete!</h3>
              <p className="text-sm text-gray-600 mb-4">
                Your video has been successfully published to Nostr
              </p>

              <div className="text-left space-y-1 text-sm text-gray-600">
                <p>✓ Video uploaded to Blossom</p>
                <p>✓ Thumbnail generated</p>
                <p>✓ Hybrid event created (kind 1)</p>
                <p>✓ Cross-client compatible</p>
                <p>✓ Published to relays</p>
              </div>
            </div>

            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
