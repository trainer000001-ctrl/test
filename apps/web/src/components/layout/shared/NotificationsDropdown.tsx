"use client";

import { useEffect, useState } from "react";
import { moonwitnessSdk } from "@moonwitness/contracts/sdk";
import { Bell, X } from "@moonwitness/ui/icons";
import { Badge, Button, Popover, PopoverContent, PopoverTrigger } from "@moonwitness/ui";
import { feedItems } from "@/lib/data";

export interface NotificationEntry {
  id: string;
  text: string;
  ago: string;
  color: string;
  read: boolean;
}

const INITIAL_NOTIFICATIONS: NotificationEntry[] = feedItems.slice(0, 4).map((f, idx) => ({
  id: String(f.id),
  text: f.text,
  ago: f.ago,
  color: f.color,
  read: idx >= 3,
}));

export interface NotificationsDropdownProps {
  open: boolean;
  onToggle: () => void;
  authenticated?: boolean;
}

export function NotificationsDropdown({
  open,
  onToggle,
  authenticated = false,
}: NotificationsDropdownProps) {
  const [items, setItems] = useState<NotificationEntry[]>(INITIAL_NOTIFICATIONS);

  useEffect(() => {
    if (!open || !authenticated) return;
    let active = true;
    moonwitnessSdk
      .model("command.alert")
      .list<Record<string, unknown>>()
      .then((res) => {
        if (!active || !Array.isArray(res.data) || res.data.length === 0) return;
        const mapped: NotificationEntry[] = res.data.slice(0, 6).map((row, idx) => ({
          id: String(row.id ?? `alert-${idx}`),
          text: String(row.title ?? row.message ?? row.summary ?? "Command alert"),
          ago: String(row.severity ?? row.status ?? "live"),
          color:
            row.severity === "critical" || row.severity === "high"
              ? "var(--destructive)"
              : "var(--primary)",
          read: Boolean(row.acknowledged ?? false),
        }));
        setItems(mapped);
      })
      .catch(() => {
        // Keep static initial notification feed when offline or unmocked in unit tests
      });
    return () => {
      active = false;
    };
  }, [authenticated, open]);

  const unreadCount = items.filter((item) => !item.read).length;

  function markAllRead() {
    const allRead = items.every((item) => item.read);
    setItems((prev) => prev.map((item) => ({ ...item, read: !allRead })));
  }

  function toggleRead(id: string) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, read: !item.read } : item)));
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next !== open) onToggle();
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          aria-label="Notifications"
          aria-expanded={open}
          className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-md p-2 text-[var(--foreground)] hover:bg-[var(--muted)]"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--primary)] text-[9px] font-bold text-[var(--primary-foreground)]">
              {unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} aria-label="Notifications" className="w-80 p-3">
        <div className="mb-2 flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="font-brush text-sm text-[var(--primary)]">COMMAND FEED</span>
            <Badge variant="outline">{unreadCount} unread</Badge>
          </div>
          {items.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={markAllRead}
              className="h-6 px-2 font-mono text-[10px]"
            >
              {unreadCount > 0 ? "Mark all read" : "Mark unread"}
            </Button>
          ) : null}
        </div>
        {items.length === 0 ? (
          <div className="py-6 text-center font-mono text-xs text-[var(--muted-foreground)]">
            No active alerts in command feed.
          </div>
        ) : (
          items.map((f) => (
            <div
              key={f.id}
              className={`flex items-start justify-between gap-2 border-t border-[var(--border)] px-1 py-2.5 ${
                f.read ? "opacity-60" : ""
              }`}
            >
              <Button
                type="button"
                variant="plain"
                onClick={() => toggleRead(f.id)}
                className="flex flex-1 items-start gap-2 text-left"
              >
                <span
                  className="mt-1 h-2 w-2 shrink-0 rounded-full"
                  style={{ background: f.color }}
                />
                <div>
                  <p className="text-xs leading-snug text-[var(--foreground)]">{f.text}</p>
                  <p className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">{f.ago}</p>
                </div>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Dismiss notification ${f.id}`}
                onClick={() => removeItem(f.id)}
                className="h-6 w-6 p-0 text-[var(--muted-foreground)]"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))
        )}
      </PopoverContent>
    </Popover>
  );
}
export default NotificationsDropdown;
