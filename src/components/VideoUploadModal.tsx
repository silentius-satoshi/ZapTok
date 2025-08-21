import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, Play, Video, FileVideo, CheckCircle2 } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUploadFile } from '@/hooks/useUploadFile';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { createHybridVideoEvent, type HybridVideoEventData } from '@/lib/hybridEventStrategy';

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
}

export function VideoUploadModal({ isOpen, onClose }: VideoUploadModalProps) {
  const { user } = useCurrentUser();
  const { mutateAsync: uploadFile } = useUploadFile();
  const { mutate: createEvent } = useNostrPublish();
  const { toast } = useToast();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata>({
    title: '',
    description: '',
    duration: 0,
    size: 0,
    type: ''
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStep, setUploadStep] = useState<'select' | 'metadata' | 'uploading' | 'complete'>('select');
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

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

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    processFile(file);
  }, [processFile]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    
    const file = event.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

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
    // Clean up URLs
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    // Reset state
    setSelectedFile(null);
    setVideoMetadata({
      title: '',
      description: '',
      duration: 0,
      size: 0,
      type: ''
    });
    setPreviewUrl(null);
    setUploadProgress(0);
    setIsProcessing(false);
    setUploadStep('select');
    
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    onClose();
  }, [previewUrl, onClose]);

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

    if (!user.signer.signEvent || typeof user.signer.signEvent !== 'function') {
      toast({
        title: 'Authentication Error',
        description: 'Invalid signer configuration. Please ensure you are logged in with a Nostr extension or valid key.',
        variant: 'destructive',
      });
      return;
    }

    console.log('Starting upload process:', {
      fileSize: selectedFile.size,
      fileName: selectedFile.name,
      userPubkey: user.pubkey,
      signerAvailable: !!user.signer,
      hasSignEvent: !!user.signer?.signEvent,
      signerSignEventType: typeof user.signer?.signEvent,
      signerMethods: user.signer ? Object.keys(user.signer) : 'none'
    });

    setIsProcessing(true);
    setUploadStep('uploading');
    setUploadProgress(0);

    try {
      // Generate thumbnail if video is loaded
      let thumbnailUrl = '';
      if (videoRef.current) {
        console.log('Generating thumbnail...');
        const thumbnailDataUrl = await generateThumbnail(videoRef.current);
        
        // Convert thumbnail to File for upload
        const response = await fetch(thumbnailDataUrl);
        const blob = await response.blob();
        const thumbnailFile = new File([blob], `${selectedFile.name}_thumbnail.jpg`, { type: 'image/jpeg' });
        
        // Upload thumbnail to Blossom
        console.log('Uploading thumbnail...');
        const thumbnailTags = await uploadFile(thumbnailFile);
        thumbnailUrl = thumbnailTags[0][1]; // First tag contains URL
        console.log('Thumbnail uploaded:', thumbnailUrl);
      }

      // Upload video to Blossom
      console.log('Uploading main video file...');
      setUploadProgress(50);
      const videoTags = await uploadFile(selectedFile);
      console.log('Video uploaded successfully, tags:', videoTags);
      // videoUrl is the first tag - we'll use it in the tags array below

      setUploadProgress(80);

      // Create hybrid video event for cross-client compatibility
      console.log('Creating hybrid Nostr event for cross-client compatibility...');

      // Extract video data from upload tags
      const videoUrl = videoTags.find(tag => tag[0] === 'url')?.[1] || '';
      const videoHash = videoTags.find(tag => tag[0] === 'x')?.[1] || '';
      const videoSize = parseInt(videoTags.find(tag => tag[0] === 'size')?.[1] || '0');
      const videoType = videoTags.find(tag => tag[0] === 'm')?.[1] || videoMetadata.type;

      // Prepare video data for hybrid event
      const hybridVideoData: HybridVideoEventData = {
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

      // Create hybrid event (kind 1 with rich metadata)
      const hybridEvent = createHybridVideoEvent(hybridVideoData, {
        includeNip71Tags: true,
        includeRichContent: true,
        hashtags: ['video', 'zaptok', ...(videoMetadata.duration <= 60 ? ['short'] : [])],
        includeImeta: true
      });

      // Add any additional Blossom-specific tags from the upload
      const additionalTags = videoTags.filter(tag => 
        !['url', 'x', 'size', 'dim', 'm', 'thumb'].includes(tag[0])
      );
      hybridEvent.tags = [...(hybridEvent.tags || []), ...additionalTags];

      console.log('Publishing hybrid event to Nostr...', {
        kind: hybridEvent.kind,
        contentPreview: hybridEvent.content?.substring(0, 50),
        tagCount: hybridEvent.tags?.length,
        videoUrl: videoUrl,
        videoHash: videoHash
      });

      createEvent(hybridEvent);

      setUploadProgress(100);
      setUploadStep('complete');

      toast({
        title: 'Video uploaded successfully!',
        description: `Your ${videoMetadata.duration <= 60 ? 'short' : 'normal'} video has been published with cross-client compatibility.`,
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
        user: user ? { pubkey: user.pubkey, signerAvailable: !!user.signer } : 'No user'
      });
      
      let errorMessage = 'There was an error uploading your video. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('signer') || error.message.includes('nostr')) {
          errorMessage = 'Authentication error. Please try logging out and back in.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('file') || error.message.includes('size')) {
          errorMessage = 'File upload error. Please try a smaller file or different format.';
        }
      }
      
      toast({
        title: 'Upload failed',
        description: errorMessage,
        variant: 'destructive',
      });
      setUploadStep('metadata');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedFile, user, videoMetadata, uploadFile, createEvent, toast, generateThumbnail, handleClose]);

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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Upload Video to Nostr
          </DialogTitle>
          <DialogDescription>
            Share your video content on the decentralized Nostr network
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: File Selection */}
        {uploadStep === 'select' && (
          <div className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer ${
                isDragging 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium mb-2">Select a video file</p>
              <p className="text-sm text-gray-600 mb-4">
                Drag and drop or click to browse
              </p>
              <p className="text-xs text-gray-500">
                Supports: MP4, WebM, MOV, AVI (max 100MB)
              </p>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {/* Step 2: Metadata Input */}
        {uploadStep === 'metadata' && selectedFile && (
          <div className="space-y-4">
            {/* Video Preview */}
            <Card>
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
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setUploadStep('select')}>
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
        )}

        {/* Step 3: Uploading */}
        {uploadStep === 'uploading' && (
          <div className="space-y-4 text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Upload className="h-8 w-8 text-blue-600 animate-pulse" />
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">Uploading your video...</h3>
              <p className="text-sm text-gray-600 mb-4">
                This may take a moment depending on your file size
              </p>
              
              <Progress value={uploadProgress} className="w-full mb-2" />
              <p className="text-xs text-gray-500">{uploadProgress}% complete</p>
            </div>

            <div className="text-left space-y-2 text-sm text-gray-600">
              <p>• Uploading to Blossom servers...</p>
              <p>• Generating thumbnail...</p>
              <p>• Creating hybrid Nostr event...</p>
              <p>• Publishing to relays...</p>
            </div>
          </div>
        )}

        {/* Step 4: Complete */}
        {uploadStep === 'complete' && (
          <div className="space-y-4 text-center">
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
        )}
      </DialogContent>
    </Dialog>
  );
}
