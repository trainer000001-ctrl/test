import type { SkinName as SkinPresetKey, ThemeMode as SkinMode } from "@moonwitness/ui";

export type LayoutMode = "vertical" | "collapsed" | "horizontal";
export type ContentWidthMode = "compact" | "wide";

export interface ThemeConfig {
  templateName: string;
  homePageUrl: string;
  loginUrl: string;
  settingsCookieName: string;
  localeCookieName: string;
  mode: SkinMode;
  skin: SkinPresetKey;
  layout: LayoutMode;
  contentWidth: ContentWidthMode;
  navbarContentWidth: ContentWidthMode;
  footerContentWidth: ContentWidthMode;
  toastPosition: "top-right" | "top-center" | "bottom-right";
}

export const themeConfig: ThemeConfig = {
  templateName: "MoonWitness",
  homePageUrl: "/mission-control",
  loginUrl: "/shadow",
  settingsCookieName: "mw-enterprise-settings-v1",
  localeCookieName: "mw-locale",
  mode: "dark",
  skin: "default",
  layout: "vertical",
  contentWidth: "wide",
  navbarContentWidth: "wide",
  footerContentWidth: "wide",
  toastPosition: "top-right",
};

export default themeConfig;
