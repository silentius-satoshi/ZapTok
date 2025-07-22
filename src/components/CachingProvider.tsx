import React, { ReactNode, useState, useCallback, useRef, useEffect } from 'react';
import type { NostrFilter } from '@nostrify/nostrify';
import { CachingContext, CachingService, CachingContextType } from '@/contexts/CachingContext';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useNostr } from '@/hooks/useNostr';

interface CachingProviderProps {
  children: ReactNode;
}

interface CachingConfig {
  selectedServiceUrl?: string;
  lastConnected?: string;
}

export function CachingProvider({ children }: CachingProviderProps) {
  const { nostr } = useNostr();
  const [config, setConfig] = useLocalStorage<CachingConfig>('nostr:caching-config', {});
  
  // Available caching services
  const availableServices: CachingService[] = [
    {
      url: 'wss://cache2.primal.net/v1',
      name: 'Primal Cache',
      isConnected: false,
    },
    {
      url: 'wss://cache1.primal.net/v1',
      name: 'Primal Cache (Backup)',
      isConnected: false,
    },
  ];

  const [currentService, setCurrentService] = useState<CachingService | null>(null);
  const [services, setServices] = useState<CachingService[]>(availableServices);
  const [isConnecting, setIsConnecting] = useState(false);
  const cachingWebSocket = useRef<WebSocket | null>(null);

  // Initialize connection on mount if we have a saved service
  useEffect(() => {
    if (config.selectedServiceUrl) {
      connectToCachingService(config.selectedServiceUrl);
    }
  }, [config.selectedServiceUrl]); // connectToCachingService is stable

  const connectToCachingService = useCallback(async (url: string): Promise<boolean> => {
    if (isConnecting) {
      console.log(`⏳ Connection already in progress for: ${url}`);
      return false;
    }
    
    console.log(`🔌 Attempting to connect to caching service: ${url}`);
    setIsConnecting(true);
    
    try {
      // Disconnect existing connection
      if (cachingWebSocket.current) {
        cachingWebSocket.current.close();
        cachingWebSocket.current = null;
      }

      // Create new WebSocket connection
      const ws = new WebSocket(url);
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.warn(`⏰ Connection timeout for: ${url}`);
          ws.close();
          resolve(false);
        }, 10000); // 10 second timeout (increased from 5)

        ws.onopen = () => {
          console.log(`🎉 WebSocket opened for: ${url}`);
          clearTimeout(timeout);
          
          // Send initial ping using Primal's cache API format
          try {
            const pingMessage = JSON.stringify(['REQ', 'ping-' + Date.now(), {"cache": ["net_stats"]}]);
            ws.send(pingMessage);
            console.log(`📤 Sent Primal cache ping to: ${url}`);
          } catch (error) {
            console.warn(`⚠️ Could not send ping to: ${url}`, error);
          }
          
          cachingWebSocket.current = ws;
          
          // Update service state
          const service = availableServices.find(s => s.url === url);
          if (service) {
            const updatedService = {
              ...service,
              isConnected: true,
              lastConnected: new Date(),
            };
            setCurrentService(updatedService);
            setServices(prev => prev.map(s => 
              s.url === url 
                ? updatedService 
                : { ...s, isConnected: false }
            ));
          }

          // Save to localStorage
          setConfig({
            selectedServiceUrl: url,
            lastConnected: new Date().toISOString(),
          });

          console.log(`✅ Successfully connected to caching service: ${url}`);
          setIsConnecting(false);
          resolve(true);
        };

        ws.onerror = (error) => {
          clearTimeout(timeout);
          console.error(`❌ WebSocket error for ${url}:`, error);
          setIsConnecting(false);
          resolve(false);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Only log non-ping responses to avoid console spam
            if (data[1] && !data[1].startsWith('ping-')) {
              console.log(`📨 Primal cache response:`, data[0], data[1] ? `(${data[1]})` : '');
              
              // Handle different Primal cache message types
              if (data[0] === 'EVENT') {
                const event = data[2];
                if (event?.kind === 1 || event?.kind === 1063) {
                  console.log(`🎬 Got video-related event from cache: kind ${event.kind}`);
                }
              } else if (data[0] === 'EOSE') {
                console.log(`✅ End of subscription: ${data[1]}`);
              } else if (data[0] === 'NOTICE') {
                console.log(`ℹ️ Cache notice: ${data[1]}`);
              }
            }
          } catch {
            console.warn(`⚠️ Could not parse Primal cache message:`, event.data);
          }
        };

        ws.onclose = (event) => {
          console.log(`🔌 WebSocket closed for ${url}. Code: ${event.code}, Reason: ${event.reason || 'No reason provided'}`);
          setIsConnecting(false);
          if (currentService?.url === url) {
            setCurrentService(null);
            setServices(prev => prev.map(s => ({ ...s, isConnected: false })));
          }
        };
      });
    } catch (error) {
      console.error(`💥 Error connecting to caching service ${url}:`, error);
      setIsConnecting(false);
      return false;
    }
  }, [availableServices, currentService, setConfig, isConnecting]);

  const disconnectCachingService = useCallback(() => {
    if (cachingWebSocket.current) {
      cachingWebSocket.current.close();
      cachingWebSocket.current = null;
    }
    setCurrentService(null);
    setServices(prev => prev.map(s => ({ ...s, isConnected: false })));
    setConfig({});
    console.log('🔌 Disconnected from caching service');
  }, [setConfig]);

  const isCachingAvailable = useCallback(() => {
    return currentService?.isConnected === true && cachingWebSocket.current?.readyState === WebSocket.OPEN;
  }, [currentService]);

  const queryWithCaching = useCallback(async (filters: NostrFilter[], options?: object): Promise<object[]> => {
    // Always query through regular relays as primary source
    const relayResults = await nostr.query(filters, options);
    
    // If caching is available and stable, supplement with Primal cache data
    if (isCachingAvailable() && cachingWebSocket.current?.readyState === WebSocket.OPEN) {
      try {
        console.log('📡 Querying Primal cache for additional video content...');
        
        // Extract author pubkeys from filters for Primal cache queries
        const authorsFromFilters = filters
          .map(filter => filter.authors)
          .flat()
          .filter(Boolean) as string[];
        
        if (authorsFromFilters.length > 0) {
          // Batch query for better performance - query multiple authors in one subscription
          const batchedVideoEvents = await new Promise<object[]>((resolve) => {
            const subscriptionId = `video-batch-${Date.now()}`;
            const collectedEvents: object[] = [];
            let completedAuthors = 0;
            const totalAuthors = Math.min(authorsFromFilters.length, 3); // Limit to 3 authors for performance
            
            // Set up response handler for batched query
            const messageHandler = (event: MessageEvent) => {
              try {
                const data = JSON.parse(event.data);
                if (data[0] === 'EVENT' && data[1] === subscriptionId) {
                  const eventData = data[2];
                  
                  // Only collect video-related events (kind 1 text notes or kind 1063 file metadata)
                  if (eventData && (eventData.kind === 1 || eventData.kind === 1063)) {
                    // Check if it contains video content indicators
                    const content = eventData.content?.toLowerCase() || '';
                    const hasVideoUrl = content.includes('.mp4') || 
                                      content.includes('.webm') || 
                                      content.includes('.mov') ||
                                      content.includes('youtube.com') ||
                                      content.includes('youtu.be') ||
                                      content.includes('vimeo.com');
                    
                    const hasVideoTags = eventData.tags?.some((tag: string[]) => 
                      tag[0] === 't' && ['video', 'content', 'entertainment'].includes(tag[1])
                    );
                    
                    if (hasVideoUrl || hasVideoTags) {
                      collectedEvents.push(eventData);
                      console.log(`🎬 Collected video event from cache: ${eventData.id?.slice(0, 8)}...`);
                    }
                  }
                } else if (data[0] === 'EOSE' && data[1] === subscriptionId) {
                  completedAuthors++;
                  if (completedAuthors >= totalAuthors) {
                    // All queries completed
                    cachingWebSocket.current?.removeEventListener('message', messageHandler);
                    cachingWebSocket.current?.send(JSON.stringify(['CLOSE', subscriptionId]));
                    resolve(collectedEvents);
                  }
                }
              } catch (error) {
                console.warn('Error parsing batched Primal cache response:', error);
              }
            };
            
            cachingWebSocket.current?.addEventListener('message', messageHandler);
            
            // Send batched queries for multiple authors
            authorsFromFilters.slice(0, totalAuthors).forEach((pubkey, index) => {
              setTimeout(() => {
                const feedQuery = JSON.stringify([
                  'REQ', 
                  subscriptionId, 
                  {"cache": ["feed", {"pubkey": pubkey}]}
                ]);
                cachingWebSocket.current?.send(feedQuery);
              }, index * 100); // Stagger requests by 100ms
            });
            
            // Timeout after 5 seconds
            setTimeout(() => {
              cachingWebSocket.current?.removeEventListener('message', messageHandler);
              resolve(collectedEvents);
            }, 5000);
          });
          
          console.log(`📦 Got ${batchedVideoEvents.length} video events from Primal cache`);
          
          // Combine and deduplicate with relay results
          const allEvents = [...relayResults, ...batchedVideoEvents];
          const uniqueEvents = new Map();
          
          allEvents.forEach(event => {
            if (event && typeof event === 'object' && 'id' in event) {
              uniqueEvents.set(event.id, event);
            }
          });
          
          const finalResults = Array.from(uniqueEvents.values());
          console.log(`🎯 Final result: ${relayResults.length} from relays + ${batchedVideoEvents.length} from cache = ${finalResults.length} total unique events`);
          
          return finalResults;
        }
        
        return relayResults;
      } catch (error) {
        console.error('Error querying Primal cache:', error);
        return relayResults;
      }
    }

    return relayResults;
  }, [isCachingAvailable, nostr]);

  const contextValue: CachingContextType = {
    currentService,
    availableServices: services,
    connectToCachingService,
    disconnectCachingService,
    isCachingAvailable,
    queryWithCaching,
  };

  return (
    <CachingContext.Provider value={contextValue}>
      {children}
    </CachingContext.Provider>
  );
}
