import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/useToast';
import { useBlossomServerList } from '@/hooks/useBlossomServerList';
import { Trash2, Plus, GripVertical, Crown, Shield } from 'lucide-react';

const DEFAULT_SERVERS = [
  'https://blossom.band/',
  'https://nostr.download/',
  'https://blossom.primal.net/'
];

export function BlossomServerListSettings() {
  const {
    serverList,
    isLoading,
    publishServerList,
    addServer,
    removeServer,
    hasServerList
  } = useBlossomServerList();

  const { toast } = useToast();
  const [newServerUrl, setNewServerUrl] = useState('');

  const handleDragEnd = (result: any) => {
    if (!result.destination || !serverList?.servers) return;

    const items = Array.from(serverList.servers);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    publishServerList.mutate(items, {
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Server order updated successfully",
        });
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to update server order",
          variant: "destructive",
        });
      }
    });
  };

  const handleAddServer = () => {
    if (!newServerUrl.trim()) return;

    let normalizedUrl;
    try {
      const url = new URL(newServerUrl.trim());
      if (url.protocol !== 'https:') {
        throw new Error('Only HTTPS URLs are allowed');
      }
      normalizedUrl = url.href;
    } catch (error) {
      toast({
        title: "Error",
        description: "Please enter a valid HTTPS URL",
        variant: "destructive",
      });
      return;
    }

    addServer.mutate(normalizedUrl, {
      onSuccess: () => {
        setNewServerUrl('');
        toast({
          title: "Success",
          description: "Server added successfully",
        });
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to add server",
          variant: "destructive",
        });
      }
    });
  };

  const handleRemoveServer = (serverUrl: string) => {
    removeServer.mutate(serverUrl, {
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Server removed successfully",
        });
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to remove server",
          variant: "destructive",
        });
      }
    });
  };

  const handlePublishDefaults = () => {
    publishServerList.mutate(DEFAULT_SERVERS, {
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Default servers published successfully",
        });
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to publish default servers",
          variant: "destructive",
        });
      }
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center space-x-3">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-8 w-8" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Your Blossom Servers
          <Badge variant="outline" className="text-xs">NIP-B7</Badge>
        </CardTitle>
        <CardDescription>
          Manage your personal list of Blossom servers. The order determines upload priority, with your primary server first.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Server List */}
        {hasServerList && serverList?.servers ? (
          <div className="space-y-2">
            <div className="font-medium text-sm">Your Published Servers</div>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="servers">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                    {serverList.servers.map((server, index) => (
                      <Draggable key={server} draggableId={server} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg border"
                          >
                            <div {...provided.dragHandleProps}>
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                            </div>
                            {index === 0 && <Crown className="h-4 w-4 text-yellow-500" />}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{server}</div>
                              {index === 0 && (
                                <div className="text-xs text-muted-foreground">Primary upload server</div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveServer(server)}
                              disabled={removeServer.isPending || serverList.servers.length === 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        ) : (
          <Alert>
            <AlertDescription>
              You haven't published a server list yet. Publishing your server list allows other Nostr clients to find your files even if they become unavailable at the original URL.
            </AlertDescription>
          </Alert>
        )}

        {/* Add New Server */}
        <div className="space-y-2">
          <div className="font-medium text-sm">Add Server</div>
          <div className="flex space-x-2">
            <Input
              placeholder="https://blossom.example.com/"
              value={newServerUrl}
              onChange={(e) => setNewServerUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddServer();
                }
              }}
            />
            <Button
              onClick={handleAddServer}
              disabled={!newServerUrl.trim() || addServer.isPending}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          <div className="font-medium text-sm">Quick Actions</div>
          <div className="flex gap-2">
            {!hasServerList && (
              <Button
                variant="outline"
                onClick={handlePublishDefaults}
                disabled={publishServerList.isPending}
              >
                Publish Default Servers
              </Button>
            )}
          </div>
        </div>

        {/* Info */}
        <Alert>
          <AlertDescription className="text-xs">
            <strong>Server Order Matters:</strong> The first server is your primary upload target. 
            Additional servers act as mirrors for redundancy. Other Nostr clients will use this 
            list to find your files if they become unavailable at the original URL.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}