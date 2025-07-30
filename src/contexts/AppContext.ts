import { createContext } from "react";
import type { ZapOption } from "@/types/zap";

export type Theme = "dark" | "light" | "system";

export interface AppConfig {
  /** Current theme */
  theme: Theme;
  /** Selected relay URLs */
  relayUrls: string[];
  /** Default zap configuration */
  defaultZap: ZapOption;
  /** Available zap options for quick selection */
  availableZapOptions: ZapOption[];
}

export interface AppContextType {
  /** Current application configuration */
  config: AppConfig;
  /** Update configuration using a callback that receives current config and returns new config */
  updateConfig: (updater: (currentConfig: AppConfig) => AppConfig) => void;
  /** Add a relay URL */
  addRelay: (relayUrl: string) => void;
  /** Remove a relay URL */
  removeRelay: (relayUrl: string) => void;
  /** Set default zap amount and message */
  setDefaultZap: (zapOption: ZapOption) => void;
  /** Update zap options at specific index */
  setZapOption: (zapOption: Partial<ZapOption>, index: number) => void;
  /** Reset zap options to default */
  resetZapOptionsToDefault: () => void;
  /** Optional list of preset relays to display in the RelaySelector */
  presetRelays?: { name: string; url: string }[];
}

export const AppContext = createContext<AppContextType | undefined>(undefined);
