"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { EraId, EventKind, TimelineEvent } from "@moonwitness/contracts/types";
import { ConsoleShellAdapter } from "../shell/console-shell-adapter";
import { Star4 } from "@moonwitness/ui/icons";
import { EraBand } from "@moonwitness/ui";
import { DockCreateEventForm } from "./create-event-form";
import { DockArchiveStats, DockChronicleError, DockModeTabs } from "./dock-panels";
import { DockHero } from "./hero";
import { FilterBar, type SortKey } from "./filter-bar";
import { EventList } from "./event-list";
import { EventDetailPanel } from "./event-detail-panel";
import { CanonLorePanel } from "./CanonLorePanel";
import { useCurrentUser } from "@/lib/api/auth";
import {
  useArchiveTimelineEvent,
  useCreateTimelineEvent,
  useDeleteTimelineEvent,
  useTimelineEras,
  useTimelineEvent,
  useTimelineEventHistory,
  useTimelineEvents,
  useTimelineRelatedEvents,
  useTimelineStats,
} from "@/lib/api/timeline";

const PAGE_SIZE = 12;
const EMPTY_EVENTS: TimelineEvent[] = [];
type DockSearchKey = "q" | "era" | "sort" | "page" | "event";

function readPage(rawPage: string | null): number {
  const page = Number(rawPage);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export function Dock() {
  const params = useSearchParams();
  const router = useRouter();
  const paramsString = params.toString();
  const queryFromUrl = params.get("q") ?? "";
  const rawEra = params.get("era");
  const era = (rawEra ?? "all") as EraId | "all";
  const sort: SortKey = params.get("sort") === "oldest" ? "oldest" : "newest";
  const page = readPage(params.get("page"));
  const eventId = params.get("event") || null;
  const [queryInput, setQueryInput] = useState(queryFromUrl);
  const [drawerOpen, setDrawerOpen] = useState(Boolean(eventId));
  const [isDesktopXl, setIsDesktopXl] = useState(false);
  const [dockTab, setDockTab] = useState<"chronicle" | "canon">("chronicle");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [origin, setOrigin] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newKind, setNewKind] = useState<EventKind>("PROJECT");
  const [newEra, setNewEra] = useState<EraId>("expansions");
  const [newDate, setNewDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newLocation, setNewLocation] = useState("");
  const [newExcerpt, setNewExcerpt] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newTags, setNewTags] = useState("");
  const [mutationNotice, setMutationNotice] = useState<string | null>(null);

  const updateSearchParams = useCallback(
    (
      updates: Partial<Record<DockSearchKey, string | null>>,
      history: "push" | "replace" = "replace",
    ) => {
      const nextParams = new URLSearchParams(paramsString);
      for (const [key, value] of Object.entries(updates)) {
        if (value) nextParams.set(key, value);
        else nextParams.delete(key);
      }
      const query = nextParams.toString();
      const url = query ? `/dock?${query}` : "/dock";
      if (history === "push") router.push(url, { scroll: false });
      else router.replace(url, { scroll: false });
    },
    [paramsString, router],
  );

  const currentUserQuery = useCurrentUser();
  const currentUser = currentUserQuery.data?.user ?? null;
  const canEditTimeline = currentUser?.role === "admin" || currentUser?.role === "editor";
  const canDeleteTimeline = currentUser?.role === "admin";

  const eventsQuery = useTimelineEvents({
    era: rawEra ?? undefined,
    q: queryFromUrl || undefined,
    sort,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });
  const erasQuery = useTimelineEras();
  const statsQuery = useTimelineStats();
  const createEventMutation = useCreateTimelineEvent();
  const archiveEventMutation = useArchiveTimelineEvent();
  const deleteEventMutation = useDeleteTimelineEvent();
  const timelineEvents = eventsQuery.data?.data ?? EMPTY_EVENTS;
  const eras = erasQuery.data?.data ?? [];
  const selectedFromList = timelineEvents[0] ?? null;
  const selectedInList = eventId
    ? (timelineEvents.find((event) => event.id === eventId) ?? null)
    : null;
  const selectedDetailQuery = useTimelineEvent(eventId);
  const selected = eventId ? (selectedDetailQuery.data?.data ?? selectedInList) : selectedFromList;
  const historyQuery = useTimelineEventHistory(
    selected?.id ?? null,
    Boolean(currentUser && selected?.id),
  );
  const relatedQuery = useTimelineRelatedEvents(selected?.related ?? []);
  const relatedEvents = relatedQuery.data ?? EMPTY_EVENTS;
  const selectedEra = selected
    ? (eras.find((availableEra) => availableEra.id === selected.era) ?? null)
    : null;
  const total = eventsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selectedListId = eventId ?? selectedFromList?.id ?? null;

  useEffect(() => {
    setQueryInput(queryFromUrl);
  }, [queryFromUrl]);

  useEffect(() => {
    setDrawerOpen(Boolean(eventId));
  }, [eventId]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1280px)");
    const syncViewport = () => setIsDesktopXl(mediaQuery.matches);
    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);
    return () => mediaQuery.removeEventListener("change", syncViewport);
  }, []);

  useEffect(() => setOrigin(window.location.origin), []);

  useEffect(() => {
    const query = queryInput.trim();
    if (query === queryFromUrl) return;
    const timeout = window.setTimeout(
      () => updateSearchParams({ q: query || null, page: null }),
      300,
    );
    return () => window.clearTimeout(timeout);
  }, [queryFromUrl, queryInput, updateSearchParams]);

  useEffect(() => {
    if (eventsQuery.isSuccess && page > totalPages) {
      updateSearchParams({ page: totalPages > 1 ? String(totalPages) : null });
    }
  }, [eventsQuery.isSuccess, page, totalPages, updateSearchParams]);

  const shareUrl = useMemo(() => {
    if (!selected) return "";
    const shareParams = new URLSearchParams(paramsString);
    shareParams.set("event", selected.id);
    return `${origin}/dock?${shareParams.toString()}`;
  }, [origin, paramsString, selected]);

  function selectEvent(id: string) {
    updateSearchParams({ event: id }, "push");
    setDrawerOpen(true);
  }

  function resetFilters() {
    setQueryInput("");
    updateSearchParams({ q: null, era: null, sort: null, page: null, event: null });
    setDrawerOpen(false);
  }

  const retryAll = () => {
    void eventsQuery.refetch();
    void erasQuery.refetch();
    void statsQuery.refetch();
  };

  function handleCreateEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMutationNotice(null);
    const title = newTitle.trim();
    if (!title) {
      setMutationNotice("Title is required.");
      return;
    }
    const tags = newTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    createEventMutation.mutate(
      {
        title,
        kind: newKind,
        era: newEra,
        date: newDate.trim() || new Date().toISOString().slice(0, 10),
        location: newLocation.trim(),
        excerpt: newExcerpt.trim(),
        body: newBody.trim(),
        tags,
      },
      {
        onSuccess: (created) => {
          setNewTitle("");
          setNewLocation("");
          setNewExcerpt("");
          setNewBody("");
          setNewTags("");
          setCreateOpen(false);
          setMutationNotice(`Created timeline event "${created.data.title}".`);
          updateSearchParams({ event: created.data.id, page: null }, "push");
        },
        onError: (err: Error) => {
          setMutationNotice(err.message);
        },
      },
    );
  }

  function handleArchiveEvent(id: string) {
    setMutationNotice(null);
    archiveEventMutation.mutate(id, {
      onSuccess: () => {
        setMutationNotice(`Archived event "${id}".`);
        updateSearchParams({ event: null });
        setDrawerOpen(false);
      },
      onError: (err: Error) => setMutationNotice(err.message),
    });
  }

  function handleDeleteEvent(id: string) {
    setMutationNotice(null);
    deleteEventMutation.mutate(id, {
      onSuccess: () => {
        setMutationNotice(`Deleted event "${id}".`);
        updateSearchParams({ event: null });
        setDrawerOpen(false);
      },
      onError: (err: Error) => setMutationNotice(err.message),
    });
  }

  const stats = statsQuery.data?.data;
  const pageStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(page * PAGE_SIZE, total);
  const chronicleError = eventsQuery.isError || erasQuery.isError || statsQuery.isError;
  const chronicleLoading = eventsQuery.isLoading || erasQuery.isLoading || statsQuery.isLoading;

  return (
    <ConsoleShellAdapter
      breadcrumb="Dock / Lighthouse"
      search={{
        value: queryInput,
        onChange: setQueryInput,
        placeholder: "Search timeline events…",
      }}
    >
      <DockHero visibleCount={timelineEvents.length} total={total} />

      <div className="space-y-5 px-4 py-6 sm:px-8">
        <DockModeTabs
          dockTab={dockTab}
          canEditTimeline={canEditTimeline}
          createOpen={createOpen}
          onSelectTab={setDockTab}
          onToggleCreate={() => setCreateOpen((open) => !open)}
        />

        {mutationNotice && (
          <p
            role="status"
            className="border border-[var(--border)] bg-[var(--card)] px-4 py-2 font-mono text-xs text-[var(--primary)]"
          >
            {mutationNotice}
          </p>
        )}

        {canEditTimeline && createOpen && dockTab === "chronicle" && (
          <DockCreateEventForm
            title={newTitle}
            kind={newKind}
            era={newEra}
            date={newDate}
            location={newLocation}
            tags={newTags}
            excerpt={newExcerpt}
            body={newBody}
            pending={createEventMutation.isPending}
            onTitleChange={setNewTitle}
            onKindChange={setNewKind}
            onEraChange={setNewEra}
            onDateChange={setNewDate}
            onLocationChange={setNewLocation}
            onTagsChange={setNewTags}
            onExcerptChange={setNewExcerpt}
            onBodyChange={setNewBody}
            onSubmit={handleCreateEvent}
          />
        )}

        {dockTab === "canon" ? (
          <CanonLorePanel />
        ) : chronicleError ? (
          <DockChronicleError onRetry={retryAll} />
        ) : chronicleLoading ? (
          <div
            className="flex h-[45vh] items-center justify-center font-brush text-xl text-[var(--primary)]"
            role="status"
            aria-live="polite"
          >
            LOADING THE DOCK…
          </div>
        ) : (
          <>
            <DockArchiveStats
              total={stats?.total ?? "—"}
              erasCount={eras.length}
              kindCount={Object.keys(stats?.byKind ?? {}).length}
            />

            <FilterBar
              eras={eras}
              era={era}
              onEraChange={(nextEra) =>
                updateSearchParams({
                  era: nextEra === "all" ? null : nextEra,
                  page: null,
                })
              }
              sort={sort}
              onSortChange={(nextSort) =>
                updateSearchParams({
                  sort: nextSort === "newest" ? null : nextSort,
                  page: null,
                })
              }
              view={view}
              onViewChange={setView}
            />

            <EraBand
              eras={eras}
              active={era}
              onSelect={(nextEra) =>
                updateSearchParams({
                  era: nextEra === "all" ? null : nextEra,
                  page: null,
                })
              }
            />

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div>
                <EventList
                  events={timelineEvents}
                  total={total}
                  pageStart={pageStart}
                  pageEnd={pageEnd}
                  page={page}
                  totalPages={totalPages}
                  view={view}
                  selectedId={selectedListId}
                  query={queryFromUrl}
                  onOpen={selectEvent}
                  onReset={resetFilters}
                  onPageChange={(nextPage) =>
                    updateSearchParams({
                      page: nextPage > 1 ? String(nextPage) : null,
                      event: null,
                    })
                  }
                />
                {eventId && !selected && selectedDetailQuery.isError && (
                  <p className="mt-4 text-sm text-[var(--primary)]" role="alert">
                    The selected event could not be loaded from the archive.
                  </p>
                )}
              </div>

              {selected && selectedEra ? (
                <EventDetailPanel
                  variant="aside"
                  event={selected}
                  era={selectedEra}
                  relatedEvents={relatedEvents}
                  shareUrl={shareUrl}
                  onRelated={selectEvent}
                  canEdit={canEditTimeline}
                  canDelete={canDeleteTimeline}
                  mutating={archiveEventMutation.isPending || deleteEventMutation.isPending}
                  onArchive={handleArchiveEvent}
                  onDelete={handleDeleteEvent}
                  historyEntries={historyQuery.data?.data}
                  historyLoading={historyQuery.isLoading}
                />
              ) : eventId && selectedDetailQuery.isLoading ? (
                <p className="p-5 text-sm text-[var(--muted-foreground)]" role="status">
                  Loading event details…
                </p>
              ) : null}
            </div>
          </>
        )}
      </div>

      {!isDesktopXl && dockTab === "chronicle" && drawerOpen && selected && selectedEra && (
        <EventDetailPanel
          variant="drawer"
          event={selected}
          era={selectedEra}
          relatedEvents={relatedEvents}
          shareUrl={shareUrl}
          onRelated={selectEvent}
          onClose={() => setDrawerOpen(false)}
          canEdit={canEditTimeline}
          canDelete={canDeleteTimeline}
          mutating={archiveEventMutation.isPending || deleteEventMutation.isPending}
          onArchive={handleArchiveEvent}
          onDelete={handleDeleteEvent}
          historyEntries={historyQuery.data?.data}
          historyLoading={historyQuery.isLoading}
        />
      )}

      <Star4 className="pointer-events-none fixed bottom-24 right-6 hidden h-6 w-6 text-[var(--primary)] opacity-50 xl:block" />
    </ConsoleShellAdapter>
  );
}
