import { Star4 } from "@moonwitness/ui/icons";

export interface SectionHeadingProps {
  id?: string;
  title: string;
  accent?: string;
  note?: string;
}

export function CommandSectionHeading({ id, title, accent, note }: SectionHeadingProps) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <h2 id={id} className="font-brush text-2xl text-[var(--foreground)] sm:text-3xl">
        {title}
        {accent && <span className="text-[var(--primary)]"> {accent}</span>}
      </h2>
      {note && (
        <span className="flex items-center gap-2 text-[11px] tracking-wider text-[var(--muted-foreground)]">
          <Star4 className="h-3.5 w-3.5 text-[var(--primary)]" />
          {note.toUpperCase()}
        </span>
      )}
    </div>
  );
}

export { CommandSectionHeading as SectionHeading };
