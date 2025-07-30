// NIP-87 mint discovery and selection component
// Allows users to discover and select mints from the Nostr network

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, Heart, ExternalLink, Zap, Shield, Users } from 'lucide-react';
import { useNIP87MintDiscovery, type DiscoveredMint } from '@/hooks/useNIP87MintDiscovery';
import { useNIP87Recommendations } from '@/hooks/useNIP87Recommendations';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { cn } from '@/lib/utils';

interface MintDiscoveryProps {
  onMintSelect: (mint: DiscoveredMint) => void;
  selectedMints?: string[]; // URLs of already selected mints
  className?: string;
}

export function MintDiscovery({ 
  onMintSelect, 
  selectedMints = [],
  className 
}: MintDiscoveryProps) {
  const { user } = useCurrentUser();
  const {
    cashuMints,
    recommendations,
    isLoading,
    error,
    refreshDiscovery,
    validateMint
  } = useNIP87MintDiscovery();

  const {
    publishRecommendation,
    removeRecommendation,
    isPublishing
  } = useNIP87Recommendations();

  const [validationStates, setValidationStates] = useState<Record<string, {
    isValidating: boolean;
    isHealthy?: boolean;
    error?: string;
  }>>({});

  const handleValidateMint = async (mint: DiscoveredMint) => {
    setValidationStates(prev => ({
      ...prev,
      [mint.url]: { isValidating: true }
    }));

    try {
      const result = await validateMint(mint.url);
      setValidationStates(prev => ({
        ...prev,
        [mint.url]: {
          isValidating: false,
          isHealthy: result.isHealthy,
          error: result.error
        }
      }));
    } catch (err) {
      setValidationStates(prev => ({
        ...prev,
        [mint.url]: {
          isValidating: false,
          isHealthy: false,
          error: err instanceof Error ? err.message : 'Validation failed'
        }
      }));
    }
  };

  const handleRecommendMint = async (mint: DiscoveredMint) => {
    if (!user) return;
    
    try {
      const existingRecommendation = recommendations.find(
        rec => rec.recommendedMint.pubkey === mint.pubkey && rec.recommender === user.pubkey
      );

      if (existingRecommendation) {
        await removeRecommendation(mint);
      } else {
        await publishRecommendation({ mint });
      }
    } catch (err) {
      console.error('Failed to toggle recommendation:', err);
    }
  };

  const isRecommendedByUser = (mint: DiscoveredMint) => {
    if (!user) return false;
    return recommendations.some(
      rec => rec.recommendedMint.pubkey === mint.pubkey && rec.recommender === user.pubkey
    );
  };

  const getRecommendationCount = (mint: DiscoveredMint) => {
    return recommendations.filter(
      rec => rec.recommendedMint.pubkey === mint.pubkey
    ).length;
  };

  const sortedMints = [...cashuMints].sort((a, b) => {
    // Sort by recommendation count first, then by last updated
    const aRecommendations = getRecommendationCount(a);
    const bRecommendations = getRecommendationCount(b);
    
    if (aRecommendations !== bRecommendations) {
      return bRecommendations - aRecommendations;
    }
    
    return b.lastUpdated - a.lastUpdated;
  });

  if (error) {
    return (
      <Card className={cn('border-dashed', className)}>
        <CardContent className="py-12 px-8 text-center">
          <div className="max-w-sm mx-auto space-y-6">
            <p className="text-muted-foreground">
              Failed to discover mints: {error}
            </p>
            <Button onClick={refreshDiscovery} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Discover Cashu Mints
          </CardTitle>
          <Button
            onClick={refreshDiscovery}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-24" />
                      <div className="flex gap-2">
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-6 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-9 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : sortedMints.length === 0 ? (
          <div className="text-center py-8 space-y-4">
            <p className="text-muted-foreground">
              No Cashu mints discovered on the network yet.
            </p>
            <p className="text-sm text-muted-foreground">
              Mints may take time to announce themselves via NIP-87.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {sortedMints.map((mint) => {
                const validation = validationStates[mint.url];
                const recommendationCount = getRecommendationCount(mint);
                const isSelected = selectedMints.includes(mint.url);
                const userRecommended = isRecommendedByUser(mint);

                return (
                  <Card 
                    key={mint.pubkey}
                    className={cn(
                      'transition-colors',
                      isSelected && 'ring-2 ring-primary',
                      recommendationCount > 0 && 'border-green-200 dark:border-green-800'
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium truncate">
                              {mint.name || 'Unnamed Mint'}
                            </h3>
                            {recommendationCount > 0 && (
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {recommendationCount}
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-sm text-muted-foreground truncate">
                            {mint.url}
                          </p>
                          
                          {mint.description && (
                            <p className="text-sm line-clamp-2">
                              {mint.description}
                            </p>
                          )}
                          
                          <div className="flex flex-wrap gap-2">
                            {mint.network && (
                              <Badge variant="outline">
                                {mint.network}
                              </Badge>
                            )}
                            
                            {mint.nuts && mint.nuts.length > 0 && (
                              <Badge variant="outline">
                                NUTs: {mint.nuts.join(', ')}
                              </Badge>
                            )}
                            
                            {validation?.isHealthy === true && (
                              <Badge variant="default" className="bg-green-500">
                                <Shield className="h-3 w-3 mr-1" />
                                Healthy
                              </Badge>
                            )}
                            
                            {validation?.isHealthy === false && (
                              <Badge variant="destructive">
                                Offline
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 pt-2">
                            <Button
                              onClick={() => handleValidateMint(mint)}
                              variant="outline"
                              size="sm"
                              disabled={validation?.isValidating}
                            >
                              {validation?.isValidating ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                <Shield className="h-3 w-3" />
                              )}
                              Test
                            </Button>
                            
                            {user && (
                              <Button
                                onClick={() => handleRecommendMint(mint)}
                                variant={userRecommended ? "default" : "outline"}
                                size="sm"
                                disabled={isPublishing}
                                className={cn(
                                  userRecommended && "bg-red-500 hover:bg-red-600"
                                )}
                              >
                                <Heart className={cn(
                                  "h-3 w-3",
                                  userRecommended && "fill-current"
                                )} />
                                {userRecommended ? 'Unrecommend' : 'Recommend'}
                              </Button>
                            )}
                            
                            {mint.contact?.website && (
                              <Button
                                onClick={() => window.open(mint.contact?.website, '_blank')}
                                variant="outline"
                                size="sm"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          <Button
                            onClick={() => onMintSelect(mint)}
                            disabled={isSelected}
                            size="sm"
                          >
                            {isSelected ? 'Selected' : 'Select'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        )}
        
        {sortedMints.length > 0 && (
          <>
            <Separator className="my-4" />
            <div className="text-xs text-muted-foreground text-center">
              Showing {sortedMints.length} mint{sortedMints.length !== 1 ? 's' : ''} discovered via NIP-87
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
