import React from 'react';
import { RefreshCw, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePWA } from '@/hooks/usePWA';
import { cn } from '@/lib/utils';

interface PWAUpdateNotificationProps {
  className?: string;
  variant?: 'card' | 'banner' | 'alert';
  onDismiss?: () => void;
}

export function PWAUpdateNotification({
  className,
  variant = 'alert',
  onDismiss,
}: PWAUpdateNotificationProps) {
  const { hasUpdate, updateServiceWorker } = usePWA();
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [updateError, setUpdateError] = React.useState<string | null>(null);

  // Don't show if no update available
  if (!hasUpdate) {
    return null;
  }

  const handleUpdate = async () => {
    try {
      setIsUpdating(true);
      setUpdateError(null);
      await updateServiceWorker();
    } catch (error) {
      console.error('[PWA] Update failed:', error);
      setUpdateError('Update failed. Please refresh the page manually.');
      setIsUpdating(false);
    }
  };

  const handleDismiss = () => {
    onDismiss?.();
  };

  if (variant === 'banner') {
    return (
      <div className={cn(
        'fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white shadow-lg',
        className
      )}>
        <div className="container mx-auto flex items-center justify-between p-3">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-5 w-5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium">ZapTok update available</p>
              <p className="text-xs text-blue-100">New features and improvements are ready</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="bg-white text-blue-600 hover:bg-blue-50"
              onClick={handleUpdate}
              disabled={isUpdating}
            >
              {isUpdating ? 'Updating...' : 'Update'}
            </Button>
            
            {onDismiss && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-white hover:bg-blue-700"
                onClick={handleDismiss}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        
        {updateError && (
          <div className="border-t border-blue-500 bg-blue-700 px-4 py-2">
            <p className="text-xs text-blue-100">{updateError}</p>
          </div>
        )}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <Card className={cn('border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20', className)}>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50">
                <Download className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-base text-blue-900 dark:text-blue-100">
                  Update Available
                </CardTitle>
                <CardDescription className="text-blue-700 dark:text-blue-300">
                  A new version of ZapTok is ready
                </CardDescription>
              </div>
            </div>
            
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/50"
                onClick={handleDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            This update includes performance improvements, bug fixes, and new Lightning features.
          </p>
          
          <div className="flex gap-2">
            <Button
              className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
              onClick={handleUpdate}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Update Now
                </>
              )}
            </Button>
            
            {onDismiss && (
              <Button
                variant="outline"
                className="border-blue-200 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300"
                onClick={handleDismiss}
              >
                Later
              </Button>
            )}
          </div>
          
          {updateError && (
            <Alert variant="destructive">
              <AlertDescription className="text-sm">{updateError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  // Default alert variant
  return (
    <Alert className={cn('border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20', className)}>
      <RefreshCw className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <div className="flex flex-1 items-center justify-between">
        <div>
          <h4 className="font-medium text-blue-900 dark:text-blue-100">
            Update Available
          </h4>
          <AlertDescription className="text-blue-700 dark:text-blue-300">
            A new version of ZapTok is ready with improvements and new features.
          </AlertDescription>
        </div>
        
        <div className="flex items-center gap-2 ml-4">
          <Button
            size="sm"
            className="bg-blue-600 text-white hover:bg-blue-700"
            onClick={handleUpdate}
            disabled={isUpdating}
          >
            {isUpdating ? 'Updating...' : 'Update'}
          </Button>
          
          {onDismiss && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/50"
              onClick={handleDismiss}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      
      {updateError && (
        <div className="mt-2">
          <p className="text-xs text-red-600 dark:text-red-400">{updateError}</p>
        </div>
      )}
    </Alert>
  );
}
