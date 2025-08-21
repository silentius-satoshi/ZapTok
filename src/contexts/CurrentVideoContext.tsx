import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { VideoEvent } from '@/lib/validateVideoEvent';

interface CurrentVideoContextType {
  currentVideo: VideoEvent | null;
  setCurrentVideo: (video: VideoEvent | null) => void;
}

const CurrentVideoContext = createContext<CurrentVideoContextType | undefined>(undefined);

export function CurrentVideoProvider({ children }: { children: ReactNode }) {
  const [currentVideo, setCurrentVideo] = useState<VideoEvent | null>(null);

  return (
    <CurrentVideoContext.Provider value={{ currentVideo, setCurrentVideo }}>
      {children}
    </CurrentVideoContext.Provider>
  );
}

export function useCurrentVideo() {
  const context = useContext(CurrentVideoContext);
  if (context === undefined) {
    throw new Error('useCurrentVideo must be used within a CurrentVideoProvider');
  }
  return context;
}
