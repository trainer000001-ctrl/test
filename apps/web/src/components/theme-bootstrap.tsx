"use client";

import { useEffect } from "react";
import { applyTheme, defaultTheme } from "@moonwitness/ui";

export function ThemeBootstrap() {
  useEffect(() => {
    applyTheme(defaultTheme);
  }, []);

  return null;
}
