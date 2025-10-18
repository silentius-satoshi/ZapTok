import { ComponentType } from 'react';

// Import all settings components
import { AppearanceSettings } from './AppearanceSettings';
import { MediaUploadsSettings } from './MediaUploadsSettings';
import { StreamSettings } from './StreamSettings';
import { CashuWalletSettings } from './CashuWalletSettings';
import { NotificationsSettings } from './NotificationsSettings';
import { NetworkSettings } from './NetworkSettings';
import { ZapsSettings } from './ZapsSettings';
import { WebOfTrustSettings } from './WebOfTrustSettings';
import { GenericSettings } from './GenericSettings';
import { ConsolidatedDeveloperSettings } from '../debug/ConsolidatedDeveloperSettings';
import { KeysSettings } from './KeysSettings';

export interface SettingsSectionConfig {
  id: string;
  title: string;
  component: ComponentType<unknown>;
  category: 'interface' | 'content' | 'network' | 'monetization' | 'moderation' | 'developer';
  requiresProps?: boolean;
}

const allSettingsSections: SettingsSectionConfig[] = [
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
    title: 'Network & Relays',
    component: NetworkSettings,
    category: 'network'
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
    id: 'web-of-trust',
    title: 'Web of Trust',
    component: WebOfTrustSettings,
    category: 'moderation'
  },
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

  // Developer Settings (includes Cache & PWA Management)
  {
    id: 'developer',
    title: 'Developer & Advanced',
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

// Filter out sections that should be hidden in production
export const settingsSections: SettingsSectionConfig[] = allSettingsSections.filter(section => {
  // Hide appearance, muted content, and content moderation from production
  if (import.meta.env.PROD) {
    return !['appearance', 'muted-content', 'content-moderation'].includes(section.id);
  }
  return true;
});

export const getSettingSectionById = (id: string): SettingsSectionConfig | undefined => {
  return settingsSections.find(section => section.id === id);
};

export const getSettingsSectionsByCategory = (category: string): SettingsSectionConfig[] => {
  return settingsSections.filter(section => section.category === category);
};
