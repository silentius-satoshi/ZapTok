import React from 'react';
import { PWASettings } from '@/components/PWASettings';
import { PWADebug } from '@/components/PWADebug';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function PWASettingsPage() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="settings">PWA Settings</TabsTrigger>
          <TabsTrigger value="debug">Debug & Testing</TabsTrigger>
        </TabsList>
        
        <TabsContent value="settings">
          <PWASettings showAdvanced={true} />
        </TabsContent>
        
        <TabsContent value="debug">
          <PWADebug />
        </TabsContent>
      </Tabs>
    </div>
  );
}
