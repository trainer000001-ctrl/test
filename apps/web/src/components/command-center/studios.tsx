import Image from "next/image";
import type { ArtKey, Module } from "@moonwitness/contracts/types";
import { ModuleCard } from "@moonwitness/ui";
import { artSrc } from "@/lib/art";
import { SectionHeading } from "./section-heading";

const STUDIO_IDS = ["story-forge", "poster-lab"];

const STUDIO_ART: Partial<Record<string, ArtKey>> = {
  "story-forge": "command-eye",
  "poster-lab": "crowd-moon",
};

export interface StudiosProps {
  modules: Module[];
  onOpen: (m: Module) => void;
}

export function Studios({ modules, onOpen }: StudiosProps) {
  const studios = STUDIO_IDS.map((id) => modules.find((m) => m.id === id)).filter(
    (m): m is Module => Boolean(m),
  );
  return (
    <section aria-labelledby="cc-studios" className="@container flex h-full scroll-mt-24 flex-col">
      <SectionHeading id="cc-studios" title="STORY STUDIO" accent={"/ POSTER\u00A0FORGE"} />
      <div className="grid flex-1 auto-rows-fr grid-cols-1 gap-3 @[30rem]:grid-cols-2">
        {studios.map((m) => {
          const art = STUDIO_ART[m.id];
          return (
            <ModuleCard
              key={m.id}
              module={m}
              onOpen={onOpen}
              art={
                art ? (
                  <>
                    <Image
                      src={artSrc(art)}
                      alt=""
                      fill
                      sizes="(min-width: 1280px) 30vw, (min-width: 480px) 45vw, 90vw"
                      className="object-cover opacity-50 grayscale transition-all duration-500 group-hover:opacity-75 group-hover:grayscale-0"
                    />
                    <span className="absolute inset-0 bg-gradient-to-r from-[var(--ink)] via-[var(--ink)]/80 to-[var(--ink)]/10" />
                  </>
                ) : undefined
              }
            />
          );
        })}
      </div>
    </section>
  );
}
