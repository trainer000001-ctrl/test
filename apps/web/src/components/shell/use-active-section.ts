"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { stripLocalePrefix } from "@/utils/i18n";
import type { NavItem } from "./nav-items";

function matchSectionFromHash(items: NavItem[], pathname: string, rawHash: string): string | null {
  const hash = rawHash.replace(/^#/, "");
  if (!hash) return null;
  const cleanPath = stripLocalePrefix(pathname);
  const hit = items.find(
    (item) =>
      item.target.kind === "section" &&
      (item.target.href === pathname || stripLocalePrefix(item.target.href) === cleanPath) &&
      item.target.anchor === hash,
  );
  return hit?.id ?? null;
}

/**
 * Tracks active anchor section (`kind === "section"`) via URL hash updates and viewport intersection.
 */
export function useActiveSection(items: NavItem[], pathname: string): string | null {
  const [activeSection, setActiveSection] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return matchSectionFromHash(items, pathname, window.location.hash);
  });
  const suppressObserverUntilRef = useRef<number>(0);
  const cleanPath = stripLocalePrefix(pathname);

  const sectionAnchors = useMemo(
    () =>
      items
        .filter(
          (i) =>
            i.target.kind === "section" &&
            (i.target.href === pathname || stripLocalePrefix(i.target.href) === cleanPath),
        )
        .map((i) => ({ id: i.id, anchor: (i.target as { anchor: string }).anchor })),
    [cleanPath, items, pathname],
  );

  useEffect(() => {
    if (sectionAnchors.length === 0) {
      setActiveSection(null);
      return;
    }

    const fromHash = matchSectionFromHash(items, pathname, window.location.hash);
    if (fromHash) {
      suppressObserverUntilRef.current = Date.now() + 350;
      setActiveSection(fromHash);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < suppressObserverUntilRef.current) return;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const hit = sectionAnchors.find((i) => i.anchor === entry.target.id);
          if (hit) setActiveSection(hit.id);
        }
      },
      { rootMargin: "-72px 0px -55% 0px" },
    );
    for (const item of sectionAnchors) {
      const el = document.getElementById(item.anchor);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items, pathname, sectionAnchors]);

  useEffect(() => {
    const syncFromHash = () => {
      const matched = matchSectionFromHash(items, pathname, window.location.hash);
      if (matched) {
        suppressObserverUntilRef.current = Date.now() + 350;
        setActiveSection(matched);
      }
    };
    const onAnchorClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest?.("a[href]");
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      const hashIdx = href.indexOf("#");
      if (hashIdx === -1) return;
      const candidateHash = href.slice(hashIdx + 1);
      const matched = matchSectionFromHash(items, pathname, candidateHash);
      if (matched) {
        suppressObserverUntilRef.current = Date.now() + 350;
        setActiveSection(matched);
      }
    };
    window.addEventListener("hashchange", syncFromHash);
    window.addEventListener("popstate", syncFromHash);
    document.addEventListener("click", onAnchorClick, true);
    return () => {
      window.removeEventListener("hashchange", syncFromHash);
      window.removeEventListener("popstate", syncFromHash);
      document.removeEventListener("click", onAnchorClick, true);
    };
  }, [items, pathname]);

  return activeSection;
}
