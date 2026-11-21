"use client";

import Link from "next/link";
import { SanctuaryGateLink } from "@/components/sanctuary-gate-link";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  WitnessAvatar,
} from "@moonwitness/ui";

interface ProfileMenuProps {
  open: boolean;
  onToggle: () => void;
  identity: string;
  role: string;
  onExit: () => void;
  avatarSeed?: string;
  dnaId?: string;
}

export function ProfileMenu({
  open,
  onToggle,
  identity,
  role,
  onExit,
  avatarSeed,
  dnaId,
}: ProfileMenuProps) {
  return (
    <DropdownMenu open={open} onOpenChange={onToggle}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="plain"
          aria-label="Profile menu"
          className="flex min-h-11 items-center gap-2 rounded-md px-2 py-1.5 hover:bg-[var(--muted)]"
        >
          <WitnessAvatar
            seed={avatarSeed ?? identity}
            size={32}
            alt=""
            dnaId={dnaId}
            className="rounded-full border-2 border-[var(--primary)]"
            options={{ radius: 50 }}
          />
          <span className="hidden text-left md:block">
            <span className="block max-w-[140px] truncate text-xs font-bold text-[var(--foreground)]">
              {identity}
            </span>
            <span className="block text-[10px] text-[var(--muted-foreground)]">{role}</span>
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 p-2 min-w-[12rem]" side="top" align="end" sideOffset={8}>
        <div className="border-b border-[var(--border)] px-3 py-2">
          <p className="truncate text-xs font-bold text-[var(--foreground)]">{identity}</p>
          <p className="text-[10px] text-[var(--muted-foreground)]">Authorized crew</p>
        </div>
        <DropdownMenuSeparator />
        <Link
          href="/dock"
          className="block min-h-11 rounded px-3 py-2 text-xs text-[var(--foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
        >
          Project Universe
        </Link>
        <Link
          href="/id-lab"
          className="block min-h-11 rounded px-3 py-2 text-xs text-[var(--yellow)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
        >
          ID Lab — your witness face
        </Link>
        <Link
          href="/moonwitness"
          className="block min-h-11 rounded px-3 py-2 text-xs text-[var(--foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
        >
          Moonwitness landing
        </Link>
        <SanctuaryGateLink className="block min-h-11 rounded px-3 py-2 text-xs text-[var(--foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]">
          Public site
        </SanctuaryGateLink>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onExit} className="text-[var(--pink)] hover:bg-[var(--muted)]">
          Exit the shadow →
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
