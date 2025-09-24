import { ComponentType } from 'react';

// Import all settings components
import { AppearanceSettings } from './AppearanceSettings';
import { FeedsSettings } from './FeedsSettings';
import { DiscoverySettings } from './DiscoverySettings';
import { MediaUploadsSettings } from './MediaUploadsSettings';
import { StreamSettings } from './StreamSettings';
import { CashuWalletSettings } from './CashuWalletSettings';
import { NotificationsSettings } from './NotificationsSettings';
import { NetworkSettings } from './NetworkSettings';
import { ZapsSettings } from './ZapsSettings';
import { GenericSettings } from './GenericSettings';
import { ConsolidatedDeveloperSettings } from '../debug/ConsolidatedDeveloperSettings';
import { KeysSettings } from './KeysSettings';
import { CacheManagementSettings } from './CacheManagementSettings';
import { PWAManagementSettings } from './PWAManagementSettings';

export interface SettingsSectionConfig {
  id: string;
  title: string;
  component: ComponentType<unknown>;
  category: 'interface' | 'content' | 'network' | 'monetization' | 'moderation' | 'developer';
  requiresProps?: boolean;
}

export const settingsSections: SettingsSectionConfig[] = [
  // Core Identity & Security Settings
  {
    id: 'keys',
    title: 'Keys',
    component: KeysSettings,
    category: 'monetization'
  },

  // Connection & Network Settings
  {
    id: 'cashu-wallet',
    title: 'Cashu Wallet',
    component: CashuWalletSettings,
    category: 'network',
    requiresProps: true
  },
  {
    id: 'network',
    title: 'Network',
    component: NetworkSettings,
    category: 'network',
    requiresProps: true
  },

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
    id: 'stream',
    title: 'Stream',
    component: StreamSettings,
    category: 'content'
  },
  {
    id: 'media-uploads',
    title: 'Media Uploads',
    component: MediaUploadsSettings,
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

  // Notification Settings
  {
    id: 'notifications',
    title: 'Notifications',
    component: NotificationsSettings,
    category: 'interface'
  },

  // Developer Settings
  {
    id: 'cache-management',
    title: 'Cache Management',
    component: CacheManagementSettings,
    category: 'developer'
  },
  {
    id: 'pwa-management',
    title: 'PWA Management',
    component: PWAManagementSettings,
    category: 'developer'
  },
  {
    id: 'developer',
    title: 'Developer Debug',
    component: ConsolidatedDeveloperSettings,
    category: 'developer'
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
