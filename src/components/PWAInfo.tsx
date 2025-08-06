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

  return (
    <div className={cn('space-y-6', className)}>
      {/* PWA Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            PWA Status
          </CardTitle>
          <CardDescription>
            Progressive Web App installation and features
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm font-medium">Current Status</div>
              <p className="text-xs text-muted-foreground">
                {isStandalone ? 'Running as installed app' : 'Running in browser'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isInstalled ? (
                <Badge variant="default" className="text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Installed
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Storage & Cache
          </CardTitle>
          <CardDescription>
            Manage offline content and app data
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid gap-3 text-sm">
            <div className="flex items-center justify-between">
              <span>Offline video cache</span>
              <Badge variant="secondary">~15MB</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Profile images</span>
              <Badge variant="secondary">~5MB</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>App resources</span>
              <Badge variant="secondary">~2MB</Badge>
            </div>
          </div>
          
          <Separator />
          
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Cache
            </Button>
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
