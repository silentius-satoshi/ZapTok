import { ComponentType } from 'react';

// Import all settings components
import { MediaUploadsSettings } from './MediaUploadsSettings';
import { StreamSettings } from './StreamSettings';
import { CashuWalletSettings } from './CashuWalletSettings';
import { NetworkSettings } from './NetworkSettings';
import { ZapsSettings } from './ZapsSettings';
import { GenericSettings } from './GenericSettings';
import { GeneralSettings } from '../debug/GeneralSettings';
import { KeysSettings } from './KeysSettings';

export interface SettingsSectionConfig {
  id: string;
  title: string;
  component: ComponentType<unknown>;
  category: 'interface' | 'content' | 'network' | 'monetization' | 'moderation' | 'developer';
  requiresProps?: boolean;
}

const allSettingsSections: SettingsSectionConfig[] = [
  // General Settings (includes Cache, PWA Management, Push Notifications, Web of Trust, Muted Content & Content Moderation)
  {
    id: 'developer',
    title: 'General',
    component: GeneralSettings,
    category: 'developer'
  },

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

  // Content Settings
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

  // Monetization Settings
  {
    id: 'zaps',
    title: 'Zaps',
    component: ZapsSettings,
    category: 'monetization'
  }
];

// Export all settings sections
export const settingsSections: SettingsSectionConfig[] = allSettingsSections;

export const getSettingSectionById = (id: string): SettingsSectionConfig | undefined => {
  return settingsSections.find(section => section.id === id);
};

export const getSettingsSectionsByCategory = (category: string): SettingsSectionConfig[] => {
  return settingsSections.filter(section => section.category === category);
};
