import React from 'react';
import { Download, Smartphone, Monitor, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePWA } from '@/hooks/usePWA';
import { cn } from '@/lib/utils';

interface PWAInstallButtonProps {
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showText?: boolean;
  children?: React.ReactNode;
}

export function PWAInstallButton({
  variant = 'default',
  size = 'default',
  className,
  showText = true,
  children,
}: PWAInstallButtonProps) {
  const {
    isInstallable,
    isInstalled,
    isInstalling,
    installError,
    installPWA,
    clearInstallError,
  } = usePWA();

  // Don't show button if not installable or already installed
  if (!isInstallable || isInstalled) {
    return null;
  }

  const handleInstall = async () => {
    clearInstallError();
    await installPWA();
  };

  return (
    <div className="space-y-2">
      <Button
        variant={variant}
        size={size}
        className={cn('gap-2', className)}
        onClick={handleInstall}
        disabled={isInstalling}
      >
        {isInstalling ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {showText && (
          <span>
            {children || (isInstalling ? 'Installing...' : 'Install App')}
          </span>
        )}
      </Button>
      
      {installError && (
        <Alert variant="destructive" className="text-sm">
          <AlertDescription>
            {installError}
            <Button
              variant="ghost"
              size="sm"
              className="ml-2 h-auto p-0 text-destructive hover:text-destructive/80"
              onClick={clearInstallError}
            >
              <X className="h-3 w-3" />
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

interface PWAInstallCardProps {
  onDismiss?: () => void;
  className?: string;
  compact?: boolean;
}

export function PWAInstallCard({
  onDismiss,
  className,
  compact = false,
}: PWAInstallCardProps) {
  const {
    isInstallable,
    isInstalled,
    isInstalling,
    installError,
    installPWA,
    dismissInstallPrompt,
    clearInstallError,
  } = usePWA();

  // Don't show card if not installable or already installed
  if (!isInstallable || isInstalled) {
    return null;
  }

  const handleInstall = async () => {
    clearInstallError();
    await installPWA();
  };

  const handleDismiss = () => {
    dismissInstallPrompt();
    onDismiss?.();
  };

  if (compact) {
    return (
      <Card className={cn('border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20', className)}>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/50">
              <Smartphone className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                Install ZapTok
              </p>
              <p className="text-xs text-orange-700 dark:text-orange-300">
                Get the full Lightning experience
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-orange-200 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900/50"
              onClick={handleInstall}
              disabled={isInstalling}
            >
              {isInstalling ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                'Install'
              )}
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-orange-600 hover:bg-orange-100 dark:text-orange-400 dark:hover:bg-orange-900/50"
              onClick={handleDismiss}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
        
        {installError && (
          <CardContent className="px-4 pb-4 pt-0">
            <Alert variant="destructive" className="text-sm">
              <AlertDescription>{installError}</AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>
    );
  }

  return (
    <Card className={cn('border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50 dark:border-orange-800 dark:from-orange-950/20 dark:to-yellow-950/20', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/50">
              <Smartphone className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <CardTitle className="text-lg text-orange-900 dark:text-orange-100">
                Install ZapTok
              </CardTitle>
              <CardDescription className="text-orange-700 dark:text-orange-300">
                Get the full Lightning & Nostr experience
              </CardDescription>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-orange-600 hover:bg-orange-100 dark:text-orange-400 dark:hover:bg-orange-900/50"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid gap-3 text-sm">
          <div className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
            <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
            Instant Lightning payments & Cashu tokens
          </div>
          <div className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
            <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
            Real-time zap notifications
          </div>
          <div className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
            <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
            Offline video caching
          </div>
          <div className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
            <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
            Works on mobile & desktop
          </div>
        </div>
        
        <div className="flex gap-2 pt-2">
          <Button
            className="flex-1 bg-orange-600 text-white hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-700"
            onClick={handleInstall}
            disabled={isInstalling}
          >
            {isInstalling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Installing...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Install Now
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            className="border-orange-200 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900/50"
            onClick={handleDismiss}
          >
            Maybe Later
          </Button>
        </div>
        
        {installError && (
          <Alert variant="destructive">
            <AlertDescription>{installError}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

interface PWAInstallBannerProps {
  position?: 'top' | 'bottom';
  className?: string;
  onDismiss?: () => void;
}

export function PWAInstallBanner({
  position = 'bottom',
  className,
  onDismiss,
}: PWAInstallBannerProps) {
  const {
    isInstallable,
    isInstalled,
    isInstalling,
    installPWA,
    dismissInstallPrompt,
  } = usePWA();

  // Don't show banner if not installable or already installed
  if (!isInstallable || isInstalled) {
    return null;
  }

  const handleInstall = async () => {
    await installPWA();
  };

  const handleDismiss = () => {
    dismissInstallPrompt();
    onDismiss?.();
  };

  return (
    <div
      className={cn(
        'fixed left-0 right-0 z-50 bg-orange-600 text-white shadow-lg',
        position === 'top' ? 'top-0' : 'bottom-0',
        className
      )}
    >
      <div className="container mx-auto flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          <Monitor className="h-5 w-5 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium">Install ZapTok for the best experience</p>
            <p className="text-xs text-orange-100">Lightning payments, push notifications & more</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="bg-white text-orange-600 hover:bg-orange-50"
            onClick={handleInstall}
            disabled={isInstalling}
          >
            {isInstalling ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              'Install'
            )}
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-white hover:bg-orange-700"
            onClick={handleDismiss}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
