import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Play, 
  Users, 
  Clock, 
  Hash, 
  ExternalLink,
  Search,
  Filter,
  Zap
} from 'lucide-react';
import { useLiveActivities, type LiveEvent } from '@/hooks/useLiveActivities';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { formatDistanceToNow } from 'date-fns';

interface LiveStreamCardProps {
  event: LiveEvent;
  onJoin: (event: LiveEvent) => void;
}

function LiveStreamCard({ event, onJoin }: LiveStreamCardProps) {
  const author = useAuthor(event.pubkey);
  const authorMetadata = author.data?.metadata;
  const displayName = authorMetadata?.name || authorMetadata?.display_name || genUserName(event.pubkey);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'live': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'planned': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'ended': return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
      default: return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    }
  };

  const isLive = event.status === 'live';
  const startTime = event.starts ? new Date(event.starts * 1000) : null;

  return (
    <Card className="bg-gray-900 border-gray-700 hover:border-purple-500/50 transition-all group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={authorMetadata?.picture} alt={displayName} />
              <AvatarFallback>{displayName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-white group-hover:text-purple-300 transition-colors">
                {event.title || 'Untitled Stream'}
              </h3>
              <p className="text-sm text-gray-400">by {displayName}</p>
            </div>
          </div>
          
          <Badge variant="outline" className={getStatusColor(event.status)}>
            {isLive && <div className="w-2 h-2 bg-red-500 rounded-full mr-1 animate-pulse" />}
            {event.status || 'unknown'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stream Preview Image */}
        {event.image && (
          <div className="relative rounded-lg overflow-hidden">
            <img 
              src={event.image} 
              alt={event.title || 'Stream preview'}
              className="w-full h-32 object-cover"
            />
            {isLive && (
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <div className="bg-red-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center">
                  <Play className="w-3 h-3 mr-1 fill-white" />
                  LIVE
                </div>
              </div>
            )}
          </div>
        )}

        {/* Description */}
        {event.summary && (
          <p className="text-sm text-gray-300 line-clamp-2">{event.summary}</p>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center space-x-4">
            {event.currentParticipants !== undefined && (
              <div className="flex items-center">
                <Users className="w-3 h-3 mr-1" />
                {event.currentParticipants}
              </div>
            )}
            
            {startTime && (
              <div className="flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {isLive ? 'Started' : 'Starts'} {formatDistanceToNow(startTime, { addSuffix: true })}
              </div>
            )}
          </div>
        </div>

        {/* Hashtags */}
        {event.hashtags && event.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {event.hashtags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs bg-purple-500/20 text-purple-300">
                <Hash className="w-2 h-2 mr-1" />
                {tag}
              </Badge>
            ))}
            {event.hashtags.length > 3 && (
              <Badge variant="secondary" className="text-xs bg-gray-500/20 text-gray-400">
                +{event.hashtags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <Button
            onClick={() => onJoin(event)}
            size="sm"
            className={isLive 
              ? "bg-red-600 hover:bg-red-700 text-white" 
              : "bg-purple-600 hover:bg-purple-700 text-white"
            }
          >
            {isLive ? (
              <>
                <Play className="w-3 h-3 mr-1 fill-white" />
                Watch Live
              </>
            ) : event.status === 'planned' ? (
              <>
                <Clock className="w-3 h-3 mr-1" />
                View Details
              </>
            ) : (
              <>
                <ExternalLink className="w-3 h-3 mr-1" />
                View Recording
              </>
            )}
          </Button>

          {isLive && (
            <Button variant="ghost" size="sm" className="text-yellow-400 hover:text-yellow-300">
              <Zap className="w-3 h-3 mr-1" />
              Zap
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function LiveStreamBrowser() {
  const { useLiveEvents } = useLiveActivities();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'planned' | 'ended'>('all');
  
  // Query live events
  const { data: allEvents, isLoading, error } = useLiveEvents({ 
    limit: 50 
  });

  // Filter events based on search and status
  const filteredEvents = allEvents?.filter(event => {
    const matchesSearch = !searchQuery || 
      event.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.hashtags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  const handleJoinStream = (event: LiveEvent) => {
    if (event.streamingUrl) {
      window.open(event.streamingUrl, '_blank');
    } else if (event.recordingUrl) {
      window.open(event.recordingUrl, '_blank');
    } else {
      // For zap.stream integration, construct the stream URL
      const streamUrl = `https://zap.stream/live/${event.identifier}`;
      window.open(streamUrl, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading live streams...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-dashed border-gray-700 bg-gray-900/50">
        <CardContent className="py-12 px-8 text-center">
          <div className="space-y-4">
            <p className="text-red-400">Failed to load streams</p>
            <p className="text-sm text-gray-500">Please check your connection and try again</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg">Discover Live Streams</CardTitle>
          <CardDescription>
            Find live streams and activities happening on the Nostr network
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search streams, topics, or hashtags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <div className="flex items-center space-x-1">
                {(['all', 'live', 'planned', 'ended'] as const).map((status) => (
                  <Button
                    key={status}
                    variant={statusFilter === status ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setStatusFilter(status)}
                    className={statusFilter === status ? 'bg-purple-600' : ''}
                  >
                    {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stream Grid */}
      {filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <LiveStreamCard
              key={`${event.pubkey}:${event.identifier}`}
              event={event}
              onJoin={handleJoinStream}
            />
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-gray-700 bg-gray-900/50">
          <CardContent className="py-12 px-8 text-center">
            <div className="space-y-4">
              <div className="text-6xl mb-4">📡</div>
              <h3 className="text-xl font-semibold text-white">No Streams Found</h3>
              <p className="text-gray-400">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'No live streams are currently available'
                }
              </p>
              <p className="text-sm text-gray-500">
                Be the first to create a live stream on Nostr!
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
