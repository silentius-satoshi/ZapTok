import React, { createContext, useContext, useRef } from 'react';
import type { GlobalVideoFeedRef } from '@/components/GlobalVideoFeed';
import type { FollowingVideoFeedRef } from '@/components/TimelineFollowingVideoFeed';

interface FeedRefreshContextType {
  globalFeedRef: React.RefObject<GlobalVideoFeedRef>;
  followingFeedRef: React.RefObject<FollowingVideoFeedRef>;
  refreshCurrentFeed: (currentPath: string) => void;
}

const FeedRefreshContext = createContext<FeedRefreshContextType | undefined>(undefined);

export function FeedRefreshProvider({ children }: { children: React.ReactNode }) {
  const globalFeedRef = useRef<GlobalVideoFeedRef>(null);
  const followingFeedRef = useRef<FollowingVideoFeedRef>(null);

  const refreshCurrentFeed = (currentPath: string) => {
    if (currentPath === '/global') {
      globalFeedRef.current?.refresh();
    } else if (currentPath === '/') {
      followingFeedRef.current?.refresh();
    }
  };

  return (
    <FeedRefreshContext.Provider value={{
      globalFeedRef,
      followingFeedRef,
      refreshCurrentFeed,
    }}>
      {children}
    </FeedRefreshContext.Provider>
  );
}

export function useFeedRefresh() {
  const context = useContext(FeedRefreshContext);
  if (context === undefined) {
    throw new Error('useFeedRefresh must be used within a FeedRefreshProvider');
  }
  return context;
}