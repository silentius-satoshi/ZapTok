import { useEffect, useRef } from 'react';
import { useVideoPlayback } from '@/contexts/VideoPlaybackContext';

export function useVideoRegistration() {
  const { registerVideo, unregisterVideo } = useVideoPlayback();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      registerVideo(video);
      return () => {
        unregisterVideo(video);
      };
    }
  }, [registerVideo, unregisterVideo]);

  return videoRef;
}
