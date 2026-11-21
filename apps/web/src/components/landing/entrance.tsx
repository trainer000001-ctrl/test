import { Splatter } from "@moonwitness/ui/icons";

/** Organic ink-splatter stamp at entrance corner using sovereign Splatter icon. */
export function Entrance() {
  return (
    <Splatter
      data-entrance-stamp
      aria-hidden="true"
      className="ink-stamp pointer-events-none absolute right-4 top-20 z-30 h-20 w-20 text-[var(--pink)] sm:right-10 sm:h-28 sm:w-28"
    />
  );
}
