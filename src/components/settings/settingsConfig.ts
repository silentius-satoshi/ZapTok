import { ComponentType } from 'react';

// Import all settings components
import { AppearanceSettings } from './AppearanceSettings';
import { FeedsSettings } from './FeedsSettings';
import { DiscoverySettings } from './DiscoverySettings';
import { MediaUploadsSettings } from './MediaUploadsSettings';
import { StreamSettings } from './StreamSettings';
import { ConnectedWalletsSettings } from './ConnectedWalletsSettings';
import { NotificationsSettings } from './NotificationsSettings';
import { NetworkSettings } from './NetworkSettings';
import { ZapsSettings } from './ZapsSettings';
import { GenericSettings } from './GenericSettings';
import { DeveloperSettings } from './DeveloperSettings';

export interface SettingsSectionConfig {
  id: string;
  title: string;
  component: ComponentType<unknown>;
  category: 'interface' | 'content' | 'network' | 'monetization' | 'moderation';
  requiresProps?: boolean;
}

export const settingsSections: SettingsSectionConfig[] = [
  // Interface Settings
  {
    id: 'appearance',
    title: 'Appearance',
    component: AppearanceSettings,
    category: 'interface'
  },

  // Content Settings
  {
    id: 'feeds',
    title: 'Feeds',
    component: FeedsSettings,
    category: 'content'
  },
  {
    id: 'discovery',
    title: 'Discovery',
    component: DiscoverySettings,
    category: 'content'
  },
  {
    id: 'media-uploads',
    title: 'Media Uploads',
    component: MediaUploadsSettings,
    category: 'content'
  },
  {
    id: 'stream',
    title: 'Stream',
    component: StreamSettings,
    category: 'content'
  },

  // Moderation Settings
  {
    id: 'muted-content',
    title: 'Muted Content',
    component: GenericSettings,
    category: 'moderation'
  },
  {
    id: 'content-moderation',
    title: 'Content Moderation',
    component: GenericSettings,
    category: 'moderation'
  },

  // Network & Connection Settings
  {
    id: 'connected-wallets',
    title: 'Connected Wallets',
    component: ConnectedWalletsSettings,
    category: 'network',
    requiresProps: true
  },
  {
    id: 'notifications',
    title: 'Notifications',
    component: NotificationsSettings,
    category: 'interface'
  },
  {
    id: 'network',
    title: 'Network',
    component: NetworkSettings,
    category: 'network',
    requiresProps: true
  },

  // Developer Settings
  {
    id: 'developer',
    title: 'Developer',
    component: DeveloperSettings,
    category: 'interface'
  },

  // Monetization Settings
  {
    id: 'zaps',
    title: 'Zaps',
    component: ZapsSettings,
    category: 'monetization'
  }
];

export const getSettingSectionById = (id: string): SettingsSectionConfig | undefined => {
  return settingsSections.find(section => section.id === id);
};

export const getSettingsSectionsByCategory = (category: string): SettingsSectionConfig[] => {
  return settingsSections.filter(section => section.category === category);
};
