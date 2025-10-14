import { useState, useCallback, useRef, useEffect } from 'react';
import { useSeoMeta } from '@unhead/react';
import { Navigation } from '@/components/Navigation';
import { LoginArea } from '@/components/auth/LoginArea';
import { AuthGate } from '@/components/AuthGate';
import { LogoHeader } from '@/components/LogoHeader';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { VideoGrid } from '@/components/VideoGrid';
import { VideoCard } from '@/components/VideoCard';
import { Search, TrendingUp, Hash, X, Users, Globe } from 'lucide-react';
import { useTimelineGlobalVideoFeed } from '@/hooks/useTimelineVideoFeed';
import { useSearchVideos, useSearchVideosInFollowing } from '@/hooks/useSearchVideos';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useFollowing } from '@/hooks/useFollowing';
import { useIsMobile } from '@/hooks/useIsMobile';
import { debounce } from 'lodash';
import type { VideoEvent } from '@/lib/validateVideoEvent';

const Discover = () => {
  const { user } = useCurrentUser();
  const following = useFollowing(user?.pubkey || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [searchScope, setSearchScope] = useState<'all' | 'following'>('all');
  const [showVideoViewer, setShowVideoViewer] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const videoViewerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Use timeline global feed when not searching
  const { 
    videos: globalVideos,
    loading: isGlobalFeedLoading,
    hasMore: hasMoreGlobal,
    loadMore: fetchMoreGlobal,
  } = useTimelineGlobalVideoFeed({
    limit: 12, // Smaller pages for discover
    enableNewEvents: false, // Disable real-time updates for discover
  });

  const { data: globalSearchResults, isLoading: isGlobalLoading, error: globalError } = useSearchVideos(searchScope === 'all' ? searchFilter : '');
  const { data: followingSearchResults, isLoading: isFollowingLoading, error: followingError } = useSearchVideosInFollowing(
    searchScope === 'following' ? searchFilter : '',
    following.data?.pubkeys || []
  );

  // Use search results when searching, otherwise use global feed
  const isSearching = searchFilter.trim().length > 0;
  const searchResults = searchScope === 'all' ? globalSearchResults : followingSearchResults;
  
  const displayVideos: VideoEvent[] | undefined = isSearching ? searchResults : globalVideos;
  const isLoading = isSearching 
    ? (searchScope === 'all' ? isGlobalLoading : isFollowingLoading)
    : isGlobalFeedLoading;
  const error = isSearching 
    ? (searchScope === 'all' ? globalError : followingError)
    : null;

  useSeoMeta({
    title: 'Discover - ZapTok',
    description: 'Discover trending videos, search for content, and explore the Nostr video ecosystem',
  });

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      if (query.trim()) {
        setSearchFilter(query);
      } else {
        setSearchFilter('');
      }
    }, 300),
    [setSearchFilter]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    debouncedSearch(value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchFilter(searchQuery);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchFilter('');
  };

  const addFilter = (filterType: string, value: string) => {
    const filterString = `${filterType}:${value}`;
    if (!activeFilters.includes(filterString)) {
      const newFilters = [...activeFilters, filterString];
      setActiveFilters(newFilters);

      // Add filter to search query
      const filtersString = newFilters.join(' ');
      const baseQuery = searchQuery.split(' ').filter(term => !term.includes(':')).join(' ');
      const combinedQuery = `${baseQuery} ${filtersString}`.trim();
      setSearchQuery(combinedQuery);
      setSearchFilter(combinedQuery);
    }
  };

  const removeFilter = (filterToRemove: string) => {
    const newFilters = activeFilters.filter(filter => filter !== filterToRemove);
    setActiveFilters(newFilters);

    // Update search query
    const filtersString = newFilters.join(' ');
    const baseQuery = searchQuery.split(' ').filter(term => !term.includes(':')).join(' ');
    const combinedQuery = `${baseQuery} ${filtersString}`.trim();
    setSearchQuery(combinedQuery);
    setSearchFilter(combinedQuery);
  };

  // Video viewer handlers
  const handleVideoClick = (index: number) => {
    setCurrentVideoIndex(index);
    setShowVideoViewer(true);
  };

  const handleCloseVideoViewer = () => {
    setShowVideoViewer(false);
  };

  const handleNextVideo = () => {
    const videos = displayVideos || [];
    if (currentVideoIndex < videos.length - 1) {
      setCurrentVideoIndex(currentVideoIndex + 1);
    }
  };

  const handlePreviousVideo = () => {
    if (currentVideoIndex > 0) {
      setCurrentVideoIndex(currentVideoIndex - 1);
    }
  };

  // Track scroll position to update current video index
  useEffect(() => {
    if (!showVideoViewer || !videoViewerRef.current) return;

    const handleScroll = () => {
      const container = videoViewerRef.current;
      if (!container) return;

      const scrollPosition = container.scrollTop;
      const videoHeight = container.clientHeight;
      const newIndex = Math.round(scrollPosition / videoHeight);
      const videos = displayVideos || [];
      
      if (newIndex !== currentVideoIndex && newIndex >= 0 && newIndex < videos.length) {
        setCurrentVideoIndex(newIndex);
      }
    };

    const container = videoViewerRef.current;
    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [showVideoViewer, currentVideoIndex, displayVideos]);

  // Scroll to the clicked video when viewer opens
  useEffect(() => {
    if (showVideoViewer && videoViewerRef.current) {
      const container = videoViewerRef.current;
      const videoHeight = container.clientHeight;
      const scrollPosition = currentVideoIndex * videoHeight;
      
      container.scrollTo({
        top: scrollPosition,
        behavior: 'instant'
      });
    }
  }, [showVideoViewer, currentVideoIndex]);

  const trendingTags = [
    'zaptok', 'bitcoin', 'nostr', 'comedy', 'music', 'technology', 'art', 'news', 'gaming'
  ];

  const quickFilters = [
    { type: 'language', value: 'en', label: 'English' },
    { type: 'sentiment', value: 'positive', label: 'Positive' },
    { type: 'nsfw', value: 'false', label: 'Safe' },
  ];

  return (
    <AuthGate>
      <div className={`min-h-screen bg-black text-white ${isMobile ? 'overflow-x-hidden' : ''}`}>
        <main className="h-screen">
          <div className="flex h-full">
            {/* Left Sidebar - Logo and Navigation - Hidden on Mobile */}
            {!isMobile && (
              <div className="flex flex-col bg-black">
                <LogoHeader />
                <div className="flex-1">
                  <Navigation />
                </div>
              </div>
            )}

            {/* Main Content - Full Width on Mobile */}
            <div className={`flex-1 overflow-y-auto scrollbar-hide ${isMobile ? 'min-w-0 overflow-x-hidden' : ''}`}>
              <div className={`max-w-4xl mx-auto ${isMobile ? 'p-4' : 'p-6'}`}>
                {/* Search Header */}
                <div className={`${isMobile ? 'mb-6' : 'mb-8'}`}>
                  <div className="flex items-center space-x-3 mb-4">
                    <Search className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} text-orange-500`} />
                    <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold`}>Discover</h1>
                  </div>
                  <p className={`text-gray-400 ${isMobile ? 'text-sm' : ''}`}>Search for videos, explore trending content, and discover new creators</p>
                </div>

                {/* Search Form */}
                <Card className={`${isMobile ? 'mb-4' : 'mb-6'}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Search className="w-5 h-5" />
                      <span>Search Videos</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Search Scope Toggle */}
                    {user && following.data && following.data.pubkeys.length > 0 && (
                      <div className="flex items-center space-x-2 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                        <div className="flex-1">
                          <p className="text-sm font-medium mb-1">Search Scope</p>
                          <p className="text-xs text-gray-400">
                            {searchScope === 'all' 
                              ? 'Searching across all users on the relay'
                              : `Searching within ${following.data.pubkeys.length} people you follow`
                            }
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant={searchScope === 'all' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSearchScope('all')}
                            className="flex items-center space-x-1"
                          >
                            <Globe className="w-3 h-3" />
                            <span>All Users</span>
                          </Button>
                          <Button
                            type="button"
                            variant={searchScope === 'following' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSearchScope('following')}
                            className="flex items-center space-x-1"
                          >
                            <Users className="w-3 h-3" />
                            <span>Following</span>
                          </Button>
                        </div>
                      </div>
                    )}

                    <form onSubmit={handleSearchSubmit} className="flex space-x-2">
                      <div className="flex-1 relative">
                        <Input
                          type="text"
                          placeholder="Search for videos, topics, or creators..."
                          value={searchQuery}
                          onChange={handleSearchChange}
                          className="pr-10"
                        />
                        {searchQuery && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={clearSearch}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <Button type="submit" disabled={!searchQuery.trim()}>
                        Search
                      </Button>
                    </form>

                    {/* Active Filters */}
                    {activeFilters.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        <span className="text-sm text-gray-400">Filters:</span>
                        {activeFilters.map((filter, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                            <span>{filter}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFilter(filter)}
                              className="h-4 w-4 p-0 hover:bg-transparent"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Quick Filters */}
                    <div className="space-y-2">
                      <p className="text-sm text-gray-400">Quick Filters:</p>
                      <div className="flex flex-wrap gap-2">
                        {quickFilters.map((filter) => (
                          <Button
                            key={`${filter.type}-${filter.value}`}
                            variant="outline"
                            size="sm"
                            onClick={() => addFilter(filter.type, filter.value)}
                            disabled={activeFilters.includes(`${filter.type}:${filter.value}`)}
                          >
                            {filter.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Search Results */}
                {searchFilter && (
                  <div className="mb-8">                      <div className="flex items-center space-x-2 mb-4">
                        <Search className="w-5 h-5 text-orange-500" />
                        <h2 className="text-xl font-semibold">Search Results</h2>
                        <Badge variant="secondary">
                          {searchResults?.length || 0} results
                        </Badge>
                        <Badge variant="outline" className="ml-2">
                          {searchScope === 'all' ? 'All Users' : 'Following Only'}
                        </Badge>
                      </div>                      {error && (
                        <Card className="border-red-500/20 bg-red-500/10 mb-4">
                          <CardContent className="pt-6">
                            <p className="text-red-400">
                              Search failed: {error.message}
                            </p>
                            <p className="text-sm text-gray-400 mt-2">
                              {searchScope === 'following'
                                ? "Make sure you're following users and your relay supports NIP-50 search functionality."
                                : "Make sure your relay supports NIP-50 search functionality."
                              }
                            </p>
                          </CardContent>
                        </Card>
                      )}

                      <VideoGrid
                        videos={displayVideos || []}
                        isLoading={isLoading}
                        emptyMessage={
                          isSearching && searchFilter
                            ? searchScope === 'following'
                              ? "No videos found in your following list for this search. Try searching 'All Users' or follow more creators."
                              : "No videos found for your search. Try different keywords or filters."
                            : !isSearching
                              ? "Discovering global video content..."
                              : "Enter a search query to find videos"
                        }
                        allowRemove={false}
                        showVerificationBadge={false}
                        onVideoClick={handleVideoClick}
                      />

                      {/* Load More Button for Global Feed */}
                      {!isSearching && hasMoreGlobal && !isGlobalFeedLoading && (
                        <div className="mt-6 text-center">
                          <Button
                            onClick={() => fetchMoreGlobal()}
                            variant="outline"
                            className="min-w-[120px]"
                          >
                            Load More Videos
                          </Button>
                        </div>
                      )}

                      {/* Loading indicator for pagination */}
                      {!isSearching && isGlobalFeedLoading && globalVideos.length > 0 && (
                        <div className="mt-6 text-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                          <p className="text-sm text-muted-foreground mt-2">Loading more videos...</p>
                        </div>
                      )}
                  </div>
                )}

                {/* Trending Tags */}
                {!searchFilter && (
                  <>
                    <Separator className="mb-8" />

                    <div className="mb-8">
                      <div className="flex items-center space-x-2 mb-4">
                        <TrendingUp className="w-5 h-5 text-orange-500" />
                        <h2 className="text-xl font-semibold">Trending Tags</h2>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {trendingTags.map((tag) => (
                          <Button
                            key={tag}
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSearchQuery(tag);
                              setSearchFilter(tag);
                            }}
                            className="flex items-center space-x-1"
                          >
                            <Hash className="w-3 h-3" />
                            <span>{tag}</span>
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Info Card */}
                    <Card className="border-blue-500/20 bg-blue-500/10">
                      <CardContent className="pt-6">
                        <div className="flex items-start space-x-3">
                          <Search className="w-5 h-5 text-blue-400 mt-0.5" />
                          <div>
                            <h3 className="font-semibold text-blue-200 mb-2">Search Options</h3>
                            <div className="space-y-3">
                              <div>
                                <p className="text-sm text-blue-300 mb-2">
                                  <strong>NIP-50 Search Extensions:</strong>
                                </p>
                                <ul className="text-sm text-blue-300 space-y-1 ml-4">
                                  <li>• <code>language:en</code> - English content only</li>
                                  <li>• <code>sentiment:positive</code> - Positive sentiment</li>
                                  <li>• <code>nsfw:false</code> - Safe content only</li>
                                  <li>• <code>domain:example.com</code> - From specific domain</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </div>

            {/* Right Sidebar - Compact Login Area */}
            <div className="hidden lg:block w-96 p-3 overflow-visible relative">
              <div className="sticky top-4 overflow-visible">
                <LoginArea className="justify-end max-w-full" />
              </div>
            </div>
          </div>
        </main>

        {/* Feed-Style Video Viewer */}
        {showVideoViewer && displayVideos && displayVideos.length > 0 && (
          <div 
            ref={videoViewerRef}
            className="fixed inset-0 z-50 bg-black overflow-y-auto snap-y snap-mandatory"
          >
            {/* Close Button */}
            <button
              onClick={handleCloseVideoViewer}
              className="fixed top-4 right-4 z-50 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
              aria-label="Close video viewer"
            >
              <X className="w-6 h-6 text-white" />
            </button>

            {/* Render all videos for scrolling */}
            {displayVideos.map((video, index) => {
              // Determine if this video should be preloaded for smooth scrolling
              // Preload current, next, and previous videos
              const shouldPreload = Math.abs(index - currentVideoIndex) <= 1;
              
              return (
                <div key={video.id} className="h-screen flex items-center justify-center snap-start">
                  <div className="flex w-full items-end h-full gap-6 max-w-2xl">
                    <div className="flex-1 h-full rounded-3xl border-2 border-gray-800 overflow-hidden bg-black shadow-2xl relative">
                      <VideoCard 
                        event={video}
                        isActive={index === currentVideoIndex}
                        onNext={handleNextVideo}
                        onPrevious={handlePreviousVideo}
                        shouldPreload={shouldPreload}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AuthGate>
  );
};

export default Discover;
