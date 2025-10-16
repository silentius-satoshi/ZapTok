import { useState, useRef, useCallback, useEffect } from 'react';

interface UseRecordVideoReturn {
  // State
  isRecording: boolean;
  isPaused: boolean;
  recordedBlob: Blob | null;
  error: string | null;
  stream: MediaStream | null;
  duration: number; // recording duration in seconds
  facingMode: 'user' | 'environment'; // Current camera facing mode
  
  // Actions
  initializeCamera: (constraints?: MediaStreamConstraints) => Promise<void>;
  startRecording: () => void;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  resetRecording: () => void;
  createFile: (filename?: string) => File | null;
  switchCamera: () => Promise<void>;
}

export function useRecordVideo(): UseRecordVideoReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [duration, setDuration] = useState(0);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);

  // Initialize camera without starting recording
  const initializeCamera = useCallback(async (constraints?: MediaStreamConstraints) => {
    try {
      setError(null);
      
      // Default constraints: video + audio
      const defaultConstraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: facingMode, // Use current facing mode state
        },
        audio: true,
      };

      // Request camera and microphone access
      const mediaStream = await navigator.mediaDevices.getUserMedia(
        constraints || defaultConstraints
      );
      
      setStream(mediaStream);

    } catch (err) {
      console.error('Failed to initialize camera:', err);
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Camera permission denied. Please allow camera access to record.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found. Please connect a camera to record video.');
        } else if (err.name === 'NotReadableError') {
          setError('Camera is already in use by another application.');
        } else {
          setError('Failed to access camera: ' + err.message);
        }
      } else {
        setError('Failed to access camera. Please check your browser settings.');
      }
    }
  }, [facingMode]);

  // Start recording (camera must already be initialized)
  const startRecording = useCallback(() => {
    if (!stream) {
      setError('Camera not initialized. Please try again.');
      return;
    }

    try {
      // Determine the best MIME type for the browser
      // Priority: H.264 MP4 (most compatible) > WebM VP9 > WebM VP8 > WebM (generic)
      let mimeType = '';
      
      // Try H.264 MP4 first (most compatible - works on iOS, Android, Desktop)
      const h264Types = [
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2', // H.264 Baseline + AAC
        'video/mp4;codecs=avc1.4D401E,mp4a.40.2', // H.264 Main + AAC
        'video/mp4;codecs=avc1,mp4a.40.2',        // H.264 generic + AAC
        'video/mp4',                               // MP4 generic
      ];
      
      for (const type of h264Types) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          console.log('Using H.264 MP4 format:', type);
          break;
        }
      }
      
      // Fallback to WebM if H.264 not supported (Firefox)
      if (!mimeType) {
        const webmTypes = [
          'video/webm;codecs=vp9,opus',  // VP9 + Opus
          'video/webm;codecs=vp8,opus',  // VP8 + Opus
          'video/webm;codecs=vp9',       // VP9 only
          'video/webm;codecs=vp8',       // VP8 only
          'video/webm',                  // WebM generic
        ];
        
        for (const type of webmTypes) {
          if (MediaRecorder.isTypeSupported(type)) {
            mimeType = type;
            console.log('Using WebM format:', type);
            break;
          }
        }
      }
      
      // Last resort fallback
      if (!mimeType) {
        mimeType = 'video/webm'; // Should work on most browsers
        console.warn('No preferred format supported, using generic WebM');
      }

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps for good quality
      });

      // Collect data chunks
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = () => {
        console.log('MediaRecorder stopped, creating blob from', chunksRef.current.length, 'chunks');
        const blob = new Blob(chunksRef.current, { type: mimeType });
        console.log('Created blob:', blob.size, 'bytes, type:', blob.type);
        setRecordedBlob(blob);
        setIsRecording(false);
        setIsPaused(false);
        
        // Clear chunks after creating blob
        chunksRef.current = [];
        
        // Stop timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        
        // Now it's safe to stop the stream tracks
        if (stream) {
          console.log('Stopping stream tracks after blob creation');
          stream.getTracks().forEach(track => track.stop());
        }
      };

      // Handle errors
      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Recording error occurred');
        setIsRecording(false);
      };

      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setIsPaused(false);
      chunksRef.current = [];
      
      // Start timer
      startTimeRef.current = Date.now();
      pausedDurationRef.current = 0;
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current - pausedDurationRef.current) / 1000);
        setDuration(elapsed);
      }, 1000);

    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Failed to start recording. Please try again.');
    }
  }, [stream]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      // Request all pending data before stopping
      if (mediaRecorderRef.current.state === 'recording' || mediaRecorderRef.current.state === 'paused') {
        mediaRecorderRef.current.requestData();
      }
      
      mediaRecorderRef.current.stop();
      
      // DON'T stop tracks immediately - let onstop handler finish first
      // The tracks will be stopped when we reset recording or close the modal
    }
  }, []);

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      
      // Pause timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, []);

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      
      // Resume timer
      const pauseStart = Date.now() - startTimeRef.current - pausedDurationRef.current - (duration * 1000);
      pausedDurationRef.current += pauseStart;
      
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current - pausedDurationRef.current) / 1000);
        setDuration(elapsed);
      }, 1000);
    }
  }, [duration]);

  // Reset recording state
  const resetRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
    }
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    chunksRef.current = [];
    setRecordedBlob(null);
    setIsRecording(false);
    setIsPaused(false);
    setDuration(0);
    setError(null);
    startTimeRef.current = 0;
    pausedDurationRef.current = 0;
  }, [stream]);

  // Create a File from the recorded Blob
  const createFile = useCallback((filename?: string): File | null => {
    if (!recordedBlob) {
      return null;
    }

    // Determine file extension based on MIME type
    let extension = '.webm'; // default
    if (recordedBlob.type.includes('mp4')) {
      extension = '.mp4';
    } else if (recordedBlob.type.includes('webm')) {
      extension = '.webm';
    }

    // Generate filename with timestamp if not provided
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const name = filename || `recorded-video-${timestamp}${extension}`;
    
    return new File([recordedBlob], name, { 
      type: recordedBlob.type,
      lastModified: Date.now(),
    });
  }, [recordedBlob]);

  // Switch between front and back camera
  const switchCamera = useCallback(async () => {
    // Can't switch camera while recording
    if (isRecording) {
      return;
    }

    // Stop current stream if it exists
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }

    // Toggle facing mode
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);

    // Restart stream with new facing mode
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: newFacingMode,
        },
        audio: false, // Don't need audio for preview
      });
      
      setStream(mediaStream);
      setError(null);
    } catch (err) {
      console.error('Failed to switch camera:', err);
      
      if (err instanceof Error) {
        setError('Failed to switch camera: ' + err.message);
      } else {
        setError('Failed to switch camera.');
      }
    }
  }, [isRecording, stream, facingMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [stream]);

  return {
    isRecording,
    isPaused,
    recordedBlob,
    error,
    stream,
    duration,
    facingMode,
    initializeCamera,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    createFile,
    switchCamera,
  };
}
