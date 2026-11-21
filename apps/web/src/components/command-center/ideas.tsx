import Image from "next/image";
import { ScenePanel } from "@moonwitness/ui";
import { artSrc } from "@/lib/art";
import { SectionHeading } from "./section-heading";

export function IdeasInMotion() {
  return (
    <section aria-labelledby="cc-ideas-heading" className="flex h-full scroll-mt-24 flex-col">
      <SectionHeading id="cc-ideas-heading" title="IDEAS PEOPLE WORLDS" accent="IN MOTION" />
      <ScenePanel
        className="flex-1"
        art={
          <Image
            src={artSrc("command-eye")}
            alt=""
            fill
            sizes="(max-width: 767px) 100vw, 33vw"
            className="object-cover object-[72%_38%]"
          />
        }
      >
        <div className="flex min-h-[300px] flex-col justify-end gap-6 p-5">
          <div className="max-w-[20rem]">
            <p className="font-mono text-[11px] font-bold tracking-[0.18em] text-[var(--primary)]">
              REAL STORIES. REAL ANOTHER TOMORROW.
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-[var(--paper)]/90">
              Every episode starts as a scribbled idea on a rooftop. This board is where those
              scribbles wait to be picked up.
            </p>
          </div>
        </div>
      </ScenePanel>
    </section>
  );
}
