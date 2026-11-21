"use client";

import type { FormEvent } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  NativeSelect,
} from "@moonwitness/ui";
import { Copy, FileText, Search } from "@moonwitness/ui/icons";
import type { MemoryKnowledgeRecord } from "@/lib/api/memory";

interface CorpusSearchPanelProps {
  query: string;
  onQueryChange: (value: string) => void;
  searching: boolean;
  kindFilter: string;
  onKindFilterChange: (value: string) => void;
  kinds: string[];
  records: MemoryKnowledgeRecord[];
  onSearch: (event: FormEvent<HTMLFormElement>) => void;
  onClearSearch: () => void;
  onInspect: (record: MemoryKnowledgeRecord) => void;
  onCopy: (record: MemoryKnowledgeRecord) => void;
}

export function CorpusSearchPanel({
  query,
  onQueryChange,
  searching,
  kindFilter,
  onKindFilterChange,
  kinds,
  records,
  onSearch,
  onClearSearch,
  onInspect,
  onCopy,
}: CorpusSearchPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 font-brush text-xl">
              <Search className="h-5 w-5 text-[var(--primary)]" />
              EXTRACTED KNOWLEDGE CORPUS ({records.length})
            </CardTitle>
            <CardDescription>
              Hybrid FTS5 keyword + FastEmbed vector search with immutable message provenance.
            </CardDescription>
          </div>
        </div>
        <form onSubmit={onSearch} className="mt-3 flex flex-wrap items-center gap-2">
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search memories, lore, decisions, people, or entities…"
            aria-label="Search memory corpus"
            className="min-w-60 flex-1"
          />
          <NativeSelect
            aria-label="Filter knowledge kind"
            value={kindFilter}
            onChange={(e) => onKindFilterChange(e.target.value)}
          >
            <option value="all">All kinds</option>
            {kinds.map((kind) => (
              <option key={kind} value={kind}>
                {kind.toUpperCase()}
              </option>
            ))}
          </NativeSelect>
          <Button type="submit" disabled={searching}>
            {searching ? "Searching…" : "Search"}
          </Button>
          {query.trim() && (
            <Button type="button" variant="outline" onClick={onClearSearch}>
              Reset
            </Button>
          )}
        </form>
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <p className="border border-dashed border-[var(--border)] p-4 text-xs text-[var(--muted-foreground)]">
            No knowledge entries matched the current query or filter.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {records.map((record) => (
              <article
                key={record.id}
                className="flex flex-col justify-between gap-3 border border-[var(--border)] bg-[var(--background)] p-4"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge variant="outline">{(record.kind || "concept").toUpperCase()}</Badge>
                    <span className="font-mono text-[10px] text-[var(--muted-foreground)]">
                      CONF {Math.round((record.confidence ?? 0) * 100)}%
                    </span>
                  </div>
                  <h3 className="font-brush text-lg text-[var(--card-foreground)]">
                    {record.title}
                  </h3>
                  <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">
                    {record.summary || record.content?.slice(0, 180)}
                  </p>
                  {record.tags && record.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {record.tags.slice(0, 5).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[10px]">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-2">
                  <Button size="sm" variant="outline" onClick={() => onInspect(record)}>
                    <FileText className="mr-1.5 h-3.5 w-3.5" />
                    Sources ({record.source_message_ids?.length ?? 0})
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onCopy(record)}>
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                    Copy Context
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
