/**
 * VideoProgressBar Component
 * 
 * Interactive video progress bar with:
 * - Draggable seek functionality
 * - Click-to-jump to position
 * - Timestamp display (00:08 / 00:18)
 * - Touch and mouse support
 * - Smooth animations
 */

import { useEffect, useRef, useState } from 'react';

interface VideoProgressBarProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  className?: string;
  isPaused?: boolean;
  onScrubbingChange?: (isScrubbing: boolean) => void;
}

export function VideoProgressBar({ videoRef, className = '', isPaused = false, onScrubbingChange }: VideoProgressBarProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [dragPosition, setDragPosition] = useState(0); // Track real-time drag position
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || seconds < 0) return '00:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Update progress from video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (!isDragging) {
        setCurrentTime(video.currentTime);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handleDurationChange = () => {
      setDuration(video.duration);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('durationchange', handleDurationChange);

    // Initialize if already loaded
    if (video.duration) {
      setDuration(video.duration);
      setCurrentTime(video.currentTime);
    }

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('durationchange', handleDurationChange);
    };
  }, [videoRef, isDragging]);

  // Calculate seek position from mouse/touch event
  const calculateSeekPosition = (clientX: number): number => {
    const progressBar = progressBarRef.current;
    if (!progressBar) return 0;

    const rect = progressBar.getBoundingClientRect();
    const clickPosition = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickPosition / rect.width));
    
    return percentage * duration;
  };

  // Seek to position
  const seekToPosition = (time: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = time;
    setCurrentTime(time);
  };

  // Handle mouse/touch down - start dragging
  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(true);
    onScrubbingChange?.(true); // Notify parent that scrubbing started
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const seekTime = calculateSeekPosition(clientX);
    const percentage = duration > 0 ? (seekTime / duration) * 100 : 0;
    setDragPosition(percentage); // Update drag position immediately
    seekToPosition(seekTime);
  };

  // Handle mouse/touch move - update while dragging
  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const seekTime = calculateSeekPosition(clientX);
      const percentage = duration > 0 ? (seekTime / duration) * 100 : 0;
      setDragPosition(percentage); // Update drag position immediately for handle
      setCurrentTime(seekTime);
      
      // Update video in real-time while dragging
      const video = videoRef.current;
      if (video) {
        video.currentTime = seekTime;
      }
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      onScrubbingChange?.(false); // Notify parent that scrubbing ended
    };

    // Add listeners to document for drag outside element
    document.addEventListener('mousemove', handlePointerMove);
    document.addEventListener('mouseup', handlePointerUp);
    document.addEventListener('touchmove', handlePointerMove);
    document.addEventListener('touchend', handlePointerUp);

    return () => {
      document.removeEventListener('mousemove', handlePointerMove);
      document.removeEventListener('mouseup', handlePointerUp);
      document.removeEventListener('touchmove', handlePointerMove);
      document.removeEventListener('touchend', handlePointerUp);
    };
  }, [isDragging, duration, videoRef]);

  // Calculate progress percentage
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  
  // Use drag position when dragging for instant handle updates, otherwise use progressPercentage
  const handlePosition = isDragging ? dragPosition : progressPercentage;

  // Determine if handle should be visible (on hover, when paused, or when dragging)
  const showHandle = isHovering || isPaused || isDragging;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Progress Bar */}
      <div
        ref={progressBarRef}
        className={`flex-1 rounded-full cursor-pointer relative mx-4 group transition-all duration-200 ${
          isDragging ? 'h-2' : 'h-1'
        }`}
        style={{ 
          overflow: 'visible',
          backgroundColor: 'rgba(255, 255, 255, 0.3)'
        }}
        onMouseDown={handlePointerDown}
        onTouchStart={handlePointerDown}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onClick={(e) => {
          // Click to jump (if not dragging)
          if (!isDragging) {
            e.preventDefault();
            e.stopPropagation();
            const seekTime = calculateSeekPosition(e.clientX);
            seekToPosition(seekTime);
          }
        }}
      >
        {/* Filled Progress - Gradient matching side nav */}
        <div
          className="absolute left-0 rounded-full z-10"
          style={{ 
            width: handlePosition > 0 ? `${handlePosition}%` : '2px',
            background: 'linear-gradient(to right, #fb923c, #ec4899, #9333ea)',
            height: isDragging ? '8px' : '3px',
            top: '50%',
            transform: 'translateY(-50%)',
            transition: isDragging ? 'height 0.2s' : 'all 0.1s'
          }}
        />
        
        {/* Draggable Handle - Shows on hover, when paused, or when dragging */}
        <div
          className={`absolute w-3 h-3 rounded-full shadow-lg z-20 ${
            showHandle ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
          }`}
          style={{ 
            left: `calc(${handlePosition}% - 6px)`,
            top: '50%',
            background: 'linear-gradient(to right, #fb923c, #ec4899, #9333ea)',
            transform: isDragging 
              ? 'translate(0, -50%) scale(1.3)' 
              : showHandle
              ? 'translate(0, -50%) scale(1)'
              : 'translate(0, -50%) scale(0)',
            transition: isDragging ? 'none' : 'all 0.2s'
          }}
        />
      </div>
    </div>
  );
}
