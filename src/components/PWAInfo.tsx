import React from 'react';
import {
  Settings,
  RefreshCw,
  Trash2,
  Smartphone,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { usePWA } from '@/hooks/usePWA';
import { PWAStatusIndicator, PWACapabilityCheck } from '@/components/PWAStatusIndicator';
import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';

interface PWAInfoProps {
  className?: string;
  showAdvanced?: boolean;
}

export function PWAInfo({ className, showAdvanced = false }: PWAInfoProps) {
  const {
    isInstalled,
    isStandalone,
  } = usePWA();
  const isMobile = useIsMobile();

  return (
    <div className={cn(isMobile ? 'space-y-4' : 'space-y-6', className)}>
      {/* PWA Status Overview */}
      <Card>
        <CardHeader className={isMobile ? 'pb-3' : ''}>
          <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-base' : ''}`}>
            <Smartphone className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
            PWA Status
          </CardTitle>
          <CardDescription className={isMobile ? 'text-xs' : ''}>
            Progressive Web App installation and features
          </CardDescription>
        </CardHeader>
        
        <CardContent className={`space-y-4 ${isMobile ? 'space-y-3 pt-0' : ''}`}>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium`}>Current Status</div>
              <p className={`${isMobile ? 'text-xs' : 'text-xs'} text-muted-foreground`}>
                {isStandalone ? 'Running as installed app' : 'Running in browser'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isInstalled ? (
                <Badge variant="default" className={isMobile ? 'text-xs px-2 py-1' : 'text-xs'}>
                  <CheckCircle2 className={`${isMobile ? 'h-2 w-2 mr-1' : 'h-3 w-3 mr-1'}`} />
                  {isMobile ? 'PWA Active' : 'Installed'}
                </Badge>
              ) : (
                <Badge variant="secondary" className={isMobile ? 'text-xs px-2 py-1' : 'text-xs'}>
                  Browser
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex flex-col space-y-2">
            <PWAStatusIndicator />
          </div>
        </CardContent>
      </Card>

      {/* Advanced PWA Information */}
      {showAdvanced && (
        <PWACapabilityCheck />
      )}

      {/* Storage and Cache Management */}
      <Card>
        <CardHeader className={isMobile ? 'pb-3' : ''}>
          <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-base' : ''}`}>
            <Settings className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
            Storage & Cache
          </CardTitle>
          <CardDescription className={isMobile ? 'text-xs' : ''}>
            Manage offline content and app data
          </CardDescription>
        </CardHeader>
        
        <CardContent className={`space-y-4 ${isMobile ? 'space-y-3 pt-0' : ''}`}>
          <div className={`grid gap-3 ${isMobile ? 'text-xs' : 'text-sm'}`}>
            <div className="flex items-center justify-between">
              <span>Offline video cache</span>
              <Badge variant="secondary" className={isMobile ? 'text-xs' : ''}>~15MB</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Profile images</span>
              <Badge variant="secondary" className={isMobile ? 'text-xs' : ''}>~5MB</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>App resources</span>
              <Badge variant="secondary" className={isMobile ? 'text-xs' : ''}>~2MB</Badge>
            </div>
          </div>
          
          <Separator />
          
          <div className={`flex gap-2 ${isMobile ? 'flex-col' : ''}`}>
            <Button size={isMobile ? 'sm' : 'sm'} variant="outline" className={`${isMobile ? 'w-full text-xs' : 'flex-1'}`}>
              <RefreshCw className={`${isMobile ? 'h-3 w-3 mr-2' : 'h-4 w-4 mr-2'}`} />
              Refresh Cache
            </Button>
            <Button size={isMobile ? 'sm' : 'sm'} variant="ghost" className={`text-destructive hover:text-destructive ${isMobile ? 'w-full text-xs' : ''}`}>
              <Trash2 className={`${isMobile ? 'h-3 w-3 mr-2' : 'h-4 w-4'}`} />
              {isMobile ? 'Clear Cache' : ''}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
