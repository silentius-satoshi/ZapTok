import React from 'react';
import { 
  Wifi, 
  WifiOff, 
  Smartphone, 
  Monitor, 
  Chrome,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePWA } from '@/hooks/usePWA';
import { cn } from '@/lib/utils';

interface PWAStatusIndicatorProps {
  className?: string;
  variant?: 'badge' | 'card' | 'minimal';
  showDetails?: boolean;
}

export function PWAStatusIndicator({
  className,
  variant = 'badge',
  showDetails = false,
}: PWAStatusIndicatorProps) {
  const {
    isInstalled,
    isStandalone,
    isOnline,
    serviceWorkerRegistration,
    hasUpdate,
  } = usePWA();

  if (variant === 'minimal') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {/* Online/Offline indicator */}
        {isOnline ? (
          <Wifi className="h-4 w-4 text-green-600" />
        ) : (
          <WifiOff className="h-4 w-4 text-red-600" />
        )}
        
        {/* Installation status */}
        {isInstalled && (
          <Smartphone className="h-4 w-4 text-blue-600" />
        )}
        
        {/* Update indicator */}
        {hasUpdate && (
          <AlertCircle className="h-4 w-4 text-orange-600" />
        )}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-5 w-5 text-orange-600" />
            PWA Status
          </CardTitle>
          <CardDescription>
            Progressive Web App capabilities
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {/* Installation Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isInstalled ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <Clock className="h-4 w-4 text-gray-400" />
              )}
              <span className="text-sm">Installation</span>
            </div>
            <Badge variant={isInstalled ? 'default' : 'secondary'}>
              {isInstalled ? 'Installed' : 'Browser'}
            </Badge>
          </div>
          
          {/* Display Mode */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isStandalone ? (
                <Smartphone className="h-4 w-4 text-blue-600" />
              ) : (
                <Monitor className="h-4 w-4 text-gray-400" />
              )}
              <span className="text-sm">Display Mode</span>
            </div>
            <Badge variant={isStandalone ? 'default' : 'secondary'}>
              {isStandalone ? 'Standalone' : 'Browser'}
            </Badge>
          </div>
          
          {/* Network Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-600" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-600" />
              )}
              <span className="text-sm">Network</span>
            </div>
            <Badge variant={isOnline ? 'default' : 'destructive'}>
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
          </div>
          
          {/* Service Worker */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {serviceWorkerRegistration?.active ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-orange-600" />
              )}
              <span className="text-sm">Service Worker</span>
            </div>
            <Badge variant={serviceWorkerRegistration?.active ? 'default' : 'secondary'}>
              {serviceWorkerRegistration?.active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          
          {/* Update Status */}
          {hasUpdate && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <span className="text-sm">Update</span>
              </div>
              <Badge variant="outline" className="border-orange-200 text-orange-700">
                Available
              </Badge>
            </div>
          )}
          
          {showDetails && (
            <div className="pt-2 border-t space-y-2 text-xs text-muted-foreground">
              <div>
                <strong>User Agent:</strong> {navigator.userAgent.split(' ').slice(-2).join(' ')}
              </div>
              {serviceWorkerRegistration && (
                <div>
                  <strong>SW Scope:</strong> {serviceWorkerRegistration.active?.scriptURL || 'N/A'}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Default badge variant
  const getStatusColor = () => {
    if (!isOnline) return 'destructive';
    if (hasUpdate) return 'outline';
    if (isInstalled && isStandalone) return 'default';
    return 'secondary';
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (hasUpdate) return 'Update Available';
    if (isInstalled && isStandalone) return 'PWA Active';
    if (serviceWorkerRegistration?.active) return 'PWA Ready';
    return 'Browser Mode';
  };

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="h-3 w-3" />;
    if (hasUpdate) return <AlertCircle className="h-3 w-3" />;
    if (isInstalled && isStandalone) return <Smartphone className="h-3 w-3" />;
    if (serviceWorkerRegistration?.active) return <CheckCircle2 className="h-3 w-3" />;
    return <Chrome className="h-3 w-3" />;
  };

  return (
    <Badge 
      variant={getStatusColor()} 
      className={cn('gap-1.5', className)}
    >
      {getStatusIcon()}
      <span>{getStatusText()}</span>
    </Badge>
  );
}

interface PWACapabilityCheckProps {
  className?: string;
}

export function PWACapabilityCheck({ className }: PWACapabilityCheckProps) {
  const capabilities = React.useMemo(() => {
    const checks = [
      {
        name: 'Service Worker',
        supported: 'serviceWorker' in navigator,
        description: 'Enables offline functionality and push notifications'
      },
      {
        name: 'Web App Manifest',
        supported: 'onbeforeinstallprompt' in window,
        description: 'Allows installation as a native app'
      },
      {
        name: 'Push Notifications',
        supported: 'PushManager' in window && 'Notification' in window,
        description: 'Real-time Lightning payment notifications'
      },
      {
        name: 'Background Sync',
        supported: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
        description: 'Syncs failed transactions when back online'
      },
      {
        name: 'Cache API',
        supported: 'caches' in window,
        description: 'Stores content for offline access'
      },
      {
        name: 'Web Share',
        supported: 'share' in navigator,
        description: 'Native sharing of videos and content'
      }
    ];
    
    return checks;
  }, []);

  const supportedCount = capabilities.filter(cap => cap.supported).length;
  const totalCount = capabilities.length;
  const supportPercentage = Math.round((supportedCount / totalCount) * 100);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-orange-600" />
          PWA Capabilities
        </CardTitle>
        <CardDescription>
          {supportedCount} of {totalCount} features supported ({supportPercentage}%)
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {capabilities.map((capability) => (
          <div key={capability.name} className="flex items-start gap-3">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center">
              {capability.supported ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{capability.name}</span>
                <Badge 
                  variant={capability.supported ? 'default' : 'destructive'}
                  className="text-xs"
                >
                  {capability.supported ? 'Supported' : 'Not Available'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {capability.description}
              </p>
            </div>
          </div>
        ))}
        
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">PWA Score</span>
            <span className={cn(
              'font-bold',
              supportPercentage >= 80 ? 'text-green-600' :
              supportPercentage >= 60 ? 'text-yellow-600' : 'text-red-600'
            )}>
              {supportPercentage}%
            </span>
          </div>
          <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={cn(
                'h-full transition-all duration-500',
                supportPercentage >= 80 ? 'bg-green-600' :
                supportPercentage >= 60 ? 'bg-yellow-600' : 'bg-red-600'
              )}
              style={{ width: `${supportPercentage}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
