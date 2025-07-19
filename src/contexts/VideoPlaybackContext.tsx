import { createContext, useContext, useRef, ReactNode } from 'react';

interface VideoPlaybackContextType {
  pauseAllVideos: () => void;
  resumeAllVideos: () => void;
  registerVideo: (video: HTMLVideoElement) => void;
  unregisterVideo: (video: HTMLVideoElement) => void;
}

const VideoPlaybackContext = createContext<VideoPlaybackContextType | undefined>(undefined);

export function VideoPlaybackProvider({ children }: { children: ReactNode }) {
  const videoRefs = useRef<Set<HTMLVideoElement>>(new Set());
  const pausedBeforeNavigation = useRef<Set<HTMLVideoElement>>(new Set());

  const pauseAllVideos = () => {
    pausedBeforeNavigation.current.clear();
    videoRefs.current.forEach(video => {
      if (!video.paused) {
        pausedBeforeNavigation.current.add(video);
        video.pause();
      }
    });
  };

  const resumeAllVideos = () => {
    pausedBeforeNavigation.current.forEach(video => {
      if (video.paused) {
        video.play().catch(() => {
          // Ignore auto-play errors
        });
      }
    });
    pausedBeforeNavigation.current.clear();
  };

  const registerVideo = (video: HTMLVideoElement) => {
    videoRefs.current.add(video);
  };

  const unregisterVideo = (video: HTMLVideoElement) => {
    videoRefs.current.delete(video);
    pausedBeforeNavigation.current.delete(video);
  };

  return (
    <VideoPlaybackContext.Provider
      value={{
        pauseAllVideos,
        resumeAllVideos,
        registerVideo,
        unregisterVideo,
      }}
    >
      {children}
    </VideoPlaybackContext.Provider>
  );
}

export function useVideoPlayback() {
  const context = useContext(VideoPlaybackContext);
  if (context === undefined) {
    throw new Error('useVideoPlayback must be used within a VideoPlaybackProvider');
  }
  return context;
}
