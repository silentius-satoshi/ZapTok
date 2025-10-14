import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRecordVideo } from '@/hooks/useRecordVideo';
import { 
  Video, 
  Circle, 
  Square, 
  Pause, 
  Play, 
  RotateCcw, 
  Check, 
  Camera,
  AlertCircle,
  Clock
} from 'lucide-react';

interface VideoRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVideoReady: (file: File) => void;
}

export function VideoRecorderModal({ isOpen, onClose, onVideoReady }: VideoRecorderModalProps) {
  const {
    isRecording,
    isPaused,
    recordedBlob,
    error,
    stream,
    duration,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    createFile,
  } = useRecordVideo();

  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const playbackVideoRef = useRef<HTMLVideoElement>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);

  // Connect live stream to video element
  useEffect(() => {
    if (stream && liveVideoRef.current) {
      liveVideoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Create playback URL when recording stops
  useEffect(() => {
    if (recordedBlob) {
      const url = URL.createObjectURL(recordedBlob);
      setPlaybackUrl(url);
      
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [recordedBlob]);

  // Format duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle modal close
  const handleClose = () => {
    resetRecording();
    setPlaybackUrl(null);
    onClose();
  };

  // Handle "Use This Video" button
  const handleUseVideo = () => {
    const file = createFile();
    if (file) {
      onVideoReady(file);
      resetRecording();
      setPlaybackUrl(null);
    }
  };

  // Handle re-record
  const handleReRecord = () => {
    resetRecording();
    setPlaybackUrl(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Record Video
          </DialogTitle>
          <DialogDescription>
            Record a video using your device's camera
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Camera Preview / Playback */}
          <Card>
            <CardContent className="p-4">
              <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                {/* Live Recording Preview */}
                {!recordedBlob && (
                  <video
                    ref={liveVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Playback Preview */}
                {recordedBlob && playbackUrl && (
                  <video
                    ref={playbackVideoRef}
                    src={playbackUrl}
                    controls
                    className="w-full h-full object-contain"
                  />
                )}

                {/* No Camera State */}
                {!stream && !recordedBlob && !error && (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center text-white">
                      <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium mb-2">Ready to Record</p>
                      <p className="text-sm opacity-75">Click "Start Recording" to begin</p>
                    </div>
                  </div>
                )}

                {/* Recording Indicator */}
                {isRecording && !isPaused && (
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 text-white px-3 py-1.5 rounded-full">
                    <Circle className="h-3 w-3 fill-current animate-pulse" />
                    <span className="text-sm font-medium">REC</span>
                  </div>
                )}

                {/* Paused Indicator */}
                {isPaused && (
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-yellow-500 text-white px-3 py-1.5 rounded-full">
                    <Pause className="h-3 w-3" />
                    <span className="text-sm font-medium">PAUSED</span>
                  </div>
                )}

                {/* Timer */}
                {(isRecording || isPaused) && (
                  <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/60 text-white px-3 py-1.5 rounded-full backdrop-blur-sm">
                    <Clock className="h-3 w-3" />
                    <span className="text-sm font-mono font-medium">{formatDuration(duration)}</span>
                  </div>
                )}
              </div>

              {/* Recording Info */}
              {recordedBlob && (
                <div className="flex flex-wrap gap-2 mt-4">
                  <Badge variant="secondary">
                    <Video className="h-3 w-3 mr-1" />
                    {(recordedBlob.size / (1024 * 1024)).toFixed(2)} MB
                  </Badge>
                  <Badge variant="secondary">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatDuration(duration)}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Controls */}
          <div className="flex flex-col gap-3">
            {/* Initial State - Start Recording */}
            {!stream && !recordedBlob && !error && (
              <Button
                onClick={() => startRecording()}
                className="w-full h-12"
                size="lg"
              >
                <Circle className="h-5 w-5 mr-2" />
                Start Recording
              </Button>
            )}

            {/* Recording State - Stop/Pause Controls */}
            {isRecording && (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={stopRecording}
                  variant="destructive"
                  className="h-12"
                  size="lg"
                >
                  <Square className="h-5 w-5 mr-2" />
                  Stop
                </Button>
                {!isPaused ? (
                  <Button
                    onClick={pauseRecording}
                    variant="outline"
                    className="h-12"
                    size="lg"
                  >
                    <Pause className="h-5 w-5 mr-2" />
                    Pause
                  </Button>
                ) : (
                  <Button
                    onClick={resumeRecording}
                    variant="outline"
                    className="h-12"
                    size="lg"
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Resume
                  </Button>
                )}
              </div>
            )}

            {/* Playback State - Use or Re-record */}
            {recordedBlob && (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handleReRecord}
                  variant="outline"
                  className="h-12"
                  size="lg"
                >
                  <RotateCcw className="h-5 w-5 mr-2" />
                  Re-record
                </Button>
                <Button
                  onClick={handleUseVideo}
                  className="h-12 bg-gradient-to-r from-purple-600 to-orange-600 hover:from-purple-700 hover:to-orange-700"
                  size="lg"
                >
                  <Check className="h-5 w-5 mr-2" />
                  Use This Video
                </Button>
              </div>
            )}

            {/* Error State - Retry */}
            {error && !stream && (
              <Button
                onClick={() => startRecording()}
                variant="outline"
                className="w-full h-12"
                size="lg"
              >
                <RotateCcw className="h-5 w-5 mr-2" />
                Try Again
              </Button>
            )}
          </div>

          {/* Browser Support Notice */}
          {!('mediaDevices' in navigator) && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your browser doesn't support video recording. Please use a modern browser like Chrome, Firefox, or Safari.
              </AlertDescription>
            </Alert>
          )}

          {/* HTTPS Notice (only shown in non-localhost environments) */}
          {typeof window !== 'undefined' && 
           window.location.protocol === 'http:' && 
           !window.location.hostname.includes('localhost') && 
           !window.location.hostname.includes('127.0.0.1') && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Camera access requires HTTPS. Please use a secure connection.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
