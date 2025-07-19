import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

    setSelectedFile(file);
    setVideoMetadata(prev => ({
      ...prev,
      size: file.size,
      type: file.type,
      title: file.name.replace(/\.[^/.]+$/, '') // Remove file extension
    }));

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setUploadStep('metadata');
  }, [toast]);

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

    setIsProcessing(true);
    setUploadStep('uploading');
    setUploadProgress(0);

    try {
      // Generate thumbnail if video is loaded
      let thumbnailUrl = '';
      if (videoRef.current) {
        const thumbnailDataUrl = await generateThumbnail(videoRef.current);
        
        // Convert thumbnail to File for upload
        const response = await fetch(thumbnailDataUrl);
        const blob = await response.blob();
        const thumbnailFile = new File([blob], `${selectedFile.name}_thumbnail.jpg`, { type: 'image/jpeg' });
        
        // Upload thumbnail to Blossom
        const thumbnailTags = await uploadFile(thumbnailFile);
        thumbnailUrl = thumbnailTags[0][1]; // First tag contains URL
      }

      // Upload video to Blossom
      setUploadProgress(50);
      const videoTags = await uploadFile(selectedFile);
      // videoUrl is the first tag - we'll use it in the tags array below

      setUploadProgress(80);

      // Determine video kind based on duration
      const videoKind = videoMetadata.duration <= 60 ? 22 : 21; // Short vs normal video

      // Create NIP-71 video event
      const eventTags = [
        ...videoTags, // Include all Blossom metadata tags
        ['title', videoMetadata.title],
        ['summary', videoMetadata.description],
        ['duration', videoMetadata.duration.toString()],
        ['size', videoMetadata.size.toString()],
        ['type', videoMetadata.type],
        ['t', 'video'],
        ['t', 'zaptok'],
      ];

      // Add thumbnail if available
      if (thumbnailUrl) {
        eventTags.push(['thumb', thumbnailUrl]);
        eventTags.push(['image', thumbnailUrl]);
      }

      // Add content type specific tags
      if (videoKind === 22) {
        eventTags.push(['t', 'short']);
      }

      createEvent({
        kind: videoKind,
        content: videoMetadata.description || videoMetadata.title,
        tags: eventTags,
      });

      setUploadProgress(100);
      setUploadStep('complete');

      toast({
        title: 'Video uploaded successfully!',
        description: `Your ${videoKind === 22 ? 'short' : 'normal'} video has been published to Nostr.`,
      });

      // Reset form after a delay
      setTimeout(() => {
        handleClose();
      }, 2000);

    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: 'Upload failed',
        description: 'There was an error uploading your video. Please try again.',
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
                <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
                  <video
                    ref={videoRef}
                    src={previewUrl || ''}
                    controls
                    onLoadedMetadata={handleVideoLoad}
                    className="w-full h-full object-contain"
                  />
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
              <p>• Creating Nostr event...</p>
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
                <p>✓ NIP-71 event created</p>
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
