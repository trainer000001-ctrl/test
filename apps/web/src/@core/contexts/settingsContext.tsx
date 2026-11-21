"use client";

import { createContext, useCallback, useMemo, type ReactNode } from "react";
import type {
  CanonicalDensity as SkinDensity,
  MasterDnaId as DnaWorldId,
  SkinName as SkinPresetKey,
  ThemeMode as SkinMode,
} from "@moonwitness/ui";
import themeConfig, { type ContentWidthMode, type LayoutMode } from "@/configs/themeConfig";
import { useObjectCookie } from "@core/hooks/useObjectCookie";

export interface Settings {
  mode: SkinMode;
  skin: SkinPresetKey;
  dnaId: DnaWorldId;
  density: SkinDensity;
  layout: LayoutMode;
  contentWidth: ContentWidthMode;
  navbarContentWidth: ContentWidthMode;
  footerContentWidth: ContentWidthMode;
  primaryColor?: string;
}

export interface UpdateSettingsOptions {
  updateCookie?: boolean;
}

export interface SettingsContextProps {
  settings: Settings;
  updateSettings: (settings: Partial<Settings>, options?: UpdateSettingsOptions) => void;
  isSettingsChanged: boolean;
  resetSettings: () => void;
  updatePageSettings: (settings: Partial<Settings>) => () => void;
}

const DEFAULT_SETTINGS: Settings = {
  mode: themeConfig.mode,
  skin: themeConfig.skin,
  dnaId: "01-imperium-lumen",
  density: "comfortable",
  layout: themeConfig.layout,
  contentWidth: themeConfig.contentWidth,
  navbarContentWidth: themeConfig.navbarContentWidth,
  footerContentWidth: themeConfig.footerContentWidth,
};

export const SettingsContext = createContext<SettingsContextProps>({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {},
  isSettingsChanged: false,
  resetSettings: () => {},
  updatePageSettings: () => () => {},
});

export function SettingsProvider({
  children,
  settingsCookie,
  mode,
}: {
  children: ReactNode;
  settingsCookie?: Partial<Settings> | null;
  mode?: SkinMode;
}) {
  const initialSettings: Settings = useMemo(
    () => ({
      ...DEFAULT_SETTINGS,
      ...(mode ? { mode } : {}),
      ...(settingsCookie ?? {}),
    }),
    [mode, settingsCookie],
  );

  const [settingsState, setSettingsCookie] = useObjectCookie<Settings>(
    themeConfig.settingsCookieName,
    initialSettings,
  );

  const updateSettings = useCallback(
    (next: Partial<Settings>, options?: UpdateSettingsOptions) => {
      const { updateCookie = true } = options ?? {};
      if (updateCookie) {
        setSettingsCookie((prev) => ({ ...prev, ...next }));
      }
    },
    [setSettingsCookie],
  );

  const updatePageSettings = useCallback(
    (pageSettings: Partial<Settings>): (() => void) => {
      updateSettings(pageSettings, { updateCookie: false });
      return () => updateSettings(settingsState, { updateCookie: false });
    },
    [settingsState, updateSettings],
  );

  const resetSettings = useCallback(() => {
    updateSettings(DEFAULT_SETTINGS);
  }, [updateSettings]);

  const isSettingsChanged = useMemo(
    () => JSON.stringify(DEFAULT_SETTINGS) !== JSON.stringify(settingsState),
    [settingsState],
  );

  return (
    <SettingsContext.Provider
      value={{
        settings: settingsState,
        updateSettings,
        isSettingsChanged,
        resetSettings,
        updatePageSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}
