"use client";

import { useContext } from "react";
import { SettingsContext, type SettingsContextProps } from "@core/contexts/settingsContext";

export function useSettings(): SettingsContextProps {
  return useContext(SettingsContext);
}
