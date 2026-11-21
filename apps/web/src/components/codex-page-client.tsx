"use client";

import { useEffect, useState } from "react";
import { FOUR_ENTRY_DOORS, type EntryDoorId } from "@moonwitness/canon";
import { CanonCodexSanctum } from "./canon-codex-sanctum";
import { SiteSubpageHeader } from "./site-subpage-header";

export function CodexPageClient() {
  const [activeDoorId, setActiveDoorId] = useState<EntryDoorId>("story-universe");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const doorParam = params.get("door");
    if (doorParam && FOUR_ENTRY_DOORS.some((d) => d.id === doorParam)) {
      setActiveDoorId(doorParam as EntryDoorId);
    }
  }, []);

  const handleSelectDoor = (doorId: EntryDoorId) => {
    setActiveDoorId(doorId);
    const url = new URL(window.location.href);
    url.searchParams.set("door", doorId);
    window.history.replaceState(null, "", url.toString());
  };

  return (
    <div className="min-h-screen bg-[var(--dna-canvas)] text-[var(--dna-text)] bg-girih-filigree">
      <SiteSubpageHeader activeRoute="codex" />
      <main id="main">
        <CanonCodexSanctum
          activeDoorId={activeDoorId}
          onSelectDoor={handleSelectDoor}
          isPageTitle
        />
      </main>
    </div>
  );
}
