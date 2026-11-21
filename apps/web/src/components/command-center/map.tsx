import Image from "next/image";
import type { MapCity } from "@moonwitness/contracts/types";
import { WorldMap, Card } from "@moonwitness/ui";
import { GlobeIcon } from "@moonwitness/ui/icons";
import { AtmosphereField } from "@/components/atmosphere";
import { artSrc } from "@/lib/art";
import { SectionHeading } from "./section-heading";

export interface UniverseMapProps {
  cities: MapCity[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function UniverseMap({ cities, selectedId, onSelect }: UniverseMapProps) {
  const selected = cities.find((c) => c.id === selectedId);
  return (
    <section aria-labelledby="cc-map-heading" className="@container scroll-mt-24">
      <SectionHeading
        id="cc-map-heading"
        title="UNIVERSE"
        accent="MAP"
        note={`${cities.length} cities`}
      />
      <div className="grid grid-cols-1 items-start gap-4">
        <div className="relative min-w-0">
          <WorldMap
            cities={cities}
            selectedId={selectedId}
            onSelect={onSelect}
            backdrop={
              <Image
                src={artSrc("world-map-atlas")}
                alt=""
                fill
                sizes="(min-width: 1280px) 65vw, 100vw"
                className="object-cover object-center"
              />
            }
          />
          <AtmosphereField
            variant="map"
            cities={cities}
            className="pointer-events-none inset-x-4 top-4 z-[1] h-64 mix-blend-screen opacity-80 @[34rem]:h-80"
          />
        </div>
        <Card className="flex min-w-0 flex-wrap items-center justify-between gap-4 p-4">
          <h3 className="flex items-center gap-2 font-brush text-lg text-[var(--card-foreground)]">
            <GlobeIcon className="h-4 w-4 text-[var(--primary)]" />
            CITY DETAIL
          </h3>
          {selected ? (
            <dl className="flex flex-wrap items-center gap-x-8 gap-y-2">
              <div>
                <dt className="text-[11px] tracking-wider text-[var(--muted-foreground)]">CITY</dt>
                <dd className="font-brush text-2xl text-[var(--primary)]">{selected.city}</dd>
              </div>
              <div>
                <dt className="text-[11px] tracking-wider text-[var(--muted-foreground)]">
                  SIGNALS
                </dt>
                <dd className="text-sm text-[var(--foreground)]">{selected.signals}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 text-xs leading-relaxed text-[var(--muted-foreground)]">
              Pick a node on the map, or use the city list beside it.
            </p>
          )}
        </Card>
      </div>
    </section>
  );
}
