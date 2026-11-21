import { useEffect, useState } from "react";

export interface MotionPreference {
  reducedMotion: boolean;
  systemReducedMotion: boolean;
  toggleMotion: () => void;
}

export default function useMotionPreference(): MotionPreference {
  const [systemReducedMotion, setSystemReducedMotion] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  const [motionOverride, setMotionOverride] = useState<boolean | null>(null);
  const reducedMotion = systemReducedMotion || motionOverride === true;

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!media) return undefined;

    const updatePreference = (event: MediaQueryListEvent) => setSystemReducedMotion(event.matches);

    if (media.addEventListener) {
      media.addEventListener("change", updatePreference);
      return () => media.removeEventListener("change", updatePreference);
    }

    media.addListener(updatePreference);
    return () => media.removeListener(updatePreference);
  }, []);

  const toggleMotion = () => {
    if (systemReducedMotion) return;
    setMotionOverride(!reducedMotion);
  };

  return { reducedMotion, systemReducedMotion, toggleMotion };
}
